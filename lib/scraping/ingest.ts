import { prisma, redis, productsKey } from '../db';
import { ScrapedProduct } from './types';

function pickRandomKey(): number {
  return Math.random();
}

async function ensureStore(storeSlug: string, name: string, type: string) {
  return prisma.store.upsert({
    where: { slug: storeSlug },
    update: { name, type },
    create: { slug: storeSlug, name, type },
  });
}

async function ensureCategories(slugs: string[]) {
  const categories = await Promise.all(
    slugs.map((slug) =>
      prisma.category.upsert({
        where: { slug },
        update: {},
        create: { slug, name: slug },
      })
    )
  );
  return categories;
}

export async function ingestScrapedProducts(storeSlug: string, storeName: string, storeType: string, scraped: ScrapedProduct[]) {
  const run = await prisma.scrapeRun.create({
    data: {
      status: 'pending',
      store: {
        connectOrCreate: {
          where: { slug: storeSlug },
          create: { slug: storeSlug, name: storeName, type: storeType },
        },
      },
    },
  });

  try {
    const store = await ensureStore(storeSlug, storeName, storeType);
    const seenIds = new Set<string>();

    for (const product of scraped) {
      seenIds.add(product.externalId);
      const categories = await ensureCategories(product.categorySlugs);
      const now = new Date();

      const upserted = await prisma.product.upsert({
        where: { storeId_externalId: { storeId: store.id, externalId: product.externalId } },
        update: {
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          productUrl: product.productUrl,
          priceCents: product.priceCents,
          currency: product.currency,
          lastSeenAt: now,
          isActive: true,
          rawData: product.raw ?? {},
        },
        create: {
          storeId: store.id,
          externalId: product.externalId,
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          productUrl: product.productUrl,
          priceCents: product.priceCents,
          currency: product.currency,
          firstSeenAt: now,
          lastSeenAt: now,
          isActive: true,
          randomKey: pickRandomKey(),
          rawData: product.raw ?? {},
        },
      });

      await prisma.productCategory.deleteMany({ where: { productId: upserted.id } });
      await prisma.productCategory.createMany({
        data: categories.map((c) => ({ productId: upserted.id, categoryId: c.id })),
        skipDuplicates: true,
      });

      for (const category of categories) {
        await redis.sadd(productsKey(store.slug, category.slug), upserted.id);
      }
    }

    const stale = await prisma.product.findMany({
      where: { storeId: store.id, externalId: { notIn: Array.from(seenIds) }, isActive: true },
      select: { id: true },
    });

    if (stale.length) {
      await prisma.product.updateMany({
        where: { id: { in: stale.map((s) => s.id) } },
        data: { isActive: false },
      });

      for (const s of stale) {
        const cats = await prisma.productCategory.findMany({
          where: { productId: s.id },
          include: { category: true, product: { include: { store: true } } },
        });
        for (const c of cats) {
          await redis.srem(productsKey(c.product.store.slug, c.category.slug), s.id);
        }
      }
    }

    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: { status: 'success', finishedAt: new Date() },
    });
  } catch (err: any) {
    await prisma.scrapeRun.update({
      where: { id: run.id },
      data: { status: 'error', finishedAt: new Date(), errorMessage: err?.message || 'unknown' },
    });
    throw err;
  }
}

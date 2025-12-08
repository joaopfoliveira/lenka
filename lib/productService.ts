import { prisma, redis, productsKey } from './db';

export type GetRandomProductsParams = {
  storeSlugs: string[];
  categorySlugs: string[];
  limit: number;
  maxAgeDays?: number;
};

export type GameProduct = {
  id: string;
  storeSlug: string;
  categorySlugs: string[];
  name: string;
  description?: string;
  imageUrl?: string;
  productUrl?: string;
  priceCents: number;
  currency: string;
};

async function fetchByIds(ids: string[], maxAgeDays: number): Promise<GameProduct[]> {
  if (!ids.length) return [];
  const maxAge = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.product.findMany({
    where: {
      id: { in: ids },
      isActive: true,
      lastSeenAt: { gte: maxAge },
    },
    include: {
      store: true,
      categories: { include: { category: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    storeSlug: row.store.slug,
    categorySlugs: row.categories.map((c) => c.category.slug),
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    productUrl: row.productUrl ?? undefined,
    priceCents: row.priceCents,
    currency: row.currency,
  }));
}

async function dbFallback(params: GetRandomProductsParams): Promise<GameProduct[]> {
  const maxAge = new Date(Date.now() - (params.maxAgeDays ?? 7) * 86400000);

  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      lastSeenAt: { gte: maxAge },
      store: { slug: { in: params.storeSlugs } },
      categories: { some: { category: { slug: { in: params.categorySlugs } } } },
    },
    orderBy: { randomKey: 'asc' },
    take: params.limit,
    include: {
      store: true,
      categories: { include: { category: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    storeSlug: row.store.slug,
    categorySlugs: row.categories.map((c) => c.category.slug),
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    productUrl: row.productUrl ?? undefined,
    priceCents: row.priceCents,
    currency: row.currency,
  }));
}

export async function getRandomProducts(params: GetRandomProductsParams): Promise<GameProduct[]> {
  const maxAgeDays = params.maxAgeDays ?? 7;

  const redisIds: string[] = [];
  for (const store of params.storeSlugs) {
    for (const category of params.categorySlugs) {
      const key = productsKey(store, category);
      const ids = await redis.srandmember(key, params.limit);
      redisIds.push(...ids);
    }
  }

  const deduped = Array.from(new Set(redisIds)).slice(0, params.limit);
  const fromRedis = await fetchByIds(deduped, maxAgeDays);

  if (fromRedis.length >= params.limit) {
    return fromRedis;
  }

  const fallback = await dbFallback(params);
  return [...fromRedis, ...fallback].slice(0, params.limit);
}

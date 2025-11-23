import { NextResponse } from 'next/server';
import { Product } from '@/lib/productTypes';
import { fetchRandomKuantoKustaProductsAPI } from '@/lib/fetchers/kuantokusta-api.fetcher';
import { fetchRandomTemuProducts } from '@/lib/fetchers/temu.fetcher';
import { fetchRandomDecathlonProducts } from '@/lib/fetchers/decathlon.fetcher';

type Source = 'kuantokusta' | 'temu' | 'decathlon' | 'mixed';
type Provider = Exclude<Source, 'mixed'>;

const providerFetchers: Record<Provider, (count: number) => Promise<Product[]>> = {
  kuantokusta: fetchRandomKuantoKustaProductsAPI,
  temu: fetchRandomTemuProducts,
  decathlon: fetchRandomDecathlonProducts,
};

function splitCounts(total: number, providers: Provider[]): Record<Provider, number> {
  const base = Math.floor(total / providers.length);
  const counts: Record<Provider, number> = {
    kuantokusta: 0,
    temu: 0,
    decathlon: 0,
  };
  providers.forEach((p) => {
    counts[p] = base;
  });
  let remainder = total - base * providers.length;
  let idx = 0;
  while (remainder > 0) {
    counts[providers[idx]] += 1;
    remainder -= 1;
    idx = (idx + 1) % providers.length;
  }
  return counts;
}

async function fetchFromProviders(source: Source, total: number): Promise<Product[]> {
  let products: Product[] = [];
  const providers: Provider[] = source === 'mixed' ? ['kuantokusta', 'temu', 'decathlon'] : [source];
  const counts = splitCounts(total, providers);

  const results = await Promise.all(
    providers.map(async (provider) => {
      const count = counts[provider];
      if (count <= 0) return [] as Product[];
      try {
        return await providerFetchers[provider](count);
      } catch (err) {
        console.warn(`⚠️ Failed to fetch ${provider} products for solo:`, err);
        return [] as Product[];
      }
    })
  );

  products = results.flat();

  // If we are short, try to top up round-robin (2 passes)
  let attempts = 0;
  while (products.length < total && attempts < 2) {
    const remaining = total - products.length;
    for (const provider of providers) {
      if (products.length >= total) break;
      try {
        const extra = await providerFetchers[provider](Math.max(remaining, 1));
        products = products.concat(extra);
      } catch (err) {
        console.warn(`⚠️ Retry fetch failed for ${provider}:`, err);
      }
    }
    attempts += 1;
  }

  return products.sort(() => Math.random() - 0.5).slice(0, total);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rounds = Math.max(1, Math.min(20, Number(searchParams.get('rounds')) || 5));
    const sourceParam = (searchParams.get('source') as Source) || 'mixed';
    const source: Source = ['kuantokusta', 'temu', 'decathlon', 'mixed'].includes(sourceParam)
      ? sourceParam
      : 'mixed';

    const products = await fetchFromProviders(source, rounds);

    if (!products.length) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    return NextResponse.json({ products });
  } catch (err: any) {
    console.error('❌ Solo products fetch failed:', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}

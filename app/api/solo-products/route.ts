import { NextResponse } from 'next/server';
import { Product } from '@/lib/productTypes';
import { fetchFromProviders } from '@/lib/soloLogic';

export const dynamic = 'force-dynamic';

type Source = 'kuantokusta' | 'temu' | 'decathlon' | 'supermarket' | 'mixed';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rounds = Math.max(1, Math.min(20, Number(searchParams.get('rounds')) || 5));
    const sourceParam = (searchParams.get('source') as Source) || 'mixed';
    const allowedSources: Source[] = ['kuantokusta', 'temu', 'decathlon', 'supermarket', 'mixed'];
    const source: Source = allowedSources.includes(sourceParam) ? sourceParam : 'mixed';

    const useFixture = process.env.E2E_FIXTURE === '1' || searchParams.get('fixture') === '1';
    if (useFixture) {
      const products = productCollection.products.slice(0, rounds);
      return NextResponse.json({ products });
    }

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

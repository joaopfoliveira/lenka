import assert from 'assert';
import { test, expect } from 'vitest';
import { splitCounts, fetchFromProviders } from '../lib/soloLogic';
import { type Product } from '../lib/productTypes';

type StubFetcher = (count: number) => Promise<Product[]>;

function makeFetcher(source: Product['source']): StubFetcher {
  return async (count: number) =>
    Array.from({ length: count }).map((_, i) => ({
      id: `${source}-${i}`,
      source,
      category: 'Outros',
      name: `${source} product ${i}`,
      price: 10 + i,
      imageUrl: `https://example.com/${source}-${i}.jpg`,
      store: source,
    }));
}

const stubFetchers = {
  kuantokusta: makeFetcher('kuantokusta'),
  temu: makeFetcher('temu'),
  decathlon: makeFetcher('decathlon'),
  supermarket: makeFetcher('supermarket'),
} as const;

(async function testSplitCountsHandlesRemainders() {
  const counts = splitCounts(7, ['kuantokusta', 'temu', 'decathlon']);
  assert.deepStrictEqual(counts, { kuantokusta: 3, temu: 2, decathlon: 2, supermarket: 0 });
})();

(async function testSplitCountsSingleProvider() {
  const counts = splitCounts(4, ['supermarket']);
  assert.deepStrictEqual(counts, { kuantokusta: 0, temu: 0, decathlon: 0, supermarket: 4 });
})();

(async function testFetchMixedDistributesAndTrims() {
  const total = 5;
  const products = await fetchFromProviders('mixed', total, stubFetchers);
  assert.strictEqual(products.length, total, 'Should return requested total');
  const bySource = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.source] = (acc[p.source] || 0) + 1;
    return acc;
  }, {});
  // With 3 providers, base=1 each, remainder=2 spread to first providers
  assert(bySource['kuantokusta'] >= 1 && bySource['temu'] >= 1 && bySource['decathlon'] >= 1);
})();

(async function testFetchSingleSource() {
  const total = 3;
  const products = await fetchFromProviders('temu', total, stubFetchers);
  assert.strictEqual(products.length, total);
  assert(products.every((p) => p.source === 'temu'), 'All products should come from the requested source');
})();

console.log('✅ solo happy-path tests passed');

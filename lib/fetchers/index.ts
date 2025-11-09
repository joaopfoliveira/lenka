/**
 * Product Fetchers Registry
 * Central registry for all product fetchers
 */

import { ProductFetcher } from '../productTypes';
import { SupermarketFetcher } from './supermarket.fetcher';
import { AmazonFetcher } from './amazon.fetcher';

// Register all available fetchers
export const fetchers: ProductFetcher[] = [
  new SupermarketFetcher(),
  new AmazonFetcher(),
];

export { SupermarketFetcher } from './supermarket.fetcher';
export { AmazonFetcher } from './amazon.fetcher';

// Helper to get fetcher by source
export function getFetcherBySource(source: string): ProductFetcher | undefined {
  return fetchers.find(f => f.source === source);
}

// Helper to test all fetchers
export async function testAllFetchers(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  for (const fetcher of fetchers) {
    console.log(`Testing ${fetcher.name}...`);
    results[fetcher.source] = await fetcher.test();
  }
  
  return results;
}


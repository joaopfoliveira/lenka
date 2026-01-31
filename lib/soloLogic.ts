import { Product } from './productTypes';
import { fetchRandomKuantoKustaProductsAPI } from './fetchers/kuantokusta-api.fetcher';
import { fetchRandomTemuProducts } from './fetchers/temu.fetcher';
import { fetchRandomDecathlonProducts } from './fetchers/decathlon.fetcher';
import { fetchRandomSupermarketProducts } from './fetchers/supermarket.fetcher';

type Source = 'kuantokusta' | 'temu' | 'decathlon' | 'supermarket' | 'mixed';
type Provider = Exclude<Source, 'mixed'>;

type ProviderFetcherMap = Record<Provider, (count: number) => Promise<Product[]>>;

const providerFetchers: ProviderFetcherMap = {
    kuantokusta: fetchRandomKuantoKustaProductsAPI,
    temu: fetchRandomTemuProducts,
    decathlon: fetchRandomDecathlonProducts,
    supermarket: fetchRandomSupermarketProducts,
};

export function splitCounts(total: number, providers: Provider[]): Record<Provider, number> {
    const base = Math.floor(total / providers.length);
    const counts: Record<Provider, number> = {
        kuantokusta: 0,
        temu: 0,
        decathlon: 0,
        supermarket: 0,
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

export async function fetchFromProviders(
    source: Source,
    total: number,
    fetchers: ProviderFetcherMap = providerFetchers
): Promise<Product[]> {
    let products: Product[] = [];
    const providers: Provider[] = source === 'mixed' ? ['kuantokusta', 'temu', 'decathlon'] : [source];
    const counts = splitCounts(total, providers);

    const results = await Promise.all(
        providers.map(async (provider) => {
            const count = counts[provider];
            if (count <= 0) return [] as Product[];
            try {
                return await fetchers[provider](count);
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
                const extra = await fetchers[provider](Math.max(remaining, 1));
                products = products.concat(extra);
            } catch (err) {
                console.warn(`⚠️ Retry fetch failed for ${provider}:`, err);
            }
        }
        attempts += 1;
    }

    return products.sort(() => Math.random() - 0.5).slice(0, total);
}

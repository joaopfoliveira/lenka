import { fetchRandomSupermarketProducts } from '../fetchers/supermarket.fetcher';
import { ScrapedProduct } from './types';

const CATEGORY_MAP: Record<string, string> = {
  Bebidas: 'groceries',
  'Laticínios': 'groceries',
  Bolachas: 'groceries',
  Iogurtes: 'groceries',
  Cereais: 'groceries',
  Snacks: 'groceries',
  Padaria: 'groceries',
  Outros: 'groceries',
};

export async function scrapeSupermarket(count: number): Promise<ScrapedProduct[]> {
  const products = await fetchRandomSupermarketProducts(count);
  return products.map((p) => ({
    externalId: p.id.replace(/^supermarket-/, ''),
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    productUrl: p.storeUrl,
    priceCents: Math.round(p.price * 100),
    currency: p.currency ?? 'EUR',
    categorySlugs: [CATEGORY_MAP[p.category] || 'groceries'],
    raw: p,
  }));
}

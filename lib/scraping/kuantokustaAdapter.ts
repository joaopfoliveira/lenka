import { fetchRandomKuantoKustaProductsAPI } from '../fetchers/kuantokusta-api.fetcher';
import { ScrapedProduct } from './types';

const CATEGORY_MAP: Record<string, string> = {
  'Bebidas': 'groceries',
  'Laticínios': 'groceries',
  'Eletrónicos': 'electronics',
  'Informática': 'electronics',
  'Desporto': 'sports',
  'Casa & Jardim': 'home',
  'Moda': 'fashion',
  'Beleza': 'beauty',
  'Brinquedos': 'toys',
  'Outros': 'other',
};

export async function scrapeKuantokusta(count: number): Promise<ScrapedProduct[]> {
  const products = await fetchRandomKuantoKustaProductsAPI(count);
  return products.map((p) => ({
    externalId: p.id.replace(/^kuantokusta-/, ''),
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    productUrl: p.storeUrl,
    priceCents: Math.round(p.price * 100),
    currency: p.currency ?? 'EUR',
    categorySlugs: [CATEGORY_MAP[p.category] || 'other'],
    raw: p,
  }));
}

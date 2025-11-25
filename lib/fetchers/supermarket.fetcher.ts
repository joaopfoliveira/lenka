/**
 * Supermarket Product Fetcher (SuperSave.pt API)
 * Fetches products from Portuguese supermarkets
 */

import {
  Product,
  ProductFetcher,
  FetcherOptions,
  ProductCategory,
  createProductId,
  calculateDifficulty,
} from '../productTypes';

interface SuperSaveProduct {
  id: number;
  name: string;
  marca: string;
  capacity: string;
  pricePerUnitContinente: string;
  priceCampaignContinente: string;
  pricePerUnitPingoDoce: string;
  priceCampaignPingoDoce: string;
  pricePerUnitAuchan: string;
  priceCampaignAuchan: string;
  imageURL: string;
  ean: string;
}

const SEARCH_TOKENS = 'abcdefops'.split('');
const SUPERMARKET_CATEGORIES: { name: ProductCategory; search: string }[] = [
  { name: 'Bebidas', search: 'Bebidas' },
  { name: 'Laticínios', search: 'Laticínios' },
  { name: 'Bolachas', search: 'Bolachas' },
  { name: 'Iogurtes', search: 'Iogurtes' },
  { name: 'Cereais', search: 'Cereais' },
  { name: 'Snacks', search: 'Snacks' },
  { name: 'Padaria', search: 'Padaria' },
];

export class SupermarketFetcher implements ProductFetcher {
  source = 'supermarket' as const;
  name = 'SuperSave.pt (Continente, Pingo Doce, Auchan)';
  private baseUrl = 'https://supersave.pt/web/api/newLastStateCall.php';
  private defaultMax = 70;

  async fetch(options?: FetcherOptions): Promise<Product[]> {
    const {
      maxProducts = this.defaultMax,
      minPrice = 0.5,
      maxPrice = 20,
    } = options || {};

    console.log(`🛒 Fetching supermarket products...`);

    let products: Product[] = [];
    let attempts = 0;
    const maxAttempts = 4;

    while (products.length === 0 && attempts < maxAttempts) {
      const token = this.pickSearchToken();
      console.log(`   📦 Fetching token "${token}" (attempt ${attempts + 1}/${maxAttempts})...`);
      try {
        products = await this.fetchByToken(token, maxProducts * 3, minPrice, maxPrice);
      } catch (error: any) {
        console.error(`   ❌ Token "${token}" failed:`, error?.message || error);
      }
      attempts += 1;
    }

    if (products.length === 0) {
      throw new Error('No supermarket products available');
    }

    const shuffled = products.sort(() => Math.random() - 0.5);
    const sliced = shuffled.slice(0, maxProducts);
    console.log(`✅ Fetched ${sliced.length} supermarket products`);
    return sliced;
  }

  private pickSearchToken(): string {
    const idx = Math.floor(Math.random() * SEARCH_TOKENS.length);
    return SEARCH_TOKENS[idx];
  }

  private async fetchByToken(
    token: string,
    maxProducts: number,
    minPrice: number,
    maxPrice: number
  ): Promise<Product[]> {
    const url = `${this.baseUrl}?search=${encodeURIComponent(token)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://supersave.pt/web/',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Invalid response structure');
    }

    const products: Product[] = [];

    for (const raw of data.products) {
      if (products.length >= maxProducts) break;
      if (!raw.name || !raw.imageURL) continue;

      // Get best price across stores
      const { store, price } = this.getBestPrice(raw);
      if (!store || !price) continue;

      // Filter by price range
      if (price < minPrice || price > maxPrice) continue;

      // Validate image URL
      if (!raw.imageURL.startsWith('http')) continue;

      // Clean product name
      let cleanName = raw.name.trim();
      if (raw.capacity && raw.capacity.trim()) {
        cleanName += ` ${raw.capacity.trim()}`;
      }

      products.push({
        id: createProductId('supermarket', raw.id),
        source: 'supermarket',
        name: cleanName,
        brand: raw.marca || undefined,
        category: 'Outros',
        price: Math.round(price * 100) / 100,
        currency: 'EUR',
        imageUrl: raw.imageURL,
        store: store || undefined,
        capacity: raw.capacity || undefined,
        ean: raw.ean || undefined,
        difficulty: calculateDifficulty(price),
        updatedAt: new Date().toISOString(),
      });
    }

    console.log(`      ✅ ${products.length} products`);
    return products;
  }

  private getBestPrice(product: SuperSaveProduct): { store: string; price: number } | { store: null; price: null } {
    const prices: { store: string; price: number }[] = [];

    // Continente
    const continentePrice = parseFloat(product.pricePerUnitContinente);
    const continenteCampaign = product.priceCampaignContinente ? parseFloat(product.priceCampaignContinente) : null;
    if (!isNaN(continentePrice) && continentePrice > 0) {
      prices.push({
        store: 'Continente',
        price: continenteCampaign && continenteCampaign < continentePrice ? continenteCampaign : continentePrice
      });
    }

    // Pingo Doce
    const pingoDocePrice = parseFloat(product.pricePerUnitPingoDoce);
    const pingoDoceCampaign = product.priceCampaignPingoDoce ? parseFloat(product.priceCampaignPingoDoce) : null;
    if (!isNaN(pingoDocePrice) && pingoDocePrice > 0) {
      prices.push({
        store: 'Pingo Doce',
        price: pingoDoceCampaign && pingoDoceCampaign < pingoDocePrice ? pingoDoceCampaign : pingoDocePrice
      });
    }

    // Auchan
    const auchanPrice = parseFloat(product.pricePerUnitAuchan);
    const auchanCampaign = product.priceCampaignAuchan ? parseFloat(product.priceCampaignAuchan) : null;
    if (!isNaN(auchanPrice) && auchanPrice > 0) {
      prices.push({
        store: 'Auchan',
        price: auchanCampaign && auchanCampaign < auchanPrice ? auchanCampaign : auchanPrice
      });
    }

    if (prices.length === 0) return { store: null, price: null };

    // Return cheapest
    prices.sort((a, b) => a.price - b.price);
    return prices[0];
  }

  async test(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}?search=Leite&category=true`;
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Convenience helper to align with other fetchers
export async function fetchRandomSupermarketProducts(count: number = 10): Promise<Product[]> {
  const fetcher = new SupermarketFetcher();
  const products = await fetcher.fetch({ maxProducts: count });
  return products.sort(() => Math.random() - 0.5).slice(0, count);
}

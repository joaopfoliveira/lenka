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

const SUPERMARKET_CATEGORIES: { name: ProductCategory; search: string }[] = [
  { name: 'Bebidas', search: 'Refrigerantes' },
  { name: 'Laticínios', search: 'Leite' },
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

  async fetch(options?: FetcherOptions): Promise<Product[]> {
    const {
      categories = SUPERMARKET_CATEGORIES.map(c => c.name),
      maxProducts = 70,
      minPrice = 0.5,
      maxPrice = 20,
    } = options || {};

    console.log(`🛒 Fetching supermarket products...`);

    const allProducts: Product[] = [];
    const productsPerCategory = Math.ceil(maxProducts / SUPERMARKET_CATEGORIES.length);

    for (const cat of SUPERMARKET_CATEGORIES) {
      if (!categories.includes(cat.name)) continue;

      try {
        const products = await this.fetchCategory(cat.name, cat.search, productsPerCategory, minPrice, maxPrice);
        allProducts.push(...products);
      } catch (error: any) {
        console.error(`   ❌ Error fetching ${cat.name}:`, error.message);
      }

      // Be polite - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ Fetched ${allProducts.length} supermarket products`);
    return allProducts;
  }

  private async fetchCategory(
    category: ProductCategory,
    searchTerm: string,
    maxProducts: number,
    minPrice: number,
    maxPrice: number
  ): Promise<Product[]> {
    const url = `${this.baseUrl}?search=${encodeURIComponent(searchTerm)}&category=true`;
    
    console.log(`   📦 Fetching ${category}...`);

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
        category,
        price: Math.round(price * 100) / 100,
        currency: 'EUR',
        imageUrl: raw.imageURL,
        store,
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


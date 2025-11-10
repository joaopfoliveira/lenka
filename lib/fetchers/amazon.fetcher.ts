/**
 * Amazon ES Product Fetcher
 * 
 * Real products scraped from CamelCamelCamel popular products
 * 200 unique products with real Amazon images and prices
 * Updated: November 2025
 */

import {
  Product,
  ProductFetcher,
  FetcherOptions,
  ProductCategory,
  createProductId,
  calculateDifficulty,
} from '../productTypes';
import { readFileSync } from 'fs';
import path from 'path';

interface ScrapedProduct {
  name: string;
  asin: string;
  imageUrl: string;
  price: number;
  category: string;
}

// Load scraped products at module initialization
let AMAZON_PRODUCTS_CATALOG: ScrapedProduct[] = [];

try {
  const dataPath = path.join(process.cwd(), 'data', 'camelcamel-products.json');
  const rawData = readFileSync(dataPath, 'utf-8');
  AMAZON_PRODUCTS_CATALOG = JSON.parse(rawData);
  console.log(`📦 Loaded ${AMAZON_PRODUCTS_CATALOG.length} Amazon ES products from CamelCamelCamel`);
} catch (error) {
  console.error('❌ Failed to load Amazon products:', error);
  // Fallback to empty array - will be handled gracefully
  AMAZON_PRODUCTS_CATALOG = [];
}

// Category mapping from scraped categories to our categories
const CATEGORY_MAP: Record<string, ProductCategory> = {
  'Eletrónicos': 'Eletrónicos',
  'Informática': 'Informática',
  'Livros': 'Livros',
  'Brinquedos': 'Brinquedos',
  'Casa & Jardim': 'Casa & Jardim',
  'Moda': 'Moda',
  'Beleza': 'Beleza',
  'Ferramentas': 'Ferramentas',
  'Outros': 'Eletrónicos', // Map "Outros" to Eletrónicos as fallback
};

export class AmazonFetcher implements ProductFetcher {
  source = 'amazon' as const;
  name = 'Amazon ES (Real Products via CamelCamelCamel)';

  async fetch(options?: FetcherOptions): Promise<Product[]> {
    const {
      categories,
      maxProducts = 100,
      minPrice = 5,
      maxPrice = 2000, // Increased to include more expensive items
    } = options || {};

    console.log(`🛍️ Loading Amazon ES products (${AMAZON_PRODUCTS_CATALOG.length} available)...`);

    if (AMAZON_PRODUCTS_CATALOG.length === 0) {
      console.warn('⚠️ No Amazon products available');
      return [];
    }

    let products = AMAZON_PRODUCTS_CATALOG
      .filter(p => p.price >= minPrice && p.price <= maxPrice)
      .filter(p => {
        if (!categories) return true;
        const mappedCategory = CATEGORY_MAP[p.category];
        return mappedCategory && categories.includes(mappedCategory);
      })
      .map(p => {
        const mappedCategory = CATEGORY_MAP[p.category] || 'Eletrónicos';
        
        return {
          id: createProductId('amazon', p.asin),
          name: p.name,
          brand: extractBrand(p.name), // Extract brand from product name
          category: mappedCategory,
          price: p.price,
          currency: 'EUR' as const,
          imageUrl: p.imageUrl,
          store: 'Amazon ES',
          description: p.name.substring(0, 100), // Use truncated name as description
          source: 'amazon' as const,
          difficulty: calculateDifficulty(p.price),
          updatedAt: new Date().toISOString(),
        } as Product;
      });

    // Shuffle for variety
    products = shuffleArray(products);

    if (maxProducts) {
      products = products.slice(0, maxProducts);
    }

    console.log(`✅ Loaded ${products.length} Amazon ES products`);
    return products;
  }

  async test(): Promise<boolean> {
    return AMAZON_PRODUCTS_CATALOG.length > 0;
  }
}

/**
 * Extract brand from product name (first word or known brand)
 */
function extractBrand(name: string): string {
  const knownBrands = [
    'Apple', 'Samsung', 'Sony', 'LG', 'Amazon', 'Philips', 'Bosch',
    'LEGO', 'Nike', 'Adidas', 'HP', 'Lenovo', 'Xiaomi', 'Logitech',
    'Corsair', 'Razer', 'ASUS', 'MSI', 'Dyson', 'Roomba', 'JBL',
    'Bose', 'Cosori', 'Potensic', 'XIAOMI', 'Tapo',
  ];

  for (const brand of knownBrands) {
    if (name.includes(brand)) {
      return brand;
    }
  }

  // Fallback: return first word
  const firstWord = name.split(' ')[0];
  return firstWord.length > 2 ? firstWord : 'Amazon';
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

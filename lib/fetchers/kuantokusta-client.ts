/**
 * KuantoKusta Client-Side Fetcher
 * Runs in the browser to avoid server IP blocking (403 errors)
 * Uses natural browser headers and user's real IP
 */

import { Product } from '../productTypes';

const BASE_URL = 'https://api.kuantokusta.pt';

interface KuantoKustaCategory {
  id: number;
  label: string;
  slug: string;
  hasChild: boolean;
}

interface KuantoKustaProduct {
  productId: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  imageUrl: string;
  storeUrl: string;
}

// Category groups to ensure diversity
const CATEGORY_GROUPS: Record<string, string[]> = {
  'mobile': ['Smartphones', 'Tablets', 'Smartwatches'],
  'computers': ['Portáteis', 'Computadores', 'Periféricos'],
  'gaming': ['Gaming', 'Consolas'],
  'tv-audio': ['TV', 'Áudio', 'Imagem e Som'],
  'home': ['Electrodomésticos', 'Smart Home', 'Casa'],
  'beauty': ['Beleza', 'Saúde', 'Perfumaria'],
  'fashion': ['Moda', 'Vestuário', 'Calçado'],
  'sports': ['Desporto', 'Fitness', 'Outdoor'],
};

// Category mapping to game categories
const CATEGORY_MAP: Record<string, string> = {
  'Smartphones': 'Eletrónicos',
  'Tablets': 'Eletrónicos',
  'Smartwatches': 'Eletrónicos',
  'Portáteis': 'Informática',
  'Computadores': 'Informática',
  'Gaming': 'Brinquedos',
  'Consolas': 'Brinquedos',
  'Electrodomésticos': 'Casa & Jardim',
  'Smart Home': 'Casa & Jardim',
  'TV': 'Eletrónicos',
  'Áudio': 'Eletrónicos',
  'Fotografia': 'Eletrónicos',
  'Beleza': 'Beleza',
  'Saúde': 'Beleza',
  'Moda': 'Moda',
  'Desporto': 'Desporto',
};

/**
 * Fetch categories from KuantoKusta API (runs in browser)
 */
async function fetchCategories(): Promise<KuantoKustaCategory[]> {
  try {
    const response = await fetch(`${BASE_URL}/categories`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const categories = await response.json();
    return categories;
  } catch (error) {
    console.error('❌ Client: Error fetching categories:', error);
    throw error;
  }
}

/**
 * Fetch products from a specific category
 */
async function fetchProductsFromCategory(
  categoryId: number,
  count: number = 9
): Promise<KuantoKustaProduct[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/products/popular?categoryId=${categoryId}&rows=${count}`
    );
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const products = await response.json();
    return products;
  } catch (error) {
    console.error(`❌ Client: Error fetching products from category ${categoryId}:`, error);
    return [];
  }
}

/**
 * Convert KuantoKusta product to our Product format
 */
function convertToProduct(kProduct: KuantoKustaProduct): Product {
  const gameCategory = CATEGORY_MAP[kProduct.category] || 'Outros';
  
  return {
    id: `kuantokusta-${kProduct.productId}`,
    name: kProduct.name,
    brand: kProduct.brand || 'Unknown',
    category: gameCategory as any,
    price: kProduct.price,
    currency: 'EUR',
    imageUrl: kProduct.imageUrl || 'https://via.placeholder.com/300?text=No+Image',
    store: 'KuantoKusta',
    storeUrl: kProduct.storeUrl || 'https://www.kuantokusta.pt',
    description: `${kProduct.brand} ${kProduct.name}`,
    source: 'kuantokusta',
    difficulty: kProduct.price < 50 ? 'easy' : kProduct.price < 200 ? 'medium' : 'hard',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Main function: Fetch random products from KuantoKusta API
 * Runs in the browser to use natural headers and user's IP
 */
export async function fetchRandomKuantoKustaProductsFromBrowser(
  count: number = 10
): Promise<Product[]> {
  const startTime = Date.now();
  console.log(`🛒 [CLIENT] Fetching ${count} products from KuantoKusta API...`);

  try {
    // Step 1: Fetch all categories
    console.log('   📂 Fetching categories...');
    const categories = await fetchCategories();
    
    if (!categories || categories.length === 0) {
      throw new Error('No categories returned from API');
    }
    
    console.log(`   ✅ Got ${categories.length} categories`);

    // Step 2: Shuffle and filter for diversity
    const shuffledCategories = categories.sort(() => Math.random() - 0.5);
    const selectedCategories: KuantoKustaCategory[] = [];
    const usedGroups = new Set<string>();

    for (const category of shuffledCategories) {
      if (selectedCategories.length >= count * 2) break;

      let categoryGroup: string | null = null;
      for (const [group, groupCategories] of Object.entries(CATEGORY_GROUPS)) {
        if (groupCategories.some(gc => category.label.includes(gc))) {
          categoryGroup = group;
          break;
        }
      }

      if (categoryGroup && usedGroups.has(categoryGroup)) {
        continue;
      }

      selectedCategories.push(category);
      if (categoryGroup) {
        usedGroups.add(categoryGroup);
      }
    }

    console.log(`   🎯 Selected ${selectedCategories.length} diverse categories`);

    // Step 3: Fetch products from selected categories
    const allProducts: Product[] = [];
    const seenProductIds = new Set<number>();
    const maxProductsPerCategory = Math.max(1, Math.floor(count / 5));

    for (let i = 0; i < selectedCategories.length && allProducts.length < count * 1.5; i++) {
      const category = selectedCategories[i];
      
      try {
        const kkProducts = await fetchProductsFromCategory(category.id, 9);

        if (kkProducts.length > 0) {
          const shuffled = kkProducts.sort(() => Math.random() - 0.5);

          let addedFromCategory = 0;
          for (const kkProduct of shuffled) {
            if (addedFromCategory >= maxProductsPerCategory) break;

            if (!seenProductIds.has(kkProduct.productId)) {
              seenProductIds.add(kkProduct.productId);
              const converted = convertToProduct(kkProduct);
              allProducts.push(converted);
              addedFromCategory++;
            }
          }
        }
      } catch (error) {
        console.error(`      ❌ Error fetching from ${category.label}:`, error);
      }
    }

    // Step 4: Shuffle and limit to requested count
    const finalProducts = allProducts
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    // Step 5: Ensure uniqueness
    const uniqueIds = new Set(finalProducts.map(p => p.id));
    if (uniqueIds.size !== finalProducts.length) {
      console.warn('⚠️  Duplicates detected! Removing...');
      const uniqueProducts: Product[] = [];
      const seenIds = new Set<string>();
      for (const product of finalProducts) {
        if (!seenIds.has(product.id)) {
          seenIds.add(product.id);
          uniqueProducts.push(product);
        }
      }
      finalProducts.length = 0;
      finalProducts.push(...uniqueProducts);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [CLIENT] Fetched ${finalProducts.length} unique products in ${duration}ms`);

    return finalProducts;
  } catch (error) {
    console.error('❌ [CLIENT] Error fetching from KuantoKusta API:', error);
    throw error;
  }
}


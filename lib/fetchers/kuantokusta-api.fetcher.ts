/**
 * KuantoKusta.pt API Fetcher
 * 
 * Uses the public KuantoKusta API for fast, reliable product fetching
 * Much faster than scraping (milliseconds vs seconds)
 */

import { Product, createProductId, calculateDifficulty, ProductCategory } from '../productTypes';

const BASE_URL = 'https://api.kuantokusta.pt';

interface KuantoKustaCategory {
  id: number;
  label: string;
  slug: string;
  hasChild: boolean;
}

interface KuantoKustaProduct {
  productId: number;
  image: string;
  name: string;
  storesLength: number;
  priceMin: number;
  productUrl: string;
  brand: string;
  category: string;
}

// Map KuantoKusta categories to our game categories
const CATEGORY_MAPPING: Record<string, ProductCategory> = {
  'Smartphones': 'Eletrónicos',
  'Tablets': 'Eletrónicos',
  'Portáteis': 'Informática',
  'Computadores': 'Informática',
  'Periféricos': 'Informática',
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

// Grupos de categorias relacionadas (para evitar buscar múltiplas da mesma área)
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

/**
 * Fetch all available categories from KuantoKusta API
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
    console.error('❌ Error fetching categories:', error);
    return [];
  }
}

/**
 * Fetch popular products from a specific category
 */
async function fetchProductsFromCategory(
  categoryId: number,
  count: number = 20
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
    console.error(`❌ Error fetching products from category ${categoryId}:`, error);
    return [];
  }
}

/**
 * Convert KuantoKusta product to our Product format
 */
function convertToProduct(kProduct: KuantoKustaProduct): Product {
  // Map category
  let gameCategory: ProductCategory = 'Outros';
  for (const [kkCat, ourCat] of Object.entries(CATEGORY_MAPPING)) {
    if (kProduct.category?.includes(kkCat)) {
      gameCategory = ourCat;
      break;
    }
  }
  
  return {
    id: createProductId('kuantokusta', kProduct.productId.toString()),
    name: kProduct.name,
    brand: kProduct.brand || 'Unknown',
    category: gameCategory,
    price: kProduct.priceMin,
    currency: 'EUR',
    imageUrl: kProduct.image,
    store: 'KuantoKusta',
    storeUrl: `https://www.kuantokusta.pt${kProduct.productUrl}`,
    description: `${kProduct.storesLength} lojas`,
    source: 'kuantokusta',
    difficulty: calculateDifficulty(kProduct.priceMin),
    updatedAt: new Date().toISOString(),
  } as Product;
}

/**
 * Fetch random products using KuantoKusta API
 * This is MUCH faster than scraping (milliseconds vs seconds)
 */
export async function fetchRandomKuantoKustaProductsAPI(count: number = 10): Promise<Product[]> {
  console.log(`\n🛒 Fetching ${count} products from KuantoKusta API...`);
  const startTime = Date.now();
  
  try {
    // Step 1: Get all categories
    console.log('   📂 Fetching categories...');
    const categories = await fetchCategories();
    
    if (categories.length === 0) {
      throw new Error('No categories found');
    }
    
    console.log(`   ✅ Found ${categories.length} categories`);
    
    // Step 2: Shuffle categories for randomness
    const shuffledCategories = categories.sort(() => Math.random() - 0.5);
    
    // Step 3: Filter categories to avoid similar ones (e.g., not both Smartphones AND Tablets)
    const selectedCategories: KuantoKustaCategory[] = [];
    const usedGroups = new Set<string>();
    
    for (const category of shuffledCategories) {
      if (selectedCategories.length >= count * 2) break;
      
      // Check if this category belongs to an already used group
      let categoryGroup: string | null = null;
      for (const [group, groupCategories] of Object.entries(CATEGORY_GROUPS)) {
        if (groupCategories.some(gc => category.label.includes(gc))) {
          categoryGroup = group;
          break;
        }
      }
      
      // If category belongs to a group, check if we already used that group
      if (categoryGroup && usedGroups.has(categoryGroup)) {
        continue; // Skip this category, we already have one from this group
      }
      
      selectedCategories.push(category);
      if (categoryGroup) {
        usedGroups.add(categoryGroup);
      }
    }
    
    console.log(`   🎯 Selected ${selectedCategories.length} diverse categories (avoiding duplicates)`);
    
    // Step 4: Fetch products from selected categories - GARANTIR VARIEDADE E SEM DUPLICATAS
    const allProducts: Product[] = [];
    const seenProductIds = new Set<number>(); // Track unique product IDs
    const maxProductsPerCategory = Math.max(1, Math.floor(count / 5)); // Máximo 1-2 produtos por categoria
    
    console.log(`   🎯 Strategy: Max ${maxProductsPerCategory} products per category`);
    
    for (let i = 0; i < selectedCategories.length && allProducts.length < count * 1.5; i++) {
      const category = selectedCategories[i];
      
      console.log(`   📦 Fetching from "${category.label}" (ID: ${category.id})...`);
      
      try {
        const kkProducts = await fetchProductsFromCategory(
          category.id,
          9 // Fetch 9 (KuantoKusta page size)
        );
        
        if (kkProducts.length > 0) {
          // Shuffle products
          const shuffled = kkProducts.sort(() => Math.random() - 0.5);
          
          // Select unique products only (MAX per category)
          let addedFromCategory = 0;
          for (const kkProduct of shuffled) {
            if (addedFromCategory >= maxProductsPerCategory) break;
            
            // Check if product ID is unique
            if (!seenProductIds.has(kkProduct.productId)) {
              seenProductIds.add(kkProduct.productId);
              const converted = convertToProduct(kkProduct);
              allProducts.push(converted);
              addedFromCategory++;
            }
          }
          
          console.log(`      ✅ Got ${addedFromCategory} unique products`);
        }
      } catch (error) {
        console.error(`      ❌ Error fetching from ${category.label}:`, error);
        // Continue to next category
      }
    }
    
    // Step 4: Shuffle all products and limit to requested count
    const finalProducts = allProducts
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
    
    // Step 5: GARANTIR QUE NÃO HÁ DUPLICATAS (verificação final)
    const uniqueIds = new Set(finalProducts.map(p => p.id));
    if (uniqueIds.size !== finalProducts.length) {
      console.error('⚠️  WARNING: Duplicates detected! Removing...');
      // Remove duplicates by ID
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
    
    console.log(`   ✅ Guaranteed ${finalProducts.length} UNIQUE products (${uniqueIds.size} IDs)`);
    
    // Log category distribution
    const categoryCount: Record<string, number> = {};
    finalProducts.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    });
    console.log('   📊 Category distribution:', categoryCount);
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Fetched ${finalProducts.length} products in ${duration}ms`);
    
    return finalProducts;
    
  } catch (error) {
    console.error('❌ Error fetching from KuantoKusta API:', error);
    throw error;
  }
}

/**
 * Test if KuantoKusta API is accessible
 */
export async function testKuantoKustaAPI(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/categories`);
    return response.ok;
  } catch (error) {
    console.error('❌ KuantoKusta API test failed:', error);
    return false;
  }
}


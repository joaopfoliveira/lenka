/**
 * Temu Product Fetcher
 * Fetches products from Temu's public API
 */

import { Product, ProductCategory } from '../productTypes';

interface TemuProduct {
  goods_id: string;
  goods_name: string;
  image_url: string;
  price_info: {
    price: string | number;
  };
  mall_name?: string;
  // Add more fields as needed
}

interface TemuResponse {
  success: boolean;
  result?: {
    goods_list?: TemuProduct[];
  };
  error_code?: number;
}

/**
 * Map Temu product to generic category
 */
function mapToCategory(productName: string): ProductCategory {
  const name = productName.toLowerCase();
  
  if (name.includes('phone') || name.includes('tablet') || name.includes('electronic')) {
    return 'Eletrónica';
  }
  if (name.includes('shirt') || name.includes('dress') || name.includes('clothes') || name.includes('fashion')) {
    return 'Moda';
  }
  if (name.includes('toy') || name.includes('game') || name.includes('doll')) {
    return 'Brinquedos';
  }
  if (name.includes('book') || name.includes('pen') || name.includes('notebook')) {
    return 'Papelaria';
  }
  if (name.includes('home') || name.includes('kitchen') || name.includes('decor')) {
    return 'Casa';
  }
  
  return 'Outros';
}

/**
 * Convert Temu product to our Product format
 */
function convertToProduct(tProduct: TemuProduct): Product {
  // Extract price (handle both string and number)
  const priceStr = tProduct.price_info?.price || '0';
  const price = typeof priceStr === 'number' ? priceStr : parseFloat(priceStr) || 0;
  
  return {
    id: `temu-${tProduct.goods_id}`,
    name: tProduct.goods_name,
    brand: tProduct.mall_name || 'Temu',
    category: mapToCategory(tProduct.goods_name),
    price: price,
    currency: 'EUR',
    imageUrl: tProduct.image_url || '',
    store: 'Temu',
    storeUrl: `https://www.temu.com/goods-${tProduct.goods_id}.html`,
    description: tProduct.goods_name,
    source: 'temu',
    difficulty: price < 10 ? 'easy' : price < 30 ? 'medium' : 'hard',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fetch random products from Temu
 */
export async function fetchRandomTemuProducts(count: number = 10): Promise<Product[]> {
  try {
    console.log(`🛍️ [TEMU] Fetching ${count} products from Temu API...`);
    
    // Random offset to get variety
    const offset = Math.floor(Math.random() * 50);
    const fetchCount = Math.min(120, count * 3); // Fetch more to filter and select
    
    const url = `https://www.temu.com/pt/api/alexa/homepage/goods_list?offset=${offset}&count=${fetchCount}&list_id=742dd6cb6fa24f2491a75c47fee2f995&listId=742dd6cb6fa24f2491a75c47fee2f995&scene=home&page_list_id=e6074145adb14db191cb4ed3cab8aef5`;
    
    console.log(`🌐 [TEMU] Fetching from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
        'Referer': 'https://www.temu.com/pt/',
        'Origin': 'https://www.temu.com',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error(`❌ [TEMU] API returned ${response.status} ${response.statusText}`);
      return [];
    }

    const data: TemuResponse = await response.json();
    
    if (!data.success || !data.result?.goods_list) {
      console.error(`❌ [TEMU] API error: ${data.error_code || 'Unknown error'}`);
      return [];
    }

    const goodsList = data.result.goods_list;
    console.log(`✅ [TEMU] Got ${goodsList.length} products from API`);

    // Convert and filter products
    const products: Product[] = [];
    const seenIds = new Set<string>();

    for (const tProduct of goodsList) {
      // Skip duplicates
      if (seenIds.has(tProduct.goods_id)) continue;
      
      const converted = convertToProduct(tProduct);
      
      // Only add products with valid price > 0 and image
      if (converted.price > 0 && converted.imageUrl) {
        products.push(converted);
        seenIds.add(tProduct.goods_id);
        
        if (products.length >= count) break;
      }
    }

    console.log(`✅ [TEMU] Returning ${products.length} valid products`);
    
    // Shuffle for variety
    return products.sort(() => Math.random() - 0.5).slice(0, count);

  } catch (error: any) {
    console.error('❌ [TEMU] Error fetching products:', error);
    return [];
  }
}


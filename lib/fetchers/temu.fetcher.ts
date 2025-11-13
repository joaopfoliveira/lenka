/**
 * Temu Product Fetcher
 * Fetches products from Temu's public API
 */

import { Product, ProductCategory } from '../productTypes';

interface TemuProductData {
  goods_id?: string;
  title?: string; // THIS IS THE PRODUCT NAME!
  goods_name?: string; // Fallback
  image?: {
    id?: number;
    url?: string; // THIS IS THE CORRECT IMAGE FIELD!
  };
  image_url?: string; // Fallback
  top_gallery_url?: string; // Fallback
  link_url?: string; // Contains goods_id in URL params
  price_info?: {
    price?: number; // Price in cents!
    price_str?: string;
  };
  mall_name?: string;
}

interface TemuProductItem {
  type: number;
  data: TemuProductData;
}

interface TemuResponse {
  success: boolean;
  result?: {
    home_goods_list?: TemuProductItem[];
  };
  error_code?: number;
}

/**
 * Map Temu product to generic category
 */
function mapToCategory(productName: string): ProductCategory {
  const name = productName.toLowerCase();
  
  if (name.includes('phone') || name.includes('tablet') || name.includes('electronic')) {
    return 'Eletrónicos';
  }
  if (name.includes('shirt') || name.includes('dress') || name.includes('clothes') || name.includes('fashion')) {
    return 'Moda';
  }
  if (name.includes('toy') || name.includes('game') || name.includes('doll')) {
    return 'Brinquedos';
  }
  if (name.includes('book')) {
    return 'Livros';
  }
  if (name.includes('home') || name.includes('kitchen') || name.includes('decor')) {
    return 'Casa & Jardim';
  }
  
  return 'Outros';
}

/**
 * Temu titles often include long descriptors (sizes, bundles, marketing copy).
 * This trims each name down to a friendlier, game-show style label.
 */
function simplifyName(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= 45) {
    return trimmed;
  }

  const separators = [' | ', ' - ', '–', '•', ':', ','];
  for (const separator of separators) {
    if (trimmed.includes(separator)) {
      const candidate = trimmed.split(separator)[0].trim();
      if (candidate.length >= 12 && candidate.length <= 45) {
        return candidate;
      }
    }
  }

  const words = trimmed.split(' ');
  return words.slice(0, 8).join(' ');
}

/**
 * Convert Temu product to our Product format
 */
function convertToProduct(item: TemuProductItem): Product | null {
  const tProduct = item.data;
  
  // Extract goods_id from link_url if not directly available
  let goodsId = tProduct.goods_id;
  if (!goodsId && tProduct.link_url) {
    const match = tProduct.link_url.match(/goods_id=(\d+)/);
    goodsId = match ? match[1] : undefined;
  }
  
  // Extract product name (title is the correct field!)
  const goodsName = tProduct.title || tProduct.goods_name || 'Produto Temu';
  const conciseName = simplifyName(goodsName);
  
  // Price is in CENTS! Divide by 100 to get euros
  const priceCents = tProduct.price_info?.price || 0;
  const priceEuros = priceCents / 100;
  
  // Extract image URL (primary field is data.image.url)
  const imageUrl = tProduct.image?.url || tProduct.top_gallery_url || tProduct.image_url || '';
  
  // Debug logging before validation
  console.log(`🔍 [TEMU] Converting item:`, {
    goodsId: goodsId || 'MISSING',
    goodsName: goodsName.substring(0, 30),
    priceCents,
    priceEuros,
    imageUrl: imageUrl ? imageUrl.substring(0, 50) + '...' : 'MISSING',
    imageSource: tProduct.image?.url ? 'image.url' : tProduct.top_gallery_url ? 'top_gallery_url' : tProduct.image_url ? 'image_url' : 'none',
  });
  
  // Validate minimum required fields
  if (!goodsId) {
    console.log(`⚠️ [TEMU] Rejected: missing goods_id`);
    return null;
  }
  if (priceEuros <= 0) {
    console.log(`⚠️ [TEMU] Rejected: invalid price ${priceEuros}`);
    return null;
  }
  if (!imageUrl) {
    console.log(`⚠️ [TEMU] Rejected: missing image`);
    return null;
  }
  
  // Build correct store URL (API gives us relative path with all tracking params)
  const storeUrl = tProduct.link_url 
    ? `https://www.temu.com/pt/${tProduct.link_url}`
    : `https://www.temu.com/pt/goods-${goodsId}.html`;
  
  return {
    id: `temu-${goodsId}`,
    name: conciseName,
    brand: tProduct.mall_name || 'Temu',
    category: mapToCategory(goodsName),
    price: priceEuros,
    currency: 'EUR',
    imageUrl: imageUrl,
    store: 'Temu',
    storeUrl: storeUrl,
    description: goodsName,
    source: 'temu',
    difficulty: priceEuros < 10 ? 'easy' : priceEuros < 30 ? 'medium' : 'hard',
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
      const errorText = await response.text();
      console.error(`❌ [TEMU] Response body:`, errorText.substring(0, 500));
      return [];
    }

    const data: TemuResponse = await response.json();
    
    console.log(`📋 [TEMU] API Response:`, JSON.stringify(data).substring(0, 300));
    
    if (!data.success || !data.result?.home_goods_list) {
      console.error(`❌ [TEMU] API error: ${data.error_code || 'Unknown error'}`);
      console.error(`❌ [TEMU] Full response:`, JSON.stringify(data));
      return [];
    }

    const homeGoodsList = data.result.home_goods_list;
    console.log(`✅ [TEMU] Got ${homeGoodsList.length} items from API`);

    // Convert and filter products
    const products: Product[] = [];
    const seenIds = new Set<string>();

    for (const item of homeGoodsList) {
      const goodsId = item.data.goods_id || '';
      
      // Skip duplicates
      if (seenIds.has(goodsId)) continue;
      
      const converted = convertToProduct(item);
      
      // Only add valid products (convertToProduct returns null if invalid)
      if (converted) {
        products.push(converted);
        seenIds.add(goodsId);
        
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

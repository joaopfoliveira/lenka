/**
 * Fetch products from SuperSave.pt API
 * Much simpler and more reliable than web scraping!
 */

import { writeFileSync } from 'fs';
import path from 'path';

interface SuperSaveProduct {
  id: number;
  idBaseHiper: number;
  ean: string;
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
  date: string;
  productURL: string;
}

interface Product {
  id: string;
  name: string;
  imageUrl: string;
  store: string;
  price: number;
  category: string;
  brand: string;
}

const CATEGORIES = [
  { name: 'Bebidas', search: 'Refrigerantes', maxProducts: 12 },
  { name: 'Laticínios', search: 'Leite', maxProducts: 12 },
  { name: 'Bolachas', search: 'Bolachas', maxProducts: 12 },
  { name: 'Iogurtes', search: 'Iogurtes', maxProducts: 10 },
  { name: 'Cereais', search: 'Cereais', maxProducts: 8 },
  { name: 'Snacks', search: 'Snacks', maxProducts: 8 },
  { name: 'Padaria', search: 'Padaria', maxProducts: 8 },
];

async function fetchCategory(categoryName: string, searchTerm: string, maxProducts: number): Promise<Product[]> {
  const url = `https://supersave.pt/web/api/newLastStateCall.php?search=${encodeURIComponent(searchTerm)}&category=true`;
  
  console.log(`📦 Fetching ${categoryName} (${searchTerm})...`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://supersave.pt/web/',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      console.error(`   ❌ HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      console.error(`   ❌ Unexpected response structure`);
      return [];
    }

    console.log(`   ✅ Received ${data.products.length} products`);

    const products: Product[] = [];

    for (const rawProduct of data.products) {
      if (products.length >= maxProducts) break;

      // Skip products without name or image
      if (!rawProduct.name || !rawProduct.imageURL) continue;

      // Get the best price from available stores
      const prices: { store: string; price: number; isCampaign: boolean }[] = [];

      // Check each store
      if (rawProduct.pricePerUnitContinente) {
        const normalPrice = parseFloat(rawProduct.pricePerUnitContinente);
        const campaignPrice = rawProduct.priceCampaignContinente ? parseFloat(rawProduct.priceCampaignContinente) : null;
        
        if (!isNaN(normalPrice) && normalPrice > 0) {
          prices.push({
            store: 'Continente',
            price: campaignPrice && campaignPrice < normalPrice ? campaignPrice : normalPrice,
            isCampaign: !!campaignPrice
          });
        }
      }

      if (rawProduct.pricePerUnitPingoDoce) {
        const normalPrice = parseFloat(rawProduct.pricePerUnitPingoDoce);
        const campaignPrice = rawProduct.priceCampaignPingoDoce ? parseFloat(rawProduct.priceCampaignPingoDoce) : null;
        
        if (!isNaN(normalPrice) && normalPrice > 0) {
          prices.push({
            store: 'Pingo Doce',
            price: campaignPrice && campaignPrice < normalPrice ? campaignPrice : normalPrice,
            isCampaign: !!campaignPrice
          });
        }
      }

      if (rawProduct.pricePerUnitAuchan) {
        const normalPrice = parseFloat(rawProduct.pricePerUnitAuchan);
        const campaignPrice = rawProduct.priceCampaignAuchan ? parseFloat(rawProduct.priceCampaignAuchan) : null;
        
        if (!isNaN(normalPrice) && normalPrice > 0) {
          prices.push({
            store: 'Auchan',
            price: campaignPrice && campaignPrice < normalPrice ? campaignPrice : normalPrice,
            isCampaign: !!campaignPrice
          });
        }
      }

      // Skip products with no valid prices
      if (prices.length === 0) continue;

      // Sort by price (lowest first) and pick the cheapest
      prices.sort((a, b) => a.price - b.price);
      const cheapest = prices[0];

      // Skip products that are too cheap or too expensive for the game
      if (cheapest.price < 0.50 || cheapest.price > 20) continue;

      // Validate image URL
      if (!rawProduct.imageURL.startsWith('http')) continue;

      // Clean product name (remove extra details)
      let cleanName = rawProduct.name.trim();
      if (rawProduct.capacity && rawProduct.capacity.trim()) {
        cleanName += ` ${rawProduct.capacity.trim()}`;
      }

      products.push({
        id: `supersave-${rawProduct.id}`,
        name: cleanName,
        imageUrl: rawProduct.imageURL,
        store: cheapest.store,
        price: Math.round(cheapest.price * 100) / 100, // Round to 2 decimals
        category: categoryName,
        brand: rawProduct.marca || 'Unknown',
      });
    }

    console.log(`   ✅ Extracted ${products.length} valid products`);
    return products;

  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return [];
  }
}

async function fetchAllProducts() {
  console.log('🚀 Starting SuperSave.pt product fetch...\n');
  console.log(`📋 Fetching ${CATEGORIES.length} categories\n`);

  const allProducts: Product[] = [];

  for (const category of CATEGORIES) {
    const products = await fetchCategory(category.name, category.search, category.maxProducts);
    allProducts.push(...products);
    
    // Wait between requests to be polite
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Total products fetched: ${allProducts.length}`);

  // Generate the products.ts file
  const outputPath = path.join(__dirname, '..', 'data', 'products.ts');
  
  const fileContent = `// Auto-generated by supersave-fetcher.ts
// Last updated: ${new Date().toISOString()}
// Source: SuperSave.pt API

export type Product = {
  id: string;
  name: string;
  imageUrl: string;
  store: string;
  price: number;
  category?: string;
  brand?: string;
};

const products: Product[] = ${JSON.stringify(allProducts, null, 2)};

export function getRandomProducts(count: number): Product[] {
  const shuffled = [...products].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default products;
`;

  writeFileSync(outputPath, fileContent, 'utf-8');
  console.log(`\n💾 Saved to: ${outputPath}`);

  // Show sample
  console.log(`\n📦 Sample products:`);
  allProducts.slice(0, 5).forEach(p => {
    console.log(`   - ${p.name} (${p.brand}) - €${p.price} @ ${p.store}`);
  });

  console.log('\n🎉 Done!');
}

fetchAllProducts().catch(console.error);


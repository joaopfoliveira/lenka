/**
 * Test SuperSave.pt API Fetcher
 * Run with: npm run test:supersave
 */

import { SupermarketFetcher } from '../lib/fetchers/supermarket.fetcher';

async function test() {
  console.log('🧪 Testing SuperSave.pt API Fetcher\n');
  
  const fetcher = new SupermarketFetcher();
  
  // Test 1: Connection
  console.log('1️⃣ Testing API connection...');
  const isConnected = await fetcher.test();
  
  if (!isConnected) {
    console.error('❌ Could not connect to SuperSave.pt API');
    return;
  }
  
  console.log('✅ API is accessible!\n');
  
  // Test 2: Fetch products
  console.log('2️⃣ Fetching supermarket products...\n');
  
  try {
    const products = await fetcher.fetch({ maxProducts: 20 });
    
    console.log(`\n📦 Got ${products.length} products:\n`);
    
    products.slice(0, 10).forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   💰 Price: €${p.price}`);
      console.log(`   🏷️  Brand: ${p.brand}`);
      console.log(`   📂 Category: ${p.category}`);
      console.log(`   🏪 Store: ${p.store}`);
      console.log('');
    });
    
    // Category breakdown
    const categoryCount: Record<string, number> = {};
    products.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    });
    
    console.log('📊 Products by category:');
    Object.entries(categoryCount).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count}`);
    });
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();


/**
 * Test KuantoKusta API Fetcher
 * Run with: npm run test:api
 */

import { fetchRandomKuantoKustaProductsAPI, testKuantoKustaAPI } from '../lib/fetchers/kuantokusta-api.fetcher';

async function test() {
  console.log('🧪 Testing KuantoKusta API Fetcher\n');
  
  // Test 1: Connection
  console.log('1️⃣ Testing API connection...');
  const isConnected = await testKuantoKustaAPI();
  
  if (!isConnected) {
    console.error('❌ Could not connect to KuantoKusta API');
    return;
  }
  
  console.log('✅ API is accessible!\n');
  
  // Test 2: Fetch products
  console.log('2️⃣ Fetching 10 random products...\n');
  
  try {
    const products = await fetchRandomKuantoKustaProductsAPI(10);
    
    console.log(`\n📦 Got ${products.length} products:\n`);
    
    products.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   💰 Price: €${p.price}`);
      console.log(`   🏷️  Brand: ${p.brand}`);
      console.log(`   📂 Category: ${p.category}`);
      console.log('');
    });
    
    console.log('✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

test();

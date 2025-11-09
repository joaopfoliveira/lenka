/**
 * Test the real SuperSave.pt API endpoints discovered
 */

async function testRealAPI() {
  console.log('🧪 Testing real SuperSave.pt API endpoints\n');

  // Test 1: Promo Feed
  console.log('1️⃣ Testing promoFeedV3.php...\n');
  try {
    const url = 'https://supersave.pt/web/api/promoFeedV3.php?auchan=1&continente=1&intermarche=1&minipreco=1&pingodoce=1';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://supersave.pt/web/',
      }
    });
    
    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Response preview: ${text.substring(0, 500)}\n`);
  } catch (error) {
    console.error('Error:', error);
  }

  // Test 2: Category search (the main one!)
  console.log('\n2️⃣ Testing newLastStateCall.php with different categories...\n');
  
  const categories = [
    { name: 'Bebidas', search: 'Refrigerantes' },
    { name: 'Laticínios', search: 'Leite' },
    { name: 'Bolachas', search: 'Bolachas' },
    { name: 'Iogurtes', search: 'Iogurtes' },
  ];

  for (const cat of categories) {
    try {
      const url = `https://supersave.pt/web/api/newLastStateCall.php?search=${encodeURIComponent(cat.search)}&category=true`;
      console.log(`\n📦 Fetching: ${cat.name} (${cat.search})`);
      console.log(`   URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://supersave.pt/web/',
          'Accept': 'application/json',
        }
      });
      
      const contentType = response.headers.get('content-type');
      console.log(`   Status: ${response.status}, Content-Type: ${contentType}`);
      
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        
        if (data.products && Array.isArray(data.products)) {
          console.log(`   ✅ Found ${data.products.length} products!`);
          
          if (data.products.length > 0) {
            const product = data.products[0];
            console.log(`\n   📦 Sample Product:`);
            console.log(`      Name: ${product.name}`);
            console.log(`      Brand: ${product.marca}`);
            console.log(`      Capacity: ${product.capacity}`);
            console.log(`      EAN: ${product.ean}`);
            console.log(`      ID: ${product.id}`);
            
            // Check prices from different stores
            const prices: any = {};
            if (product.pricePerUnitContinente) prices.Continente = product.pricePerUnitContinente;
            if (product.pricePerUnitPingoDoce) prices.PingoDoce = product.pricePerUnitPingoDoce;
            if (product.pricePerUnitAuchan) prices.Auchan = product.pricePerUnitAuchan;
            if (product.pricePerUnitMinipreco) prices.Minipreco = product.pricePerUnitMinipreco;
            if (product.pricePerUnitIntermarche) prices.Intermarche = product.pricePerUnitIntermarche;
            
            console.log(`      Prices:`, JSON.stringify(prices, null, 2));
            
            // Check for image
            if (product.imageUrl || product.image || product.img) {
              console.log(`      Image: ${product.imageUrl || product.image || product.img}`);
            }
            
            // Show all keys
            console.log(`\n      All keys: ${Object.keys(product).join(', ')}`);
          }
        } else {
          console.log(`   ⚠️ Unexpected response structure:`, JSON.stringify(data).substring(0, 200));
        }
      } else {
        const text = await response.text();
        console.log(`   ❌ Not JSON, got: ${text.substring(0, 200)}`);
      }
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n✅ Testing complete!');
}

testRealAPI().catch(console.error);


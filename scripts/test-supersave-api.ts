/**
 * Test SuperSave.pt API to understand data structure
 */

async function testAPI() {
  const baseUrl = 'https://supersave.pt/web/api';
  
  console.log('🔍 Testing SuperSave.pt API endpoints...\n');

  // Test products endpoint
  console.log('📦 Testing /products endpoint...');
  try {
    const response = await fetch(`${baseUrl}/products`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': '*/*',
        'Referer': 'https://supersave.pt/web/',
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log(`Response length: ${text.length} chars`);
    console.log(`First 1000 chars:\n${text.substring(0, 1000)}\n`);
    
    // Try to parse as JSON
    try {
      const data = JSON.parse(text);
      console.log('✅ Valid JSON!');
      console.log('Keys:', Object.keys(data));
      if (Array.isArray(data)) {
        console.log(`Array with ${data.length} items`);
        if (data.length > 0) {
          console.log('First item:', JSON.stringify(data[0], null, 2));
        }
      } else {
        console.log('Sample data:', JSON.stringify(data, null, 2).substring(0, 500));
      }
    } catch (e) {
      console.log('❌ Not valid JSON, appears to be HTML');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test with query parameters
  console.log('\n\n📦 Testing /products with parameters...');
  const testParams = [
    '?limit=10',
    '?page=1',
    '?category=bebidas',
    '?store=continente',
    '?search=leite',
  ];

  for (const params of testParams) {
    try {
      console.log(`\nTrying: ${baseUrl}/products${params}`);
      const response = await fetch(`${baseUrl}/products${params}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json, */*',
        }
      });
      
      const text = await response.text();
      console.log(`  Status: ${response.status}, Length: ${text.length}`);
      
      try {
        const data = JSON.parse(text);
        console.log(`  ✅ JSON! Keys:`, Object.keys(data));
        if (Array.isArray(data)) {
          console.log(`  Array with ${data.length} items`);
        }
      } catch (e) {
        console.log(`  ❌ HTML response`);
      }
    } catch (error) {
      console.log(`  ❌ Error`);
    }
  }

  // Test categories
  console.log('\n\n📁 Testing /categories endpoint...');
  try {
    const response = await fetch(`${baseUrl}/categories`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    const text = await response.text();
    console.log(`Status: ${response.status}, Length: ${text.length}`);
    
    try {
      const data = JSON.parse(text);
      console.log('✅ Valid JSON!');
      console.log('Data:', JSON.stringify(data, null, 2).substring(0, 500));
    } catch (e) {
      console.log('First 500 chars:', text.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test stores
  console.log('\n\n🏪 Testing /stores endpoint...');
  try {
    const response = await fetch(`${baseUrl}/stores`);
    const text = await response.text();
    console.log(`Status: ${response.status}, Length: ${text.length}`);
    
    try {
      const data = JSON.parse(text);
      console.log('✅ Valid JSON!');
      console.log('Data:', JSON.stringify(data, null, 2).substring(0, 500));
    } catch (e) {
      console.log('First 500 chars:', text.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n\n✅ Testing complete!');
}

testAPI().catch(console.error);


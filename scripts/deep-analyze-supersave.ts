/**
 * Deep analysis of SuperSave.pt to find API endpoints
 */

async function deepAnalyze() {
  console.log('🔍 Deep analysis of SuperSave.pt...\n');

  try {
    // Download the main JS file
    console.log('📥 Downloading main JavaScript bundle...');
    const response = await fetch('https://supersave.pt/web/_nuxt/entry.3449a5bb.js');
    const jsCode = await response.text();
    console.log(`✅ Downloaded ${jsCode.length} characters\n`);

    // Search for API-related patterns
    console.log('🔍 Searching for API patterns...\n');

    // Pattern 1: Look for fetch/axios calls
    const fetchPattern = /(?:fetch|axios\.get|axios\.post)\s*\(\s*[`'"](\/[^`'"]+)[`'"]/g;
    const fetchMatches = [...jsCode.matchAll(fetchPattern)];
    
    if (fetchMatches.length > 0) {
      console.log('✅ Found fetch/axios calls:');
      const uniqueUrls = new Set(fetchMatches.map(m => m[1]));
      Array.from(uniqueUrls).slice(0, 20).forEach(url => {
        console.log(`  ${url}`);
      });
      console.log();
    }

    // Pattern 2: Look for API base URLs
    const baseUrlPattern = /(?:baseURL|apiUrl|API_URL|baseUrl)[:=]\s*[`'"]([^`'"]+)[`'"]/g;
    const baseUrlMatches = [...jsCode.matchAll(baseUrlPattern)];
    
    if (baseUrlMatches.length > 0) {
      console.log('✅ Found base URLs:');
      baseUrlMatches.forEach(m => console.log(`  ${m[1]}`));
      console.log();
    }

    // Pattern 3: Look for endpoint definitions
    const endpointPattern = /['"](\/api\/[^'"]{3,40})['"]/g;
    const endpointMatches = [...jsCode.matchAll(endpointPattern)];
    
    if (endpointMatches.length > 0) {
      console.log('✅ Found API endpoints:');
      const uniqueEndpoints = new Set(endpointMatches.map(m => m[1]));
      Array.from(uniqueEndpoints).forEach(endpoint => {
        console.log(`  ${endpoint}`);
      });
      console.log();
    }

    // Pattern 4: Look for GraphQL or REST endpoints
    const graphqlPattern = /['"](https?:\/\/[^'"]+(?:graphql|api|query)[^'"]*)['"]/g;
    const graphqlMatches = [...jsCode.matchAll(graphqlPattern)];
    
    if (graphqlMatches.length > 0) {
      console.log('✅ Found external API URLs:');
      const uniqueGraphql = new Set(graphqlMatches.map(m => m[1]));
      Array.from(uniqueGraphql).slice(0, 10).forEach(url => {
        console.log(`  ${url}`);
      });
      console.log();
    }

    // Pattern 5: Look for specific methods related to products
    const productMethods = [
      /function\s+(\w*[Pp]roduct\w*)\s*\(/g,
      /const\s+(\w*[Pp]roduct\w*)\s*=/g,
      /(\w*[Ff]etch\w*[Pp]roduct\w*)/g,
      /(\w*[Gg]et\w*[Pp]roduct\w*)/g,
    ];

    console.log('🔍 Looking for product-related functions...\n');
    productMethods.forEach(pattern => {
      const matches = [...jsCode.matchAll(pattern)];
      if (matches.length > 0) {
        const uniqueNames = new Set(matches.map(m => m[1]));
        Array.from(uniqueNames).slice(0, 5).forEach(name => {
          console.log(`  Found: ${name}`);
          
          // Try to find the implementation
          const funcPattern = new RegExp(`${name}[^{]*{([^}]{0,500})`, 's');
          const funcMatch = jsCode.match(funcPattern);
          if (funcMatch) {
            const implementation = funcMatch[1].trim();
            if (implementation.includes('api') || implementation.includes('fetch')) {
              console.log(`    Implementation snippet: ${implementation.substring(0, 200)}...`);
            }
          }
        });
      }
    });

    // Try to actually call the API with different approaches
    console.log('\n\n🧪 Testing different API approaches...\n');

    const testUrls = [
      'https://supersave.pt/api/products',
      'https://supersave.pt/api/v1/products',
      'https://supersave.pt/web/api/v1/products',
      'https://api.supersave.pt/products',
      'https://api.supersave.pt/v1/products',
    ];

    for (const url of testUrls) {
      try {
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            'Origin': 'https://supersave.pt',
            'Referer': 'https://supersave.pt/web/',
          }
        });
        
        const contentType = res.headers.get('content-type') || '';
        const text = await res.text();
        
        console.log(`${url}`);
        console.log(`  Status: ${res.status}, Content-Type: ${contentType}, Length: ${text.length}`);
        
        if (contentType.includes('application/json')) {
          console.log(`  ✅ JSON response!`);
          try {
            const data = JSON.parse(text);
            console.log(`  Sample: ${JSON.stringify(data).substring(0, 200)}`);
          } catch (e) {
            console.log(`  (Could not parse JSON)`);
          }
        }
        console.log();
      } catch (error) {
        console.log(`${url} - ❌ Error\n`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('✅ Deep analysis complete!');
}

deepAnalyze().catch(console.error);


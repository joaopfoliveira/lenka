/**
 * Analyze SuperSave.pt JavaScript to find real API endpoints
 */

async function analyzeJS() {
  console.log('🔍 Analyzing SuperSave.pt JavaScript...\n');

  try {
    // Fetch the main page
    const response = await fetch('https://supersave.pt/web/');
    const html = await response.text();

    console.log(`📄 Page size: ${html.length} characters\n`);

    // Look for script tags
    const scriptMatches = html.match(/<script[^>]*src="([^"]+)"[^>]*>/gi) || [];
    console.log(`📜 Found ${scriptMatches.length} external scripts:\n`);
    
    const scriptUrls: string[] = [];
    scriptMatches.forEach(tag => {
      const match = tag.match(/src="([^"]+)"/);
      if (match) {
        let url = match[1];
        if (url.startsWith('/')) {
          url = `https://supersave.pt${url}`;
        }
        scriptUrls.push(url);
        console.log(`  - ${url}`);
      }
    });

    // Look for inline scripts with API calls
    console.log('\n\n🔍 Searching for API patterns in inline scripts...\n');
    
    const patterns = [
      /fetch\(['"]([^'"]+)['"]/gi,
      /axios\.get\(['"]([^'"]+)['"]/gi,
      /\.get\(['"]([^'"]+)['"]/gi,
      /api[/:]([^\s'"<>]+)/gi,
      /\/api\/[^\s'"<>]+/gi,
    ];

    const foundUrls = new Set<string>();
    
    patterns.forEach(pattern => {
      const matches = html.match(pattern) || [];
      matches.forEach(match => foundUrls.add(match));
    });

    if (foundUrls.size > 0) {
      console.log('✅ Found API-related patterns:');
      Array.from(foundUrls).slice(0, 20).forEach(url => console.log(`  - ${url}`));
    }

    // Download and analyze the first main JS file
    if (scriptUrls.length > 0) {
      console.log('\n\n📥 Analyzing main JavaScript files...\n');
      
      for (const scriptUrl of scriptUrls.slice(0, 3)) {
        try {
          console.log(`\n📜 Fetching: ${scriptUrl}`);
          const jsResponse = await fetch(scriptUrl);
          const jsCode = await jsResponse.text();
          
          console.log(`   Size: ${jsCode.length} characters`);
          
          // Look for API endpoints
          const apiEndpoints = new Set<string>();
          
          // Pattern 1: /api/something
          const apiPattern1 = /['"]\/api\/[^'"]+['"]/gi;
          const matches1 = jsCode.match(apiPattern1) || [];
          matches1.forEach(m => apiEndpoints.add(m.replace(/['"]/g, '')));
          
          // Pattern 2: api/something
          const apiPattern2 = /['"]api\/[^'"]+['"]/gi;
          const matches2 = jsCode.match(apiPattern2) || [];
          matches2.forEach(m => apiEndpoints.add(m.replace(/['"]/g, '')));
          
          // Pattern 3: baseURL or API_URL definitions
          const baseUrlPattern = /(?:baseURL|API_URL|apiUrl):\s*['"]([^'"]+)['"]/gi;
          const baseUrlMatches = [...jsCode.matchAll(baseUrlPattern)];
          if (baseUrlMatches.length > 0) {
            console.log('   ✅ Found base URL definitions:');
            baseUrlMatches.forEach(match => console.log(`      ${match[1]}`));
          }
          
          if (apiEndpoints.size > 0) {
            console.log(`   ✅ Found ${apiEndpoints.size} API endpoints:`);
            Array.from(apiEndpoints).slice(0, 10).forEach(endpoint => {
              console.log(`      ${endpoint}`);
            });
          }
          
          // Look for specific product-related keywords
          if (jsCode.includes('products') || jsCode.includes('items')) {
            console.log('   ✅ Contains product-related code');
          }
          
        } catch (error) {
          console.log(`   ❌ Error fetching script`);
        }
      }
    }

    // Look for window.__INITIAL_STATE__ or similar
    console.log('\n\n🔍 Looking for initial state data...\n');
    const statePatterns = [
      /window\.__INITIAL_STATE__\s*=\s*({[^;]+});/,
      /window\.__PRELOADED_STATE__\s*=\s*({[^;]+});/,
      /__NEXT_DATA__\s*=\s*({[^<]+})/,
    ];

    for (const pattern of statePatterns) {
      const match = html.match(pattern);
      if (match) {
        console.log('✅ Found initial state!');
        console.log('First 500 chars:', match[1].substring(0, 500));
        try {
          const data = JSON.parse(match[1]);
          console.log('Keys:', Object.keys(data));
        } catch (e) {
          console.log('(Could not parse as JSON)');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n\n✅ Analysis complete!');
}

analyzeJS().catch(console.error);


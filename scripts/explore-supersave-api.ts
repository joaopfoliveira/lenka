/**
 * Script to explore SuperSave.pt API endpoints
 * Run with: tsx scripts/explore-supersave-api.ts
 */

async function exploreAPI() {
  console.log('🔍 Exploring SuperSave.pt API...\n');

  const baseUrls = [
    'https://supersave.pt/api',
    'https://api.supersave.pt',
    'https://supersave.pt/web/api',
  ];

  const endpoints = [
    '/products',
    '/items',
    '/search',
    '/categories',
    '/stores',
    '/deals',
    '/offers',
  ];

  // First, let's try to fetch the main page and look for API calls
  try {
    console.log('📡 Fetching main page to analyze...');
    const mainPage = await fetch('https://supersave.pt/web/');
    const html = await mainPage.text();
    
    // Look for API endpoints in the HTML/JS
    const apiMatches = html.match(/https?:\/\/[^"'\s]+api[^"'\s]*/gi) || [];
    const uniqueApis = [...new Set(apiMatches)];
    
    if (uniqueApis.length > 0) {
      console.log('\n✅ Found potential API URLs in page source:');
      uniqueApis.forEach(url => console.log(`  - ${url}`));
    }

    // Look for fetch/axios calls
    const fetchMatches = html.match(/fetch\(['"](\/[^'"]+)['"]\)/gi) || [];
    if (fetchMatches.length > 0) {
      console.log('\n✅ Found fetch calls:');
      fetchMatches.forEach(match => console.log(`  - ${match}`));
    }
  } catch (error) {
    console.error('❌ Error fetching main page:', error);
  }

  // Try common API endpoints
  console.log('\n\n🔍 Testing common API endpoints...\n');
  
  for (const base of baseUrls) {
    for (const endpoint of endpoints) {
      const url = `${base}${endpoint}`;
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
          }
        });
        
        if (response.ok) {
          console.log(`✅ ${response.status} ${url}`);
          const contentType = response.headers.get('content-type');
          console.log(`   Content-Type: ${contentType}`);
          
          if (contentType?.includes('application/json')) {
            try {
              const data = await response.json();
              console.log(`   Sample data:`, JSON.stringify(data).substring(0, 200) + '...');
            } catch (e) {
              console.log('   (Could not parse JSON)');
            }
          }
        } else {
          console.log(`❌ ${response.status} ${url}`);
        }
      } catch (error: any) {
        // Silent fail for network errors
      }
    }
  }

  // Try to fetch robots.txt
  console.log('\n\n🤖 Checking robots.txt...');
  try {
    const robots = await fetch('https://supersave.pt/robots.txt');
    if (robots.ok) {
      const robotsText = await robots.text();
      console.log('\n📄 robots.txt content:');
      console.log(robotsText);
    }
  } catch (error) {
    console.log('❌ Could not fetch robots.txt');
  }

  // Try to fetch sitemap
  console.log('\n\n🗺️  Checking sitemap.xml...');
  try {
    const sitemap = await fetch('https://supersave.pt/sitemap.xml');
    if (sitemap.ok) {
      const sitemapText = await sitemap.text();
      console.log('\n📄 sitemap.xml (first 500 chars):');
      console.log(sitemapText.substring(0, 500));
    }
  } catch (error) {
    console.log('❌ Could not fetch sitemap.xml');
  }

  console.log('\n\n✅ Exploration complete!');
}

exploreAPI().catch(console.error);


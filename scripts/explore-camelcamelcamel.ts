/**
 * Explore CamelCamelCamel.com to find API endpoints
 * CamelCamelCamel tracks Amazon price history
 */

import puppeteer from 'puppeteer';

async function exploreCamelCamelCamel() {
  console.log('🔍 Exploring CamelCamelCamel.com...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Track all API requests
    const apiRequests: any[] = [];
    
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('api') || url.includes('camelcamelcamel') || 
          url.includes('.json') || url.includes('search') || url.includes('product')) {
        apiRequests.push({
          url: url,
          method: request.method(),
          headers: request.headers(),
        });
        console.log(`📡 Request: ${request.method()} ${url}`);
      }
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('api') || url.includes('.json') || url.includes('search') || 
          url.includes('product') || url.includes('camel')) {
        const contentType = response.headers()['content-type'] || '';
        console.log(`📥 Response: ${response.status()} ${url}`);
        
        if (contentType.includes('application/json')) {
          try {
            const json = await response.json();
            console.log(`   ✅ JSON Data:`, JSON.stringify(json).substring(0, 300));
          } catch (e) {
            console.log(`   ❌ Could not parse JSON`);
          }
        }
      }
    });

    // Navigate to Spanish site
    console.log('📄 Navigating to CamelCamelCamel ES...\n');
    await page.goto('https://es.camelcamelcamel.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('\n✅ Page loaded\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to search for a product
    console.log('🔍 Trying to search for products...\n');
    
    // Look for search box
    const searchBox = await page.$('input[type="search"], input[name="sq"], #search-input, .search-input');
    
    if (searchBox) {
      console.log('✅ Found search box, searching for "auriculares"...\n');
      await searchBox.type('auriculares', { delay: 100 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to submit
      await Promise.race([
        searchBox.press('Enter'),
        page.click('button[type="submit"], .search-button')
      ]).catch(() => {});
      
      console.log('⏳ Waiting for results...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Check for product listings
    console.log('📦 Looking for product listings...\n');
    const products = await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="product"], [class*="item"], .row');
      return Array.from(items).slice(0, 10).map(item => ({
        html: item.innerHTML.substring(0, 200),
        text: item.textContent?.trim().substring(0, 100)
      }));
    });

    if (products.length > 0) {
      console.log(`✅ Found ${products.length} potential product elements`);
      products.forEach((p, i) => {
        console.log(`\n  Product ${i + 1}:`);
        console.log(`    Text: ${p.text}`);
      });
    }

    // Look for embedded data
    console.log('\n\n🔍 Looking for embedded data...\n');
    const embeddedData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const dataScripts: any[] = [];
      
      scripts.forEach(script => {
        const content = script.textContent || '';
        if (content.includes('products') || content.includes('items') || 
            content.includes('search') || content.includes('data')) {
          dataScripts.push({
            type: script.type,
            content: content.substring(0, 500)
          });
        }
      });
      
      return dataScripts;
    });

    if (embeddedData.length > 0) {
      console.log('✅ Found embedded data scripts:');
      embeddedData.slice(0, 3).forEach((s, i) => {
        console.log(`\n  Script ${i + 1}:`);
        console.log(`    ${s.content.substring(0, 200)}`);
      });
    }

    // Check page HTML for API endpoints
    const html = await page.content();
    const apiMatches = html.match(/https?:\/\/[^"'\s]+(?:api|search|product)[^"'\s]*/gi) || [];
    const uniqueApis = [...new Set(apiMatches)];
    
    if (uniqueApis.length > 0) {
      console.log('\n\n✅ Found API URLs in HTML:');
      uniqueApis.slice(0, 10).forEach(url => console.log(`  ${url}`));
    }

    console.log('\n\n📋 Summary of API requests:\n');
    if (apiRequests.length > 0) {
      const uniqueUrls = [...new Set(apiRequests.map(r => r.url))];
      uniqueUrls.forEach(url => console.log(`  ${url}`));
    } else {
      console.log('  ❌ No API requests intercepted');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n✅ Exploration complete!');
}

exploreCamelCamelCamel().catch(console.error);


/**
 * Use Puppeteer to intercept real API requests from SuperSave.pt
 */

import puppeteer from 'puppeteer';

async function interceptRequests() {
  console.log('🚀 Launching browser to intercept requests...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Track all requests
    const requests: any[] = [];
    
    page.on('request', (request) => {
      const url = request.url();
      // Only track API-like requests
      if (url.includes('api') || url.includes('graphql') || url.includes('query') || 
          url.includes('.json') || url.includes('products') || url.includes('items')) {
        requests.push({
          url: url,
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
        console.log(`📡 Request: ${request.method()} ${url}`);
      }
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('api') || url.includes('graphql') || url.includes('.json') ||
          url.includes('products') || url.includes('items')) {
        const contentType = response.headers()['content-type'] || '';
        console.log(`📥 Response: ${response.status()} ${contentType} ${url}`);
        
        if (contentType.includes('application/json')) {
          try {
            const json = await response.json();
            console.log(`   ✅ JSON Data (sample):`, JSON.stringify(json).substring(0, 300));
          } catch (e) {
            console.log(`   ❌ Could not parse JSON`);
          }
        }
      }
    });

    console.log('📄 Navigating to SuperSave.pt...\n');
    await page.goto('https://supersave.pt/web/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('\n✅ Page loaded, waiting for additional requests...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to interact with the page
    console.log('🖱️  Trying to find and click on categories or products...\n');
    
    // Look for navigation or product links
    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a'));
      return allLinks.map(link => ({
        href: link.href,
        text: link.textContent?.trim().substring(0, 50)
      })).filter(l => l.href && l.text);
    });

    console.log(`Found ${links.length} links:`);
    links.slice(0, 10).forEach(link => {
      console.log(`  - ${link.text}: ${link.href}`);
    });

    // Try clicking on a product or category if available
    const categoryLink = links.find(l => 
      l.text?.toLowerCase().includes('produto') || 
      l.text?.toLowerCase().includes('categoria') ||
      l.href.includes('category') ||
      l.href.includes('product')
    );

    if (categoryLink) {
      console.log(`\n🖱️  Clicking on: ${categoryLink.text}\n`);
      await page.goto(categoryLink.href, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Check for any data in window object
    console.log('\n🔍 Checking window object for data...\n');
    const windowData = await page.evaluate(() => {
      const keys = Object.keys(window).filter(k => 
        k.includes('data') || k.includes('state') || k.includes('products') ||
        k.includes('api') || k.includes('config')
      );
      
      const result: any = {};
      keys.forEach(key => {
        try {
          const value = (window as any)[key];
          if (value && typeof value === 'object') {
            result[key] = JSON.stringify(value).substring(0, 200);
          }
        } catch (e) {}
      });
      return result;
    });

    if (Object.keys(windowData).length > 0) {
      console.log('✅ Found data in window object:');
      Object.entries(windowData).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }

    console.log('\n\n📋 Summary of API requests found:\n');
    if (requests.length > 0) {
      const uniqueUrls = [...new Set(requests.map(r => r.url))];
      uniqueUrls.forEach(url => {
        console.log(`  ${url}`);
      });
    } else {
      console.log('  ❌ No API requests intercepted');
      console.log('  This suggests the data might be SSR (Server-Side Rendered) in the HTML');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n✅ Analysis complete!');
}

interceptRequests().catch(console.error);


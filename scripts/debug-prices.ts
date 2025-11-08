/**
 * Debug de preços - analisar estrutura de preços (original vs promocional)
 */

import puppeteer from 'puppeteer';

async function debugPrices() {
  console.log('🔍 Debug de preços do Continente...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const testUrl = 'https://www.continente.pt/stores/continente/pt-pt/public/Pages/SearchResults.aspx?k=leite';
    
    console.log('🌐 Acessando:', testUrl);
    await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight || totalHeight >= 2000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Analisar estrutura de preços
    const priceAnalysis = await page.evaluate(() => {
      const tiles = document.querySelectorAll('[data-product-tile-impression]');
      const results: any[] = [];

      for (let i = 0; i < Math.min(5, tiles.length); i++) {
        const tile = tiles[i];
        const dataAttr = tile.getAttribute('data-product-tile-impression');
        if (!dataAttr) continue;

        const productData = JSON.parse(dataAttr);

        // Procurar todos os elementos de preço
        const priceElements = tile.querySelectorAll('.price, .ct-price, [class*="price"]');
        const prices: any[] = [];

        priceElements.forEach((el, idx) => {
          prices.push({
            index: idx,
            class: el.className,
            text: el.textContent?.trim(),
            html: el.innerHTML.substring(0, 200)
          });
        });

        // Procurar imagens
        const images = tile.querySelectorAll('img');
        const imageInfo: any[] = [];

        images.forEach((img, idx) => {
          const src = img.src || img.getAttribute('data-src') || '';
          imageInfo.push({
            index: idx,
            src: src.substring(0, 100),
            alt: img.alt,
            isPvpr: src.includes('pvpr'),
            isBadge: src.includes('badge'),
            isValid: !src.includes('pvpr') && !src.includes('badge') && !src.includes('library')
          });
        });

        results.push({
          name: productData.name,
          priceFromJSON: productData.price,
          brand: productData.brand,
          priceElements: prices,
          images: imageInfo
        });
      }

      return results;
    });

    console.log('\n📊 Análise dos primeiros 5 produtos:\n');
    priceAnalysis.forEach((product, i) => {
      console.log(`\n==== Produto ${i + 1} ====`);
      console.log(`Nome: ${product.name}`);
      console.log(`Marca: ${product.brand}`);
      console.log(`Preço do JSON: €${product.priceFromJSON}`);
      
      console.log('\nPreços encontrados:');
      product.priceElements.forEach((p: any) => {
        console.log(`  [${p.index}] ${p.class}: "${p.text}"`);
      });

      console.log('\nImagens encontradas:');
      product.images.forEach((img: any) => {
        const status = img.isValid ? '✅' : '❌';
        console.log(`  ${status} [${img.index}] ${img.alt || 'sem alt'}`);
        console.log(`      ${img.src}...`);
        if (img.isPvpr) console.log('      ⚠️  É badge PVPR');
      });
    });

    console.log('\n\n✨ Análise concluída!');

  } catch (error) {
    console.error('\n❌ Erro:', error);
  } finally {
    await browser.close();
  }
}

debugPrices().catch(console.error);


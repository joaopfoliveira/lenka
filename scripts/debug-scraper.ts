/**
 * Debug detalhado do scraper
 * Analisa a estrutura HTML dos produtos
 */

import puppeteer from 'puppeteer';

async function debugScraper() {
  console.log('🔍 Debug detalhado do scraper...\n');

  const browser = await puppeteer.launch({
    headless: false, // Abrir browser visível
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

    // Analisar estrutura dos produtos
    const analysis = await page.evaluate(() => {
      const productCards = document.querySelectorAll('.product');
      console.log(`Found ${productCards.length} products`);

      if (productCards.length === 0) return { error: 'No products found' };

      const firstProduct = productCards[0];
      
      // Tentar diferentes seletores para o nome
      const nameSel = [
        '.product-name',
        '.product-title',
        'h3',
        'h4',
        '[data-testid="product-name"]',
        '.ct-tile-title',
        'a[title]'
      ];

      const nameResults = nameSel.map(sel => {
        const el = firstProduct.querySelector(sel);
        return {
          selector: sel,
          found: !!el,
          text: el?.textContent?.trim().substring(0, 50)
        };
      });

      // Tentar diferentes seletores para o preço
      const priceSel = [
        '.product-price',
        '.price',
        '[data-testid="product-price"]',
        '.ct-price-value',
        '.sales',
        '.value'
      ];

      const priceResults = priceSel.map(sel => {
        const el = firstProduct.querySelector(sel);
        return {
          selector: sel,
          found: !!el,
          text: el?.textContent?.trim()
        };
      });

      // Tentar diferentes seletores para a imagem
      const imgEl = firstProduct.querySelector('img');
      const imageInfo = {
        found: !!imgEl,
        src: imgEl?.src,
        dataSrc: imgEl?.getAttribute('data-src'),
        alt: imgEl?.alt
      };

      // HTML do primeiro produto (limitado)
      const html = firstProduct.outerHTML.substring(0, 1000);

      return {
        totalProducts: productCards.length,
        nameResults,
        priceResults,
        imageInfo,
        sampleHTML: html
      };
    });

    console.log('\n📊 Análise dos Produtos:\n');
    console.log(`Total de produtos encontrados: ${analysis.totalProducts || 0}\n`);

    if (analysis.error) {
      console.log('❌', analysis.error);
      return;
    }

    console.log('🏷️  Seletores de NOME:');
    analysis.nameResults.forEach((r: any) => {
      const status = r.found ? '✅' : '❌';
      console.log(`   ${status} ${r.selector}`);
      if (r.text) console.log(`      Texto: "${r.text}"`);
    });

    console.log('\n💰 Seletores de PREÇO:');
    analysis.priceResults.forEach((r: any) => {
      const status = r.found ? '✅' : '❌';
      console.log(`   ${status} ${r.selector}`);
      if (r.text) console.log(`      Texto: "${r.text}"`);
    });

    console.log('\n🖼️  Informação da IMAGEM:');
    console.log(`   Encontrada: ${analysis.imageInfo.found ? '✅' : '❌'}`);
    if (analysis.imageInfo.src) console.log(`   src: ${analysis.imageInfo.src.substring(0, 100)}...`);
    if (analysis.imageInfo.dataSrc) console.log(`   data-src: ${analysis.imageInfo.dataSrc.substring(0, 100)}...`);
    if (analysis.imageInfo.alt) console.log(`   alt: ${analysis.imageInfo.alt}`);

    console.log('\n📝 HTML de Exemplo (primeiros 1000 chars):');
    console.log(analysis.sampleHTML);

    console.log('\n✨ Debug concluído! Browser vai ficar aberto por 30 segundos...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('\n❌ Erro:', error);
  } finally {
    await browser.close();
  }
}

debugScraper().catch(console.error);


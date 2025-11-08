/**
 * Teste rápido do scraper
 * Verifica se conseguimos aceder ao site e extrair dados básicos
 */

import puppeteer from 'puppeteer';

async function testScraper() {
  console.log('🧪 Testando scraper do Continente...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log('🌐 Acessando Continente...');
    const testUrl = 'https://www.continente.pt/stores/continente/pt-pt/public/Pages/SearchResults.aspx?k=leite';
    
    await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Página carregada!');
    console.log('📄 Title:', await page.title());

    // Esperar um pouco
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Tirar screenshot para debug
    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('📸 Screenshot guardado em test-screenshot.png');

    // Tentar encontrar produtos
    const products = await page.evaluate(() => {
      // Vários seletores possíveis
      const selectors = [
        '.product',
        '.product-card',
        '.ct-product-card',
        '[data-testid="product-card"]',
        '.product-tile',
        'article',
        '[class*="product"]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          return {
            selector,
            count: elements.length,
            firstElement: elements[0].outerHTML.substring(0, 200)
          };
        }
      }

      return null;
    });

    if (products) {
      console.log('\n✅ Produtos encontrados!');
      console.log(`   Seletor: ${products.selector}`);
      console.log(`   Quantidade: ${products.count}`);
      console.log(`   Exemplo HTML: ${products.firstElement}...`);
    } else {
      console.log('\n⚠️  Nenhum produto encontrado com os seletores atuais');
      console.log('   Pode ser necessário ajustar os seletores no scraper.ts');
      
      // Guardar HTML para análise
      const html = await page.content();
      const fs = require('fs');
      fs.writeFileSync('test-page.html', html);
      console.log('📄 HTML completo guardado em test-page.html');
    }

    console.log('\n✨ Teste concluído!');

  } catch (error) {
    console.error('\n❌ Erro no teste:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

testScraper().catch(console.error);


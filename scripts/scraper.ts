/**
 * Continente Product Scraper
 * 
 * Este script faz scraping de produtos do site do Continente
 * Guarda produtos com imagens, preços, categorias
 * 
 * IMPORTANTE: Este script é para uso educacional/pessoal apenas
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

interface ScrapedProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  store: string;
  category: string;
  brand?: string;
}

interface CategoryConfig {
  name: string;
  url: string;
  maxProducts: number;
}

// Categorias para fazer scraping
const CATEGORIES: CategoryConfig[] = [
  {
    name: 'Laticínios',
    url: 'https://www.continente.pt/stores/continente/pt-pt/public/Pages/SearchResults.aspx?k=leite',
    maxProducts: 12
  },
  {
    name: 'Snacks',
    url: 'https://www.continente.pt/stores/continente/pt-pt/public/Pages/SearchResults.aspx?k=batatas%20fritas',
    maxProducts: 12
  },
  {
    name: 'Doces',
    url: 'https://www.continente.pt/stores/continente/pt-pt/public/Pages/SearchResults.aspx?k=chocolate',
    maxProducts: 12
  },
  {
    name: 'Bolachas',
    url: 'https://www.continente.pt/stores/continente/pt-pt/public/Pages/SearchResults.aspx?k=bolachas',
    maxProducts: 12
  },
  {
    name: 'Iogurtes',
    url: 'https://www.continente.pt/stores/continente/pt-pt/public/Pages/SearchResults.aspx?k=iogurte',
    maxProducts: 12
  },
  {
    name: 'Refrigerantes',
    url: 'https://www.continente.pt/stores/continente/pt-pt/public/Pages/SearchResults.aspx?k=coca%20cola',
    maxProducts: 12
  }
];

async function scrapeProducts(): Promise<ScrapedProduct[]> {
  console.log('🚀 Iniciando scraping do Continente...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const allProducts: ScrapedProduct[] = [];

  try {
    for (const category of CATEGORIES) {
      console.log(`\n📦 Scraping categoria: ${category.name}`);
      console.log(`🔗 URL: ${category.url}`);

      const page = await browser.newPage();
      
      // Set user agent para parecer um browser real
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      try {
        await page.goto(category.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Esperar um pouco para o conteúdo carregar
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Scroll down para forçar lazy loading
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

        // Esperar produtos carregarem após scroll
        await new Promise(resolve => setTimeout(resolve, 2000));

        // O Continente tem dados estruturados em JSON no atributo data-product-tile-impression
        const products = await page.evaluate((categoryName) => {
          const results: any[] = [];
          
          // Procurar por tiles de produtos que têm o atributo com dados
          const productTiles = document.querySelectorAll('[data-product-tile-impression]');

          productTiles.forEach((tile) => {
            try {
              // Extrair dados JSON do atributo
              const dataAttr = tile.getAttribute('data-product-tile-impression');
              if (!dataAttr) return;

              const productData = JSON.parse(dataAttr);

              // Extrair imagem - procurar pela imagem do produto (não badges)
              const imgElements = tile.querySelectorAll('img');
              let imageUrl = '';
              
              // Procurar a imagem que tem o alt do produto
              for (const img of imgElements) {
                const alt = img.alt || '';
                const src = img.src || img.getAttribute('data-src') || '';
                
                // Verificar se é a imagem do produto (alt contém o nome)
                if (alt && productData.name && alt.toLowerCase().includes(productData.name.toLowerCase().split(' ')[0])) {
                  // E não é um badge
                  if (!src.includes('pvpr') && !src.includes('badge') && !src.includes('library')) {
                    imageUrl = src;
                    break;
                  }
                }
              }
              
              // Se não encontrou pela alt, procurar primeira imagem válida
              if (!imageUrl) {
                for (const img of imgElements) {
                  const src = img.src || img.getAttribute('data-src') || '';
                  if (src && 
                      !src.includes('pvpr') && 
                      !src.includes('badge') && 
                      !src.includes('placeholder') &&
                      !src.includes('library') &&
                      src.includes('/images/col/')) { // URLs de produtos reais têm /images/col/
                    imageUrl = src;
                    break;
                  }
                }
              }
              
              // Se for relative URL, fazer absoluta
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = 'https://www.continente.pt' + imageUrl;
              }

              // Extrair preço (preferir PVP Recomendado se existir)
              let price = parseFloat(productData.price);
              const priceText = tile.textContent || '';
              
              // Procurar por "PVP Recomendado: €X.XX"
              const pvprMatch = priceText.match(/PVP Recomendado:\s*€?(\d+[,.]?\d*)/i);
              if (pvprMatch) {
                const pvprPrice = parseFloat(pvprMatch[1].replace(',', '.'));
                if (!isNaN(pvprPrice) && pvprPrice > 0) {
                  price = pvprPrice; // Usar preço original, não o promocional
                }
              }

              // Validar dados essenciais
              const isValidImage = imageUrl && 
                                   imageUrl.length > 50 && 
                                   !imageUrl.includes('pvpr') && 
                                   !imageUrl.includes('badge');

              if (productData.name && price > 0 && isValidImage) {
                results.push({
                  name: productData.name,
                  price: price,
                  imageUrl: imageUrl,
                  brand: productData.brand || 'Continente',
                  category: categoryName,
                  originalCategory: productData.category
                });
              }
            } catch (e) {
              // Ignorar produtos com erro silenciosamente
            }
          });

          return results;
        }, category.name);

        console.log(`✅ Encontrados ${products.length} produtos em ${category.name}`);

        // Adicionar produtos com IDs únicos
        const categoryProducts = products
          .slice(0, category.maxProducts)
          .map((p, idx) => ({
            id: `${category.name.toLowerCase()}_${idx + 1}_${Date.now()}`,
            name: p.name,
            price: p.price,
            imageUrl: p.imageUrl,
            store: 'Continente',
            category: p.category,
            brand: p.brand
          }));

        allProducts.push(...categoryProducts);

      } catch (error) {
        console.error(`❌ Erro ao fazer scraping de ${category.name}:`, error);
      } finally {
        await page.close();
      }

      // Delay entre categorias para não sobrecarregar o servidor
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } finally {
    await browser.close();
  }

  return allProducts;
}

async function saveProducts(products: ScrapedProduct[]) {
  const dataDir = path.join(__dirname, '..', 'data');
  
  // Criar diretório se não existir
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (e) {
    // Já existe
  }

  // Guardar produtos scraped com timestamp
  const scrapedPath = path.join(dataDir, 'products-scraped.json');
  await fs.writeFile(
    scrapedPath,
    JSON.stringify(products, null, 2),
    'utf-8'
  );

  // Atualizar o ficheiro principal de produtos
  const productsPath = path.join(dataDir, 'products.ts');
  
  const tsContent = `// Auto-generated from scraper
// Last updated: ${new Date().toISOString()}

export type Product = {
  id: string;
  name: string;
  imageUrl: string;
  store: string;
  price: number;
  category?: string;
  brand?: string;
};

export const products: Product[] = ${JSON.stringify(products, null, 2)};

export function getRandomProducts(count: number): Product[] {
  const shuffled = [...products].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, products.length));
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter(p => p.category === category);
}

export const categories = [...new Set(products.map(p => p.category))];
`;

  await fs.writeFile(productsPath, tsContent, 'utf-8');

  console.log(`\n✅ Guardados ${products.length} produtos!`);
  console.log(`📁 Ficheiros criados:`);
  console.log(`   - ${scrapedPath}`);
  console.log(`   - ${productsPath}`);
}

async function main() {
  try {
    console.log('🛒 Continente Product Scraper');
    console.log('================================\n');

    const products = await scrapeProducts();

    if (products.length === 0) {
      console.error('❌ Nenhum produto encontrado!');
      console.error('O site pode ter mudado a estrutura ou estar bloqueado.');
      process.exit(1);
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Total de produtos: ${products.length}`);
    
    const byCategory = products.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`   Por categoria:`);
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`      - ${cat}: ${count}`);
    });

    await saveProducts(products);

    console.log('\n✨ Scraping concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  main();
}

export { scrapeProducts, saveProducts };


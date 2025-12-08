import { ingestScrapedProducts } from '../lib/scraping/ingest';
import { scrapeKuantokusta } from '../lib/scraping/kuantokustaAdapter';
import { scrapeSupermarket } from '../lib/scraping/supermarketAdapter';
// TODO: add adapters for other stores and wire them here

async function main() {
  const store = process.argv[2];
  if (!store) {
    console.error('Usage: tsx scripts/runScrape.ts <storeSlug>');
    process.exit(1);
  }

  if (store === 'kuantokusta') {
    const products = await scrapeKuantokusta(200);
    await ingestScrapedProducts('kuantokusta', 'KuantoKusta', 'marketplace', products);
    console.log('✅ Scrape completed for kuantokusta');
    return;
  }
  if (store === 'supermarket') {
    const products = await scrapeSupermarket(200);
    await ingestScrapedProducts('supermarket', 'Supermarket', 'groceries', products);
    console.log('✅ Scrape completed for supermarket');
    return;
  }

  console.error(`Unsupported store slug: ${store}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

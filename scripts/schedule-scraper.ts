/**
 * Agendador de Scraping Diário
 * 
 * Este script executa o scraper automaticamente todos os dias
 * Para usar em produção com node-cron ou similar
 */

import cron from 'node-cron';
import { scrapeProducts, saveProducts } from './scraper';

console.log('🕐 Iniciando agendador de scraping...');
console.log('⏰ O scraper vai executar todos os dias às 03:00');

// Executar todos os dias às 3h da manhã
cron.schedule('0 3 * * *', async () => {
  console.log('\n🔄 Iniciando scraping agendado...');
  console.log(`📅 Data: ${new Date().toISOString()}`);
  
  try {
    const products = await scrapeProducts();
    await saveProducts(products);
    console.log('✅ Scraping agendado concluído!');
  } catch (error) {
    console.error('❌ Erro no scraping agendado:', error);
    // Aqui podes adicionar notificações (email, slack, etc)
  }
});

// Executar uma vez no início
console.log('🚀 Executando scraping inicial...\n');
(async () => {
  try {
    const products = await scrapeProducts();
    await saveProducts(products);
    console.log('\n✅ Scraping inicial concluído!');
    console.log('⏰ Próxima execução: amanhã às 03:00');
  } catch (error) {
    console.error('❌ Erro no scraping inicial:', error);
  }
})();


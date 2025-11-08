# 🛒 Continente Product Scraper

Sistema de scraping automático de produtos do Continente com imagens, preços e categorias.

## ⚠️ Aviso Legal

**Este scraper é para uso educacional/pessoal apenas.**

- Respeite os Termos de Serviço do Continente
- Não use para fins comerciais
- Não sobrecarregue os servidores (use delays)
- As imagens pertencem ao Continente

## 📦 Instalação

```bash
# Instalar dependências do scraper
npm run setup:scraper

# Ou manualmente:
npm install --save-dev puppeteer @types/puppeteer node-cron @types/node-cron
```

## 🚀 Como Usar

### Scraping Manual (uma vez)

```bash
npm run scrape
```

Isto vai:
1. Abrir um browser headless
2. Visitar categorias do Continente
3. Extrair produtos com imagens, preços, categorias
4. Guardar em `data/products.ts` e `data/products-scraped.json`

### Scraping Automático Diário

```bash
npm run scrape:schedule
```

Isto vai:
- Executar scraping imediatamente
- Agendar scraping diário às 03:00
- Continuar a correr em background

Para usar em produção, recomendo:
- PM2: `pm2 start npm --name "lenka-scraper" -- run scrape:schedule`
- Docker com cron job
- Cloud Functions (AWS Lambda, Google Cloud Functions)

## 📁 Estrutura de Dados

### Produto Scraped

```typescript
{
  id: string;              // ID único gerado
  name: string;            // Nome do produto
  price: number;           // Preço em euros
  imageUrl: string;        // URL da imagem
  store: string;           // "Continente"
  category: string;        // Categoria do produto
  brand?: string;          // Marca (quando disponível)
  scrapedAt: string;       // Timestamp do scraping
}
```

### Categorias Configuradas

Atualmente faz scraping de:
- **Mercearia** (arroz, massas, etc)
- **Laticínios** (leite, queijo, iogurtes)
- **Bebidas** (água, sumos, refrigerantes)
- **Frescos** (queijos frescos, etc)

Para adicionar mais categorias, edita `scripts/scraper.ts`:

```typescript
const CATEGORIES: CategoryConfig[] = [
  {
    name: 'NovaCategoria',
    url: 'https://www.continente.pt/stores/continente/pt-pt/public/Pages/SearchResults.aspx?k=termo',
    maxProducts: 10
  }
];
```

## 🔧 Configuração

### Ajustar Seletores

Se o site mudar, podes precisar atualizar os seletores CSS em `scraper.ts`:

```typescript
// Procurar produtos
const productCards = document.querySelectorAll('.product, .product-card');

// Extrair nome
const nameEl = card.querySelector('.product-name, .product-title');

// Extrair preço
const priceEl = card.querySelector('.product-price, .price');
```

### Delays e Rate Limiting

```typescript
// Delay entre categorias (atualmente 2 segundos)
await new Promise(resolve => setTimeout(resolve, 2000));
```

## 🐛 Troubleshooting

### "Nenhum produto encontrado"

**Possíveis causas:**
1. Site mudou estrutura HTML → Atualizar seletores
2. Cloudflare bloqueou → Usar proxies/user agents diferentes
3. Timeout muito curto → Aumentar `timeout` no `page.goto()`

**Solução debug:**
```typescript
// Em scraper.ts, adicionar screenshots
await page.screenshot({ path: 'debug.png' });

// Ver HTML
const html = await page.content();
console.log(html);
```

### Imagens não carregam

As imagens podem ser lazy-loaded. Adicionar scroll:

```typescript
await page.evaluate(() => {
  window.scrollBy(0, window.innerHeight);
});
await page.waitForTimeout(1000);
```

### Browser crashes

Aumentar memória disponível:

```typescript
const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  headless: true
});
```

## 📊 Monitorização

O scraper gera logs detalhados:

```
🚀 Iniciando scraping do Continente...
📦 Scraping categoria: Mercearia
✅ Encontrados 15 produtos em Mercearia
📊 Resumo:
   Total de produtos: 40
   Por categoria:
      - Mercearia: 10
      - Laticínios: 10
      - Bebidas: 10
      - Frescos: 10
✅ Guardados 40 produtos!
```

## 🔐 Boas Práticas

1. **Rate Limiting**: Não fazer scraping com muita frequência
2. **User Agent**: Usar user agents realistas
3. **Respeito**: Seguir robots.txt e ToS
4. **Cache**: Guardar resultados e só atualizar quando necessário
5. **Erro Handling**: Tratar erros gracefully

## 🚀 Produção

### Docker

```dockerfile
FROM node:20
RUN apt-get update && apt-get install -y chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# ... resto do Dockerfile
```

### PM2 Ecosystem

```javascript
module.exports = {
  apps: [{
    name: 'lenka-scraper',
    script: 'npm',
    args: 'run scrape:schedule',
    cron_restart: '0 3 * * *'  // Reiniciar às 3h
  }]
};
```

### Variáveis de Ambiente

```bash
# .env
SCRAPER_ENABLED=true
SCRAPER_SCHEDULE="0 3 * * *"
SCRAPER_MAX_PRODUCTS=50
SCRAPER_HEADLESS=true
```

## 📈 Melhorias Futuras

- [ ] Suporte para múltiplos supermercados (Pingo Doce, Lidl)
- [ ] Comparação de preços entre lojas
- [ ] Histórico de preços
- [ ] Notificações quando preços descem
- [ ] API REST para aceder aos produtos
- [ ] Dashboard de administração
- [ ] Detecção automática de mudanças no site

## 🤝 Contribuir

Para adicionar novas funcionalidades ao scraper:

1. Testar localmente com `npm run scrape`
2. Verificar qualidade dos dados
3. Adicionar logs apropriados
4. Documentar mudanças

## 📞 Suporte

Se encontrares problemas:
1. Verifica os logs
2. Testa com `headless: false` para ver o browser
3. Captura screenshots para debug
4. Verifica se o site mudou

---

**Lembra-te**: Este é um projeto educacional. Usa com responsabilidade! 🎓


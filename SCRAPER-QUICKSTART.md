# 🚀 Guia Rápido - Scraper do Continente

## Passos para Começar

### 1️⃣ Instalar Dependências do Scraper

```bash
npm install puppeteer @types/puppeteer node-cron @types/node-cron
```

### 2️⃣ Executar Scraping (Primeira Vez)

```bash
npm run scrape
```

**O que acontece:**
- ✅ Abre browser headless
- ✅ Visita 4 categorias do Continente
- ✅ Extrai ~40 produtos com imagens e preços
- ✅ Guarda em `data/products.ts`
- ✅ Atualiza automaticamente o jogo

**Tempo estimado:** 20-30 segundos

### 3️⃣ Ver Resultados

Os produtos são guardados em:
- **`data/products.ts`** - Ficheiro TypeScript usado pelo jogo
- **`data/products-scraped.json`** - Backup em JSON

### 4️⃣ Testar no Jogo

```bash
npm run dev
```

Os produtos scraped já estão no jogo! 🎮

### 5️⃣ Scraping Automático Diário (Opcional)

```bash
npm run scrape:schedule
```

Isto executa o scraper:
- ⏰ Imediatamente (primeira vez)
- ⏰ Todos os dias às 03:00
- ⏰ Mantém produtos sempre atualizados

## 📊 Exemplo de Output

```
🚀 Iniciando scraping do Continente...

📦 Scraping categoria: Mercearia
✅ Encontrados 12 produtos em Mercearia

📦 Scraping categoria: Laticínios
✅ Encontrados 10 produtos em Laticínios

📊 Resumo:
   Total de produtos: 42
   Por categoria:
      - Mercearia: 12
      - Laticínios: 10
      - Bebidas: 10
      - Frescos: 10

✅ Guardados 42 produtos!
📁 Ficheiros criados:
   - data/products-scraped.json
   - data/products.ts

✨ Scraping concluído com sucesso!
```

## ⚙️ Personalizar

### Adicionar Mais Categorias

Edita `scripts/scraper.ts`:

```typescript
const CATEGORIES = [
  {
    name: 'Snacks',
    url: 'https://www.continente.pt/.../SearchResults.aspx?k=snacks',
    maxProducts: 10
  }
];
```

### Mudar Número de Produtos

```typescript
maxProducts: 20  // Em vez de 10
```

## ⚠️ Notas Importantes

1. **Legal**: Uso educacional apenas
2. **Rate Limiting**: Não executar muito frequentemente
3. **Site Mudanças**: Se falhar, pode ser que o site mudou
4. **Imagens**: URLs do Continente (podem expirar)

## 🐛 Se Algo Correr Mal

### Erro: "Nenhum produto encontrado"

```bash
# Tentar com browser visível para debug
# Em scripts/scraper.ts mudar:
headless: false  # Ver o que está a acontecer
```

### Erro: "Browser crashed"

```bash
# Instalar dependências do Chromium (Linux)
sudo apt-get install -y chromium chromium-browser
```

## 🎯 Próximos Passos

1. ✅ Executar `npm run scrape` agora
2. ✅ Ver produtos em `data/products.ts`
3. ✅ Testar jogo com `npm run dev`
4. ✅ (Opcional) Agendar com `npm run scrape:schedule`

---

**Dúvidas?** Consulta `scripts/README-SCRAPER.md` para documentação completa.


#!/bin/bash

# Script para instalar dependências do scraper

echo "📦 Instalando dependências do scraper..."

npm install --save-dev puppeteer @types/puppeteer

echo "✅ Dependências instaladas!"
echo ""
echo "Para executar o scraper:"
echo "  npm run scrape"
echo ""
echo "⚠️  AVISO: Use apenas para fins educacionais/pessoais"


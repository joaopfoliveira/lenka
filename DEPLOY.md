# 🚀 Deploy Guide - Lenka

## Pré-requisitos

- [x] Conta no GitHub
- [x] Conta no Vercel
- [x] Git configurado localmente

## 📋 Passos para Deploy

### 1. Criar Repositório no GitHub

1. Vai a https://github.com/new
2. Nome do repositório: `lenka`
3. Descrição: "Real-time price guessing game - Portuguese supermarket edition"
4. **Público** ou **Privado** (à tua escolha)
5. **NÃO** inicializes com README (já temos um)
6. Clica em "Create repository"

### 2. Conectar Repositório Local ao GitHub

No terminal, executa:

```bash
cd /Users/joao.ferreira.oliveira/Desktop/lenka

# Adicionar remote do GitHub (substitui USERNAME pelo teu)
git remote add origin https://github.com/joaopfoliveira/lenka.git

# Fazer push do código
git branch -M main
git push -u origin main
```

### 3. Deploy no Vercel

#### Opção A: Via Website (Recomendado)

1. Vai a https://vercel.com/
2. Faz login com a tua conta GitHub
3. Clica em "Add New Project"
4. Importa o repositório `joaopfoliveira/lenka`
5. Configuração:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Install Command:** `npm install`
   - **Output Directory:** `.next`

6. **Environment Variables** (IMPORTANTE):
   ```
   NODE_ENV=production
   ```

7. Clica em "Deploy"

#### Opção B: Via CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy para produção
vercel --prod
```

## ⚠️ Notas Importantes sobre Socket.IO

**IMPORTANTE:** Socket.IO no Vercel tem limitações porque o Vercel usa serverless functions.

### Alternativas:

1. **Railway** (Recomendado para Socket.IO)
   - Suporta WebSockets nativamente
   - Deploy: https://railway.app/

2. **Render**
   - Também suporta WebSockets
   - Deploy: https://render.com/

3. **Heroku**
   - Suporte completo para aplicações Node.js
   - Deploy: https://heroku.com/

### Para usar Socket.IO em produção:

```bash
# Exemplo com Railway
railway login
railway init
railway up
```

## 🔧 Configuração Alternativa: Deploy sem Socket.IO

Se quiser fazer deploy simples no Vercel (sem multiplayer real-time):

1. Remove Socket.IO do projeto
2. Converte para polling ao invés de WebSockets
3. Ou usa uma solução de WebSocket externa (Pusher, Ably)

## 📦 Build Local para Testar

Antes de fazer deploy, testa o build local:

```bash
npm run build
npm start
```

Abre http://localhost:3000 e verifica se tudo funciona.

## 🌐 URLs Após Deploy

Depois do deploy, terás:
- **Vercel:** https://lenka.vercel.app (ou domínio personalizado)
- **Railway:** https://lenka-production.up.railway.app
- **Render:** https://lenka.onrender.com

## 🔄 Atualizações Futuras

Sempre que fizeres mudanças:

```bash
git add .
git commit -m "Descrição das mudanças"
git push
```

O Vercel/Railway/Render vai fazer deploy automático! 🚀

## 🐛 Troubleshooting

### Socket.IO não funciona no Vercel
- **Solução:** Usa Railway, Render ou Heroku para Socket.IO

### Build falha
- Verifica os logs no dashboard do Vercel
- Confirma que todas as dependências estão no `package.json`

### Produtos não aparecem
- Verifica se `data/products.ts` está no repositório
- Os produtos são estáticos, não precisa de scraping em produção

## 📞 Suporte

Para problemas:
1. Verifica os logs de deploy
2. Testa localmente primeiro
3. Verifica as variáveis de ambiente

---

**Recomendação:** Para uma experiência completa de multiplayer, usa **Railway** ou **Render** em vez do Vercel.


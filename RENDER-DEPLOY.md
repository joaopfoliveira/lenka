# 🚀 Deploy no Render (100% Grátis)

## ✅ Por Que Render?

- ✅ **Totalmente grátis** (sem cartão necessário)
- ✅ **Socket.IO funciona** perfeitamente
- ✅ **Setup em 5 minutos**
- ✅ **Deploy automático** via GitHub

## 📋 Passo a Passo

### 1️⃣ Criar Conta no Render

1. Vai a https://render.com
2. Clica em **"Get Started"**
3. **Sign up with GitHub** (mais fácil)
4. Autoriza o Render a aceder ao GitHub

### 2️⃣ Criar Web Service

1. No dashboard, clica em **"New +"**
2. Seleciona **"Web Service"**
3. Conecta o repositório:
   - Clica em **"Connect account"** se necessário
   - Encontra: `joaopfoliveira/lenka`
   - Clica em **"Connect"**

### 3️⃣ Configurar o Service

**Configuração:**
```
Name: lenka
Region: Frankfurt (ou outra próxima de Portugal)
Branch: main
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
Plan: Free
```

**Environment Variables:**
```
NODE_ENV = production
```

### 4️⃣ Deploy!

1. Clica em **"Create Web Service"**
2. Aguarda 2-3 minutos (build + deploy)
3. ✅ Pronto! URL: `https://lenka.onrender.com`

## 🔄 Atualizações Automáticas

Sempre que fizeres `git push` no GitHub:
- Render detecta automaticamente
- Faz rebuild e redeploy
- ✨ Zero configuração!

## ⚠️ Nota: Hibernação

**O que acontece:**
- Após 15 minutos sem atividade → hiberna
- Primeira visita → espera ~30s para "acordar"
- Depois funciona normal

**Não é problema para:**
- Jogos casuais ✅
- Testes e demos ✅
- Portfolio ✅

**Solução (opcional):**
Podes usar um serviço de "ping" para manter ativo:
- https://cron-job.org (grátis)
- Faz ping a cada 10 minutos

## 🎮 Testar o Jogo

Depois do deploy:

1. Abre: `https://lenka.onrender.com`
2. Cria um lobby
3. Abre em outra aba/dispositivo
4. Joga multiplayer! 🎉

## 📊 Monitorizar

No dashboard do Render podes ver:
- Logs em tempo real
- Uso de recursos
- Histórico de deploys
- Métricas

## 🐛 Troubleshooting

### Build falha
```bash
# Testa localmente primeiro:
npm run build
npm start
```

### Socket.IO não conecta
- Verifica os logs no dashboard
- Confirma que `server.ts` está a correr
- Verifica variáveis de ambiente

### App hiberna muito
- Considera usar cron-job.org para ping
- Ou upgrade para plano pago ($7/mês - sem hibernação)

## 💰 Upgrade (Opcional)

Se o jogo ficar popular e quiseres remover hibernação:

**Plano Starter: $7/mês**
- Sem hibernação
- Mais recursos
- Deploy priority

Mas para começar, **FREE é perfeito!** ✨

## 🎉 Pronto!

Agora tens o Lenka online, grátis, com multiplayer funcionando!

**URL do jogo:** `https://lenka.onrender.com` (ou custom domain se configurares)

---

**Dúvidas?** Consulta: https://render.com/docs


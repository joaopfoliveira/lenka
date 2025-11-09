# Lenka - Real-Time Price Guessing Game

A multiplayer browser game inspired by "The Price Is Right", built with Next.js and Socket.IO.

## 🎮 About

Lenka is a real-time multiplayer game where players compete to guess the prices of Portuguese supermarket products. Players join lobbies, guess prices, and earn points based on accuracy. The player with the highest score after all rounds wins!

## 🚀 Tech Stack

- **Next.js 14+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Socket.IO** (real-time communication)
- **Node.js** (custom server)
- **In-memory storage** (no database required)

## 📦 Installation

1. Make sure you have Node.js 18+ installed

2. Install dependencies:
```bash
npm install
```

## 🏃 Running the Game

Start the development server:

```bash
npm run dev
```

The game will be available at `http://localhost:3000`

To test multiplayer functionality, open multiple browser tabs or windows to the same URL.

## 🎯 How to Play

### Creating a Lobby

1. Go to `http://localhost:3000`
2. Click "Create Lobby"
3. Enter your name
4. Select number of rounds (5, 8, or 10)
5. Click "Create & Join"
6. Share the lobby code with friends

### Joining a Lobby

1. Go to `http://localhost:3000`
2. Click "Join Lobby"
3. Enter your name
4. Enter the lobby code
5. Click "Join Lobby"

### Playing the Game

1. The host starts the game when all players are ready
2. Each round shows a product with its name, image, and store
3. Players have 15 seconds to guess the price in euros (€)
4. Submit your guess before time runs out
5. After all players submit (or time expires), results are shown:
   - Real price is revealed
   - Points are awarded based on accuracy
   - Current leaderboard is displayed
6. After all rounds, the final winner is announced

### Scoring System

Points are calculated using the formula:
```
difference = |guess - realPrice|
points = max(0, 1000 - difference × 400)
```

The closer your guess, the more points you earn!

## 📁 Project Structure

```
lenka/
├── app/
│   ├── page.tsx                 # Homepage (create/join lobby)
│   ├── lobby/[code]/page.tsx    # Lobby and game screen
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── lib/
│   ├── gameManager.ts           # Server-side game logic
│   └── socketClient.ts          # Socket.IO client utilities
├── lib/
│   ├── productTypes.ts          # Generic product types & utilities
│   └── fetchers/
│       ├── index.ts             # Fetcher registry
│       ├── supermarket.fetcher.ts # SuperSave.pt API
│       └── amazon.fetcher.ts    # Amazon products
├── data/
│   ├── products.ts              # Product database (auto-generated)
│   └── products-scraped.json    # Backup JSON
├── scripts/
│   ├── fetch-all-products.ts    # Main: Fetch ALL sources
│   ├── supersave-fetcher.ts     # SuperSave.pt only
│   └── explore-*.ts             # API exploration tools
├── server.ts                    # Custom Socket.IO server
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── README.md
├── SCRAPER-QUICKSTART.md        # Quick start guide
└── SCRAPER-IMPLEMENTADO.md      # Implementation details
```

## 🎮 Game Features

- ✅ Create and join private lobbies
- ✅ Real-time player synchronization
- ✅ **90+ products from multiple sources** (Supermarket + Amazon + more!)
- ✅ **Real product images and prices** from multiple stores
- ✅ **Supermarket products** (70): Continente, Pingo Doce, Auchan via SuperSave.pt API
- ✅ **Amazon products** (20): Electronics, books, toys, home & more
- ✅ **16 product categories** - from €0.59 to €199.99
- ✅ **Difficulty tiers** - Easy, Medium, Hard based on price
- ✅ Countdown timer per round
- ✅ Live scoring and leaderboards
- ✅ Automatic round progression
- ✅ Final results and rankings
- ✅ Play again functionality
- ✅ Responsive design (desktop + mobile optimized)
- ✅ **Extensible architecture** - easy to add new product sources!

## 🔧 Development

### Building for Production

```bash
npm run build
npm start
```

### Updating Products

The game uses **products from multiple sources** with a generic, extensible architecture.

**Fetch ALL products (Supermarket + Amazon + more):**
```bash
npm run fetch:products
```

This will fetch:
- **70 Supermarket products** (Continente, Pingo Doce, Auchan) via SuperSave.pt API
- **20 Amazon products** (Electronics, books, toys, home goods, etc.)
- Total: **90 products** across **16 categories**
- Price range: €0.59 - €199.99

**Fetch specific source only:**
```bash
# Supermarket only
npm run fetch:supermarket
```

**See documentation:**
- [MULTI-SOURCE-PRODUCTS.md](./MULTI-SOURCE-PRODUCTS.md) - **Multi-source architecture guide**
- [SUPERSAVE-API.md](./SUPERSAVE-API.md) - SuperSave.pt API documentation

**Adding new product sources:**
The architecture makes it easy to add new sources (cars, real estate, more stores, etc.). See `MULTI-SOURCE-PRODUCTS.md` for details.
- `SCRAPER-IMPLEMENTADO.md` - Full implementation details
- `scripts/README-SCRAPER.md` - Technical documentation

### Cleaning Up

The game automatically removes inactive lobbies after 1 hour.

## 🎨 UI/UX Features

- Clean, centered card layout
- Gradient backgrounds for different game states
- Real-time player status indicators
- Visual countdown timer
- Color-coded leaderboard (gold, silver, bronze)
- Responsive design for all screen sizes

## 📝 Game Rules

- **Waiting Room**: Players can join until the host starts the game
- **Game Start**: Cannot join once the game has started
- **Guessing**: 15 seconds per round
- **Scoring**: More accurate guesses earn more points
- **Winning**: Player with highest total score wins
- **Host Powers**: Can start game and initiate "Play Again"

## 🐛 Troubleshooting

**Socket connection issues?**
- Make sure port 3000 is available
- Try restarting the development server

**Players not seeing updates?**
- Check browser console for errors
- Ensure Socket.IO connection is established

**Lobby not found?**
- Lobby codes are case-sensitive
- Lobbies expire after 1 hour of inactivity

## 📄 License

This project is for educational and demonstration purposes.

## 🚀 Deploy

### Quick Deploy Steps

1. **Create GitHub Repository:**
   ```bash
   # Go to https://github.com/new
   # Create repository: lenka
   ```

2. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/joaopfoliveira/lenka.git
   git push -u origin main
   ```

3. **Deploy Options:**

   **Railway (Recommended for Socket.IO):**
   - Visit https://railway.app/
   - Import GitHub repository
   - Deploy automatically

   **Vercel (Limited Socket.IO support):**
   - Visit https://vercel.com/
   - Import GitHub repository
   - Note: WebSockets have limitations on Vercel

   **Render:**
   - Visit https://render.com/
   - Full Socket.IO support

📖 **Full deploy guide:** See [DEPLOY.md](./DEPLOY.md)

## 🎉 Enjoy Playing Lenka!

Have fun guessing prices and competing with friends!


# Multi-Source Product System

## Overview

Lenka now supports products from **multiple sources**, not just supermarkets! This creates much more variety and interesting gameplay.

## 🎯 Current Sources

### 1. Supermarket (SuperSave.pt API)
- **70 products** from Portuguese supermarkets
- Stores: Continente, Pingo Doce, Auchan
- Categories: Bebidas, Laticínios, Bolachas, Iogurtes, Cereais, Snacks, Padaria
- Price range: €0.50 - €20
- **Real-time prices** via API

### 2. Amazon ES (Curated)
- **20 curated products** from Amazon España
- Categories: Eletrónicos, Livros, Brinquedos, Casa & Jardim, Desporto, Beleza, Moda, Ferramentas, Informática
- Price range: €10 - €200
- **Realistic prices** based on Amazon ES

## 📦 Total: 90 Products

- Average price: **€12.70**
- Price range: **€0.59 - €199.99**
- **16 different categories**

## 🏗️ Architecture

### Generic Product Model

All products follow a unified interface defined in `lib/productTypes.ts`:

```typescript
interface Product {
  id: string;              // Format: "source-originalId"
  source: ProductSource;   // 'supermarket' | 'amazon' | ...
  name: string;
  brand?: string;
  category: ProductCategory;
  price: number;           // in EUR
  imageUrl: string;
  store?: string;          // Store/seller name
  difficulty?: 'easy' | 'medium' | 'hard';
  // ... more fields
}
```

### Product Fetchers

Each source implements the `ProductFetcher` interface:

```typescript
interface ProductFetcher {
  source: ProductSource;
  name: string;
  fetch(options?: FetcherOptions): Promise<Product[]>;
  test(): Promise<boolean>;
}
```

**Current fetchers:**
- `SupermarketFetcher` - SuperSave.pt API
- `AmazonFetcher` - Curated Amazon products

**Future fetchers:**
- `AutomotiveFetcher` - Car prices
- `RealEstateFetcher` - Property prices
- `ElectronicsFetcher` - Worten, FNAC, etc.

## 🚀 Usage

### Fetch All Products

```bash
npm run fetch:products
```

This will:
1. Fetch from all available sources
2. Combine into single product list
3. Generate `data/products.ts`
4. Show statistics and samples

### Fetch Specific Source

```bash
# Supermarket only
npm run fetch:supermarket
```

### Programmatic Usage

```typescript
import { fetchers } from './lib/fetchers';

// Fetch from specific source
const supermarketFetcher = fetchers.find(f => f.source === 'supermarket');
const products = await supermarketFetcher.fetch({
  maxProducts: 50,
  minPrice: 1,
  maxPrice: 50,
});

// Filter products
import { filterProducts } from './lib/productTypes';

const cheapProducts = filterProducts(products, {
  maxPrice: 10,
  difficulty: ['easy'],
});

const electronicProducts = filterProducts(products, {
  sources: ['amazon'],
  categories: ['Eletrónicos'],
});
```

## 📁 File Structure

```
lib/
├── productTypes.ts              # Generic types & utilities
└── fetchers/
    ├── index.ts                 # Fetcher registry
    ├── supermarket.fetcher.ts   # SuperSave.pt
    └── amazon.fetcher.ts        # Amazon ES

scripts/
├── fetch-all-products.ts        # Main fetcher (ALL sources)
└── supersave-fetcher.ts         # Legacy (supermarket only)

data/
└── products.ts                  # Generated product list
```

## 🔮 Adding New Sources

### 1. Create Fetcher

Create `lib/fetchers/yoursource.fetcher.ts`:

```typescript
import { Product, ProductFetcher, FetcherOptions } from '../productTypes';

export class YourSourceFetcher implements ProductFetcher {
  source = 'yoursource' as const;
  name = 'Your Source Name';

  async fetch(options?: FetcherOptions): Promise<Product[]> {
    // Fetch products from your source
    // Transform to Product[] format
    // Return products
  }

  async test(): Promise<boolean> {
    // Test if source is accessible
  }
}
```

### 2. Register Fetcher

Add to `lib/fetchers/index.ts`:

```typescript
import { YourSourceFetcher } from './yoursource.fetcher';

export const fetchers: ProductFetcher[] = [
  new SupermarketFetcher(),
  new AmazonFetcher(),
  new YourSourceFetcher(),  // Add here
];
```

### 3. Add Product Source Type

Add to `lib/productTypes.ts`:

```typescript
export type ProductSource = 
  | 'supermarket'
  | 'amazon'
  | 'yoursource'    // Add here
  | ...
```

### 4. Fetch Products

```bash
npm run fetch:products
```

Done! Your products will be automatically included.

## 🎮 Game Compatibility

The game automatically works with products from **any source**. The scoring system, display, and gameplay are source-agnostic.

**Price difficulty classification:**
- **Easy**: €0.50 - €5 (common items)
- **Medium**: €5 - €50 (moderate items)
- **Hard**: €50+ (expensive items)

## 📊 Product Statistics

Current distribution:

| Category | Products | Source |
|----------|----------|--------|
| Bebidas | 10 | Supermarket |
| Laticínios | 10 | Supermarket |
| Bolachas | 10 | Supermarket |
| Iogurtes | 10 | Supermarket |
| Cereais | 10 | Supermarket |
| Snacks | 10 | Supermarket |
| Padaria | 10 | Supermarket |
| Eletrónicos | 3 | Amazon |
| Casa & Jardim | 3 | Amazon |
| Informática | 2 | Amazon |
| Livros | 2 | Amazon |
| Brinquedos | 2 | Amazon |
| Desporto | 2 | Amazon |
| Beleza | 2 | Amazon |
| Moda | 2 | Amazon |
| Ferramentas | 2 | Amazon |

## 🔄 Future Plans

### Phase 1: More Amazon Products ✅
- Currently: 20 curated products
- Goal: 50+ products
- Method: Consider Amazon Product Advertising API integration

### Phase 2: More Portuguese Stores
- Worten (electronics)
- FNAC (books, electronics)
- Decathlon (sports)
- IKEA (furniture)

### Phase 3: Automotive
- Standvirtual / OLX
- Real car prices
- Different difficulty tier

### Phase 4: Real Estate
- Idealista
- Property prices
- Ultra-hard difficulty

### Phase 5: API Integrations
- Real-time Amazon API
- Store APIs
- Dynamic pricing

## 🔒 Data Quality

All products must meet these criteria:
- Valid price (>€0.50, <€500)
- Valid image URL
- Clear product name
- Source attribution
- Category classification

Products are automatically validated and filtered during fetch.

## ⚙️ Configuration

Edit `scripts/fetch-all-products.ts` to configure:

```typescript
const products = await fetcher.fetch({
  maxProducts: 70,        // Max products per source
  minPrice: 0.5,          // Minimum price
  maxPrice: 300,          // Maximum price
  categories: [...],      // Filter categories
});
```

## 🐛 Troubleshooting

**Products not showing in game:**
- Run `npm run fetch:products`
- Check `data/products.ts` was generated
- Restart the server

**Wrong prices:**
- SuperSave API is real-time, prices may vary
- Amazon prices are curated (static)
- Re-fetch to update

**Missing images:**
- Check product `imageUrl` is valid
- Some stores may block external image access
- Consider using CDN/proxy

## 📖 API Reference

See `lib/productTypes.ts` for full type definitions and utilities.


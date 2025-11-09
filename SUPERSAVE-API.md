# SuperSave.pt API Documentation

## Overview

SuperSave.pt provides a simple JSON API to fetch product data from multiple Portuguese supermarkets (Continente, Pingo Doce, Auchan, Minipreço, Intermarché).

This is **much better** than web scraping:
- ✅ Fast and reliable
- ✅ Clean JSON responses
- ✅ Multiple stores in one call
- ✅ Campaign/promotional prices included
- ✅ Product images included

## Main Endpoint

### Get Products by Category

**URL**: `https://supersave.pt/web/api/newLastStateCall.php`

**Method**: `GET`

**Parameters**:
- `search` - Category or search term (e.g., "Refrigerantes", "Leite", "Bolachas")
- `category` - Set to `true` for category searches

**Example**:
```bash
curl "https://supersave.pt/web/api/newLastStateCall.php?search=Bolachas&category=true"
```

## Response Format

```json
{
  "products": [
    {
      "id": 17270358,
      "idBaseHiper": 1,
      "ean": "5600744051013",
      "name": "Bolachas Belgas",
      "marca": "Saborosa",
      "capacity": "0.22 Kg",
      "pricePerUnitContinente": "1.99",
      "priceCampaignContinente": "",
      "pricePerUnitPingoDoce": "1.99",
      "priceCampaignPingoDoce": "",
      "pricePerUnitAuchan": "1.99",
      "priceCampaignAuchan": "",
      "imageURL": "https://...",
      "date": "2025-11-09",
      "productURL": "https://..."
    }
  ]
}
```

## Fields

- `id` - Unique product ID
- `name` - Product name
- `marca` - Brand name
- `capacity` - Product capacity/size
- `ean` - European Article Number (barcode)
- `pricePerUnit[Store]` - Regular price at each store
- `priceCampaign[Store]` - Campaign/promotional price (if active)
- `imageURL` - Direct URL to product image
- `productURL` - Link to product page
- `date` - Last update date

## Stores Available

- **Continente** - `pricePerUnitContinente`, `priceCampaignContinente`
- **Pingo Doce** - `pricePerUnitPingoDoce`, `priceCampaignPingoDoce`
- **Auchan** - `pricePerUnitAuchan`, `priceCampaignAuchan`
- **Minipreço** - Fields available (not always populated)
- **Intermarché** - Fields available (not always populated)

## Usage in Lenka

Run the fetcher to update product data:

```bash
npm run fetch:products
```

This will:
1. Fetch products from 7 categories
2. Extract ~70 products with valid prices and images
3. Select the cheapest price per product across all stores
4. Filter products between €0.50-€20 (ideal for game)
5. Generate `data/products.ts` with formatted data

## Categories Used

1. **Bebidas** (Refrigerantes) - 12 products
2. **Laticínios** (Leite) - 12 products
3. **Bolachas** - 12 products
4. **Iogurtes** - 10 products
5. **Cereais** - 8 products
6. **Snacks** - 8 products
7. **Padaria** - 8 products

Total: **~70 products**

## Rate Limiting

Be respectful:
- Wait 1 second between category requests
- Don't fetch more than necessary
- The API returns up to 200 products per category

## Alternative Endpoints

### Promotional Feed

**URL**: `https://supersave.pt/web/api/promoFeedV3.php`

**Parameters**:
- `auchan=1`
- `continente=1`
- `intermarche=1`
- `minipreco=1`
- `pingodoce=1`

Returns products currently on promotion across all selected stores.

## Notes

- Prices are in EUR (€)
- Image URLs are hosted on store CDNs (mostly Intermarché)
- Campaign prices (when available) are usually lower than regular prices
- Not all products have prices in all stores
- Data is updated regularly by SuperSave.pt


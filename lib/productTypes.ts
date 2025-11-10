/**
 * Generic Product Model
 * Supports multiple product sources: supermarket, Amazon, cars, electronics, etc.
 */

// Product source types
export type ProductSource = 
  | 'supermarket'   // SuperSave API (Continente, Pingo Doce, Auchan)
  | 'kuantokusta'   // KuantoKusta API (multiple stores)
  | 'amazon'        // Amazon products
  | 'marketplace'   // Generic marketplace
  | 'automotive'    // Cars, motorcycles
  | 'real-estate'   // Houses, apartments
  | 'electronics'   // Tech products
  | 'fashion'       // Clothing, accessories
  | 'other';

// Main product categories
export type ProductCategory =
  // Supermarket
  | 'Bebidas' | 'Laticínios' | 'Bolachas' | 'Iogurtes' | 'Cereais' | 'Snacks' | 'Padaria'
  // Amazon / General
  | 'Eletrónicos' | 'Livros' | 'Brinquedos' | 'Desporto' | 'Casa & Jardim' 
  | 'Moda' | 'Beleza' | 'Automóvel' | 'Ferramentas' | 'Informática'
  // Future
  | 'Carros' | 'Imobiliário' | 'Outros';

/**
 * Generic Product Interface
 * Works for ANY type of product from ANY source
 */
export interface Product {
  // Core identifiers
  id: string;                    // Unique ID (format: "source-originalId")
  source: ProductSource;         // Where the product comes from
  
  // Basic info
  name: string;                  // Product name
  brand?: string;                // Brand/manufacturer
  category: ProductCategory;     // Product category
  
  // Price (in EUR)
  price: number;                 // Current price in euros
  originalPrice?: number;        // Original price (if on sale)
  currency?: string;             // Default: 'EUR'
  
  // Visual
  imageUrl: string;              // Product image URL
  
  // Vendor info
  store?: string;                // Store/seller name (e.g., "Continente", "Amazon")
  storeUrl?: string;             // Link to product page
  
  // Additional details (optional)
  description?: string;          // Short description
  capacity?: string;             // Size/capacity (e.g., "1L", "500g")
  unit?: string;                 // Unit of measure (e.g., "kg", "L", "un")
  
  // Metadata
  ean?: string;                  // Barcode/EAN
  asin?: string;                 // Amazon Standard Identification Number
  sku?: string;                  // Stock Keeping Unit
  
  // Price context
  priceHistory?: {
    date: string;
    price: number;
  }[];
  
  // Game-specific
  difficulty?: 'easy' | 'medium' | 'hard';  // How hard to guess
  minPrice?: number;             // Minimum price range for validation
  maxPrice?: number;             // Maximum price range for validation
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Product Fetcher Interface
 * Each source (SuperSave, Amazon, etc.) implements this
 */
export interface ProductFetcher {
  source: ProductSource;
  name: string;
  
  /**
   * Fetch products from this source
   * @param options - Fetcher-specific options
   * @returns Array of products
   */
  fetch(options?: FetcherOptions): Promise<Product[]>;
  
  /**
   * Test if the fetcher is working
   */
  test(): Promise<boolean>;
}

export interface FetcherOptions {
  categories?: ProductCategory[];
  maxProducts?: number;
  minPrice?: number;
  maxPrice?: number;
  [key: string]: any;  // Allow custom options
}

/**
 * Product Collection
 * Manages products from multiple sources
 */
export interface ProductCollection {
  products: Product[];
  sources: {
    [key in ProductSource]?: {
      count: number;
      lastUpdated: string;
    };
  };
  metadata: {
    totalProducts: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
    categories: { [key: string]: number };
  };
}

/**
 * Utility: Create product ID from source and original ID
 */
export function createProductId(source: ProductSource, originalId: string | number): string {
  return `${source}-${originalId}`;
}

/**
 * Utility: Validate product price for game
 */
export function isValidGamePrice(price: number): boolean {
  return price >= 0.50 && price <= 500;  // €0.50 to €500
}

/**
 * Utility: Calculate price difficulty
 */
export function calculateDifficulty(price: number): 'easy' | 'medium' | 'hard' {
  if (price < 5) return 'easy';       // €0.50 - €5: Easy (common items)
  if (price < 50) return 'medium';    // €5 - €50: Medium (moderate items)
  return 'hard';                       // €50+: Hard (expensive items)
}

/**
 * Utility: Format price for display
 */
export function formatPrice(price: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

/**
 * Utility: Get random products from collection
 */
export function getRandomProducts(products: Product[], count: number): Product[] {
  const shuffled = [...products].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Utility: Filter products by criteria
 */
export function filterProducts(
  products: Product[],
  criteria: {
    sources?: ProductSource[];
    categories?: ProductCategory[];
    minPrice?: number;
    maxPrice?: number;
    difficulty?: ('easy' | 'medium' | 'hard')[];
  }
): Product[] {
  return products.filter(product => {
    if (criteria.sources && !criteria.sources.includes(product.source)) return false;
    if (criteria.categories && !criteria.categories.includes(product.category)) return false;
    if (criteria.minPrice && product.price < criteria.minPrice) return false;
    if (criteria.maxPrice && product.price > criteria.maxPrice) return false;
    if (criteria.difficulty && product.difficulty && !criteria.difficulty.includes(product.difficulty)) return false;
    return true;
  });
}


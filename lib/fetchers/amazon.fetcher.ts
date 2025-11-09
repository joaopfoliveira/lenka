/**
 * Amazon Product Fetcher
 * 
 * Since Amazon/CamelCamelCamel APIs are restricted,
 * this uses a curated list of popular Amazon ES products
 * with realistic prices for the game.
 * 
 * Future: Can be extended with real API when available
 */

import {
  Product,
  ProductFetcher,
  FetcherOptions,
  ProductCategory,
  createProductId,
  calculateDifficulty,
} from '../productTypes';

/**
 * Curated list of popular Amazon ES products
 * Prices are realistic based on Amazon ES (as of November 2025)
 */
const AMAZON_PRODUCTS_CATALOG: Omit<Product, 'id' | 'source' | 'difficulty' | 'updatedAt'>[] = [
  // Eletrónicos
  {
    name: 'Fire TV Stick 4K',
    brand: 'Amazon',
    category: 'Eletrónicos',
    price: 49.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/51MSD32mZNL._AC_SL1000_.jpg',
    store: 'Amazon ES',
    description: 'Streaming media player',
  },
  {
    name: 'Echo Dot (5ª Generación)',
    brand: 'Amazon',
    category: 'Eletrónicos',
    price: 59.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/71RzKRu0EuL._AC_SL1000_.jpg',
    store: 'Amazon ES',
    description: 'Altavoz inteligente con Alexa',
  },
  {
    name: 'Auriculares Bluetooth JBL Tune 510BT',
    brand: 'JBL',
    category: 'Eletrónicos',
    price: 29.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/61nDjVSU+rL._AC_SL1500_.jpg',
    store: 'Amazon ES',
    description: 'Auriculares inalámbricos',
  },
  {
    name: 'Ratón Inalámbrico Logitech M185',
    brand: 'Logitech',
    category: 'Informática',
    price: 12.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/51z57s8U+xL._AC_SL1200_.jpg',
    store: 'Amazon ES',
  },
  {
    name: 'Teclado Mecánico Gaming RGB',
    brand: 'Redragon',
    category: 'Informática',
    price: 45.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/71qtgvhRHJL._AC_SL1500_.jpg',
    store: 'Amazon ES',
  },
  
  // Livros
  {
    name: 'Harry Potter y la Piedra Filosofal',
    brand: 'J.K. Rowling',
    category: 'Livros',
    price: 12.30,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/81Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
  {
    name: 'El Principito - Edición Ilustrada',
    brand: 'Antoine de Saint-Exupéry',
    category: 'Livros',
    price: 9.95,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/71Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
  
  // Brinquedos
  {
    name: 'LEGO Classic Caja de Ladrillos Creativos',
    brand: 'LEGO',
    category: 'Brinquedos',
    price: 34.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/71Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
    description: '484 piezas',
  },
  {
    name: 'Cubo de Rubik Original 3x3',
    brand: 'Rubik',
    category: 'Brinquedos',
    price: 14.95,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/61s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
  
  // Casa & Jardim
  {
    name: 'Juego de Sartenes Antiadherentes (3 piezas)',
    brand: 'Tefal',
    category: 'Casa & Jardim',
    price: 54.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/71s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
  {
    name: 'Set de 12 Toallas de Algodón',
    brand: 'AmazonBasics',
    category: 'Casa & Jardim',
    price: 29.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/81s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
  {
    name: 'Aspiradora Robot iRobot Roomba 692',
    brand: 'iRobot',
    category: 'Casa & Jardim',
    price: 199.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/61s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
  
  // Desporto
  {
    name: 'Esterilla de Yoga Antideslizante',
    brand: 'ATIVAFIT',
    category: 'Desporto',
    price: 24.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/71s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
  {
    name: 'Mancuernas Ajustables 20kg (Par)',
    brand: 'Bowflex',
    category: 'Desporto',
    price: 89.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/61s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
  
  // Beleza
  {
    name: 'Plancha de Pelo Cerámica',
    brand: 'Remington',
    category: 'Beleza',
    price: 34.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/71s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
  {
    name: 'Set de Brochas de Maquillaje (12 piezas)',
    brand: 'USpicy',
    category: 'Beleza',
    price: 15.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/81s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },

  // Moda
  {
    name: 'Zapatillas Running Nike Revolution 6',
    brand: 'Nike',
    category: 'Moda',
    price: 64.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/71s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
  {
    name: 'Mochila para Portátil 15.6"',
    brand: 'KONO',
    category: 'Moda',
    price: 27.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/81s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },

  // Ferramentas
  {
    name: 'Taladro Atornillador Bosch 18V',
    brand: 'Bosch',
    category: 'Ferramentas',
    price: 129.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/71s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
  {
    name: 'Set de Destornilladores (25 piezas)',
    brand: 'Stanley',
    category: 'Ferramentas',
    price: 22.99,
    currency: 'EUR',
    imageUrl: 'https://m.media-amazon.com/images/I/81s1Ui5AYF8AL._SL1500_.jpg',
    store: 'Amazon ES',
  },
];

export class AmazonFetcher implements ProductFetcher {
  source = 'amazon' as const;
  name = 'Amazon ES (Curated Products)';

  async fetch(options?: FetcherOptions): Promise<Product[]> {
    const {
      categories,
      maxProducts = 50,
      minPrice = 5,
      maxPrice = 300,
    } = options || {};

    console.log(`🛍️ Loading Amazon products...`);

    let products = AMAZON_PRODUCTS_CATALOG
      .filter(p => p.price >= minPrice && p.price <= maxPrice)
      .filter(p => !categories || categories.includes(p.category))
      .map((p, index) => ({
        ...p,
        id: createProductId('amazon', `amz-${index}`),
        source: 'amazon' as const,
        difficulty: calculateDifficulty(p.price),
        updatedAt: new Date().toISOString(),
      }));

    if (maxProducts) {
      products = products.slice(0, maxProducts);
    }

    console.log(`✅ Loaded ${products.length} Amazon products`);
    return products;
  }

  async test(): Promise<boolean> {
    return true; // Always works (static data)
  }
}

/**
 * TODO: Future enhancement
 * 
 * Integrate with real Amazon Product Advertising API:
 * - Register for Amazon Associates program
 * - Get API credentials
 * - Use paapi5-nodejs-sdk
 * 
 * Or use third-party services:
 * - Rainforest API (https://www.rainforestapi.com/)
 * - ScraperAPI with Amazon integration
 * - Oxylabs Real-Time Crawler
 */


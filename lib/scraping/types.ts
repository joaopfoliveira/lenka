export interface ScrapedProduct {
  externalId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  productUrl?: string;
  priceCents: number;
  currency: string;
  categorySlugs: string[];
  raw?: any;
}

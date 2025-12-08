import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['query', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export function productsKey(storeSlug: string, categorySlug: string) {
  return `products:store=${storeSlug}:cat=${categorySlug}`;
}

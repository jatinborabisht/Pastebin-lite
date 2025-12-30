import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Vercel Postgres uses POSTGRES_PRISMA_URL or POSTGRES_URL
  // Fall back to DATABASE_URL for local development
  const connectionString = 
    process.env.POSTGRES_PRISMA_URL || 
    process.env.POSTGRES_URL || 
    process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('Database connection string not found. Set POSTGRES_PRISMA_URL, POSTGRES_URL, or DATABASE_URL');
  }

  const adapter = new PrismaNeon({ connectionString });
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

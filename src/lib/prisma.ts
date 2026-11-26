// src/lib/prisma.ts
// Koneksi Prisma Client singleton — Prisma 7 dengan driver adapter PostgreSQL
// DATABASE_URL diambil dari environment (disuntikkan oleh Docker Compose).

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Type untuk menampung instance Prisma (untuk singleton di Edge Runtime)
type PrismaClientType = PrismaClient;

// Membuat instance Prisma client singleton
let prisma: PrismaClientType | null = null;

// Fungsi untuk mendapatkan instance Prisma (singleton)
function getPrisma() {
  if (!prisma) {
    // Prisma 7 mewajibkan driver adapter (mis. PrismaPg) untuk PostgreSQL.
    const connectionString = process.env.DATABASE_URL;
    const adapter = new PrismaPg({ connectionString });
    prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });
  }
  return prisma;
}

// Ekspor client Prisma untuk digunakan di seluruh aplikasi
export default getPrisma;

// Helper untuk menutup koneksi Prisma (seperti di app router edge)
export async function disconnectPrisma() {
  const client = getPrisma();
  if (client && client.$disconnect) {
    await client.$disconnect();
  }
}

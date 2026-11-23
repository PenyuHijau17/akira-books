// src/lib/prisma.ts
// Koneksi Prisma Client singleton — kompatibel dengan Prisma 7 &
// prisma7.config.ts (datasource URL diambil dari config, bukan schema)

// Import PrismaClient dari Prisma v7
import { PrismaClient } from '@prisma/client';

// Type untuk menampung instance Prisma (untuk singleton di Edge Runtime)
type PrismaClient = ReturnType<typeof import('../prisma/schema').default>;

// Membuat instance Prisma client singleton
let prisma: PrismaClient | null = null;

// Fungsi untuk mendapatkan instance Prisma (singleton)
function getPrisma() {
  if (!prisma) {
    // Import dinamis untuk menghindari init ganda di Edge Functions
    // dan sesuai dengan cara Prisma 7 diasuransi di prisma7.config.ts
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient({
      // Log level bisa disesuaikan: 'query', 'error', 'warn', 'info'
      log: ['error', 'warn'],
    });
  }
  return prisma;
}

// Ekspor client Prisma untuk digunakan di seluruh aplikasi
export default getPrisma;

// Ekspor helper untuk migration/setup
export { PrismaClient };

// Helper untuk menutup koneksi Prisma (seperti di app router edge)
export async function disconnectPrisma() {
  const client = getPrisma();
  if (client && client.$disconnect) {
    await client.$disconnect();
  }
}
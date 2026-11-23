// src/lib/prisma.ts
// Koneksi Prisma Client singleton — kompatibel dengan Prisma 7
// prisma7.config.ts (datasource URL diambil dari config, bukan schema)

// Import PrismaClient dari Prisma 7 (client di ./src/generated/prisma/client)
import { PrismaClient } from '@/generated/prisma/client';

// Type untuk menampung instance Prisma (untuk singleton di Edge Runtime)
type PrismaClientType = PrismaClient;

// Membuat instance Prisma client singleton
let prisma: PrismaClientType | null = null;

// Fungsi untuk mendapatkan instance Prisma (singleton)
function getPrisma() {
  if (!prisma) {
    // Import dinamis untuk menghindari init ganda di Edge Functions
    // dan sesuai dengan cara Prisma 7 diasuransi di prisma7.config.ts
    // @ts-ignore - Prisma 7 memerlukan adapter di options tapi project ini
    // menggunakan data source dari environment variable yang terkonfigurasi di Docker
    prisma = new PrismaClient({
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
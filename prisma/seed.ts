// prisma/seed.ts
// Script seed untuk membuat akun Admin Utama awal dan recovery code.
// Dijalankan via: docker compose exec app npx tsx prisma/seed.ts

import 'dotenv/config';
import crypto from 'crypto';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Format hash harus sama dengan verifikasi di src/app/api/auth/route.ts: "<salt>:<hash>"
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

async function main() {
  console.log('=== Memulai seeding akun awal ===\n');

  // Cek apakah sudah ada Admin Utama
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN_UTAMA' },
  });

  if (existingAdmin) {
    console.log('Admin Utama sudah ada, lewati pembuatan akun.');
  } else {
    const adminEmail = 'admin@akirabooks.id';
    const adminPassword = 'admin123';

    // Buat akun Admin Utama pertama
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashPassword(adminPassword),
        name: 'Admin Utama',
        role: 'ADMIN_UTAMA',
        isActive: true,
      },
    });

    console.log(`✓ Akun Admin Utama dibuat: ${admin.email}`);
    console.log(`   Kata sandi awal : ${adminPassword}`);

    // Buat recovery code untuk Admin Utama
    const recoveryCode = Math.floor(100000 + Math.random() * 899999).toString();

    // Hash recovery code sebelum disimpan
    const recoveryCodeHash = crypto
      .createHash('sha256')
      .update(recoveryCode)
      .digest('hex');

    // Simpan recovery code di tabel OtpAndRecoveryToken
    await prisma.otpAndRecoveryToken.create({
      data: {
        userId: admin.id,
        codeHash: recoveryCodeHash,
        type: 'RECOVERY_ADMIN',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 hari
        failedAttempts: 0,
        userUserId: admin.id,
      },
    });

    console.log('✓ Recovery code dibuat dan disimpan (valid 30 hari)');
    console.log(
      '⚠️  Simpan recovery code ini di lokasi aman (hanya ditampilkan sekali):',
    );
    console.log(`   Recovery Code: ${recoveryCode}`);
  }

  // Seed akun Admin Biasa untuk pengujian alur banner
  const existingAdminBiasa = await prisma.user.findFirst({
    where: { role: 'ADMIN_BIASA' },
  });

  if (!existingAdminBiasa) {
    const biasa = await prisma.user.create({
      data: {
        email: 'adminbiasa@akirabooks.id',
        passwordHash: hashPassword('adminbiasa123'),
        name: 'Admin Biasa',
        role: 'ADMIN_BIASA',
        isActive: true,
      },
    });
    console.log(`✓ Akun Admin Biasa dibuat: ${biasa.email}`);
    console.log('   Kata sandi awal : adminbiasa123');
  }

  const userCount = await prisma.user.count();
  console.log(`\nTotal user di database: ${userCount}`);
  console.log('\n=== Seeding selesai ===');
}

main()
  .catch((e) => {
    console.error('Error selama seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

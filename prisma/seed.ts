// prisma/seed.ts
// Script seed untuk membuat akun Admin Utama awal dan recovery code
// Dijalankan via: docker compose exec app npx tsx prisma/seed.ts

// Import PrismaClient dengan konfigurasi dari environment
require('dotenv').config({
  path: '.env',
});

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  // Konfigurasi dari .env: postgresql://akira_books:akira_books_dev_only@localhost:5433/akira_books?schema=public
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log('=== Memulai seeding akun awal ===\n');

  // Cek apakah sudah ada user
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN_UTAMA' },
  });

  if (existingAdmin) {
    console.log('Admin Utama sudah ada, lewati pembuatan akun.');
  } else {
    // Generate salt dan hash sandi menggunakan scrypt
    const crypto = require('crypto');

    const generateAdminSandi = () => {
      const salt = crypto.randomBytes(16).toString('hex');
      const derivedKey = crypto.scryptSync('admin123', salt, 64, { n: 16384, r: 8, p: 1 });
      return {
        hash: derivedKey.toString('hex'),
        salt,
      };
    };

    const { hash: sandiHash, salt: sandiSalt } = generateAdminSandi();

    // Buat akun Admin Utama pertama
    const admin = await prisma.user.create({
      data: {
        email: 'admin@akirabooks.id',
        passwordHash: sandiHash,
        name: 'Admin Utama',
        role: 'ADMIN_UTAMA',
        isActive: true,
      },
    });

    console.log(`✓ Akun Admin Utama dibuat: ${admin.email}`);

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
      },
    });

    console.log('✓ Recovery code dibuat dan disimpan (30 hari validity)');
    console.log(
      '⚠️  Simpan recovery code ini dalam keadaan terenkripsi di lokasi yang aman:',
    );
    console.log(`   Recovery Code: ${recoveryCode}`);
    console.log(
      '   (Gunakan untuk pemulihan akun Admin Utama jika lupa kata sandi)',
    );
  }

  // Catat informasi penting
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
-- AlterTable
-- Tanggal daftar akun dipakai panel Kelola Pengguna (Admin Utama).
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

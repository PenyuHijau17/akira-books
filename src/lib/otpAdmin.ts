// src/lib/otpAdmin.ts
// OTP sekali pakai untuk tindakan sensitif pengelolaan akun admin (FR-ACC-004/007).
// Dipakai bersama oleh /api/admin dan /api/admin/pengguna agar aturan masa
// berlaku, percobaan gagal, dan anti-replay tidak berbeda antar endpoint.

import type { Prisma, PrismaClient } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { generateOTP, hashToken, kirimEmailKeTerminal } from '@/lib/auth'

export const MASA_BERLAKU_OTP = 5 * 60 * 1000
export const MAKS_GAGAL_OTP = 5

type KlienOtp = PrismaClient | Prisma.TransactionClient

/**
 * Konsumsi OTP di dalam transaksi yang sama dengan perubahan akun.
 * Mengembalikan false bila kode salah/kedaluwarsa; percobaan gagal tetap
 * tercatat agar pembatasan MAKS_GAGAL_OTP berlaku.
 */
export async function konsumsiOtpAdmin(
  userId: string,
  otp: string,
  client: KlienOtp,
  sekarang: Date = new Date()
): Promise<boolean> {
  const rekaman = await client.otpAndRecoveryToken.findFirst({
    where: {
      userId,
      type: 'OTP_ADMIN',
      usedAt: null,
      expiresAt: { gt: sekarang },
    },
    orderBy: { expiresAt: 'desc' },
  })

  if (!rekaman || rekaman.codeHash !== hashToken(String(otp || ''))) {
    if (rekaman) {
      const gagalKe = rekaman.failedAttempts + 1
      await client.otpAndRecoveryToken.update({
        where: { id: rekaman.id },
        data: {
          failedAttempts: gagalKe,
          ...(gagalKe >= MAKS_GAGAL_OTP ? { usedAt: sekarang } : {}),
        },
      })
    }
    return false
  }

  const dikonsumsi = await client.otpAndRecoveryToken.updateMany({
    where: { id: rekaman.id, usedAt: null },
    data: { usedAt: sekarang },
  })
  return dikonsumsi.count === 1
}

/** Terbitkan OTP baru hanya bila tidak ada OTP aktif yang masih berlaku. */
export async function mintaOtpAdmin(
  userId: string,
  email: string,
  client: KlienOtp = prisma(),
  sekarang: Date = new Date()
): Promise<{ ok: boolean; pesan: string; status: number }> {
  const aktif = await client.otpAndRecoveryToken.findFirst({
    where: {
      userId,
      type: 'OTP_ADMIN',
      usedAt: null,
      expiresAt: { gt: sekarang },
    },
    orderBy: { expiresAt: 'desc' },
  })

  if (aktif && aktif.expiresAt.getTime() - sekarang.getTime() > 60_000) {
    return {
      ok: false,
      pesan: 'OTP masih berlaku. Tunggu maksimal 1 menit sebelum meminta ulang.',
      status: 429,
    }
  }

  const otp = generateOTP()
  await client.otpAndRecoveryToken.create({
    data: {
      userId,
      userUserId: userId,
      codeHash: hashToken(otp),
      type: 'OTP_ADMIN',
      failedAttempts: 0,
      expiresAt: new Date(sekarang.getTime() + MASA_BERLAKU_OTP),
    },
  })
  kirimEmailKeTerminal(
    email,
    'OTP Pengelolaan Akun Admin Akira Books',
    `Kode OTP: ${otp}. Berlaku 5 menit. Jangan bagikan kepada pihak lain.`
  )

  return {
    ok: true,
    pesan: 'OTP dikirim ke terminal server dan berlaku selama 5 menit.',
    status: 200,
  }
}

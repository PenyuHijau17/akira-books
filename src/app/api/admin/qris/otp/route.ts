// src/app/api/admin/qris/otp/route.ts
// OTP tindakan sensitif untuk penggantian QRIS (FR-PAY-001).
// Sesuai OD-04, OTP dikirim ke terminal server (abstraksi email), bukan layanan eksternal.

import { NextResponse } from 'next/server'
import { generateOTP, getSessionUser, hashToken, kirimEmailKeTerminal } from '@/lib/auth'
import prisma from '@/lib/prisma'

const MASA_BERLAKU_OTP = 5 * 60 * 1000

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
    }
    if (user.role !== 'ADMIN_UTAMA') {
      return NextResponse.json({ error: 'Hanya Admin Utama yang dapat meminta OTP ini' }, { status: 403 })
    }

    const sekarang = new Date()
    const otpAktif = await prisma().otpAndRecoveryToken.findFirst({
      where: {
        userId: user.id,
        type: 'OTP_SENSITIF',
        usedAt: null,
        expiresAt: { gt: sekarang },
      },
      orderBy: { expiresAt: 'desc' },
    })
    if (otpAktif && otpAktif.expiresAt.getTime() - sekarang.getTime() > 60_000) {
      return NextResponse.json(
        { error: 'OTP masih berlaku. Tunggu maksimal 1 menit sebelum meminta ulang.' },
        { status: 429 }
      )
    }

    const otp = generateOTP()
    await prisma().otpAndRecoveryToken.create({
      data: {
        userId: user.id,
        userUserId: user.id,
        codeHash: hashToken(otp),
        type: 'OTP_SENSITIF',
        failedAttempts: 0,
        expiresAt: new Date(sekarang.getTime() + MASA_BERLAKU_OTP),
      },
    })

    kirimEmailKeTerminal(
      user.email,
      'OTP Penggantian QRIS Toko',
      `Kode OTP: ${otp}. Berlaku 5 menit. Jangan bagikan kepada pihak lain.`
    )

    return NextResponse.json({
      success: true,
      pesan: 'OTP dikirim ke terminal server dan berlaku selama 5 menit.',
    })
  } catch (error: any) {
    console.error('API POST /api/admin/qris/otp error:', error)
    return NextResponse.json(
      { error: error?.message || 'Gagal mengirim OTP' },
      { status: 500 }
    )
  }
}

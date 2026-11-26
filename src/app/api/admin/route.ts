// src/app/api/admin/route.ts
// API Endpoint Pengelolaan Akun Admin/Customer
// GR-02, GR-04, GR-06, BR-005: otorisasi server-side, Admin Utama tunggal, audit append-only.
// FR-ACC-004, FR-ACC-005, FR-ACC-007: OTP untuk tindakan sensitif & alasan wajib saat menonaktifkan.

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  generateOTP,
  getSessionUser,
  hashPassword,
  hashToken,
  kirimEmailKeTerminal,
} from '@/lib/auth'
import { catatAudit } from '@/lib/pembayaranServer'

const MASA_BERLAKU_OTP = 5 * 60 * 1000
const MAKS_GAGAL_OTP = 5
const AKSI_VALID = [
  'minta-otp',
  'disable-user',
  'enable-user',
  'create-admin-biasa',
  'delete-admin-biasa',
]

function gagal(pesan: string, status: number) {
  return NextResponse.json({ success: false, error: pesan }, { status })
}

/** OTP sekali pakai untuk pengelolaan akun admin (terpisah dari OTP QRIS/backup). */
async function konsumsiOtpAdmin(
  userId: string,
  otp: string,
  client: any,
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

// GET: daftar user berdasarkan peran — otorisasi server-side (GR-02).
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return gagal('Hanya admin yang dapat melihat daftar akun', 403)
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const where: any = {}
    if (role) where.role = role

    const users = await prisma().user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
      orderBy: { email: 'asc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('API GET /api/admin error:', error)
    return gagal('Gagal memuat daftar akun', 500)
  }
}

// POST: operasi pengelolaan akun — otorisasi server-side (GR-02).
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
      return gagal('Hanya admin yang dapat mengelola akun', 403)
    }

    const body = await request.json().catch(() => null)
    const action = String(body?.action || '')

    if (!AKSI_VALID.includes(action)) {
      return gagal('Aksi tidak valid', 400)
    }

    // Permintaan OTP hanya untuk Admin Utama (FR-ACC-004, FR-ACC-007).
    if (action === 'minta-otp') {
      if (user.role !== 'ADMIN_UTAMA') {
        return gagal('Hanya Admin Utama yang dapat meminta OTP ini', 403)
      }
      const sekarang = new Date()
      const aktif = await prisma().otpAndRecoveryToken.findFirst({
        where: {
          userId: user.id,
          type: 'OTP_ADMIN',
          usedAt: null,
          expiresAt: { gt: sekarang },
        },
        orderBy: { expiresAt: 'desc' },
      })
      if (aktif && aktif.expiresAt.getTime() - sekarang.getTime() > 60_000) {
        return gagal('OTP masih berlaku. Tunggu maksimal 1 menit sebelum meminta ulang.', 429)
      }

      const otp = generateOTP()
      await prisma().otpAndRecoveryToken.create({
        data: {
          userId: user.id,
          userUserId: user.id,
          codeHash: hashToken(otp),
          type: 'OTP_ADMIN',
          failedAttempts: 0,
          expiresAt: new Date(sekarang.getTime() + MASA_BERLAKU_OTP),
        },
      })
      kirimEmailKeTerminal(
        user.email,
        'OTP Pengelolaan Akun Admin Akira Books',
        `Kode OTP: ${otp}. Berlaku 5 menit. Jangan bagikan kepada pihak lain.`
      )
      return NextResponse.json({
        success: true,
        pesan: 'OTP dikirim ke terminal server dan berlaku selama 5 menit.',
      })
    }

    const otp = String(body?.otp || '')
    let butuhOtp =
      action === 'create-admin-biasa' || action === 'delete-admin-biasa'

    // Nonaktifkan/aktifkan Customer: Admin Biasa atau Admin Utama.
    // Nonaktifkan/aktifkan Admin Biasa: Admin Utama + OTP.
    const targetUserId = String(body?.targetUserId || '')
    let targetUser: any = null
    if (action !== 'create-admin-biasa') {
      if (!targetUserId) return gagal('targetUserId wajib diisi', 400)
      targetUser = await prisma().user.findUnique({ where: { id: targetUserId } })
      if (!targetUser) return gagal('User tidak ditemukan', 404)
      if (targetUser.role === 'ADMIN_UTAMA') {
        return gagal('Akun Admin Utama tidak dapat diubah melalui endpoint ini', 403)
      }
      if (targetUser.role === 'ADMIN_BIASA') butuhOtp = true
    }

    if (butuhOtp) {
      if (user.role !== 'ADMIN_UTAMA') {
        return gagal('Hanya Admin Utama yang dapat mengelola akun admin', 403)
      }
      if (!/^\d{6}$/.test(otp)) {
        return gagal('OTP 6 digit wajib diisi', 400)
      }
      const sah = await prisma().$transaction(async (tx: any) =>
        konsumsiOtpAdmin(user.id, otp, tx)
      )
      if (!sah) return gagal('OTP tidak valid atau sudah kedaluarsa', 401)
    }

    const reason = String(body?.reason || '').trim()

    if (action === 'disable-user' || action === 'enable-user') {
      if (action === 'disable-user' && !reason) {
        return gagal('Alasan penonaktifan wajib diisi', 400)
      }
      const baruAktif = action === 'enable-user'

      // FR-ACC-007: sesi aktif langsung dicabut saat akun dinonaktifkan.
      const hasil = await prisma().$transaction(async (tx: any) => {
        const diperbarui = await tx.user.update({
          where: { id: targetUserId },
          data: {
            isActive: baruAktif,
            deactivationReason: baruAktif ? null : reason,
          },
        })
        if (!baruAktif) {
          await tx.session.deleteMany({ where: { userId: targetUserId } })
        }
        await catatAudit({
          actorId: user.id,
          actorRole: user.role,
          action: baruAktif ? 'AKUN_DIAKTIFKAN' : 'NONAKTIFKAN_AKUN',
          targetEntity: 'User',
          targetId: targetUserId,
          oldValue: { isActive: targetUser.isActive },
          newValue: { isActive: baruAktif, role: targetUser.role },
          reason: reason || null,
          client: tx,
        })
        return diperbarui
      })

      return NextResponse.json({
        success: true,
        message: baruAktif ? 'Akun diaktifkan kembali' : 'Akun dinonaktifkan',
        user: { id: hasil.id, isActive: hasil.isActive },
      })
    }

    if (action === 'create-admin-biasa') {
      const email = String(body?.email || '').trim().toLowerCase()
      const nama = String(body?.name || '').trim()
      const password = String(body?.password || '')

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return gagal('Format email tidak valid', 400)
      }
      if (!nama) return gagal('Nama wajib diisi', 400)
      if (password.length < 8) {
        return gagal('Kata sandi Admin Biasa minimal 8 karakter', 400)
      }

      const existing = await prisma().user.findUnique({ where: { email } })
      if (existing) return gagal('Email sudah terdaftar', 409)

      const adminBiasa = await prisma().$transaction(async (tx: any) => {
        const dibuat = await tx.user.create({
          data: {
            email,
            passwordHash: hashPassword(password),
            name: nama,
            role: 'ADMIN_BIASA',
            isActive: true,
          },
        })
        await catatAudit({
          actorId: user.id,
          actorRole: user.role,
          action: 'BUAT_ADMIN',
          targetEntity: 'User',
          targetId: dibuat.id,
          oldValue: {},
          newValue: { email, name: nama, role: 'ADMIN_BIASA' },
          reason: reason || 'Pembuatan akun Admin Biasa',
          client: tx,
        })
        return dibuat
      })

      return NextResponse.json({
        success: true,
        message: 'Admin Biasa berhasil dibuat',
        user: {
          id: adminBiasa.id,
          email: adminBiasa.email,
          name: adminBiasa.name,
          role: adminBiasa.role,
        },
      })
    }

    // delete-admin-biasa
    await prisma().$transaction(async (tx: any) => {
      await tx.session.deleteMany({ where: { userId: targetUserId } })
      await tx.user.delete({ where: { id: targetUserId } })
      await catatAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'HAPUS_ADMIN',
        targetEntity: 'User',
        targetId: targetUserId,
        oldValue: { email: targetUser.email, role: targetUser.role },
        newValue: {},
        reason: reason || 'Pencabutan akun Admin Biasa',
        client: tx,
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Admin Biasa berhasil dicabut',
    })
  } catch (error: any) {
    console.error('API POST /api/admin error:', error)
    return gagal('Terjadi kesalahan sistem', 500)
  }
}

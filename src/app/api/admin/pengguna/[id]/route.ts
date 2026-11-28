// src/app/api/admin/pengguna/[id]/route.ts
// Ubah peran / status akun — hanya ADMIN_UTAMA (GR-02, GR-04, BR-005).
// Tindakan pada akun admin memakai OTP sekali pakai (FR-ACC-004/007); audit tetap append-only (GR-06).

import type { Prisma } from '@/generated/prisma/client'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { catatAudit } from '@/lib/pembayaranServer'
import {
  adalahPeranYangBolehDiubah,
  bolehUbahAkun,
  dtoAkunPengguna,
} from '@/lib/kelolaPengguna'
import { konsumsiOtpAdmin } from '@/lib/otpAdmin'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (user.role !== 'ADMIN_UTAMA') {
      return gagal('Hanya Admin Utama yang dapat mengubah pengguna', 403)
    }

    const { id } = await context.params
    const db = prisma()
    const target = await db.user.findUnique({ where: { id } })
    if (!target) return gagal('Akun tidak ditemukan', 404)

    // GR-04: akun Admin Utama tunggal tidak boleh diubah; pemilik juga tidak
    // boleh menonaktifkan atau menurunkan peran akunnya sendiri.
    if (!bolehUbahAkun(user.id, target.id, target.role)) {
      return gagal('Akun Admin Utama tidak dapat diubah melalui panel ini', 403)
    }

    const body = await request.json().catch(() => null)
    const adaPeran = body?.role !== undefined
    const adaStatus = body?.isActive !== undefined
    if (!adaPeran && !adaStatus) {
      return gagal('Pilih peran atau status yang akan diubah', 400)
    }

    let peranBaru: 'CUSTOMER' | 'ADMIN_BIASA' | null = null
    if (adaPeran) {
      if (!adalahPeranYangBolehDiubah(body.role)) {
        return gagal('Peran hanya boleh Pelanggan atau Admin Biasa', 400)
      }
      peranBaru = body.role
      if (peranBaru === target.role) return gagal('Peran tidak berubah', 400)
    }

    let aktifBaru: boolean | null = null
    const alasan = String(body?.alasan ?? '').trim()
    if (adaStatus) {
      if (typeof body.isActive !== 'boolean') return gagal('Status tidak valid', 400)
      aktifBaru = body.isActive
      if (aktifBaru === target.isActive) return gagal('Status tidak berubah', 400)
      if (!aktifBaru && !alasan) {
        return gagal('Alasan penonaktifan wajib diisi', 400)
      }
    }

    // OTP wajib untuk pengelolaan akun admin (buat/ubah peran/nonaktifkan).
    const butuhOtp = adaPeran || target.role === 'ADMIN_BIASA'
    const otp = String(body?.otp ?? '')
    if (butuhOtp && !/^\d{6}$/.test(otp)) {
      return gagal('OTP 6 digit wajib diisi untuk perubahan akun admin', 400)
    }

    let otpSah = !butuhOtp
    const diperbarui = await db.$transaction(async (tx) => {
      if (butuhOtp) {
        otpSah = await konsumsiOtpAdmin(user.id, otp, tx)
        if (!otpSah) return null
      }

      const data: Prisma.UserUpdateInput = {}
      if (peranBaru) data.role = peranBaru
      if (aktifBaru !== null) {
        data.isActive = aktifBaru
        data.deactivationReason = aktifBaru ? null : alasan
      }

      const hasil = await tx.user.update({ where: { id }, data })

      // FR-ACC-007: sesi akun admin langsung dicabut saat dinonaktifkan.
      if (aktifBaru === false) {
        await tx.session.deleteMany({ where: { userId: id } })
      }

      const aksi = peranBaru
        ? 'UBAH_PERAN'
        : aktifBaru
          ? 'AKUN_DIAKTIFKAN'
          : 'NONAKTIFKAN_AKUN'
      await catatAudit({
        actorId: user.id,
        actorRole: user.role,
        action: aksi,
        targetEntity: 'User',
        targetId: id,
        oldValue: { role: target.role, isActive: target.isActive },
        newValue: {
          role: peranBaru ?? target.role,
          isActive: aktifBaru ?? target.isActive,
        },
        reason: alasan || 'Perubahan peran oleh Admin Utama',
        client: tx,
      })
      return hasil
    })

    if (!otpSah) return gagal('OTP tidak valid atau sudah kedaluarsa', 401)
    if (!diperbarui) return gagal('Gagal mengubah akun', 500)

    return NextResponse.json({
      success: true,
      pesan: peranBaru ? 'Peran berhasil diubah' : 'Status akun berhasil diubah',
      akun: dtoAkunPengguna(diperbarui, 0),
    })
  } catch (error) {
    console.error('API PATCH /api/admin/pengguna/[id] error:', error)
    return gagal('Terjadi kesalahan sistem', 500)
  }
}

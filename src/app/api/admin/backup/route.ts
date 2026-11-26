// src/app/api/admin/backup/route.ts
// Tahap 13 — panel backup Admin Utama (GR-02), audit append-only (GR-06).
// GR-03 — tidak ada field modal/laba yang dikirim lewat endpoint ini.

import { NextResponse } from 'next/server'
import { getSessionUser, validasiKredensial } from '@/lib/auth'
import { bolehKelolaBackup } from '@/lib/backup'
import {
  daftarRiwayatBackup,
  jalankanBackup,
  konsumsiOtpBackup,
  mintaOtpBackup,
} from '@/lib/backupServer'
import { catatAudit } from '@/lib/pembayaranServer'
import { validasiKonfirmasiSensitif } from '@/lib/pembayaran'
import prisma from '@/lib/prisma'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (!bolehKelolaBackup(user.role)) {
      return gagal('Hanya Admin Utama yang dapat mengelola backup', 403)
    }

    const hasil = await daftarRiwayatBackup()
    return NextResponse.json({
      daftar: hasil.daftar,
      ringkasan: hasil.ringkasan,
      konfigurasi: {
        publicKeyTersedia: hasil.konfigurasi.publicKeyTersedia,
        jamWIB: hasil.konfigurasi.jamWIB,
        retensiHari: hasil.konfigurasi.retensiHari,
      },
    })
  } catch (error) {
    console.error('Gagal memuat riwayat backup:', error)
    return gagal('Gagal memuat riwayat backup', 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (!bolehKelolaBackup(user.role)) {
      return gagal('Hanya Admin Utama yang dapat menjalankan backup', 403)
    }

    const body = await request.json().catch(() => null)
    const action = String(body?.action || 'jalankan')

    if (action === 'minta-otp') {
      await mintaOtpBackup({ userId: user.id, email: user.email })
      await catatAudit({
        actorId: user.id,
        actorRole: 'ADMIN_UTAMA',
        action: 'OTP_BACKUP_DIMINTA',
        targetEntity: 'BackupArsip',
        targetId: user.id,
        oldValue: {},
        newValue: { berhasil: true },
        reason: 'Permintaan OTP backup manual',
      })
      return NextResponse.json({
        berhasil: true,
        pesan: 'OTP dikirim ke terminal server dan berlaku selama 5 menit.',
      })
    }

    if (action !== 'jalankan') return gagal('Aksi tidak dikenal', 400)

    const konfirmasi = String(body?.konfirmasi || '')
    const password = String(body?.password || '')
    const otp = String(body?.otp || '')
    const keterangan = String(body?.keterangan || '').slice(0, 300)

    const cek = validasiKonfirmasiSensitif({ konfirmasi, password, otp })
    if (!cek.valid) return gagal(cek.alasan || 'Konfirmasi tidak lengkap', 400)

    const admin = await prisma().user.findUnique({ where: { id: user.id } })
    if (!admin || !validasiKredensial(password, admin.passwordHash)) {
      return gagal('Kata sandi tidak benar', 401)
    }

    const otpSah = await prisma().$transaction(async (tx: any) =>
      konsumsiOtpBackup({ userId: user.id, otp, client: tx })
    )
    if (!otpSah) return gagal('OTP tidak valid atau sudah kedaluarsa', 401)

    const hasil = await jalankanBackup({
      jenis: 'MANUAL',
      dibuatOlehId: user.id,
      keterangan,
    })
    return NextResponse.json({ berhasil: true, backup: hasil })
  } catch (error: any) {
    const pesan = String(error?.message || 'Gagal menjalankan backup')
    if (pesan.includes('OTP masih berlaku')) return gagal(pesan, 429)
    if (pesan.includes('Kunci publik') || pesan.includes('DATABASE_URL')) {
      return gagal(pesan, 400)
    }
    console.error('Gagal menjalankan backup:', error)
    return gagal('Gagal menjalankan backup. Periksa log server untuk detailnya.', 500)
  }
}

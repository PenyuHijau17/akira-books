// src/app/api/notifikasi/akun/route.ts
// Level 1 inbox Admin: daftar akun + kelompok Sistem Toko.
// GR-02: otorisasi sesi dan peran divalidasi di server, bukan di UI.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { daftarAkunNotifikasi } from '@/lib/notifikasiServer'

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Sesi tidak valid. Silakan masuk kembali.' }, { status: 401 })
    }
    if (user.role !== 'ADMIN_UTAMA' && user.role !== 'ADMIN_BIASA') {
      return NextResponse.json({ error: 'Hanya Admin yang dapat melihat daftar akun' }, { status: 403 })
    }

    const hasil = await daftarAkunNotifikasi({ peran: user.role })
    return NextResponse.json(hasil)
  } catch (error) {
    console.error('Gagal memuat daftar akun notifikasi:', error)
    return NextResponse.json({ error: 'Gagal memuat daftar akun' }, { status: 500 })
  }
}

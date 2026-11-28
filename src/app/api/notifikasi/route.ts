// src/app/api/notifikasi/route.ts
// Inbox notifikasi per akun (Tahap 12). GR-02/GR-03: sesi & isolasi divalidasi server.
// BR-003: pengguna hanya melihat dan mengubah notifikasinya sendiri.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import {
  daftarNotifikasiPengguna,
  tandaiNotifikasiDibaca,
} from '@/lib/notifikasiServer'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

function peranDiizinkan(peran: string): boolean {
  return ['CUSTOMER', 'ADMIN_BIASA', 'ADMIN_UTAMA'].includes(peran)
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (!peranDiizinkan(user.role)) return gagal('Peran ini tidak memiliki inbox notifikasi', 403)

    const url = new URL(request.url)
    const ringkas = url.searchParams.get('ringkas') === '1'
    const limit = Number(url.searchParams.get('limit') || 100)

    if (ringkas) {
      const hasil = await daftarNotifikasiPengguna({
        userId: user.id,
        peran: user.role,
        limit: 1,
        tanpaKonteks: true,
      })
      return NextResponse.json({ belumDibaca: hasil.belumDibaca })
    }

    const hasil = await daftarNotifikasiPengguna({
      userId: user.id,
      peran: user.role,
      limit,
    })
    return NextResponse.json(hasil)
  } catch (error) {
    console.error('Gagal memuat notifikasi:', error)
    return gagal('Gagal memuat notifikasi', 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (!peranDiizinkan(user.role)) return gagal('Peran ini tidak memiliki inbox notifikasi', 403)

    const body = await request.json().catch(() => null)
    const action = String(body?.action || 'tandai-dibaca')
    if (action !== 'tandai-dibaca') return gagal('Aksi tidak dikenal', 400)

    const semua = Boolean(body?.semua)
    const ids = Array.isArray(body?.ids) ? body.ids.map(String).filter(Boolean) : []
    if (!semua && ids.length === 0) return gagal('Pilih minimal satu notifikasi', 400)

    const berubah = await tandaiNotifikasiDibaca({
      userId: user.id,
      ids,
      semua,
    })
    const setelah = await daftarNotifikasiPengguna({
      userId: user.id,
      peran: user.role,
      limit: 1,
    })
    return NextResponse.json({ berubah, belumDibaca: setelah.belumDibaca })
  } catch (error) {
    console.error('Gagal menandai notifikasi:', error)
    return gagal('Gagal menandai notifikasi', 500)
  }
}

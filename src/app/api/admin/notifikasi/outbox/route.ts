// src/app/api/admin/notifikasi/outbox/route.ts
// Panel Admin Utama untuk kegagalan pengiriman outbox (Tahap 12).
// GR-02: hanya Admin Utama; GR-06: setiap tindak lanjut dicatat di audit append-only.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import {
  daftarOutboxGagal,
  tandaiOutboxDitindaklanjuti,
} from '@/lib/notifikasiServer'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (user.role !== 'ADMIN_UTAMA') return gagal('Hanya Admin Utama yang dapat membuka panel ini', 403)

    const daftar = await daftarOutboxGagal()
    return NextResponse.json({ daftar })
  } catch (error) {
    console.error('Gagal memuat outbox:', error)
    return gagal('Gagal memuat daftar pengiriman gagal', 500)
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (user.role !== 'ADMIN_UTAMA') return gagal('Hanya Admin Utama yang dapat menindaklanjuti', 403)

    const body = await request.json().catch(() => null)
    const action = String(body?.action || 'tindak-lanjut')
    if (action !== 'tindak-lanjut') return gagal('Aksi tidak dikenal', 400)

    const id = String(body?.id || '').trim()
    const catatan = String(body?.catatan || '').trim()
    if (!id) return gagal('Identifier antrean wajib diisi', 400)
    if (!catatan) return gagal('Catatan tindak lanjut wajib diisi', 400)

    const hasil = await tandaiOutboxDitindaklanjuti({
      id,
      actorId: user.id,
      peran: user.role,
      catatan,
    })
    return NextResponse.json({
      berhasil: true,
      id: hasil.id,
      status: hasil.status,
    })
  } catch (error: any) {
    const pesan = String(error?.message || 'Gagal menindaklanjuti antrean')
    if (pesan.includes('tidak ditemukan') || pesan.includes('Hanya antrean gagal')) {
      return gagal(pesan, 400)
    }
    console.error('Gagal menindaklanjuti outbox:', error)
    return gagal('Gagal menindaklanjuti antrean', 500)
  }
}

// src/app/api/notifikasi/route.ts
// Inbox notifikasi per akun (Tahap 12). GR-02/GR-03: sesi & isolasi divalidasi server.
// BR-003: pengguna hanya melihat dan mengubah notifikasinya sendiri, kecuali Admin
// yang sedang meninjau akun lain lewat daftar akun (userId divalidasi server).

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  daftarNotifikasiPengguna,
  daftarUserIdNotifikasiYatim,
  tandaiNotifikasiDibaca,
} from '@/lib/notifikasiServer'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

function peranDiizinkan(peran: string): boolean {
  return ['CUSTOMER', 'ADMIN_BIASA', 'ADMIN_UTAMA'].includes(peran)
}

function adalahAdmin(peran: string): boolean {
  return peran === 'ADMIN_BIASA' || peran === 'ADMIN_UTAMA'
}

/**
 * Akun yang boleh dibuka di panel detail. Memakai kriteria yang sama dengan
 * daftar kiri agar tidak ada kartu yang mengarah ke "Akun tidak ditemukan".
 */
async function akunNotifikasiValid(id: string): Promise<boolean> {
  if (!id) return false
  const ditemukan = await prisma().user.findFirst({
    where: { id, isActive: true },
    select: { id: true, name: true, role: true },
  })
  return Boolean(
    ditemukan &&
      String(ditemukan.name || '').trim() &&
      ['CUSTOMER', 'ADMIN_BIASA', 'ADMIN_UTAMA'].includes(ditemukan.role)
  )
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (!peranDiizinkan(user.role)) return gagal('Peran ini tidak memiliki inbox notifikasi', 403)

    const url = new URL(request.url)
    const ringkas = url.searchParams.get('ringkas') === '1'
    const limit = Number(url.searchParams.get('limit') || 100)
    const target = String(url.searchParams.get('userId') || '')
    const sistem = target === '__sistem__'
    const admin = adalahAdmin(user.role)

    if ((target || sistem) && !admin)
      return gagal('Anda tidak berhak melihat notifikasi akun lain', 403)

    if (ringkas) {
      const hasil = await daftarNotifikasiPengguna({
        userId: user.id,
        peran: user.role,
        limit: 1,
        tanpaKonteks: true,
      })
      return NextResponse.json({ belumDibaca: hasil.belumDibaca })
    }

    if (sistem) {
      const hasil = await daftarNotifikasiPengguna({
        userId: user.id,
        peran: user.role,
        limit,
        sistemSaja: true,
        sistemUserIds: await daftarUserIdNotifikasiYatim(),
      })
      return NextResponse.json(hasil)
    }

    const targetSah = admin && target ? await akunNotifikasiValid(target) : false
    // Tautan lama ke akun yatim tidak boleh menampilkan "Akun tidak ditemukan";
    // notifikasinya dibuka melalui panel Sistem Toko.
    if (target && admin && !targetSah) {
      const hasil = await daftarNotifikasiPengguna({
        userId: user.id,
        peran: user.role,
        limit,
        sistemSaja: true,
        sistemUserIds: [target],
      })
      return NextResponse.json(hasil)
    }

    const hasil = await daftarNotifikasiPengguna({
      userId: targetSah ? target : user.id,
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

    const target = String(body?.userId || '')
    const sistem = target === '__sistem__'
    const admin = adalahAdmin(user.role)
    if ((target || sistem) && !admin)
      return gagal('Anda tidak berhak mengubah notifikasi akun lain', 403)

    const semua = Boolean(body?.semua)
    const ids = Array.isArray(body?.ids) ? body.ids.map(String).filter(Boolean) : []
    if (!semua && ids.length === 0) return gagal('Pilih minimal satu notifikasi', 400)

    const targetSah = admin && target && !sistem ? await akunNotifikasiValid(target) : false
    const gabungSistem = Boolean(sistem || (target && admin && !targetSah))
    const sistemUserIds = sistem
      ? await daftarUserIdNotifikasiYatim()
      : target && admin && !targetSah
        ? [target]
        : []
    const userId = targetSah ? target : user.id

    const berubah = await tandaiNotifikasiDibaca({
      userId,
      ids,
      semua,
      sistemSaja: gabungSistem,
      sistemUserIds,
    })
    const setelah = await daftarNotifikasiPengguna({
      userId,
      peran: user.role,
      limit: 1,
      tanpaKonteks: true,
      sistemSaja: gabungSistem,
      sistemUserIds,
    })
    return NextResponse.json({ berubah, belumDibaca: setelah.belumDibaca })
  } catch (error) {
    console.error('Gagal menandai notifikasi:', error)
    return gagal('Gagal menandai notifikasi', 500)
  }
}

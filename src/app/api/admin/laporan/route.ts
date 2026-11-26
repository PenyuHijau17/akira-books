// src/app/api/admin/laporan/route.ts
// Laporan keuangan khusus Admin Utama (FR-REP-001, GR-03).
// Admin Biasa/Customer/Pengunjung wajib mendapat 403 sebelum query database dijalankan.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { bolehAksesLaporanKeuangan, parsePeriodeLaporan } from '@/lib/penjualanOffline'
import { ringkasanLaporanKeuangan } from '@/lib/penjualanServer'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Silakan masuk terlebih dahulu', 401)
    if (!bolehAksesLaporanKeuangan(user.role)) {
      return gagal('Akses ditolak: laporan keuangan hanya tersedia untuk Admin Utama', 403)
    }

    const { searchParams } = new URL(request.url)
    let periode
    try {
      periode = parsePeriodeLaporan(
        searchParams.get('jenis') || 'harian',
        searchParams.get('tanggal')
      )
    } catch (error: any) {
      return gagal(error?.message || 'Periode laporan tidak valid', 400)
    }

    const laporan = await ringkasanLaporanKeuangan(prisma(), periode)
    return NextResponse.json({
      ...laporan,
      hakAkses: { bisaLihatKeuangan: true },
    })
  } catch (error: any) {
    console.error('API GET /api/admin/laporan error:', error)
    return gagal(error?.message || 'Gagal memuat laporan keuangan', 500)
  }
}

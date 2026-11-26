// src/app/api/pembayaran/cron/route.ts
// Pemicu manual/internal untuk auto-cancel & pengingat 2 jam.
// Penjadwal in-process juga memanggil fungsi yang sama (src/lib/penjadwal.ts).

import { NextResponse } from 'next/server'
import { jalankanTugasPembayaran } from '@/lib/penjadwal'

function rahasia(): string {
  return process.env.CRON_SECRET || 'akira-cron-dev'
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get('x-cron-secret') || ''
    if (secret !== rahasia()) {
      return NextResponse.json({ error: 'Akses cron ditolak' }, { status: 401 })
    }

    const hasil = await jalankanTugasPembayaran(new Date())
    return NextResponse.json({ success: true, ...hasil })
  } catch (error: any) {
    console.error('API POST /api/pembayaran/cron error:', error)
    return NextResponse.json({ error: 'Gagal menjalankan tugas pembayaran' }, { status: 500 })
  }
}

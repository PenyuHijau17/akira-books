// src/app/api/media/sampul/[nama]/route.ts
// Melayani sampul buku yang disimpan di storage privat.
// Publik karena sampul tampil di katalog dan beranda; nama berkas acak UUID
// dan divalidasi ketat agar tidak ada path traversal.

import { NextResponse } from 'next/server'
import { bacaSampul, mimeSampul } from '@/lib/sampulBuku'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nama: string }> }
) {
  try {
    const { nama } = await params
    const mime = mimeSampul(nama)
    if (!mime) return NextResponse.json({ error: 'Nama berkas tidak valid' }, { status: 400 })

    const isi = await bacaSampul(nama)
    if (!isi) return NextResponse.json({ error: 'Sampul tidak ditemukan' }, { status: 404 })

    return new NextResponse(new Uint8Array(isi), {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Error serving sampul buku:', error)
    return NextResponse.json({ error: 'Gagal memuat sampul' }, { status: 500 })
  }
}

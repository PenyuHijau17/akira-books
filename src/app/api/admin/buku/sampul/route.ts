// src/app/api/admin/buku/sampul/route.ts
// Unggah sampul buku (JPEG/PNG/WebP, maksimal 5 MB).
// GR-02: sesi admin diverifikasi di server. Berkas disimpan di storage/uploads
// agar ikut ter-backup oleh skrip age Tahap 13.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { butuhAksesAdmin } from '@/lib/rbac'
import { simpanSampul } from '@/lib/sampulBuku'

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Sesi tidak valid. Silakan masuk kembali.' }, { status: 401 })
    }
    if (!butuhAksesAdmin(user.role)) {
      return NextResponse.json({ error: 'Hanya admin yang dapat mengunggah sampul' }, { status: 403 })
    }

    const formData = await request.formData().catch(() => null)
    const berkas = formData?.get('file')
    if (!(berkas instanceof File)) {
      return NextResponse.json({ error: 'Berkas sampul wajib diunggah.' }, { status: 400 })
    }

    try {
      const hasil = await simpanSampul(berkas)
      return NextResponse.json({
        success: true,
        imageUrl: hasil.imageUrl,
        storageName: hasil.storageName,
        mime: hasil.mime,
        message: 'Sampul berhasil diunggah',
      })
    } catch (error: any) {
      return NextResponse.json(
        { error: String(error?.message || 'Sampul tidak valid') },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error uploading sampul buku:', error)
    return NextResponse.json({ error: 'Gagal mengunggah sampul' }, { status: 500 })
  }
}

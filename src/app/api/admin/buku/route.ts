// src/app/api/admin/buku/route.ts
// Pengelolaan master buku — otorisasi server-side (GR-02) & isolasi modal/laba (GR-03).
// Admin Biasa TIDAK pernah menerima costPrice / riwayat modal, baik di DTO maupun error.

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { boleLihatModalLaba, butuhAksesAdmin } from '@/lib/rbac'
import { catatAudit } from '@/lib/pembayaranServer'
import { dtoBuku } from '@/lib/buku'
import { kodeBukuBerikutnya } from '@/lib/kodeBuku'
import { daftarNamaUnik } from '@/lib/namaBuku'
import { samakanNamaBuku } from '@/lib/normalisasiNama'
import { PATCH as patchBukuId } from './[id]/route'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

// PATCH /api/admin/buku — alias pembaruan buku dengan `id` di body.
// Logika normalisasi Penulis/Penerbit dan GR-03 memakai handler yang sama dengan
// /api/admin/buku/[id].
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null)
  const id = String(body?.id ?? '')
  if (!id) return gagal('ID buku wajib diisi', 400)

  const requestBaru = new Request(request.url, {
    method: 'PATCH',
    headers: request.headers,
    body: JSON.stringify(body),
  })
  return patchBukuId(requestBaru, { params: Promise.resolve({ id }) })
}

// GET /api/admin/buku — daftar buku untuk admin.
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (!butuhAksesAdmin(user.role)) return gagal('Hanya admin yang dapat mengelola buku', 403)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const kategori = searchParams.get('kategori') || ''
    const where: any = {}
    if (status) where.status = status
    if (kategori) where.categoryId = kategori

    // Daftar Penulis/Penerbit unik diambil dari seluruh buku (tanpa filter)
    // agar dropdown selalu berisi pilihan yang pernah tersimpan.
    const [books, semuaBuku] = await Promise.all([
      prisma().book.findMany({ where, orderBy: { title: 'asc' } }),
      prisma().book.findMany({ select: { author: true, publisher: true } }),
    ])

    return NextResponse.json({
      books: books.map((book: any) => dtoBuku(book, user.role)),
      penulis: daftarNamaUnik(semuaBuku.map((book) => book.author)),
      penerbit: daftarNamaUnik(semuaBuku.map((book) => book.publisher)),
    })
  } catch (error) {
    console.error('Error fetching admin buku:', error)
    return gagal('Gagal mengambil data buku', 500)
  }
}

// POST /api/admin/buku — tambah buku baru.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)
    if (!butuhAksesAdmin(user.role)) return gagal('Hanya admin yang dapat menambah buku', 403)

    const body = await request.json().catch(() => null)
    const {
      title, author, publisher, publishYear, categoryId, imageUrl, description,
      sellingPrice, costPrice, stockTotal,
    } = body || {}

    // Kode buku selalu dibuat server-side (BK-0001, BK-0002, ...).
    // Nilai `code` dari klien sengaja diabaikan.
    if (!title || !author || sellingPrice === undefined) {
      return gagal('Judul, penulis, dan harga jual wajib diisi', 400)
    }
    if (Number(stockTotal || 0) < 0) return gagal('Stok tidak boleh negatif', 400)

    // Pencegahan typo lapis 1 & 2: rapikan spasi lalu samakan ejaan dengan
    // nama Penulis/Penerbit yang sudah ada (abaikan huruf besar/kecil).
    const namaRapi = await samakanNamaBuku(author, publisher)

    // GR-03: hanya Admin Utama yang boleh menetapkan modal per unit.
    const modal = boleLihatModalLaba(user.role) ? Number(costPrice || 0) : 0

    // Buat dengan retry saat bentrok kode unik (dua admin menambah buku bersamaan).
    let book: any = null
    let kodeDipakai = ''
    for (let percobaan = 0; percobaan < 5; percobaan++) {
      kodeDipakai = await kodeBukuBerikutnya()
      try {
        book = await prisma().book.create({
          data: {
            code: kodeDipakai,
            title: String(title),
            author: namaRapi.author,
            publisher: namaRapi.publisher,
            publishYear: Number(publishYear || 2024),
            imageUrl: String(imageUrl || ''),
            description: String(description || ''),
            sellingPrice: Number(sellingPrice),
            costPrice: modal,
            stockTotal: Number(stockTotal || 0),
            stockReserved: 0,
            status: 'TERSEDIA',
            categoryId: String(categoryId || ''),
          },
        })
        break
      } catch (error: any) {
        const bentrok =
          error?.code === 'P2002' ||
          String(error?.message || '').includes('Unique constraint')
        if (!bentrok || percobaan === 4) throw error
      }
    }

    if (Number(stockTotal || 0) > 0) {
      await prisma().stockMovement.create({
        data: {
          bookId: book.id,
          type: 'MASUK',
          quantity: Number(stockTotal),
          reason: 'Stok awal saat pembuatan buku',
          createdBy: user.id,
        },
      })
    }

    await catatAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'BUAT_BUKU',
      targetEntity: 'Book',
      targetId: book.id,
      oldValue: {},
      newValue: dtoBuku(book, user.role),
      reason: 'Penambahan buku baru',
    })

    return NextResponse.json({
      success: true,
      book: dtoBuku(book, user.role),
      message: `Buku berhasil ditambahkan dengan kode ${kodeDipakai}`,
    })
  } catch (error: any) {
    console.error('Error creating book:', error)
    if (error?.code === 'P2002' || String(error?.message || '').includes('Unique constraint')) {
      return gagal('Kode buku otomatis masih bentrok. Silakan coba lagi.', 409)
    }
    return gagal('Gagal menambah buku', 500)
  }
}

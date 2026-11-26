// src/app/api/admin/buku/route.ts
// Pengelolaan master buku — otorisasi server-side (GR-02) & isolasi modal/laba (GR-03).
// Admin Biasa TIDAK pernah menerima costPrice / riwayat modal, baik di DTO maupun error.

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { boleLihatModalLaba, butuhAksesAdmin } from '@/lib/rbac'
import { catatAudit } from '@/lib/pembayaranServer'
import { dtoBuku } from '@/lib/buku'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
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

    const books = await prisma().book.findMany({ where, orderBy: { title: 'asc' } })
    return NextResponse.json({ books: books.map((book: any) => dtoBuku(book, user.role)) })
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
      code, title, author, publisher, publishYear, categoryId, imageUrl, description,
      sellingPrice, costPrice, stockTotal,
    } = body || {}

    if (!code || !title || !author || sellingPrice === undefined) {
      return gagal('Field wajib tidak lengkap', 400)
    }
    if (Number(stockTotal || 0) < 0) return gagal('Stok tidak boleh negatif', 400)

    // GR-03: hanya Admin Utama yang boleh menetapkan modal per unit.
    const modal = boleLihatModalLaba(user.role) ? Number(costPrice || 0) : 0

    const book = await prisma().book.create({
      data: {
        code: String(code),
        title: String(title),
        author: String(author),
        publisher: String(publisher || ''),
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

    return NextResponse.json({ success: true, book: dtoBuku(book, user.role), message: 'Buku berhasil ditambahkan' })
  } catch (error: any) {
    console.error('Error creating book:', error)
    if (error?.code === 'P2002' || String(error?.message || '').includes('Unique constraint')) {
      return gagal('Kode buku sudah ada. Gunakan kode yang unik.', 400)
    }
    return gagal('Gagal menambah buku', 500)
  }
}

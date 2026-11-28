// src/app/api/katalog/[slug]/route.ts
// Detail buku publik. Menerima slug (/katalog/janji-12), kode buku
// (/katalog/12), maupun id UUID sebagai fallback.
// GR-03: DTO sengaja sama dengan /api/katalog — tanpa costPrice / riwayat modal.

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { slugBuku } from '@/lib/slugBuku'

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Field aman yang dipakai baik untuk pencarian maupun DTO akhir.
const pilihanAman = {
  id: true,
  code: true,
  title: true,
  author: true,
  publisher: true,
  publishYear: true,
  imageUrl: true,
  description: true,
  sellingPrice: true,
  stockTotal: true,
  status: true,
  categoryId: true,
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: slugMentah } = await context.params
    const param = decodeURIComponent(slugMentah).trim().toLowerCase()

    if (!param) {
      return NextResponse.json({ books: [], total: 0 })
    }

    const client = prisma()

    // 1. Kode buku — mencakup URL angka seperti /katalog/12.
    let book: any = await client.book.findFirst({
      where: { code: { equals: param, mode: 'insensitive' } },
      select: pilihanAman,
    })

    // 2. id UUID jika yang dikirim justru id buku.
    if (!book && REGEX_UUID.test(param)) {
      book = await client.book.findUnique({
        where: { id: param },
        select: pilihanAman,
      })
    }

    // 3. Slug turunan (judul + kode), mis. "janji-12".
    if (!book) {
      const daftar = await client.book.findMany({ select: pilihanAman })
      book =
        daftar.find((item: any) => slugBuku(item.title, item.code) === param) ?? null
    }

    if (!book) {
      return NextResponse.json({ books: [], total: 0 })
    }

    const kategori = await client.category.findUnique({
      where: { id: book.categoryId },
      select: { name: true },
    })

    const bukuAman = {
      id: book.id,
      code: book.code,
      slug: slugBuku(book.title, book.code),
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      publishYear: book.publishYear,
      imageUrl: book.imageUrl,
      description: book.description,
      sellingPrice: book.sellingPrice,
      stockTotal: book.stockTotal,
      status: book.status,
      kategori: kategori?.name || '',
    }

    return NextResponse.json({ books: [bukuAman], total: 1 })
  } catch (error) {
    console.error('Error detail katalog:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil detail buku' },
      { status: 500 }
    )
  }
}

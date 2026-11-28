// src/app/api/tandai-buku/route.ts
// API Tandai Buku (wishlist) untuk Customer yang sedang login.
// GET: daftar ID buku; ?detail=1 juga mengembalikan detail buku aman.
// POST: toggle tambah/hapus tandaan berdasarkan bookId.
// GR-02: sesi & peran divalidasi server. GR-03: DTO tanpa costPrice/laba.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  daftarIdTandaan,
  dtoBukuTandaan,
  pesanHasilTandaan,
  pilihanBukuTandaan,
} from '@/lib/tandaiBuku'

function mintaCustomer(request: Request) {
  return getSessionUser(request).then((user) =>
    user && user.role === 'CUSTOMER' ? user : null
  )
}

export async function GET(request: Request) {
  try {
    const user = await mintaCustomer(request)
    if (!user) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mintaDetail = ['1', 'true'].includes(
      (searchParams.get('detail') || '').toLowerCase()
    )

    const tandaan = await prisma().wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { bookId: true },
    })
    const bookIds = daftarIdTandaan(tandaan)

    const respons: {
      bookIds: string[]
      total: number
      books?: ReturnType<typeof dtoBukuTandaan>[]
    } = { bookIds, total: bookIds.length }

    if (mintaDetail) {
      if (bookIds.length === 0) {
        respons.books = []
      } else {
        const [books, daftarKategori] = await Promise.all([
          prisma().book.findMany({
            where: { id: { in: bookIds } },
            select: pilihanBukuTandaan,
          }),
          prisma().category.findMany({
            select: { id: true, name: true },
          }),
        ])
        const petaKategori = new Map(
          daftarKategori.map((item) => [item.id, item.name])
        )
        const petaBuku = new Map(
          books.map((book) => [
            book.id,
            dtoBukuTandaan(book, petaKategori.get(book.categoryId) || ''),
          ])
        )
        // Urutan mengikuti tandaan terbaru, bukan urutan query database.
        respons.books = bookIds
          .map((id) => petaBuku.get(id))
          .filter((book): book is ReturnType<typeof dtoBukuTandaan> => Boolean(book))
      }
    }

    return NextResponse.json(respons)
  } catch (error) {
    console.error('API GET /api/tandai-buku error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil daftar buku ditandai' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await mintaCustomer(request)
    if (!user) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const bookId = typeof body?.bookId === 'string' ? body.bookId.trim() : ''
    if (!bookId) {
      return NextResponse.json(
        { error: 'BookId wajib diisi' },
        { status: 400 }
      )
    }

    const client = prisma()
    const buku = await client.book.findUnique({
      where: { id: bookId },
      select: { id: true, title: true },
    })
    if (!buku) {
      return NextResponse.json({ error: 'Buku tidak ditemukan' }, { status: 404 })
    }

    const sudahAda = await client.wishlistItem.findUnique({
      where: { userId_bookId: { userId: user.id, bookId } },
      select: { id: true },
    })

    if (sudahAda) {
      await client.wishlistItem.delete({ where: { id: sudahAda.id } })
      return NextResponse.json({
        bookId,
        ditandai: false,
        pesan: pesanHasilTandaan(false, buku.title),
      })
    }

    try {
      await client.wishlistItem.create({ data: { userId: user.id, bookId } })
    } catch (error: any) {
      // Dua klik bersamaan: tandaan sudah dibuat request lain.
      if (error?.code === 'P2002') {
        return NextResponse.json({
          bookId,
          ditandai: true,
          pesan: 'Buku sudah ditandai.',
        })
      }
      throw error
    }

    return NextResponse.json({
      bookId,
      ditandai: true,
      pesan: pesanHasilTandaan(true, buku.title),
    })
  } catch (error: any) {
    console.error('API POST /api/tandai-buku error:', error)
    return NextResponse.json(
      { error: error?.message || 'Gagal menyimpan tandaan buku' },
      { status: 500 }
    )
  }
}

// src/lib/tandaiBuku.ts
// Helper murni untuk fitur Tandai Buku (wishlist).
// Dipakai oleh API dan unit test agar aturan GR-03 mudah diverifikasi.

import { slugBuku } from '@/lib/slugBuku'

export const pilihanBukuTandaan = {
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

export type BukuTandaan = {
  id: string
  code: string
  slug: string
  title: string
  author: string
  publisher: string
  publishYear: number
  imageUrl: string | null
  description: string | null
  sellingPrice: number
  stockTotal: number
  status: string
  kategori: string
}

/**
 * DTO publik untuk buku yang ditandai.
 * Hanya field aman yang disalin satu per satu — costPrice/laba tidak pernah
 * ikut terkirim, bahkan jika objek sumber membawa field tersebut (GR-03).
 */
export function dtoBukuTandaan(book: any, namaKategori = ''): BukuTandaan {
  return {
    id: book.id,
    code: book.code,
    slug: slugBuku(book.title, book.code),
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    publishYear: book.publishYear,
    imageUrl: book.imageUrl ?? null,
    description: book.description ?? null,
    sellingPrice: book.sellingPrice,
    stockTotal: book.stockTotal,
    status: book.status,
    kategori: namaKategori || '',
  }
}

/** Ambil ID buku unik, mempertahankan urutan tandaan terbaru. */
export function daftarIdTandaan(baris: Array<{ bookId: string }>): string[] {
  const terlihat = new Set<string>()
  const hasil: string[] = []
  for (const item of baris) {
    if (!item?.bookId || terlihat.has(item.bookId)) continue
    terlihat.add(item.bookId)
    hasil.push(item.bookId)
  }
  return hasil
}

/** Pesan hasil toggle dalam Bahasa Indonesia. */
export function pesanHasilTandaan(ditandai: boolean, judul?: string): string {
  const nama = judul ? ` "${judul}"` : ''
  return ditandai
    ? `Buku${nama} berhasil ditandai.`
    : `Tandaan buku${nama} berhasil dihapus.`
}

/** Filter cepat katalog: menyisakan buku yang ID-nya ada di daftar tandaan. */
export function filterBukuTandaan<T extends { id: string }>(
  books: T[],
  bookIds: Set<string>
): T[] {
  return books.filter((book) => bookIds.has(book.id))
}

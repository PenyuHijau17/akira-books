import { describe, expect, it } from 'vitest'
import {
  daftarIdTandaan,
  dtoBukuTandaan,
  filterBukuTandaan,
  pesanHasilTandaan,
} from '@/lib/tandaiBuku'

const bukuMentah = {
  id: 'buku-1',
  code: 'BK-0002',
  title: 'Negeri 5 Menara',
  author: 'A. Fuadi',
  publisher: 'Gramedia',
  publishYear: 2009,
  imageUrl: null,
  description: 'Contoh deskripsi',
  sellingPrice: 88000,
  costPrice: 50000,
  laba: 38000,
  stockTotal: 4,
  status: 'TERSEDIA',
  categoryId: 'kat-1',
}

describe('Tandai Buku — helper wishlist', () => {
  it('membuat DTO publik tanpa costPrice maupun laba (GR-03)', () => {
    const dto = dtoBukuTandaan(bukuMentah, 'Fiksi')

    expect(dto).toEqual({
      id: 'buku-1',
      code: 'BK-0002',
      slug: 'negeri-5-menara-bk-0002',
      title: 'Negeri 5 Menara',
      author: 'A. Fuadi',
      publisher: 'Gramedia',
      publishYear: 2009,
      imageUrl: null,
      description: 'Contoh deskripsi',
      sellingPrice: 88000,
      stockTotal: 4,
      status: 'TERSEDIA',
      kategori: 'Fiksi',
    })
    expect(Object.keys(dto).some((k) => /(cost|modal|laba|profit|margin)/i.test(k))).toBe(false)
  })

  it('mengambil ID tandaan unik dengan urutan terbaru lebih dulu', () => {
    const ids = daftarIdTandaan([
      { bookId: 'buku-3' },
      { bookId: 'buku-1' },
      { bookId: 'buku-3' },
      { bookId: '' as any },
      { bookId: 'buku-2' },
    ])

    expect(ids).toEqual(['buku-3', 'buku-1', 'buku-2'])
  })

  it('memfilter buku memakai daftar tandaan untuk filter cepat katalog', () => {
    const books = [
      { id: 'buku-1', title: 'Pertama' },
      { id: 'buku-2', title: 'Kedua' },
      { id: 'buku-3', title: 'Ketiga' },
    ]

    expect(filterBukuTandaan(books, new Set(['buku-2']))).toEqual([
      { id: 'buku-2', title: 'Kedua' },
    ])
    expect(filterBukuTandaan(books, new Set())).toEqual([])
  })

  it('memberikan pesan toggle dalam Bahasa Indonesia', () => {
    expect(pesanHasilTandaan(true, 'Negeri 5 Menara')).toBe(
      'Buku "Negeri 5 Menara" berhasil ditandai.'
    )
    expect(pesanHasilTandaan(false)).toBe('Tandaan buku berhasil dihapus.')
  })
})

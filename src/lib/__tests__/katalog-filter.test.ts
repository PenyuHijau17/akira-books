import { describe, it, expect } from 'vitest'
import { bangunWhereKatalog, bangunOrderKatalog } from '@/lib/katalogFilter'

describe('Filter katalog', () => {
  it('memakai status TERSEDIA sebagai default', () => {
    expect(bangunWhereKatalog({})).toEqual({ status: 'TERSEDIA' })
  })

  it('menyaring berdasarkan penulis secara case-insensitive', () => {
    expect(bangunWhereKatalog({ penulis: 'Tere Liye' })).toEqual({
      status: 'TERSEDIA',
      author: { equals: 'Tere Liye', mode: 'insensitive' },
    })
  })

  it('menyaring berdasarkan penerbit secara case-insensitive', () => {
    expect(bangunWhereKatalog({ penerbit: 'Gramedia', status: 'TERJUAL' })).toEqual({
      status: 'TERJUAL',
      publisher: { equals: 'Gramedia', mode: 'insensitive' },
    })
  })

  it('menggabungkan pencarian, kategori, penulis, dan penerbit', () => {
    const where: any = bangunWhereKatalog({
      q: 'laskar',
      kategori: 'kat-1',
      penulis: 'Andrea Hirata',
      penerbit: 'Bentang Pustaka',
    })
    expect(where.categoryId).toBe('kat-1')
    expect(where.author).toEqual({ equals: 'Andrea Hirata', mode: 'insensitive' })
    expect(where.publisher).toEqual({ equals: 'Bentang Pustaka', mode: 'insensitive' })
    expect(where.OR).toHaveLength(3)
  })

  it('menentukan pengurutan harga dan terbaru', () => {
    expect(bangunOrderKatalog('harga_rendah')).toEqual({ sellingPrice: 'asc' })
    expect(bangunOrderKatalog('harga_tinggi')).toEqual({ sellingPrice: 'desc' })
    expect(bangunOrderKatalog()).toEqual({ id: 'desc' })
  })
})

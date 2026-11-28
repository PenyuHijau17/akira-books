import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: () => ({
    book: { findMany: mockFindMany },
  }),
}))

import {
  rapikanNama,
  daftarNamaUnik,
  samakanNama,
  jarakLevenshtein,
  saranKoreksi,
} from '@/lib/namaBuku'
import { samakanNamaBuku } from '@/lib/normalisasiNama'

describe('Pencegahan typo Penulis/Penerbit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Lapis 1 — normalisasi spasi', () => {
    it('memangkas dan menyatukan spasi berlebih', () => {
      expect(rapikanNama('  Tere   Liye \n')).toBe('Tere Liye')
      expect(rapikanNama('Gramedia\t Pustaka')).toBe('Gramedia Pustaka')
      expect(rapikanNama(null)).toBe('')
    })
  })

  describe('Lapis 2 — pencocokan ejaan di database', () => {
    it('menghasilkan daftar unik abaikan huruf besar/kecil', () => {
      expect(daftarNamaUnik(['Tere Liye', 'tere  liye', 'Andrea Hirata', ''])).toEqual([
        'Andrea Hirata',
        'Tere Liye',
      ])
    })

    it('menyelaraskan nama dengan ejaan tersimpan', () => {
      expect(samakanNama('tere liye', ['Tere Liye', 'Andrea Hirata'])).toBe('Tere Liye')
      expect(samakanNama('  Nama  Baru ', ['Tere Liye'])).toBe('Nama Baru')
    })

    it('menyelaraskan Penulis dan Penerbit dalam satu query database', async () => {
      mockFindMany.mockResolvedValue([
        { author: 'Tere Liye', publisher: 'Gramedia Pustaka Utama' },
        { author: 'Andrea Hirata', publisher: 'Bentang Pustaka' },
      ])

      const hasil = await samakanNamaBuku('tere   liye', 'gramedia pustaka utama')
      expect(hasil).toEqual({
        author: 'Tere Liye',
        publisher: 'Gramedia Pustaka Utama',
      })
      expect(mockFindMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('Lapis 3 — saran kemiripan Levenshtein', () => {
    it('menghitung jarak edit dengan benar', () => {
      expect(jarakLevenshtein('Tere Lliye', 'Tere Liye')).toBe(1)
      expect(jarakLevenshtein('Tere Liye', 'tere liye')).toBe(0)
      expect(jarakLevenshtein('abc', 'xyz')).toBe(3)
    })

    it('menyarankan koreksi untuk salah ketik dekat', () => {
      expect(saranKoreksi('Tere Lliye', ['Tere Liye', 'Andrea Hirata'])).toBe('Tere Liye')
      expect(saranKoreksi('Penerb it', ['Bentang Pustaka', 'Penerbit'])).toBe('Penerbit')
    })

    it('tidak menyarankan nama yang sudah sama atau terlalu jauh', () => {
      expect(saranKoreksi('tere liye', ['Tere Liye'])).toBeNull()
      expect(saranKoreksi('xyz', ['Tere Liye'])).toBeNull()
      expect(saranKoreksi('To', ['Tere Liye'])).toBeNull()
    })
  })
})

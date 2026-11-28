import { describe, it, expect } from 'vitest'
import { daftarDummyBuku } from '@/lib/dataDummyBuku'

const STATUS_DIBOLEHKAN = ['TERSEDIA', 'SEDANG_DIPESAN', 'TERJUAL', 'NONAKTIF']

describe('Seeder dummy katalog buku', () => {
  it('memiliki 12–15 judul dengan kode unik berformat BK-xxxx', () => {
    expect(daftarDummyBuku.length).toBeGreaterThanOrEqual(12)
    expect(daftarDummyBuku.length).toBeLessThanOrEqual(15)

    const kode = daftarDummyBuku.map((buku) => buku.code)
    expect(new Set(kode).size).toBe(kode.length)
    for (const item of kode) expect(item).toMatch(/^BK-\d{4}$/)
  })

  it('mencakup kategori, penulis, dan penerbit yang diminta', () => {
    const kategori = new Set(daftarDummyBuku.map((buku) => buku.kategori))
    const penulis = new Set(daftarDummyBuku.map((buku) => buku.author))
    const penerbit = new Set(daftarDummyBuku.map((buku) => buku.publisher))

    for (const nama of [
      'Fiksi',
      'Sastra',
      'Sejarah',
      'Pengembangan Diri',
      'Bisnis',
      'Biografi',
    ]) {
      expect(kategori.has(nama)).toBe(true)
    }
    for (const nama of [
      'Tere Liye',
      'Andrea Hirata',
      'Pramoedya Ananta Toer',
      'Leila S. Chudori',
      'Dee Lestari',
      'Henry Manampiring',
      'Eka Kurniawan',
    ]) {
      expect(penulis.has(nama)).toBe(true)
    }
    expect(penulis.size).toBeGreaterThanOrEqual(8)

    for (const nama of [
      'Gramedia Pustaka Utama',
      'Bentang Pustaka',
      'Kepustakaan Populer Gramedia',
      'Kompas',
      'Sabakgrip',
      'Mizan',
    ]) {
      expect(penerbit.has(nama)).toBe(true)
    }
  })

  it('memiliki variasi kondisi ORIGINAL dan BEKAS', () => {
    const kondisi = new Set(daftarDummyBuku.map((buku) => buku.kondisi))
    expect(kondisi.has('ORIGINAL')).toBe(true)
    expect(kondisi.has('BEKAS')).toBe(true)
    expect([...kondisi].every((item) => item === 'ORIGINAL' || item === 'BEKAS')).toBe(true)
  })

  it('harga jual, modal, dan stok berada dalam rentang yang diminta', () => {
    for (const buku of daftarDummyBuku) {
      expect(buku.hargaJual).toBeGreaterThanOrEqual(45000)
      expect(buku.hargaJual).toBeLessThanOrEqual(145000)
      expect(buku.hargaModal).toBeLessThan(buku.hargaJual)
      expect(buku.stok).toBeGreaterThanOrEqual(0)
      if (buku.stok > 0) {
        expect(buku.stok).toBeGreaterThanOrEqual(2)
        expect(buku.stok).toBeLessThanOrEqual(15)
      }
      expect(STATUS_DIBOLEHKAN).toContain(buku.status)
    }
  })

  it('menyediakan dua judul dengan stok 0 untuk menguji tampilan stok habis', () => {
    const habis = daftarDummyBuku.filter((buku) => buku.stok === 0)
    expect(habis).toHaveLength(2)
    expect(habis.some((buku) => buku.status === 'TERSEDIA')).toBe(true)
    expect(habis.some((buku) => buku.status === 'TERJUAL')).toBe(true)
  })

  it('tidak menyimpan URL sampul pada data dummy', () => {
    for (const buku of daftarDummyBuku) {
      expect(buku).not.toHaveProperty('imageUrl')
      expect(buku).not.toHaveProperty('coverUrl')
    }
  })
})

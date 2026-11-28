import { describe, it, expect } from 'vitest'
import { slugBuku } from '@/lib/slugBuku'

describe('Slug buku untuk /katalog/[slug]', () => {
  it('menggabungkan judul dan kode secara deterministik', () => {
    expect(slugBuku('Janji', '12')).toBe('janji-12')
    expect(slugBuku('Janji', 'BK-0001')).toBe('janji-bk-0001')
  })

  it('membuang aksen dan menormalkan spasi serta tanda baca', () => {
    expect(slugBuku('  Buku  Hari   Ini!  ', 'A/01')).toBe('buku-hari-ini-a-01')
    expect(slugBuku('Café   Masih', '42')).toBe('cafe-masih-42')
  })

  it('memiliki fallback yang aman bila judul atau kode kosong', () => {
    expect(slugBuku('', '99')).toBe('99')
    expect(slugBuku('Tanpa Kode', '')).toBe('tanpa-kode')
    expect(slugBuku('', '')).toBe('buku')
  })

  it('tidak pernah menghasilkan slug yang sama untuk kode berbeda', () => {
    expect(slugBuku('Janji', '12')).not.toBe(slugBuku('Janji', '13'))
  })
})

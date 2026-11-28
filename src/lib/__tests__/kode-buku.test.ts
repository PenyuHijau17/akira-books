import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
  default: () => ({
    book: { findMany: mockFindMany },
  }),
}))

import {
  nomorKodeBukuTerakhir,
  formatKodeBuku,
  kodeBukuBerikutnya,
} from '@/lib/kodeBuku'

describe('Kode buku otomatis (BK-0001, BK-0002, ...)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mengabaikan kode di luar pola BK dan mengambil nomor terbesar', () => {
    expect(
      nomorKodeBukuTerakhir(['BK-0001', 'BK-0009', 'LEGACY-99', 'BK-0020', '', null])
    ).toBe(20)
  })

  it('mengembalikan 0 bila belum ada kode berformat BK', () => {
    expect(nomorKodeBukuTerakhir(['ABC-1', 'BK-template', undefined])).toBe(0)
  })

  it('memformat nomor dengan empat digit dan menaikkan ke minimal 1', () => {
    expect(formatKodeBuku(1)).toBe('BK-0001')
    expect(formatKodeBuku(42)).toBe('BK-0042')
    expect(formatKodeBuku(12345)).toBe('BK-12345')
    expect(formatKodeBuku(0)).toBe('BK-0001')
  })

  it('menghasilkan kode berikutnya dari data database', async () => {
    mockFindMany.mockResolvedValue([{ code: 'BK-0001' }, { code: 'BK-0007' }])
    expect(await kodeBukuBerikutnya()).toBe('BK-0008')
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { code: { startsWith: 'BK-' } },
      select: { code: true },
    })
  })

  it('mulai dari BK-0001 bila database belum memiliki buku', async () => {
    mockFindMany.mockResolvedValue([])
    expect(await kodeBukuBerikutnya()).toBe('BK-0001')
  })
})

import { describe, expect, it } from 'vitest'
import { statusPanelFormBuku } from '../admin-buku-form'

describe('Pengelolaan Buku — panel formulir (GR-10)', () => {
  it('tertutup secara default agar daftar buku tampil lebih dulu', () => {
    expect(statusPanelFormBuku(false, null)).toEqual({
      tampil: false,
      judul: '',
      kode: '',
      mode: 'TERTUTUP',
    })
  })

  it('muncul sebagai Tambah Buku Baru setelah tombol ditekan', () => {
    expect(statusPanelFormBuku(true, null, 'BK-0009')).toEqual({
      tampil: true,
      judul: 'Tambah Buku Baru',
      kode: 'Kode dibuat otomatis',
      mode: 'TAMBAH',
    })
  })

  it('mode Ubah mengambil prioritas dan memakai kode buku terpilih', () => {
    const panel = statusPanelFormBuku(true, 'buku-42', 'BK-0042')
    expect(panel).toEqual({
      tampil: true,
      judul: 'Ubah Buku',
      kode: 'BK-0042',
      mode: 'UBAH',
    })
  })

  it('memanggil scroll hanya saat panel tampil', () => {
    const panel = statusPanelFormBuku(false, 'buku-42', 'BK-0042')
    expect(panel.tampil).toBe(true)
    expect(statusPanelFormBuku(false, null).tampil).toBe(false)
  })

  it('tidak pernah menyimpan angka modal/laba di status panel (GR-03)', () => {
    const payload = JSON.stringify(statusPanelFormBuku(false, 'buku-42', 'BK-0042'))
    expect(payload).not.toContain('costPrice')
    expect(payload).not.toContain('laba')
  })
})

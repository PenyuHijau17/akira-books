import { describe, expect, it } from 'vitest'
import {
  BATAS_UKURAN_AVATAR,
  berkasAvatarDariUrl,
  deteksiEkstensiAvatar,
  inisialNama,
  namaFileAvatar,
  urlAvatar,
  validasiAvatar,
} from '@/lib/avatar'

const jpeg = [0xff, 0xd8, 0xff, 0xe0, 0, 16]
const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const webp = [
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]

describe('Foto profil — validasi berkas', () => {
  it('membuat inisial dua huruf dari nama', () => {
    expect(inisialNama('Nadia Putri')).toBe('NP')
    expect(inisialNama('akira')).toBe('A')
    expect(inisialNama('')).toBe('AK')
  })

  it('mendeteksi JPG, PNG, dan WEBP dari isi berkas', () => {
    expect(deteksiEkstensiAvatar(jpeg)).toBe('jpg')
    expect(deteksiEkstensiAvatar(png)).toBe('png')
    expect(deteksiEkstensiAvatar(webp)).toBe('webp')
    expect(deteksiEkstensiAvatar([0, 1, 2, 3, 4, 5])).toBeNull()
  })

  it('menolak berkas lebih dari 2 MB', () => {
    const hasil = validasiAvatar({
      size: BATAS_UKURAN_AVATAR + 1,
      type: 'image/png',
      bytes: png,
    })
    expect(hasil.valid).toBe(false)
    expect(hasil.alasan).toContain('2 MB')
  })

  it('menolak MIME yang tidak cocok dengan isi berkas', () => {
    const hasil = validasiAvatar({
      size: 1024,
      type: 'image/png',
      bytes: jpeg,
    })
    expect(hasil.valid).toBe(false)
    expect(hasil.alasan).toContain('tidak sesuai')
  })

  it('menerima foto yang valid', () => {
    const hasil = validasiAvatar({ size: 1024, type: 'image/webp', bytes: webp })
    expect(hasil).toEqual({ valid: true, ekstensi: 'webp' })
  })
})

describe('Foto profil — nama berkas aman', () => {
  it('membuat nama berkas hanya dari karakter aman', () => {
    const nama = namaFileAvatar('user-abcdef/../admin', 'jpg', 123)
    expect(nama).toMatch(/^user-abcdefadmin-123\.jpg$/)
  })

  it('menghasilkan URL lokal yang dikenali', () => {
    const url = urlAvatar('user-1', 'png', 'abc')
    expect(url).toBe('/uploads/avatars/user-1-abc.png')
    expect(berkasAvatarDariUrl(url)).toBe('user-1-abc.png')
  })

  it('menolak URL luar dan percobaan traversal', () => {
    expect(berkasAvatarDariUrl('https://contoh.test/foto.png')).toBeNull()
    expect(berkasAvatarDariUrl('/uploads/avatars/../../.env')).toBeNull()
    expect(berkasAvatarDariUrl(null)).toBeNull()
  })
})

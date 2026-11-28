// src/lib/avatar.ts
// Aturan foto profil: format, ukuran, nama berkas, dan inisial.
// Logika murni agar dapat diuji unit tanpa menyentuh sistem berkas (GR-10).

export const BATAS_UKURAN_AVATAR = 2 * 1024 * 1024 // 2 MB

export type EkstensiAvatar = 'jpg' | 'png' | 'webp'

const MIME_DISETUJUI: Record<EkstensiAvatar, string[]> = {
  jpg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  webp: ['image/webp'],
}

/** Inisial dua huruf dari nama; dipakai bila foto profil kosong. */
export function inisialNama(namaLengkap: string | null | undefined): string {
  const bagian = String(namaLengkap || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (bagian.length === 0) return 'AK'
  const depan = bagian[0].charAt(0)
  const belakang = bagian.length > 1 ? bagian[bagian.length - 1].charAt(0) : ''
  return `${depan}${belakang}`.toLocaleUpperCase('id-ID')
}

/** Deteksi format dari isi berkas, bukan hanya dari nama/MIME yang dikirim klien. */
export function deteksiEkstensiAvatar(bytes: Uint8Array | number[]): EkstensiAvatar | null {
  const b = (i: number) => Number(bytes[i] ?? -1)

  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'jpg'
  if (
    b(0) === 0x89 &&
    b(1) === 0x50 &&
    b(2) === 0x4e &&
    b(3) === 0x47 &&
    b(4) === 0x0d &&
    b(5) === 0x0a &&
    b(6) === 0x1a &&
    b(7) === 0x0a
  )
    return 'png'
  if (
    String.fromCharCode(b(0), b(1), b(2), b(3)) === 'RIFF' &&
    String.fromCharCode(b(8), b(9), b(10), b(11)) === 'WEBP'
  )
    return 'webp'
  return null
}

export function validasiAvatar(file: {
  size: number
  type?: string | null
  bytes: Uint8Array | number[]
}): { valid: boolean; alasan?: string; ekstensi?: EkstensiAvatar } {
  const ukuran = Number(file.size || 0)
  if (ukuran <= 0) return { valid: false, alasan: 'Pilih foto profil terlebih dahulu.' }
  if (ukuran > BATAS_UKURAN_AVATAR)
    return { valid: false, alasan: 'Ukuran foto maksimal 2 MB.' }

  const ekstensi = deteksiEkstensiAvatar(file.bytes)
  if (!ekstensi)
    return { valid: false, alasan: 'Format foto harus JPG, PNG, atau WEBP.' }

  const mime = String(file.type || '').toLowerCase()
  if (!MIME_DISETUJUI[ekstensi].includes(mime))
    return { valid: false, alasan: 'Jenis berkas tidak sesuai dengan isi foto.' }

  return { valid: true, ekstensi }
}

/** Nama berkas dibuat server agar tidak ada path traversal dari klien. */
export function namaFileAvatar(
  userId: string,
  ekstensi: EkstensiAvatar,
  penanda: string | number = Date.now()
): string {
  const pemilik = String(userId || '').replace(/[^a-zA-Z0-9-]/g, '') || 'pengguna'
  const unik = String(penanda).replace(/[^a-zA-Z0-9-]/g, '') || '1'
  return `${pemilik}-${unik}.${ekstensi}`
}

export function urlAvatar(
  userId: string,
  ekstensi: EkstensiAvatar,
  penanda: string | number = Date.now()
): string {
  return `/uploads/avatars/${namaFileAvatar(userId, ekstensi, penanda)}`
}

/** Hanya berkas avatars lokal yang boleh dihapus; URL luar diabaikan. */
export function berkasAvatarDariUrl(url: string | null | undefined): string | null {
  const cocok = String(url || '').match(
    /^\/uploads\/avatars\/([a-zA-Z0-9-]+\.(?:jpg|png|webp))$/
  )
  return cocok?.[1] ?? null
}

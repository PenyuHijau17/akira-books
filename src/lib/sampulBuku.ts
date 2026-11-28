// src/lib/sampulBuku.ts
// Penyimpanan sampul buku di direktori media privat (/app/storage/uploads/sampul-buku).
// Direktori `storage/` sudah ikut dikemas & dienkripsi age oleh skrip backup Tahap 13.
// Sampul dipublikasikan lewat endpoint /api/media/sampul/[nama], bukan file public/.

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

export const UKURAN_MAKSIMAL_SAMPUL = 5 * 1024 * 1024 // 5 MB

const MIME_KE_EKSTENSI: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const EKSTENSI_KE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

// Nama berkas selalu UUID + ekstensi hasil validasi, bukan nama asli pengguna.
const POLA_NAMA_AMAN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/

export function direktoriSampul(): string {
  return path.join(process.cwd(), 'storage', 'uploads', 'sampul-buku')
}

export function ekstensiSampul(mime: string): string | null {
  return MIME_KE_EKSTENSI[String(mime || '').toLowerCase()] ?? null
}

export function mimeSampul(storageName: string): string | null {
  const ekstensi = String(storageName || '').split('.').pop()?.toLowerCase() ?? ''
  return EKSTENSI_KE_MIME[ekstensi] ?? null
}

/** Cek tanda tangan biner agar file dengan MIME palsu tidak diterima. */
function tandaTanganSesuai(mime: string, isi: Buffer): boolean {
  if (mime === 'image/jpeg') {
    return isi.length > 3 && isi[0] === 0xff && isi[1] === 0xd8 && isi[2] === 0xff
  }
  if (mime === 'image/png') {
    return (
      isi.length > 8 &&
      isi[0] === 0x89 && isi[1] === 0x50 && isi[2] === 0x4e && isi[3] === 0x47 &&
      isi[4] === 0x0d && isi[5] === 0x0a && isi[6] === 0x1a && isi[7] === 0x0a
    )
  }
  if (mime === 'image/webp') {
    return (
      isi.length > 12 &&
      isi.toString('ascii', 0, 4) === 'RIFF' &&
      isi.toString('ascii', 8, 12) === 'WEBP'
    )
  }
  return false
}

export async function simpanSampul(berkas: File): Promise<{
  storageName: string
  imageUrl: string
  mime: string
}> {
  const mime = String(berkas.type || '').toLowerCase()
  const ekstensi = ekstensiSampul(mime)
  if (!ekstensi) {
    throw new Error('Format tidak didukung. Gunakan JPEG, PNG, atau WebP.')
  }
  if (berkas.size === 0 || berkas.size > UKURAN_MAKSIMAL_SAMPUL) {
    throw new Error('Ukuran berkas kosong atau melebihi 5 MB.')
  }

  const isi = Buffer.from(await berkas.arrayBuffer())
  if (!tandaTanganSesuai(mime, isi)) {
    throw new Error('Isi berkas tidak sesuai dengan jenis gambar yang dinyatakan.')
  }

  const storageName = `${crypto.randomUUID()}.${ekstensi}`
  await fs.mkdir(direktoriSampul(), { recursive: true })
  await fs.writeFile(path.join(direktoriSampul(), storageName), isi, { flag: 'wx' })

  return {
    storageName,
    imageUrl: `/api/media/sampul/${storageName}`,
    mime,
  }
}

export async function bacaSampul(storageName: string): Promise<Buffer | null> {
  if (!POLA_NAMA_AMAN.test(String(storageName || ''))) return null
  try {
    return await fs.readFile(path.join(direktoriSampul(), storageName))
  } catch {
    return null
  }
}

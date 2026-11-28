// src/lib/kodeBuku.ts
// Pembuatan kode buku otomatis: BK-0001, BK-0002, dst.
// Kode dihasilkan di server agar tidak bisa dimanipulasi klien dan tetap
// konsisten meskipun beberapa admin menambah buku bersamaan (unique + retry).

import prisma from '@/lib/prisma'

const POLA_KODE = /^BK-(\d+)$/

/** Ambil nomor terbesar dari sekumpulan kode buku berformat BK-xxxx. */
export function nomorKodeBukuTerakhir(kodeList: Array<string | null | undefined>): number {
  let maksimal = 0
  for (const kode of kodeList) {
    const cocok = POLA_KODE.exec(String(kode ?? '').trim())
    if (!cocok) continue
    const nomor = Number(cocok[1])
    if (Number.isSafeInteger(nomor) && nomor > maksimal) maksimal = nomor
  }
  return maksimal
}

/** Format nomor menjadi kode buku dengan minimal empat digit. */
export function formatKodeBuku(nomor: number): string {
  return `BK-${String(Math.max(1, Math.floor(nomor))).padStart(4, '0')}`
}

/**
 * Hitung kode berikutnya dari data yang ada di database.
 * Kode di luar pola BK- (misalnya hasil import lama) diabaikan.
 */
export async function kodeBukuBerikutnya(): Promise<string> {
  const daftar = await prisma().book.findMany({
    where: { code: { startsWith: 'BK-' } },
    select: { code: true },
  })
  return formatKodeBuku(nomorKodeBukuTerakhir(daftar.map((buku) => buku.code)) + 1)
}

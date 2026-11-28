// src/lib/namaBuku.ts
// Fungsi murni untuk merapikan nama Penulis/Penerbit dan memberi saran ejaan.
// File ini TIDAK mengimpor Prisma agar aman dipakai dari komponen klien.

/** Trim + spasi berlebih (termasuk tab/newline) jadi satu spasi. */
export function rapikanNama(nilai: unknown): string {
  return String(nilai ?? '').trim().replace(/\s+/g, ' ')
}

/** Kunci perbandingan case-insensitive. */
export function kunciNama(nilai: unknown): string {
  return rapikanNama(nilai).toLocaleLowerCase('id-ID')
}

/** Daftar unik nama, memakai ejaan pertama yang tersimpan sebagai bentuk baku. */
export function daftarNamaUnik(nilaiList: Array<string | null | undefined>): string[] {
  const peta = new Map<string, string>()
  for (const nilai of nilaiList) {
    const rapi = rapikanNama(nilai)
    if (!rapi) continue
    const kunci = kunciNama(rapi)
    if (!peta.has(kunci)) peta.set(kunci, rapi)
  }
  return Array.from(peta.values()).sort((a, b) => a.localeCompare(b, 'id'))
}

/** Samakan dengan ejaan baku di database bila kuncinya sama (abaikan huruf besar/kecil). */
export function samakanNama(nilai: unknown, daftarBaku: string[]): string {
  const rapi = rapikanNama(nilai)
  if (!rapi) return ''
  const kunci = kunciNama(rapi)
  return daftarBaku.find((nama) => kunciNama(nama) === kunci) ?? rapi
}

/** Jarak edit Levenshtein (case-insensitive, spasi sudah dirapikan). */
export function jarakLevenshtein(a: string, b: string): number {
  const kiri = kunciNama(a)
  const kanan = kunciNama(b)
  if (kiri === kanan) return 0
  if (!kiri.length) return kanan.length
  if (!kanan.length) return kiri.length

  let barisSebelumnya: number[] = Array.from({ length: kanan.length + 1 }, (_, i) => i)
  for (let i = 1; i <= kiri.length; i++) {
    const barisSekarang: number[] = [i]
    for (let j = 1; j <= kanan.length; j++) {
      const biaya = kiri[i - 1] === kanan[j - 1] ? 0 : 1
      barisSekarang[j] = Math.min(
        barisSekarang[j - 1] + 1,
        barisSebelumnya[j] + 1,
        barisSebelumnya[j - 1] + biaya
      )
    }
    barisSebelumnya = barisSekarang
  }
  return barisSebelumnya[kanan.length]
}

/**
 * Saran koreksi ringan untuk nama baru: kandidat terdekat dengan jarak ≤ 2.
 * Nama yang persis sama (beda huruf besar/kecil) tidak disarankan karena
 * sudah diselaraskan otomatis oleh server.
 */
export function saranKoreksi(nilai: unknown, daftarBaku: string[], batas = 2): string | null {
  const rapi = rapikanNama(nilai)
  if (rapi.length < 3) return null

  let terbaik: string | null = null
  let jarakTerkecil = batas + 1
  for (const calon of daftarBaku) {
    if (kunciNama(calon) === kunciNama(rapi)) continue
    if (Math.abs(calon.length - rapi.length) > batas) continue
    const jarak = jarakLevenshtein(rapi, calon)
    if (jarak <= batas && jarak < jarakTerkecil) {
      jarakTerkecil = jarak
      terbaik = calon
    }
  }
  return terbaik
}

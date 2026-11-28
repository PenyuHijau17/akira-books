// src/lib/notifikasiKunci.ts
// Kunci kanonik notifikasi: satu baris per (penerima, jenis kejadian, konteks).
// Logika murni tanpa database agar dapat diuji unit (GR-10).
// BR-008/BR-003: kunci bersifat per penerima; GR-03: tidak membawa data finansial.

import { kategoriDariKunci } from './notifikasi'

const POLA_ID =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const POLA_NOMOR_PESANAN = /AKB-\d{8}-\d{6}/i

export type KunciNotifikasi = {
  /** Kunci grup kanonik yang disimpan ke database. */
  groupKey: string
  /** Jenis kejadian yang stabil (tanpa langkah, userId, atau cap waktu). */
  jenis: string
  /** Konteks utama: id pesanan, kanal pengiriman, atau pengenal lain. */
  konteks: string
  /** Kategori tampilan yang sah. */
  kategori: string
}

function daftarId(...nilai: Array<string | null | undefined>): string[] {
  const hasil = new Set<string>()
  for (const item of nilai) {
    for (const cocok of String(item || '').match(POLA_ID) || []) hasil.add(cocok.toLowerCase())
  }
  return [...hasil]
}

function segmen(groupKey: string | null | undefined): string[] {
  return String(groupKey || '')
    .split(':')
    .map((bagian) => bagian.trim())
    .filter(Boolean)
}

/**
 * Jenis kejadian sengaja dibedakan, bukan sekadar kategori besar. Pengingat bukti
 * dan pengingat jadwal pada pesanan yang sama tetap dua notifikasi berbeda.
 */
export function jenisNotifikasiDariKunci(
  groupKey: string | null | undefined,
  kategori?: string | null
): string {
  const kunci = String(groupKey || '').toLowerCase()
  const bagian = segmen(groupKey)
  const kedua = String(bagian[1] || '').toUpperCase()
  const ketiga = String(bagian[2] || '').toUpperCase()

  /** Kunci yang sudah kanonik memakai segmen kedua berhuruf kapital. */
  const kanonik = (awal: string) =>
    kedua.startsWith(awal) ? kedua : null

  if (kunci.startsWith('outbox:gagal') || kunci.startsWith('sistem:outbox')) return 'OUTBOX_GAGAL'
  if (kunci.startsWith('pengingat:pengingat_jadwal')) return 'PENGINGAT_JADWAL'
  if (kunci.startsWith('pengingat:pengingat_bukti')) return 'PENGINGAT_BUKTI'
  if (kunci.startsWith('pengingat:pengingat_putusan')) return 'PENGINGAT_PUTUSAN'
  if (kunci.startsWith('pengingat:')) return 'PENGINGAT'
  if (kunci.startsWith('auto-cancel')) return 'PEMBATALAN_OTOMATIS'
  if (kunci.startsWith('pembatalan')) return 'PEMBATALAN'
  if (kunci.startsWith('refund')) return kanonik('REFUND_') || `REFUND_${kedua || 'LAIN'}`
  if (kunci.startsWith('jadwal')) return kanonik('JADWAL_') || `JADWAL_${kedua || 'LAIN'}`
  if (kunci.startsWith('bukti')) return kanonik('BUKTI_') || `BUKTI_${kedua || 'LAIN'}`
  if (kunci.startsWith('pembayaran')) return kanonik('PEMBAYARAN_') || `PEMBAYARAN_${kedua || 'LAIN'}`
  if (kunci.startsWith('putusan')) return kanonik('PEMBAYARAN_') || `PEMBAYARAN_PUTUSAN_${kedua || 'LAIN'}`
  if (kunci.startsWith('metode')) return kanonik('METODE_') || `METODE_${kedua || 'LAIN'}`
  if (kunci.startsWith('tenggat')) return kanonik('TENGGAT_') || `TENGGAT_${kedua || 'LAIN'}`
  if (kunci.startsWith('qris')) return 'QRIS_DIUBARUI'
  if (kunci.startsWith('keranjang')) return 'KERANJANG'
  if (kunci.startsWith('pesanan'))
    return kanonik('PESANAN_') || `PESANAN_${ketiga || kedua || 'LAIN'}`
  if (kunci.startsWith('penjualan')) return kanonik('PENJUALAN_') || `PENJUALAN_${kedua || 'LAIN'}`
  // Usul dan keputusan untuk koreksi yang sama adalah satu jenis kejadian:
  // keputusan harus menimpa usul, bukan membuat kartu baru.
  if (kunci.startsWith('koreksi-offline')) return 'KOREKSI_OFFLINE'
  if (kunci.startsWith('sistem') || kunci.startsWith('toko'))
    return kanonik('SISTEM_') || `SISTEM_${kedua || 'LAIN'}`

  const bentuk = bagian.slice(0, 2).join('_').toUpperCase()
  return bentuk || String(kategori || 'UMUM').toUpperCase()
}

/** Prefix tetap agar `kategoriDariKunci` dan tampilan lama tetap mengenali kunci. */
function prefixKunci(groupKey: string | null | undefined): string {
  const bagian = segmen(groupKey)
  if (bagian[0]?.toLowerCase() === 'sistem' && bagian[1]?.toLowerCase() === 'outbox')
    return 'outbox'
  return bagian[0]?.toLowerCase() || 'umum'
}

function kategoriKanonik(
  groupKey: string | null | undefined,
  kategori: string | null | undefined
): string {
  const kunci = String(groupKey || '').toLowerCase()
  if (kategori && ['PEMBAYARAN', 'JADWAL', 'PESANAN', 'PENJUALAN', 'SISTEM', 'UMUM'].includes(kategori))
    return kategori
  if (kunci.startsWith('outbox:gagal') || kunci.startsWith('sistem:outbox')) return 'SISTEM'
  return kategoriDariKunci(groupKey)
}

/**
 * Ubah kunci mentah menjadi kunci kanonik. userId, langkah pengingat, cap waktu,
 * dan deliveryKey tidak boleh menjadi bagian kunci—semuanya membuat duplikat.
 */
export function kunciBakuNotifikasi(args: {
  groupKey?: string | null
  kategori?: string | null
  entitasId?: string | null
  message?: string | null
  userId?: string | null
  kanal?: string | null
}): KunciNotifikasi {
  const groupKey = String(args.groupKey || '')
  const jenis = jenisNotifikasiDariKunci(groupKey, args.kategori)
  const kategori = kategoriKanonik(groupKey, args.kategori)
  const idPenerima = String(args.userId || '').toLowerCase()
  const ids = daftarId(groupKey, args.entitasId, args.message).filter((id) => id !== idPenerima)
  const pesan = String(args.message || '')
  const nomor = pesan.match(POLA_NOMOR_PESANAN)?.[0]?.toUpperCase()

  let konteks = '-'
  if (jenis === 'OUTBOX_GAGAL') {
    konteks = String(args.kanal || 'EMAIL').toUpperCase()
  } else if (ids.length > 0) {
    // `qris:diganti:<idQris>:<idPesanan>`: pesanan ada di UUID terakhir.
    konteks = jenis === 'QRIS_DIUBARUI' ? ids[ids.length - 1] : ids[0]
  } else if (nomor) {
    konteks = nomor
  } else {
    const bagian = segmen(groupKey)
    konteks =
      bagian.slice(1).find((nilai) => !/^\d{8,}$/.test(nilai) && nilai.toLowerCase() !== idPenerima) ||
      '-'
  }

  return {
    groupKey:
      jenis === 'OUTBOX_GAGAL'
        ? `outbox:gagal:${konteks}`
        : `${prefixKunci(groupKey)}:${jenis}:${konteks}`,
    jenis,
    konteks,
    kategori,
  }
}

/** Buang jejak teknis dari teks yang dibaca pengguna (legacy rows ikut dibersihkan). */
export function bersihkanPesanNotifikasi(pesan: string | null | undefined): string {
  return String(pesan || '')
    .replace(/Kunci pengiriman:\s*[^\s.]+\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// src/lib/inboxNotifikasi.ts
// Penyusun Kotak Masuk per akun: notifikasi diubah menjadi utas/percakapan ringkas.
// Admin mengelompokkan berdasarkan pelanggan pemilik pesanan; Customer berdasarkan
// pesanannya. Logika murni (tanpa database) agar dapat diuji unit (GR-10).
// GR-03: metadata keuangan sengaja tidak ikut ke dalam utas.

import { inisialNama } from '@/lib/avatar'
import {
  kategoriDariKunci,
  tautanDetailPesanan,
  type NotifikasiItem,
} from '@/lib/notifikasi'

export type PeranInbox = 'CUSTOMER' | 'ADMIN_BIASA' | 'ADMIN_UTAMA'

export type InfoPesananInbox = {
  id: string
  orderNumber: string
  customerId: string
}

export type InfoPenggunaInbox = {
  id: string
  name: string | null
  avatarUrl?: string | null
}

export type PesanInbox = {
  id: string
  isi: string
  waktu: string
  sudahDibaca: boolean
  kategori: string
  tautan: string | null
  labelTautan: string | null
}

export type UtasInbox = {
  id: string
  jenis: 'PELANGGAN' | 'PESANAN' | 'SISTEM' | 'UMUM'
  judul: string
  subjudul: string | null
  avatarUrl: string | null
  inisial: string
  kodePesanan: string | null
  cuplikan: string
  waktuTerbaru: string
  jumlah: number
  belumDibaca: number
  pesan: PesanInbox[]
}

const POLA_ID_GLOBAL =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const POLA_NOMOR_PESANAN = /AKB-\d{8}-\d{6}/gi

function waktu(item: NotifikasiItem): number {
  const nilai =
    item.createdAt instanceof Date
      ? item.createdAt.getTime()
      : new Date(item.createdAt).getTime()
  return Number.isFinite(nilai) ? nilai : 0
}

function uuidDari(...teks: Array<string | null | undefined>): string[] {
  return teks.flatMap((nilai) => String(nilai || '').match(POLA_ID_GLOBAL) || [])
}

function nomorPesananDari(item: NotifikasiItem): string | null {
  const teks = `${item.message || ''} ${item.groupKey || ''}`
  const cocok = teks.match(POLA_NOMOR_PESANAN)?.[0]
  return cocok ? cocok.toUpperCase() : null
}

/** Salinan putih: field sensitif tidak pernah masuk ke utas. */
function amankan(item: NotifikasiItem): NotifikasiItem {
  return {
    id: String(item.id || ''),
    kategori: item.kategori ?? null,
    entitasId: item.entitasId ?? null,
    groupKey: item.groupKey ?? null,
    message: String(item.message || '').replace(/\s+/g, ' ').trim(),
    isRead: Boolean(item.isRead),
    createdAt: item.createdAt,
  }
}

function ringkasPesan(teks: string, batas: number = 110): string {
  const bersih = teks
    .replace(/^Pengingat:\s*/i, '')
    .replace(/Kunci pengiriman:[^.]*\.?/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!bersih) return 'Tidak ada ringkasan tambahan.'
  return bersih.length > batas ? `${bersih.slice(0, batas - 1).trim()}…` : bersih
}

function aksiLangsung(
  item: NotifikasiItem,
  peran: PeranInbox,
  daftarPesanan: Array<{ id: string; orderNumber: string }>,
  sistem: boolean
): { tautan: string | null; labelTautan: string | null } {
  const tautanDetail = tautanDetailPesanan(item, daftarPesanan)
  if (tautanDetail)
    return { tautan: tautanDetail, labelTautan: 'Lihat Detail Pesanan' }

  if (peran === 'CUSTOMER') return { tautan: null, labelTautan: null }

  if (sistem)
    return { tautan: '/admin/notifikasi', labelTautan: 'Buka Peringatan Notifikasi' }

  const teks = `${item.groupKey || ''} ${item.message || ''}`.toLowerCase()
  if (/pembayaran|bukti|putusan|verifikasi|qris|refund|tenggat|metode/.test(teks))
    return { tautan: '/admin/pembayaran', labelTautan: 'Buka Verifikasi Bayar' }

  return { tautan: null, labelTautan: null }
}

export function susunUtasInbox(args: {
  daftar: NotifikasiItem[]
  peran: PeranInbox
  pesanan: InfoPesananInbox[]
  pengguna: InfoPenggunaInbox[]
}): UtasInbox[] {
  const petaPesanan = new Map(args.pesanan.map((p) => [p.id, p]))
  const petaNomor = new Map(args.pesanan.map((p) => [p.orderNumber, p]))
  const petaPengguna = new Map(args.pengguna.map((u) => [u.id, u]))
  const daftarPesanan = args.pesanan.map((p) => ({ id: p.id, orderNumber: p.orderNumber }))
  const utas = new Map<string, UtasInbox>()

  for (const mentah of [...args.daftar].sort((a, b) => waktu(a) - waktu(b))) {
    const item = amankan(mentah)
    const ids = uuidDari(item.entitasId, item.groupKey, item.message)
    const nomor = nomorPesananDari(item)
    const pesanan =
      ids.map((id) => petaPesanan.get(id)).find(Boolean) ||
      (nomor ? petaNomor.get(nomor) : undefined)

    const kategori =
      String(item.kategori || '').toUpperCase() || kategoriDariKunci(item.groupKey)
    const kunciGrup = String(item.groupKey || '').toLowerCase()
    const sistem = kategori === 'SISTEM' || kunciGrup.startsWith('outbox:')

    let kunci: string
    let jenis: UtasInbox['jenis']
    let judul: string
    let subjudul: string | null
    let avatarUrl: string | null
    let inisial: string
    let kodePesanan: string | null

    if (pesanan && args.peran !== 'CUSTOMER') {
      const pelanggan = petaPengguna.get(pesanan.customerId)
      kunci = `pelanggan:${pesanan.customerId}`
      jenis = 'PELANGGAN'
      judul = pelanggan?.name?.trim() || 'Pelanggan Toko'
      subjudul = 'Pelanggan Akira Books'
      avatarUrl = pelanggan?.avatarUrl ?? null
      inisial = inisialNama(judul)
      kodePesanan = pesanan.orderNumber || nomor
    } else if (pesanan && args.peran === 'CUSTOMER') {
      const pemilik = petaPengguna.get(pesanan.customerId)
      kunci = `pesanan:${pesanan.id}`
      jenis = 'PESANAN'
      judul = `Pesanan ${pesanan.orderNumber || nomor || ''}`.trim()
      subjudul = 'Riwayat pesanan Anda'
      avatarUrl = pemilik?.avatarUrl ?? null
      inisial = inisialNama(pemilik?.name || judul)
      kodePesanan = pesanan.orderNumber || nomor
    } else if (args.peran !== 'CUSTOMER') {
      // Admin: semua pesan tanpa pelanggan terverifikasi masuk satu grup Sistem Toko.
      kunci = 'sistem'
      jenis = 'SISTEM'
      judul = 'Sistem Toko'
      subjudul = sistem ? 'Peringatan otomatis' : 'Kabar operasional toko'
      avatarUrl = null
      inisial = 'ST'
      kodePesanan = nomor
    } else {
      // Customer: pesan umum/sistem dirangkum sebagai Info Toko.
      kunci = 'umum'
      jenis = 'UMUM'
      judul = 'Info Toko'
      subjudul = 'Kabar dari Akira Books'
      avatarUrl = null
      inisial = 'AK'
      kodePesanan = nomor
    }

    const grup =
      utas.get(kunci) ||
      ({
        id: kunci,
        jenis,
        judul,
        subjudul,
        avatarUrl,
        inisial,
        kodePesanan,
        cuplikan: '',
        waktuTerbaru: new Date(waktu(item)).toISOString(),
        jumlah: 0,
        belumDibaca: 0,
        pesan: [],
      } satisfies UtasInbox)

    const aksi = aksiLangsung(item, args.peran, daftarPesanan, sistem)
    grup.pesan.push({
      id: item.id,
      isi: item.message,
      waktu: new Date(waktu(item)).toISOString(),
      sudahDibaca: Boolean(item.isRead),
      kategori,
      tautan: aksi.tautan,
      labelTautan: aksi.labelTautan,
    })
    grup.jumlah += 1
    if (!item.isRead) grup.belumDibaca += 1
    grup.cuplikan = ringkasPesan(item.message)
    grup.waktuTerbaru = new Date(waktu(item)).toISOString()
    grup.kodePesanan = kodePesanan

    utas.set(kunci, grup)
  }

  return [...utas.values()].sort(
    (a, b) =>
      new Date(b.waktuTerbaru).getTime() - new Date(a.waktuTerbaru).getTime()
  )
}

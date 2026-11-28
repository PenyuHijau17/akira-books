// src/lib/notifikasiServer.ts
// Helper server-side Tahap 12: inbox per-akun, penanda baca, outbox idempoten, dan eskalasi.
// Semua akses database memakai prisma()/client transaksi (GR-02, GR-03, BR-008).

import prisma from '@/lib/prisma'
import { kirimEmailKeTerminal } from '@/lib/auth'
import { saringFieldModal } from '@/lib/pesanan'
import {
  kategoriDariKunci,
  type KategoriNotifikasi,
} from '@/lib/notifikasi'
import {
  kunciPengiriman,
  penilaianPengirimanOutbox,
  pesanEskalasiOutbox,
  type HasilPengiriman,
  type OutboxDasar,
} from '@/lib/outbox'
import type {
  InfoPesananInbox,
  InfoPenggunaInbox,
  PeranInbox,
} from '@/lib/inboxNotifikasi'
import { simpanNotifikasiBaku } from '@/lib/notifikasiPenyimpanan'
import { kelompokkanNotifikasiMenjadiKartu } from '@/lib/notifikasiKartu'

type Klien = any

const FIELD_KEUANGAN_TAMBAHAN = new Set([
  'labaHistoris',
  'labaHitungUlang',
  'labaHistorisTotal',
  'hitungUlangTotal',
  'hitungUlangOffline',
  'hitungUlangOnline',
  'selisih',
  'modal',
])

/** GR-03: buang modal/laba secara rekursif sebelum payload dikirim ke Admin Biasa/Customer. */
export function saringNotifikasiUntukPeran<T>(data: T, peran: string | null | undefined): T {
  // Admin Utama berhak melihat modal/laba; peran lain tidak (GR-03).
  if (peran === 'ADMIN_UTAMA') return data
  const buang = (nilai: any): any => {
    if (Array.isArray(nilai)) return nilai.map(buang)
    if (nilai && typeof nilai === 'object' && !(nilai instanceof Date)) {
      const hasil: Record<string, unknown> = {}
      for (const [kunci, isi] of Object.entries(nilai)) {
        if (FIELD_KEUANGAN_TAMBAHAN.has(kunci)) continue
        hasil[kunci] = buang(isi)
      }
      return hasil
    }
    return nilai
  }
  return buang(saringFieldModal(data)) as T
}

function kategoriValid(nilai: string | null | undefined): KategoriNotifikasi {
  if (nilai && ['PEMBAYARAN', 'JADWAL', 'PESANAN', 'PENJUALAN', 'SISTEM', 'UMUM'].includes(nilai)) {
    return nilai as KategoriNotifikasi
  }
  return 'UMUM'
}

const POLA_ID_GLOBAL =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const POLA_NOMOR_PESANAN = /AKB-\d{8}-\d{6}/gi

/** Kumpulkan petunjuk pesanan dari notifikasi tanpa mengubah isi pesan. */
function petunjukInbox(baris: Array<any>): { ids: string[]; nomor: string[] } {
  const ids = new Set<string>()
  const nomor = new Set<string>()
  for (const n of baris) {
    for (const nilai of [n.entitasId, n.groupKey, n.message]) {
      for (const id of String(nilai || '').match(POLA_ID_GLOBAL) || []) ids.add(id)
    }
    const cocok = String(n.message || '').match(POLA_NOMOR_PESANAN)?.[0]
    if (cocok) nomor.add(cocok)
  }
  return { ids: [...ids], nomor: [...nomor] }
}

/**
 * Hubungkan notifikasi ke pesanan dan pemiliknya di server.
 * Jika query pendukung gagal, inbox tetap tampil sebagai utas umum.
 */
async function konteksInbox(
  client: Klien,
  baris: Array<any>,
  userId: string
): Promise<{ pesanan: InfoPesananInbox[]; pengguna: InfoPenggunaInbox[] }> {
  try {
    const { ids, nomor } = petunjukInbox(baris)
    const atau: any[] = []
    if (ids.length) atau.push({ id: { in: ids } })
    if (nomor.length) atau.push({ orderNumber: { in: nomor } })

    const pesanan: InfoPesananInbox[] = atau.length
      ? await client.order.findMany({
          where: { OR: atau },
          select: { id: true, orderNumber: true, customerId: true },
        })
      : []

    const idsPengguna = [...new Set([userId, ...pesanan.map((p) => p.customerId)])]
    const pengguna: InfoPenggunaInbox[] = await client.user.findMany({
      where: { id: { in: idsPengguna } },
      select: { id: true, name: true, avatarUrl: true },
    })
    return { pesanan, pengguna }
  } catch (error) {
    console.error('Gagal memuat konteks inbox:', error)
    return { pesanan: [], pengguna: [] }
  }
}

/** Daftar notifikasi milik satu akun + jumlah belum dibaca, sudah dikelompokkan (BR-003). */
export async function daftarNotifikasiPengguna(args: {
  userId: string
  peran: string | null | undefined
  limit?: number
  client?: Klien
  tanpaKonteks?: boolean
}) {
  const client = args.client ?? prisma()
  const batas = Math.min(Math.max(1, Number(args.limit) || 100), 200)

  const [baris, belumDibaca] = await Promise.all([
    client.notification.findMany({
      where: { userId: args.userId },
      orderBy: { createdAt: 'desc' },
      take: batas,
    }),
    client.notification.count({ where: { userId: args.userId, isRead: false } }),
  ])

  const daftar = (baris as Array<any>).map((n) => ({
    id: n.id,
    kategori: n.kategori || kategoriDariKunci(n.groupKey),
    entitasId: n.entitasId || null,
    groupKey: n.groupKey,
    message: n.message,
    isRead: Boolean(n.isRead),
    metadata: n.metadata ?? null,
    createdAt: new Date(n.createdAt).toISOString(),
  }))

  const konteks = args.tanpaKonteks
    ? { pesanan: [] as InfoPesananInbox[], pengguna: [] as InfoPenggunaInbox[] }
    : await konteksInbox(client, baris as Array<any>, args.userId)
  const peranKartu: PeranInbox =
    args.peran === 'ADMIN_UTAMA' || args.peran === 'ADMIN_BIASA'
      ? args.peran
      : 'CUSTOMER'
  const kartu = args.tanpaKonteks
    ? []
    : kelompokkanNotifikasiMenjadiKartu(daftar as any, {
        userId: args.userId,
        peran: peranKartu,
        pesanan: konteks.pesanan,
        pengguna: konteks.pengguna,
      })

  return saringNotifikasiUntukPeran(
    {
      belumDibaca,
      daftar,
      kartu,
    },
    args.peran
  )
}

/**
 * Tandai satu/beberapa notifikasi sebagai dibaca. Filter `userId` di query menjamin
 * tidak ada notifikasi akun lain yang berubah meski id disusupkan (BR-002/BR-003).
 */
export async function tandaiNotifikasiDibaca(args: {
  userId: string
  ids?: string[]
  semua?: boolean
  client?: Klien
}): Promise<number> {
  const client = args.client ?? prisma()
  const where: any = { userId: args.userId, isRead: false }
  if (!args.semua) {
    const ids = (args.ids || []).map(String).filter(Boolean)
    if (ids.length === 0) return 0
    where.id = { in: ids }
  }
  const hasil = await client.notification.updateMany({
    where,
    data: { isRead: true, readAt: new Date() },
  })
  return hasil.count
}

/** Eksternal hanya abstraksi log-terminal sesuai OD-04; tidak menambah layanan (GR-01). */
export function eksternalAktif(): boolean {
  return String(process.env.AKIRA_NOTIF_EKSTERNAL || '').toLowerCase() === 'terminal'
}

/** Antrikan pengiriman dengan kunci unik; pemanggilan ulang tidak membuat duplikat. */
export async function enqueueOutbox(args: {
  userId: string
  groupKey: string
  message: string
  kanal?: string
  kategori?: string | null
  entitasId?: string | null
  deliveryKey?: string
  client?: Klien
  sekarang?: Date
}) {
  const client = args.client ?? prisma()
  const kanal = String(args.kanal || 'IN_APP').toUpperCase()
  if (kanal !== 'IN_APP' && !eksternalAktif()) return null

  const deliveryKey =
    args.deliveryKey ||
    kunciPengiriman({
      kanal,
      userId: args.userId,
      groupKey: args.groupKey,
      kategori: args.kategori,
      entitasId: args.entitasId,
    })
  const sudah = await client.notificationOutbox.findUnique({
    where: { deliveryKey },
    select: { id: true },
  })
  if (sudah) return null

  const sekarang = args.sekarang ?? new Date()
  const inApp = kanal === 'IN_APP'
  return client.notificationOutbox.create({
    data: {
      deliveryKey,
      userId: args.userId,
      kanal,
      kategori: kategoriValid(args.kategori || kategoriDariKunci(args.groupKey)),
      entitasId: args.entitasId || null,
      message: args.message,
      status: inApp ? 'TERKIRIM' : 'PENDING',
      attempts: inApp ? 1 : 0,
      nextAttemptAt: sekarang,
      sentAt: inApp ? sekarang : null,
    },
  })
}

async function tulisAudit(client: Klien, params: {
  actorId: string
  actorRole: string
  action: string
  targetId: string
  reason?: string | null
}) {
  await client.adminAuditLog.create({
    data: {
      actorId: params.actorId,
      actorRoleSnapshot: params.actorRole,
      action: params.action,
      targetEntity: 'NotificationOutbox',
      targetId: params.targetId,
      oldValue: { status: 'GAGAL' } as any,
      newValue: { status: 'DITINDAKLANJUTI' } as any,
      reason: params.reason ?? null,
    },
  })
}

/** Jalankan antrean outbox yang sudah jatuh tempo dengan backoff bertahap. */
export async function jalankanOutbox(args: {
  sekarang?: Date
  kirim?: (item: OutboxDasar) => Promise<HasilPengiriman> | HasilPengiriman
  client?: Klien
}): Promise<{ diproses: number; terkirim: number; gagal: number; eskalasi: number }> {
  const client = args.client ?? prisma()
  const sekarang = args.sekarang ?? new Date()
  const kirim =
    args.kirim ??
    (async (item: OutboxDasar): Promise<HasilPengiriman> => {
      if (!eksternalAktif()) return { berhasil: true }
      if (item.kanal === 'EMAIL') {
        const pengguna = await client.user.findUnique({
          where: { id: item.userId },
          select: { email: true },
        })
        kirimEmailKeTerminal(
          pengguna?.email || item.userId,
          `Notifikasi Akira Books (${item.kategori || 'UMUM'})`,
          item.message
        )
      } else {
        console.log(`[OUTBOX ${item.kanal}] ${item.deliveryKey}: ${item.message}`)
      }
      return { berhasil: true }
    })

  const antrean = await client.notificationOutbox.findMany({
    where: { status: 'PENDING', nextAttemptAt: { lte: sekarang } },
    orderBy: { nextAttemptAt: 'asc' },
    take: 50,
  })

  let terkirim = 0
  let gagal = 0
  let eskalasi = 0

  for (const baris of antrean as Array<any>) {
    let hasil: HasilPengiriman
    try {
      hasil = await kirim(baris as OutboxDasar)
    } catch (error: any) {
      hasil = { berhasil: false, error: error?.message || 'Pengiriman melempar kesalahan' }
    }

    const keputusan = penilaianPengirimanOutbox({
      attempts: Number(baris.attempts),
      maxAttempts: Number(baris.maxAttempts),
      kirim: hasil,
      sekarang,
    })

    await client.notificationOutbox.update({
      where: { id: baris.id },
      data: {
        status: keputusan.status,
        attempts: keputusan.attempts,
        nextAttemptAt: keputusan.nextAttemptAt,
        sentAt: keputusan.sentAt,
        lastError: keputusan.lastError,
      },
    })

    if (keputusan.status === 'TERKIRIM') terkirim += 1
    if (keputusan.status === 'GAGAL') gagal += 1

    if (keputusan.butuhEskalasi && !baris.escalationNotified) {
      const adminUtama = await client.user.findMany({
        where: { role: 'ADMIN_UTAMA', isActive: true },
        select: { id: true },
      })
      for (const admin of adminUtama as Array<{ id: string }>) {
        const kanal = String(baris.kanal || 'EMAIL').toUpperCase()
        // Satu peringatan sistem per kanal: deliveryKey tidak boleh masuk kunci.
        await simpanNotifikasiBaku({
          userId: admin.id,
          groupKey: `outbox:gagal:${kanal}`,
          message: pesanEskalasiOutbox({
            ...baris,
            attempts: keputusan.attempts,
          } as OutboxDasar),
          kategori: 'SISTEM',
          kanal,
          client,
        })
      }
      eskalasi += 1
      await client.notificationOutbox.update({
        where: { id: baris.id },
        data: { escalationNotified: true },
      })
    }
  }

  return { diproses: antrean.length, terkirim, gagal, eskalasi }
}

/** Panel Admin Utama: daftar kegagalan pengiriman yang perlu ditindaklanjuti. */
export async function daftarOutboxGagal(args: { client?: Klien } = {}) {
  const client = args.client ?? prisma()
  const baris = await client.notificationOutbox.findMany({
    where: { status: 'GAGAL' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return (baris as Array<any>).map((b) => ({
    id: b.id,
    deliveryKey: b.deliveryKey,
    kanal: b.kanal,
    kategori: b.kategori,
    message: b.message,
    attempts: Number(b.attempts),
    maxAttempts: Number(b.maxAttempts),
    lastError: b.lastError,
    escalationNotified: Boolean(b.escalationNotified),
    createdAt: new Date(b.createdAt).toISOString(),
  }))
}

/** Tindak lanjut Admin Utama: tandai gagal tanpa mengirim ulang (anti-duplikasi). */
export async function tandaiOutboxDitindaklanjuti(args: {
  id: string
  actorId: string
  peran: string
  catatan?: string | null
  client?: Klien
}) {
  const client = args.client ?? prisma()
  const baris = await client.notificationOutbox.findUnique({ where: { id: args.id } })
  if (!baris) throw new Error('Antrean pengiriman tidak ditemukan')
  if (baris.status !== 'GAGAL') throw new Error('Hanya antrean gagal yang dapat ditindaklanjuti')

  const diperbarui = await client.notificationOutbox.update({
    where: { id: args.id },
    data: { status: 'DITINDAKLANJUTI' },
  })
  await tulisAudit(client, {
    actorId: args.actorId,
    actorRole: args.peran,
    action: 'TINDAK_LANJUT_OUTBOX_GAGAL',
    targetId: args.id,
    reason: args.catatan ?? null,
  })
  return diperbarui
}

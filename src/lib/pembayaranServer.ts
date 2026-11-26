// src/lib/pembayaranServer.ts
// Helper server-side Tahap 8: penyimpanan berkas privat, audit append-only, notifikasi,
// riwayat status, dan pengingat. Semua akses database memakai prisma() (Prisma 7 adapter).

import { promises as fs } from 'fs'
import path from 'path'
import prisma from '@/lib/prisma'
import { kirimEmailKeTerminal } from '@/lib/auth'
import { kategoriDariKunci } from '@/lib/notifikasi'
import { enqueueOutbox } from '@/lib/notifikasiServer'

export type BerkasServer = {
  name: string
  type: string
  size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

const MIME_MENURUT_EKSTENSI: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function direktoriUnggahan(jenis: 'qris' | 'bukti'): string {
  return path.join(process.cwd(), 'storage', 'uploads', jenis)
}

/** Simpan berkas dengan nama acak; nama asli tidak pernah dipakai sebagai nama file. */
export async function simpanBerkas(
  berkas: BerkasServer,
  jenis: 'qris' | 'bukti',
  id: string
): Promise<{ storageName: string; imageUrl: string; mime: string }> {
  const tipe = berkas.type.toLowerCase()
  const ekstensi =
    tipe === 'image/png' ? 'png' : tipe === 'image/webp' ? 'webp' : 'jpg'
  const storageName = `${id}.${ekstensi}`
  const direktori = direktoriUnggahan(jenis)
  await fs.mkdir(direktori, { recursive: true })
  const isi = Buffer.from(await berkas.arrayBuffer())
  await fs.writeFile(path.join(direktori, storageName), isi, { flag: 'wx' })

  return {
    storageName,
    imageUrl:
      jenis === 'qris'
        ? `/api/qris/gambar/${id}`
        : `/api/pembayaran/bukti/${id}`,
    mime: MIME_MENURUT_EKSTENSI[ekstensi],
  }
}

export async function bacaBerkas(
  jenis: 'qris' | 'bukti',
  storageName: string
): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(direktoriUnggahan(jenis), storageName))
  } catch {
    return null
  }
}

export async function hapusBerkas(
  jenis: 'qris' | 'bukti',
  storageName: string
): Promise<void> {
  try {
    await fs.unlink(path.join(direktoriUnggahan(jenis), storageName))
  } catch {
    // Berkas mungkin sudah tidak ada; penghapusan bersifat best-effort.
  }
}

/** Audit log append-only (GR-06). Tidak ada fungsi update/delete di lapisan aplikasi. */
export async function catatAudit(params: {
  actorId: string
  actorRole: string
  action: string
  targetEntity: string
  targetId: string
  oldValue?: unknown
  newValue?: unknown
  reason?: string | null
  client?: any
}) {
  const client = params.client ?? prisma()
  return client.adminAuditLog.create({
    data: {
      actorId: params.actorId,
      actorRoleSnapshot: params.actorRole,
      action: params.action,
      targetEntity: params.targetEntity,
      targetId: params.targetId,
      oldValue: (params.oldValue ?? {}) as any,
      newValue: (params.newValue ?? {}) as any,
      reason: params.reason ?? null,
    },
  })
}

/** Riwayat status domain terpisah (BR-006) — append-only. */
export async function catatRiwayatStatus(params: {
  orderId: string
  domain: 'ORDER' | 'PAYMENT' | 'PICKUP' | 'REFUND'
  oldStatus: string
  newStatus: string
  reason?: string | null
  actorId: string
  actorRole: string
  client?: any
}) {
  const client = params.client ?? prisma()
  return client.orderStatusHistory.create({
    data: {
      orderId: params.orderId,
      orderOrderId: params.orderId,
      domain: params.domain,
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
      reason: params.reason ?? null,
      actorId: params.actorId,
      actorRole: params.actorRole,
    },
  })
}

export async function buatNotifikasi(params: {
  userId: string
  groupKey: string
  message: string
  kategori?: string | null
  entitasId?: string | null
  metadata?: any
  client?: any
}) {
  const client = params.client ?? prisma()
  // BR-003: kunci pengiriman bersifat per penerima, bukan global antar akun.
  const sudah = await client.notification.findFirst({
    where: { userId: params.userId, groupKey: params.groupKey },
    select: { id: true },
  })
  if (sudah) return null

  const dibuat = await client.notification.create({
    data: {
      userId: params.userId,
      userUserId: params.userId,
      groupKey: params.groupKey,
      kategori: params.kategori || kategoriDariKunci(params.groupKey),
      entitasId: params.entitasId || null,
      metadata: params.metadata ?? null,
      message: params.message,
      isRead: false,
      readAt: null,
      retryCount: 0,
    },
  })

  // Outbox persisten: IN_APP langsung tercatat terkirim, kanal eksternal mengikuti aturan retry.
  try {
    await enqueueOutbox({
      userId: params.userId,
      groupKey: params.groupKey,
      message: params.message,
      kanal: 'IN_APP',
      kategori: dibuat.kategori,
      entitasId: dibuat.entitasId,
      deliveryKey: `in_app|${params.userId}|${params.groupKey}`,
      client,
    })
  } catch (error) {
    console.error('[OUTBOX] gagal mengantri notifikasi:', error)
  }

  return dibuat
}

export async function notifikasiAdmins(params: {
  groupKey: string
  message: string
  client?: any
}) {
  const client = params.client ?? prisma()
  const admins = await client.user.findMany({
    where: { role: { in: ['ADMIN_BIASA', 'ADMIN_UTAMA'] }, isActive: true },
    select: { id: true, role: true, email: true },
  })
  for (const admin of admins) {
    await buatNotifikasi({
      userId: admin.id,
      groupKey: `${params.groupKey}:${admin.id}`,
      message: params.message,
      client,
    })
  }
  return admins.length
}

export async function buatReminder(params: {
  orderId: string
  type: 'PENGINGAT_BUKTI' | 'PENGINGAT_PUTUSAN' | 'PENGINGAT_JADWAL'
  jam?: number
  jobKey?: string
  client?: any
}) {
  const client = params.client ?? prisma()
  const jam = params.jam ?? 2
  const sekarang = new Date()
  const jobKey =
    params.jobKey || `${params.orderId}:${params.type}:${sekarang.getTime()}:${Math.random().toString(36).slice(2, 8)}`
  return client.scheduledReminder.create({
    data: {
      orderId: params.orderId,
      orderOrderId: params.orderId,
      type: params.type,
      jobKey,
      intervalMenit: Math.max(1, Math.floor(jam * 60)),
      zonaWaktu: 'Asia/Jakarta',
      nextRunAt: new Date(sekarang.getTime() + jam * 60 * 60 * 1000),
      isResolved: false,
      createdAt: sekarang,
    },
  })
}

export async function selesaikanReminder(params: {
  orderId: string
  types: Array<'PENGINGAT_BUKTI' | 'PENGINGAT_PUTUSAN' | 'PENGINGAT_JADWAL'>
  client?: any
}) {
  const client = params.client ?? prisma()
  return client.scheduledReminder.updateMany({
    where: {
      orderId: params.orderId,
      type: { in: params.types },
      isResolved: false,
    },
    data: { isResolved: true },
  })
}

/** Bukti terbaru yang teralokasi ke satu pesanan (bukti lama tetap tersimpan). */
export async function ambilBuktiTerkini(orderId: string, client?: any) {
  const orm = client ?? prisma()
  const alokasi = await orm.orderPaymentAllocation.findMany({
    where: { orderId },
    select: { paymentEvidenceId: true },
  })
  if (alokasi.length === 0) return null

  return orm.paymentEvidence.findFirst({
    where: {
      id: {
        in: [
          ...new Set(
            alokasi.map((a: { paymentEvidenceId: string }) => a.paymentEvidenceId)
          ),
        ],
      },
    },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      imageUrl: true,
      status: true,
      amount: true,
      isLatest: true,
      rejectionCount: true,
      rejectionReason: true,
      proofRequestReason: true,
      proofDeadline: true,
      initialCheckedById: true,
      finalApprovedById: true,
      qrisConfigId: true,
      uploadedAt: true,
      updatedAt: true,
    },
  })
}

export function beriTahuTerminal(subject: string, isi: string) {
  kirimEmailKeTerminal('admin@akirabooks.id', subject, isi)
}

export function mimeDariNama(storageName: string): string {
  const ekstensi = storageName.split('.').pop()?.toLowerCase() || ''
  return MIME_MENURUT_EKSTENSI[ekstensi] || 'application/octet-stream'
}

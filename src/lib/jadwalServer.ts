// src/lib/jadwalServer.ts
// Helper server-side Tahap 9: riwayat usulan jadwal, grup gabungan, notifikasi, dan penutupan usulan.
// Semua akses database memakai prisma()/client transaksi yang diteruskan (GR-02, BR-001).

import { buatNotifikasi, selesaikanReminder } from '@/lib/pembayaranServer'

export type UsulanJadwalRecord = {
  id: string
  orderId: string
  jenis: string
  pengajuId: string
  peranPengaju: string
  tanggalLama: Date
  tanggalBaru: Date
  statusSebelumnya: string | null
  alasan: string | null
  status: string
  diputuskanOleh: string | null
  diputuskanPeran: string | null
  alasanKeputusan: string | null
  diputuskanPada: Date | null
  createdAt: Date
}

/** Tutup semua usulan yang masih menunggu sebelum membuat/usulan baru (anti-duplikasi, BR-008). */
export async function tutupUsulanTertunda(
  client: any,
  orderId: string,
  actorId: string,
  actorRole: string,
  alasan: string
): Promise<number> {
  const tertunda = await client.jadwalPerubahan.findMany({
    where: { orderId, status: 'MENUNGGU_PERSETUJUAN' },
  })
  for (const usulan of tertunda) {
    await client.jadwalPerubahan.update({
      where: { id: usulan.id },
      data: {
        status: 'DIBATALKAN',
        diputuskanOleh: actorId,
        diputuskanPeran: actorRole,
        alasanKeputusan: alasan,
        diputuskanPada: new Date(),
      },
    })
  }
  return tertunda.length
}

export async function ambilUsulanTertunda(
  client: any,
  orderId: string
): Promise<UsulanJadwalRecord | null> {
  return client.jadwalPerubahan.findFirst({
    where: { orderId, status: 'MENUNGGU_PERSETUJUAN' },
    orderBy: { createdAt: 'desc' },
  })
}

export async function riwayatJadwalLengkap(
  client: any,
  orderId: string
): Promise<UsulanJadwalRecord[]> {
  return client.jadwalPerubahan.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}

/** Anggota grup gabungan — tiap pesanan tetap menyimpan status bayar, nominal, dan riwayat sendiri. */
export async function anggotaGrupJadwal(client: any, order: { pickupGroupId: string | null; id: string }) {
  if (!order.pickupGroupId) return []
  return client.order.findMany({
    where: { pickupGroupId: order.pickupGroupId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      orderStatus: true,
      paymentProofStatus: true,
      pickupStatus: true,
      pickupSundayDate: true,
      totalAmount: true,
    },
  })
}

export async function notifikasiJadwal(
  client: any,
  userId: string,
  groupKey: string,
  message: string
) {
  return buatNotifikasi({ userId, groupKey, message, client })
}

export async function notifikasiAdminJadwal(
  client: any,
  groupKey: string,
  message: string
): Promise<number> {
  const admins = await client.user.findMany({
    where: { role: { in: ['ADMIN_BIASA', 'ADMIN_UTAMA'] }, isActive: true },
    select: { id: true },
  })
  for (const admin of admins) {
    await notifikasiJadwal(
      client,
      admin.id,
      `${groupKey}:${admin.id}`,
      message
    )
  }
  return admins.length
}

export async function selesaikanPengingatJadwal(client: any, orderId: string) {
  return selesaikanReminder({ orderId, types: ['PENGINGAT_JADWAL'], client })
}

// src/app/api/admin/penjualan-offline/[saleId]/route.ts
// Detail penjualan offline & alur usul/persetujuan koreksi harga (FR-OFF-001).
// Harga lama tetap aktif sampai Admin Utama menyetujui; keputusan dicatat di audit append-only (GR-06).

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  penilaianPersetujuanKoreksi,
  penilaianUsulKoreksiHarga,
} from '@/lib/penjualanOffline'
import {
  auditPenjualan,
  saringPenjualanUntukPeran,
} from '@/lib/penjualanServer'
import { notifikasiAdminBiasa, notifikasiAdmins } from '@/lib/pembayaranServer'

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

async function izinAdmin(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return { user: null, respons: gagal('Silakan masuk terlebih dahulu', 401) }
  if (user.role !== 'ADMIN_BIASA' && user.role !== 'ADMIN_UTAMA') {
    return { user: null, respons: gagal('Akses ditolak', 403) }
  }
  return { user, respons: null }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const { user, respons } = await izinAdmin(request)
    if (respons || !user) return respons
    const { saleId } = await params
    const db = prisma()

    const sale = await db.offlineSale.findUnique({ where: { id: saleId } })
    if (!sale) return gagal('Penjualan tidak ditemukan', 404)

    const [items, koreksi] = await Promise.all([
      db.offlineSaleItem.findMany({
        where: { offlineSaleId: saleId },
        orderBy: { id: 'asc' },
      }),
      db.offlinePriceCorrection.findMany({
        where: { offlineSaleId: saleId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json(
      saringPenjualanUntukPeran(
        {
          penjualan: { ...sale, soldAt: new Date(sale.soldAt).toISOString() },
          items,
          koreksi,
          hakAkses: {
            bisaMengusulkan: true,
            bisaMemutuskan: user.role === 'ADMIN_UTAMA',
          },
        },
        user.role
      )
    )
  } catch (error: any) {
    console.error('API GET /api/admin/penjualan-offline/[saleId] error:', error)
    return gagal(error?.message || 'Gagal memuat detail penjualan', 500)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const { user, respons } = await izinAdmin(request)
    if (respons || !user) return respons
    const { saleId } = await params
    const body = await request.json().catch(() => null)
    if (!body) return gagal('Data koreksi tidak valid', 400)

    const aksi = String(body.action || '').toUpperCase()
    if (!['USUL_KOREKSI', 'SETUJUI_KOREKSI', 'TOLAK_KOREKSI'].includes(aksi)) {
      return gagal('Aksi koreksi tidak dikenali', 400)
    }

    const itemId = String(body.itemId || '').trim()
    const koreksiId = String(body.koreksiId || '').trim()
    const hargaBaru = Number(body.hargaBaru)
    const alasan = String(body.alasan || '').trim()
    const sekarang = new Date()

    const hasil = await prisma().$transaction(
      async (tx: any) => {
        const terkunci = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "OfflineSale" WHERE id = ${saleId} FOR UPDATE
        `
        if (terkunci.length === 0) throw new Error('Penjualan tidak ditemukan')

        const sale = await tx.offlineSale.findUnique({ where: { id: saleId } })
        if (!sale || sale.status !== 'SELESAI') {
          throw new Error('Penjualan tidak dapat dikoreksi')
        }

        if (aksi === 'USUL_KOREKSI') {
          const item = await tx.offlineSaleItem.findFirst({
            where: { id: itemId, offlineSaleId: saleId },
          })
          if (!item) throw new Error('Item penjualan tidak ditemukan')

          const tertunda = await tx.offlinePriceCorrection.findFirst({
            where: { offlineSaleItemId: item.id, status: 'MENUNGGU_PERSETUJUAN' },
          })
          if (tertunda) {
            throw new Error('Masih ada usul koreksi yang menunggu persetujuan')
          }

          const cek = penilaianUsulKoreksiHarga({
            peran: user.role,
            alasan,
            hargaLama: Number(item.actualSellingPrice),
            hargaBaru,
          })
          if (!cek.valid) throw new Error(cek.alasan || 'Usul koreksi ditolak')

          const dibuat = await tx.offlinePriceCorrection.create({
            data: {
              offlineSaleId: saleId,
              offlineSaleItemId: item.id,
              pengajuId: user.id,
              peranPengaju: user.role,
              hargaLama: Number(item.actualSellingPrice),
              hargaBaru,
              alasan,
              status: 'MENUNGGU_PERSETUJUAN',
            },
          })
          await auditPenjualan({
            client: tx,
            user,
            action: 'USUL_KOREKSI_HARGA_OFFLINE',
            targetId: dibuat.id,
            oldValue: { actualSellingPrice: Number(item.actualSellingPrice), status: 'SELESAI' },
            newValue: { hargaBaru, status: 'MENUNGGU_PERSETUJUAN' },
            reason: alasan,
          })
          await notifikasiAdmins({
            groupKey: `koreksi-offline:usul:${dibuat.id}`,
            message: `Usul koreksi harga penjualan offline menunggu persetujuan Admin Utama (${item.snapshotTitle || 'Buku'}): ${dibuat.hargaLama} → ${dibuat.hargaBaru}. Alasan: ${alasan}`,
            client: tx,
          })
          return { status: 'MENUNGGU_PERSETUJUAN', koreksiId: dibuat.id, hargaBerlaku: dibuat.hargaLama }
        }

        const koreksi = await tx.offlinePriceCorrection.findFirst({
          where: { id: koreksiId || undefined, offlineSaleId: saleId },
          orderBy: { createdAt: 'desc' },
        })
        if (!koreksi) throw new Error('Usul koreksi tidak ditemukan')

        const cek = penilaianPersetujuanKoreksi({
          peran: user.role,
          status: koreksi.status,
          aksi: aksi as 'SETUJUI_KOREKSI' | 'TOLAK_KOREKSI',
          alasan,
        })
        if (!cek.valid) throw new Error(cek.alasan || 'Koreksi tidak dapat diputuskan')

        const item = await tx.offlineSaleItem.findFirst({
          where: { id: koreksi.offlineSaleItemId, offlineSaleId: saleId },
        })
        if (!item) throw new Error('Item penjualan tidak ditemukan')

        const disetujui = aksi === 'SETUJUI_KOREKSI'
        const hargaBerlaku = disetujui ? Number(koreksi.hargaBaru) : Number(koreksi.hargaLama)

        if (disetujui) {
          await tx.offlineSaleItem.update({
            where: { id: item.id },
            data: {
              actualSellingPrice: Number(koreksi.hargaBaru),
              subtotal: Number(item.quantity) * Number(koreksi.hargaBaru),
            },
          })
        }
        await tx.offlinePriceCorrection.update({
          where: { id: koreksi.id },
          data: {
            status: disetujui ? 'DISETUJUI' : 'DITOLAK',
            disetujuiOlehId: user.id,
            disetujuiPada: sekarang,
            alasanKeputusan: disetujui ? alasan || null : alasan,
          },
        })

        await auditPenjualan({
          client: tx,
          user,
          action: disetujui ? 'SETUJUI_KOREKSI_HARGA_OFFLINE' : 'TOLAK_KOREKSI_HARGA_OFFLINE',
          targetId: koreksi.id,
          oldValue: {
            status: koreksi.status,
            actualSellingPrice: Number(item.actualSellingPrice),
          },
          newValue: {
            status: disetujui ? 'DISETUJUI' : 'DITOLAK',
            hargaBerlaku,
            disetujuiPada: sekarang,
          },
          reason: alasan || null,
        })
        // Hasil keputusan hanya untuk Admin Biasa (pengusul/operasional).
        // Admin Utama tidak menerima notifikasi hasil atas tindakannya sendiri.
        await notifikasiAdminBiasa({
          groupKey: `koreksi-offline:keputusan:${koreksi.id}:${sekarang.getTime()}`,
          message: `Koreksi harga penjualan offline ${disetujui ? 'disetujui' : 'ditolak'} Admin Utama. Harga yang berlaku: ${hargaBerlaku}.${alasan ? ` Alasan: ${alasan}` : ''}`,
          pengajuId: koreksi.pengajuId,
          client: tx,
        })

        return {
          status: disetujui ? 'DISETUJUI' : 'DITOLAK',
          koreksiId: koreksi.id,
          hargaBerlaku,
        }
      },
      { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
    )

    const payload = saringPenjualanUntukPeran({ hasil }, user.role)

    return NextResponse.json({
      success: true,
      pesan:
        hasil.status === 'MENUNGGU_PERSETUJUAN'
          ? 'Usul koreksi dikirim dan menunggu persetujuan Admin Utama. Harga lama tetap berlaku.'
          : hasil.status === 'DISETUJUI'
            ? 'Koreksi harga disetujui dan berlaku sekarang.'
            : 'Usul koreksi ditolak. Harga lama tetap berlaku.',
      ...payload,
    })
  } catch (error: any) {
    console.error('API POST /api/admin/penjualan-offline/[saleId] error:', error)
    return gagal(error?.message || 'Gagal memproses koreksi harga', 409)
  }
}

// src/app/api/admin/penjualan-offline/route.ts
// Pencatatan penjualan langsung di booth CFD (Tahap 11, FR-OFF-001, BR-012).
// Admin Biasa & Admin Utama boleh mencatat; modal/laba tidak pernah dikirim ke Admin Biasa (GR-03).

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  auditPenjualan,
  catatPenjualanOffline,
  daftarBukuPenjualan,
  saringPenjualanUntukPeran,
} from '@/lib/penjualanServer'
import { bolehLihatModalLaba } from '@/lib/penjualanOffline'

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

const PILIHAN_SALE = {
  id: true,
  soldAt: true,
  status: true,
  catatan: true,
  recordedById: true,
  idempotencyKey: true,
}

const PILIHAN_ITEM = {
  id: true,
  offlineSaleId: true,
  bookId: true,
  quantity: true,
  actualSellingPrice: true,
  costPrice: true,
  snapshotTitle: true,
  snapshotCode: true,
  subtotal: true,
}

export async function GET(request: Request) {
  try {
    const { user, respons } = await izinAdmin(request)
    if (respons || !user) return respons
    const db = prisma()

    const [sales, koreksi, daftarBuku] = await Promise.all([
      db.offlineSale.findMany({
        orderBy: { soldAt: 'desc' },
        take: 50,
        select: PILIHAN_SALE,
      }),
      db.offlinePriceCorrection.findMany({
        where: { status: 'MENUNGGU_PERSETUJUAN' },
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: {
          id: true,
          offlineSaleId: true,
          offlineSaleItemId: true,
          pengajuId: true,
          peranPengaju: true,
          hargaLama: true,
          hargaBaru: true,
          alasan: true,
          status: true,
          createdAt: true,
        },
      }),
      daftarBukuPenjualan(db),
    ])

    const saleIds = (sales as Array<any>).map((s) => s.id)
    const items = saleIds.length
      ? await db.offlineSaleItem.findMany({
          where: { offlineSaleId: { in: saleIds } },
          select: PILIHAN_ITEM,
        })
      : []

    const daftar = (sales as Array<any>).map((s) => {
      const itemSale = (items as Array<any>).filter((i) => i.offlineSaleId === s.id)
      const pendapatan = itemSale.reduce(
        (jumlah, i) => jumlah + Number(i.subtotal || i.quantity * i.actualSellingPrice),
        0
      )
      const labaHistoris = itemSale.reduce(
        (jumlah, i) =>
          jumlah + Number(i.quantity) * (Number(i.actualSellingPrice) - Number(i.costPrice)),
        0
      )
      return {
        ...s,
        soldAt: new Date(s.soldAt).toISOString(),
        items: itemSale,
        pendapatan,
        unit: itemSale.reduce((jumlah, i) => jumlah + Number(i.quantity), 0),
        labaHistoris,
      }
    })

    return NextResponse.json(
      saringPenjualanUntukPeran(
        {
          daftar,
          koreksiMenunggu: koreksi.map((k: any) => ({
            ...k,
            createdAt: new Date(k.createdAt).toISOString(),
          })),
          daftarBuku,
          hakAkses: {
            bisaMencatat: true,
            bisaLihatKeuangan: bolehLihatModalLaba(user.role),
          },
        },
        user.role
      )
    )
  } catch (error: any) {
    console.error('API GET /api/admin/penjualan-offline error:', error)
    return gagal(error?.message || 'Gagal memuat penjualan offline', 500)
  }
}

export async function POST(request: Request) {
  let peranPengguna: string | null = null
  try {
    const { user, respons } = await izinAdmin(request)
    if (respons || !user) return respons
    peranPengguna = user.role

    const body = await request.json().catch(() => null)
    if (!body) return gagal('Data penjualan tidak valid', 400)

    const items = Array.isArray(body.items) ? body.items : []
    if (items.length === 0) return gagal('Minimal satu buku harus dicatat', 400)
    if (items.length > 20) return gagal('Maksimal 20 judul per transaksi', 400)

    const catatan = String(body.catatan || '').trim().slice(0, 500) || null
    const idempotencyKey = String(body.idempotencyKey || '').trim()
    if (idempotencyKey.length < 8 || idempotencyKey.length > 100) {
      return gagal('Kunci idempotensi wajib diisi (minimal 8 karakter)', 400)
    }

    const itemsBersih = items.map((item: any) => ({
      bookId: String(item.bookId || ''),
      quantity: Number(item.quantity),
      actualSellingPrice: Number(item.actualSellingPrice),
    }))

    const hasil = await prisma().$transaction(
      async (tx: any) => {
        const ditulis = await catatPenjualanOffline({
          client: tx,
          user,
          items: itemsBersih,
          catatan,
          idempotencyKey,
          sekarang: new Date(),
        })

        if (!ditulis.sudahAda) {
          const nominal = ditulis.items.reduce(
            (jumlah: number, i: any) => jumlah + Number(i.subtotal || 0),
            0
          )
          await auditPenjualan({
            client: tx,
            user,
            action: 'CATAT_PENJUALAN_OFFLINE',
            targetId: ditulis.penjualan.id,
            oldValue: {},
            newValue: {
              status: 'SELESAI',
              nominal,
              unit: ditulis.items.reduce(
                (jumlah: number, i: any) => jumlah + Number(i.quantity || 0),
                0
              ),
              jumlahKeranjangTerdampak: ditulis.penyesuaian.length,
            },
            reason: catatan,
          })
        }
        return ditulis
      },
      { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
    )

    const payload = saringPenjualanUntukPeran(
      {
        penjualan: {
          ...hasil.penjualan,
          soldAt: new Date(hasil.penjualan.soldAt).toISOString(),
        },
        items: hasil.items,
        penyesuaianKeranjang: hasil.penyesuaian,
      },
      user.role
    )

    return NextResponse.json(
      {
        success: true,
        pesan: hasil.sudahAda
          ? 'Transaksi ini sudah dicatat sebelumnya. Data yang sama dikembalikan.'
          : hasil.penyesuaian.length > 0
            ? `Penjualan offline berhasil dicatat. ${hasil.penyesuaian.length} item keranjang disesuaikan dan perlu tinjau ulang Customer.`
            : 'Penjualan offline berhasil dicatat.',
        ...payload,
      },
      { status: hasil.sudahAda ? 200 : 201 }
    )
  } catch (error: any) {
    if (error?.code === 'P2002') {
      try {
        const body = await request.json().catch(() => null)
        const kunci = String(body?.idempotencyKey || '').trim()
        const lama = kunci
          ? await prisma().offlineSale.findUnique({ where: { idempotencyKey: kunci } })
          : null
        if (lama) {
          const itemLama = await prisma().offlineSaleItem.findMany({
            where: { offlineSaleId: lama.id },
          })
          return NextResponse.json(
            saringPenjualanUntukPeran(
              {
                success: true,
                pesan: 'Transaksi ini sudah dicatat sebelumnya. Data yang sama dikembalikan.',
                penjualan: {
                  ...lama,
                  soldAt: new Date(lama.soldAt).toISOString(),
                },
                items: itemLama,
                penyesuaianKeranjang: [],
              },
              peranPengguna
            )
          )
        }
      } catch {
        // jatuh ke respons gagal umum
      }
    }
    console.error('API POST /api/admin/penjualan-offline error:', error)
    return gagal(error?.message || 'Gagal mencatat penjualan offline', 409)
  }
}

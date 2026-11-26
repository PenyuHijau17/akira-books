// src/app/api/checkout/route.ts
// API Checkout atomik (Tahap 7)
// - Tolak saat Toko Libur / status toko gagal diverifikasi (BR-013)
// - Kunci baris stok dengan SELECT ... FOR UPDATE agar tidak overselling (BR-010)
// - Idempotensi via idempotencyKey (BR-008)
// - Snapshot harga & identitas buku + tenggat 24 jam WIB (BR-009, BR-011)
// - Status awal: pesanan MENUNGGU_PEMBAYARAN, jadwal MENUNGGU_KONFIRMASI

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { muatKeranjang } from '@/lib/keranjangServer'
import {
  cekIdempotensi,
  cekTokoBuka,
  buatNomorPesanan,
  hitungSnapshotPesanan,
  hitungTenggatPembayaran,
  saringFieldModal,
  tanggalMingguKeDate,
  validasiIdempotencyKey,
  validasiTanggalMinggu,
} from '@/lib/pesanan'

type BarisBukuTerkunci = {
  id: string
  code: string
  title: string
  sellingPrice: number
  costPrice: number
  stockTotal: number
  stockReserved: number
  status: string
  mergedIntoBookId: string | null
}

function responsGagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

// Ambil pesanan lama berdasarkan idempotencyKey (dipakai saat retry / P2002)
async function ambilPesananLama(idempotencyKey: string, customerId: string) {
  const client = prisma()
  const pesanan = await client.order.findUnique({
    where: { idempotencyKey },
  })

  const hasil = cekIdempotensi(pesanan ? { customerId: pesanan.customerId } : null, customerId)
  if (hasil === 'KONFLIK_PENGGUNA') return { konflik: true as const, pesanan: null }

  if (hasil === 'GUNAKAN_PESANAN_LAMA' && pesanan) {
    const orderItems = await client.orderItem.findMany({
      where: { orderId: pesanan.id },
    })
    return { konflik: false as const, pesanan: { ...pesanan, orderItems } }
  }

  return { konflik: false as const, pesanan: null }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') {
      return responsGagal('Anda harus login sebagai Customer untuk checkout', 401)
    }

    const body = await request.json().catch(() => null)
    if (!body) return responsGagal('Data checkout tidak valid', 400)

    const { idempotencyKey, paymentMethod, pickupSundayDate } = body

    if (!validasiIdempotencyKey(idempotencyKey)) {
      return responsGagal('Kunci idempotensi tidak valid', 400)
    }
    const kunci = String(idempotencyKey).trim()

    if (paymentMethod !== 'QRIS' && paymentMethod !== 'TUNAI_CFD') {
      return responsGagal('Metode pembayaran tidak valid', 400)
    }

    if (typeof pickupSundayDate !== 'string') {
      return responsGagal('Tanggal pengambilan wajib diisi', 400)
    }
    const cekTanggal = validasiTanggalMinggu(pickupSundayDate)
    if (!cekTanggal.valid) return responsGagal(cekTanggal.alasan || 'Tanggal tidak valid', 400)

    // Idempotensi: kiriman ulang tidak membuat pesanan baru
    const lama = await ambilPesananLama(kunci, user.id)
    if (lama.konflik) {
      return responsGagal('Kunci idempotensi sudah digunakan oleh pelanggan lain', 409)
    }
    if (lama.pesanan) {
      return NextResponse.json(
        {
          pesanan: saringFieldModal(lama.pesanan),
          dibuatUlang: false,
          pesan: 'Checkout ini sudah diproses sebelumnya. Pesanan yang sama dikembalikan.',
        },
        { status: 200 }
      )
    }

    // Sinkronisasi keranjang dengan stok terkini (BR-012)
    const keranjang = await muatKeranjang(user.id)
    if (keranjang.items.length === 0) {
      return responsGagal('Keranjang Anda kosong', 400)
    }
    if (keranjang.perluTinjauUlang) {
      return responsGagal(
        keranjang.alasanTinjau ||
          'Keranjang berubah karena stok. Mohon tinjau dan setujui ulang sebelum checkout.',
        409
      )
    }
    if (keranjang.versi !== keranjang.versiDisetujui) {
      return responsGagal('Mohon tinjau dan setujui ulang keranjang sebelum checkout', 409)
    }

    // Verifikasi status toko di server sebelum memulai transaksi (BR-013)
    const statusToko = await prisma().storeStatus.findFirst({
      orderBy: { updatedAt: 'desc' },
    })
    const cekToko = cekTokoBuka(statusToko ? { isOpen: statusToko.isOpen } : null, true)
    if (!cekToko.boleh) return responsGagal(cekToko.alasan || 'Toko sedang libur', 409)

    const sekarang = new Date()
    const tenggat = hitungTenggatPembayaran(sekarang)
    const nomorPesanan = buatNomorPesanan(sekarang)

    let pesananBaru: any

    try {
      pesananBaru = await prisma().$transaction(
        async (tx: any) => {
          // Urutkan bookId agar urutan kunci konsisten dan menghindari deadlock.
          const itemTerurut = [...keranjang.items].sort((a, b) =>
            a.bookId.localeCompare(b.bookId)
          )

          const bukuTerkunci: Record<string, BarisBukuTerkunci> = {}

          for (const item of itemTerurut) {
            const baris = await tx.$queryRaw<BarisBukuTerkunci[]>`
              SELECT id, code, title, "sellingPrice", "costPrice", "stockTotal",
                     "stockReserved", status, "mergedIntoBookId"
              FROM "Book"
              WHERE id = ${item.bookId}
              FOR UPDATE
            `

            const buku = baris[0]
            if (!buku) throw new Error(`Buku tidak ditemukan: ${item.bookId}`)

            const tersedia = buku.stockTotal - buku.stockReserved
            if (tersedia < item.quantity) {
              throw new Error(
                `Stok buku "${buku.title}" tidak mencukupi (tersedia ${Math.max(0, tersedia)}, diminta ${item.quantity})`
              )
            }

            bukuTerkunci[buku.id] = buku

            // Tahan stok untuk pesanan aktif (bukan saat item masuk keranjang)
            await tx.book.update({
              where: { id: buku.id },
              data: { stockReserved: { increment: item.quantity } },
            })
          }

          const snapshot = hitungSnapshotPesanan(itemTerurut, bukuTerkunci)
          if (snapshot.items.length === 0) throw new Error('Tidak ada item yang dapat dipesan')

          const pesanan = await tx.order.create({
            data: {
              orderNumber: nomorPesanan,
              idempotencyKey: kunci,
              customerId: user.id,
              customerUserId: user.id,
              orderStatus: 'MENUNGGU_PEMBAYARAN',
              paymentProofStatus: 'BELUM_DIUNGGAH',
              pickupStatus: 'MENUNGGU_KONFIRMASI',
              refundStatus: 'TIDAK_BERLAKU',
              paymentMethod,
              pickupSundayDate: tanggalMingguKeDate(pickupSundayDate),
              paymentDeadline: tenggat,
              totalAmount: snapshot.total,
            },
          })

          for (const item of snapshot.items) {
            await tx.orderItem.create({
              data: {
                orderId: pesanan.id,
                orderOrderId: pesanan.id,
                bookId: item.bookId,
                bookBookId: item.bookId,
                quantity: item.quantity,
                snapshotCode: item.snapshotCode,
                snapshotTitle: item.snapshotTitle,
                snapshotSellingPrice: item.snapshotSellingPrice,
                snapshotCostPrice: item.snapshotCostPrice,
                subtotal: item.subtotal,
              },
            })
          }

          // Riwayat status awal (audit domain terpisah, BR-005/BR-006)
          for (const statusAwal of [
            { domain: 'ORDER', status: 'MENUNGGU_PEMBAYARAN' },
            { domain: 'PAYMENT', status: 'BELUM_DIUNGGAH' },
            { domain: 'PICKUP', status: 'MENUNGGU_KONFIRMASI' },
            { domain: 'REFUND', status: 'TIDAK_BERLAKU' },
          ]) {
            await tx.orderStatusHistory.create({
              data: {
                orderId: pesanan.id,
                orderOrderId: pesanan.id,
                domain: statusAwal.domain,
                oldStatus: '',
                newStatus: statusAwal.status,
                reason: 'Pesanan dibuat melalui checkout',
                actorId: user.id,
                actorRole: 'CUSTOMER',
              },
            })
          }

          // Kosongkan keranjang setelah checkout berhasil
          await tx.cartItem.deleteMany({ where: { cartId: keranjang.cartId } })
          await tx.cart.update({
            where: { id: keranjang.cartId },
            data: {
              version: { increment: 1 },
              approvedVersion: { increment: 1 },
              needsReview: false,
              reviewReason: null,
            },
          })

          await tx.notification.create({
            data: {
              userId: user.id,
              userUserId: user.id,
              groupKey: `pesanan:${pesanan.id}:dibuat`,
              message: `Pesanan ${nomorPesanan} berhasil dibuat. Selesaikan pembayaran sebelum tenggat 24 jam.`,
              isRead: false,
              retryCount: 0,
            },
          })

          return pesanan
        },
        { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
      )
    } catch (error: any) {
      // Idempotensi: dua request bersamaan → yang kalah mendapat P2002, ambil pesanan pertama
      if (error?.code === 'P2002') {
        const retry = await ambilPesananLama(kunci, user.id)
        if (retry.pesanan) {
          return NextResponse.json(
            {
              pesanan: saringFieldModal(retry.pesanan),
              dibuatUlang: false,
              pesan: 'Checkout ini sudah diproses sebelumnya. Pesanan yang sama dikembalikan.',
            },
            { status: 200 }
          )
        }
      }

      console.error('Checkout gagal:', error)
      return responsGagal(
        error?.message || 'Checkout gagal. Keranjang Anda tetap tersimpan.',
        409
      )
    }

    const pesananLengkap = await prisma().order.findUnique({
      where: { id: pesananBaru.id },
    })
    const orderItems = await prisma().orderItem.findMany({
      where: { orderId: pesananBaru.id },
    })

    return NextResponse.json(
      {
        pesanan: saringFieldModal({ ...pesananLengkap, orderItems }),
        dibuatUlang: true,
        pesan: 'Pesanan berhasil dibuat. Silakan lanjutkan pembayaran.',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('API POST /api/checkout error:', error)
    return responsGagal(error?.message || 'Terjadi kesalahan server', 500)
  }
}

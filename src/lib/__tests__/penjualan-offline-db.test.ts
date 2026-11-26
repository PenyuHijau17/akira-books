import { describe, expect, it } from 'vitest'
import prisma from '@/lib/prisma'
import { catatPenjualanOffline, ringkasanLaporanKeuangan } from '@/lib/penjualanServer'
import { parsePeriodeLaporan } from '@/lib/penjualanOffline'

/**
 * Integrasi database nyata: jamin transaksi offline atomik, stok berkurang tepat sekali,
 * keranjang Customer terdampak disesuaikan + notifikasi, serta idempotensi kunci (BR-008/BR-012).
 */
describe('Tahap 11 — penjualan offline atomik & keranjang terdampak (database nyata)', () => {
  it('mengurangi stok, menyesuaikan keranjang, dan mengabaikan pengulangan kunci', async () => {
    const db = prisma()
    const unik = Date.now().toString(36)
    const kunci = `uji-offline-${unik}`

    // Bersihkan sisa dari percobaan sebelumnya.
    const sisaUser = await db.user.findMany({
      where: { email: { startsWith: `offline10-${unik.slice(0, 4)}` } },
      select: { id: true },
    })
    for (const u of sisaUser) {
      const saleSisa = await db.offlineSale.findMany({
        where: { recordedById: u.id },
        select: { id: true },
      })
      for (const s of saleSisa) {
        await db.offlineSaleItem.deleteMany({ where: { offlineSaleId: s.id } })
        await db.offlinePriceCorrection.deleteMany({ where: { offlineSaleId: s.id } })
        await db.offlineSale.delete({ where: { id: s.id } })
      }
      await db.user.delete({ where: { id: u.id } }).catch(() => undefined)
    }

    const admin = await db.user.create({
      data: {
        email: `offline10-${unik}@example.test`,
        passwordHash: 'x',
        name: 'Admin Uji Offline',
        role: 'ADMIN_BIASA',
      },
    })
    const customer = await db.user.create({
      data: {
        email: `offline10-customer-${unik}@example.test`,
        passwordHash: 'x',
        name: 'Customer Uji Offline',
        role: 'CUSTOMER',
      },
    })
    const kategori = await db.category.create({
      data: { name: `Kategori10-${unik}` },
    })
    const buku = await db.book.create({
      data: {
        code: `OFF10-${unik}`,
        title: 'Buku Uji Offline',
        author: 'Uji',
        publisher: 'Uji',
        publishYear: 2026,
        sellingPrice: 70000,
        costPrice: 30000,
        stockTotal: 5,
        stockReserved: 0,
        status: 'TERSEDIA',
        categoryId: kategori.id,
      },
    })
    const keranjang = await db.cart.create({
      data: { userId: customer.id, userUserId: customer.id, version: 0, approvedVersion: 0 },
    })
    await db.cartItem.create({
      data: {
        cartId: keranjang.id,
        cartCartId: keranjang.id,
        bookId: buku.id,
        bookBookId: buku.id,
        quantity: 4,
      },
    })

    try {
      const hasil = await db.$transaction(
        async (tx: any) =>
          catatPenjualanOffline({
            client: tx,
            user: { id: admin.id, role: 'ADMIN_BIASA' },
            items: [{ bookId: buku.id, quantity: 2, actualSellingPrice: 75000 }],
            catatan: 'Penjualan lapak Minggu pagi',
            idempotencyKey: kunci,
          }),
        { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
      )

      expect(hasil.sudahAda).toBe(false)
      expect(hasil.penjualan.status).toBe('SELESAI')
      expect(hasil.items[0]).toMatchObject({
        quantity: 2,
        actualSellingPrice: 75000,
        costPrice: 30000,
        subtotal: 150000,
      })

      const bukuSesudah = await db.book.findUnique({ where: { id: buku.id } })
      expect(bukuSesudah?.stockTotal).toBe(3)
      expect(bukuSesudah?.stockReserved).toBe(0)

      // Stok tersedia setelah penjualan = 3, sehingga kuantitas 4 disesuaikan menjadi 3.
      const itemKeranjang = await db.cartItem.findFirst({ where: { cartId: keranjang.id } })
      expect(itemKeranjang?.quantity).toBe(3)
      const keranjangSesudah = await db.cart.findUnique({ where: { id: keranjang.id } })
      expect(keranjangSesudah?.needsReview).toBe(true)
      expect(keranjangSesudah?.version).toBe(1)

      const notifikasi = await db.notification.findFirst({
        where: { userId: customer.id },
      })
      expect(notifikasi?.message).toContain('disesuaikan')
      expect(notifikasi?.groupKey).toContain(keranjang.id)

      const movements = await db.stockMovement.findMany({ where: { bookId: buku.id } })
      expect(movements).toHaveLength(1)
      expect(movements[0]).toMatchObject({ type: 'KELUAR', quantity: 2 })

      // Klik ulang / kirim ulang dengan kunci sama tidak mengurangi stok lagi.
      const ulang = await db.$transaction(
        async (tx: any) =>
          catatPenjualanOffline({
            client: tx,
            user: { id: admin.id, role: 'ADMIN_BIASA' },
            items: [{ bookId: buku.id, quantity: 2, actualSellingPrice: 75000 }],
            idempotencyKey: kunci,
          }),
        { maxWait: 20000, timeout: 30000, isolationLevel: 'Serializable' }
      )
      expect(ulang.sudahAda).toBe(true)
      expect((await db.book.findUnique({ where: { id: buku.id } }))?.stockTotal).toBe(3)
      expect(await db.offlineSale.count({ where: { idempotencyKey: kunci } })).toBe(1)
    } finally {
      await db.notification.deleteMany({ where: { userId: customer.id } })
      await db.stockMovement.deleteMany({ where: { bookId: buku.id } })
      const sales = await db.offlineSale.findMany({ where: { recordedById: admin.id } })
      for (const s of sales) {
        await db.offlineSaleItem.deleteMany({ where: { offlineSaleId: s.id } })
        await db.offlinePriceCorrection.deleteMany({ where: { offlineSaleId: s.id } })
        await db.offlineSale.delete({ where: { id: s.id } })
      }
      await db.cartItem.deleteMany({ where: { cartId: keranjang.id } })
      await db.cart.delete({ where: { id: keranjang.id } })
      await db.book.delete({ where: { id: buku.id } })
      await db.category.delete({ where: { id: kategori.id } })
      await db.user.delete({ where: { id: customer.id } })
      await db.user.delete({ where: { id: admin.id } })
    }
  }, 60000)

  it('memisahkan laba historis dan hitung ulang pada agregasi laporan WIB', async () => {
    const db = prisma()
    const unik = Date.now().toString(36)
    const sekarang = new Date()
    const hariWIB = sekarang.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

    const admin = await db.user.create({
      data: {
        email: `laporan11-${unik}@example.test`,
        passwordHash: 'x',
        role: 'ADMIN_UTAMA',
      },
    })
    const customer = await db.user.create({
      data: {
        email: `laporan11-customer-${unik}@example.test`,
        passwordHash: 'x',
        role: 'CUSTOMER',
      },
    })
    const kategori = await db.category.create({ data: { name: `Laporan11-${unik}` } })
    const buku = await db.book.create({
      data: {
        code: `LAP11-${unik}`,
        title: 'Buku Laporan',
        author: 'Uji',
        publisher: 'Uji',
        publishYear: 2026,
        sellingPrice: 70000,
        costPrice: 30000,
        stockTotal: 10,
        stockReserved: 0,
        status: 'TERSEDIA',
        categoryId: kategori.id,
      },
    })
    const sale = await db.offlineSale.create({
      data: { recordedById: admin.id, userUserId: admin.id, soldAt: sekarang, status: 'SELESAI' },
    })
    await db.offlineSaleItem.create({
      data: {
        offlineSaleId: sale.id,
        offlineSaleOfflineSaleId: sale.id,
        bookId: buku.id,
        bookBookId: buku.id,
        quantity: 2,
        actualSellingPrice: 75000,
        costPrice: 30000,
        subtotal: 150000,
      },
    })
    await db.book.update({ where: { id: buku.id }, data: { costPrice: 40000 } })

    const order = await db.order.create({
      data: {
        orderNumber: `LAP11-${unik}`,
        idempotencyKey: `laporan11-${unik}`,
        customerId: customer.id,
        customerUserId: customer.id,
        orderStatus: 'SELESAI',
        paymentProofStatus: 'TERVERIFIKASI',
        pickupStatus: 'DISETUJUI',
        refundStatus: 'TIDAK_BERLAKU',
        paymentMethod: 'TUNAI_CFD',
        pickupSundayDate: new Date('2026-12-06T02:00:00.000Z'),
        paymentDeadline: sekarang,
        paidAt: sekarang,
        completedAt: sekarang,
        totalAmount: 60000,
      },
    })
    await db.orderItem.create({
      data: {
        orderId: order.id,
        orderOrderId: order.id,
        bookId: buku.id,
        bookBookId: buku.id,
        quantity: 1,
        snapshotTitle: buku.title,
        snapshotSellingPrice: 60000,
        snapshotCostPrice: 30000,
        subtotal: 60000,
      },
    })

    try {
      const laporan = await ringkasanLaporanKeuangan(
        db,
        parsePeriodeLaporan('harian', hariWIB, sekarang)
      )
      expect(laporan.ringkasan.penjualanOffline).toBe(150000)
      expect(laporan.ringkasan.penjualanOnline).toBe(60000)
      expect(laporan.ringkasan.totalUnit).toBe(3)
      expect(laporan.laba.historisOffline).toBe(90000)
      expect(laporan.laba.hitungUlangOffline).toBe(70000)
      expect(laporan.laba.historisOnline).toBe(30000)
      expect(laporan.laba.hitungUlangOnline).toBe(20000)
      expect(laporan.laba.historisTotal).toBe(120000)
      expect(laporan.laba.hitungUlangTotal).toBe(90000)
    } finally {
      await db.orderItem.deleteMany({ where: { orderId: order.id } })
      await db.orderStatusHistory.deleteMany({ where: { orderId: order.id } })
      await db.orderPaymentAllocation.deleteMany({ where: { orderId: order.id } })
      await db.order.delete({ where: { id: order.id } })
      await db.offlineSaleItem.deleteMany({ where: { offlineSaleId: sale.id } })
      await db.offlineSale.delete({ where: { id: sale.id } })
      await db.book.delete({ where: { id: buku.id } })
      await db.category.delete({ where: { id: kategori.id } })
      await db.user.delete({ where: { id: customer.id } })
      await db.user.delete({ where: { id: admin.id } })
    }
  }, 60000)
})

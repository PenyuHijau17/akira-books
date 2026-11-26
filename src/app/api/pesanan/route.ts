// src/app/api/pesanan/route.ts
// Daftar pesanan milik Customer yang login.
// GR-03: field modal/laba (snapshotCostPrice, costPrice) tidak pernah dikirim ke Customer.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { saringFieldModal } from '@/lib/pesanan'

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const pesanan = await prisma().order.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentProofStatus: true,
        pickupStatus: true,
        refundStatus: true,
        paymentMethod: true,
        pickupSundayDate: true,
        pickupGroupId: true,
        noShowHoldDeadline: true,
        paymentDeadline: true,
        totalAmount: true,
        createdAt: true,
      },
    })

    const orderItems = await prisma().orderItem.findMany({
      where: { orderId: { in: pesanan.map((p) => p.id) } },
      select: {
        id: true,
        orderId: true,
        bookId: true,
        quantity: true,
        snapshotCode: true,
        snapshotTitle: true,
        snapshotSellingPrice: true,
        subtotal: true,
      },
    })

    const hasil = pesanan.map((p) => ({
      ...p,
      orderItems: orderItems
        .filter((item) => item.orderId === p.id)
        .map(({ orderId: _orderId, ...item }) => item),
    }))

    return NextResponse.json({ pesanan: saringFieldModal(hasil) })
  } catch (error: any) {
    console.error('API GET /api/pesanan error:', error)
    return NextResponse.json(
      { error: error?.message || 'Gagal mengambil daftar pesanan' },
      { status: 500 }
    )
  }
}

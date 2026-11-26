// src/app/api/pesanan/[id]/route.ts
// Detail satu pesanan. Hanya pemilik pesanan (Customer) yang boleh mengakses.
// GR-03: field modal/laba tidak pernah dikirim ke Customer.

import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { saringFieldModal } from '@/lib/pesanan'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const { id } = await params

    const pesanan = await prisma().order.findFirst({
      where: { id, customerId: user.id },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentProofStatus: true,
        pickupStatus: true,
        refundStatus: true,
        paymentMethod: true,
        pickupSundayDate: true,
        paymentDeadline: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!pesanan) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    const orderItems = await prisma().orderItem.findMany({
      where: { orderId: pesanan.id },
      select: {
        id: true,
        bookId: true,
        quantity: true,
        snapshotCode: true,
        snapshotTitle: true,
        snapshotSellingPrice: true,
        subtotal: true,
      },
    })

    return NextResponse.json({ pesanan: saringFieldModal({ ...pesanan, orderItems }) })
  } catch (error: any) {
    console.error('API GET /api/pesanan/[id] error:', error)
    return NextResponse.json(
      { error: error?.message || 'Gagal mengambil detail pesanan' },
      { status: 500 }
    )
  }
}

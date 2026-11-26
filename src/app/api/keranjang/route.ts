// src/app/api/keranjang/route.ts
// API Keranjang Belanja: GET (muat & sinkronisasi stok BR-012), POST (tambah/ubah item), PUT (setujui ulang), DELETE (hapus item)
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { muatKeranjang, ambilAtauBuatKeranjang, setujuiKeranjang } from '@/lib/keranjangServer'
import { hitungStokTersedia, bukuDapatDijual } from '@/lib/keranjang'

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const payload = await muatKeranjang(user.id)
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('API GET /api/keranjang error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const body = await request.json()
    const { bookId, quantity } = body

    if (!bookId || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ error: 'Data item keranjang tidak valid' }, { status: 400 })
    }

    const client = prisma()
    const buku = await client.book.findUnique({ where: { id: bookId } })

    if (!buku || !bukuDapatDijual(buku)) {
      return NextResponse.json({ error: 'Buku tidak ditemukan atau sudah tidak dijual' }, { status: 400 })
    }

    const stokTersedia = hitungStokTersedia(buku)
    if (quantity > stokTersedia) {
      return NextResponse.json(
        { error: `Kuantitas melebihi stok tersedia (${stokTersedia} eksemplar)` },
        { status: 400 }
      )
    }

    const keranjang = await ambilAtauBuatKeranjang(user.id)

    // Cek apakah item sudah ada di keranjang
    const itemExist = await client.cartItem.findUnique({
      where: {
        cartId_bookId: {
          cartId: keranjang.id,
          bookId,
        },
      },
    })

    if (itemExist) {
      const kuantitasBaru = itemExist.quantity + quantity
      if (kuantitasBaru > stokTersedia) {
        return NextResponse.json(
          { error: `Total kuantitas di keranjang (${kuantitasBaru}) melebihi stok tersedia (${stokTersedia})` },
          { status: 400 }
        )
      }
      await client.cartItem.update({
        where: { id: itemExist.id },
        data: { quantity: kuantitasBaru },
      })
    } else {
      await client.cartItem.create({
        data: {
          cartId: keranjang.id,
          bookId,
          quantity,
          cartCartId: keranjang.id,
          bookBookId: bookId,
        },
      })
    }

    const payload = await muatKeranjang(user.id)
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('API POST /api/keranjang error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// Ubah kuantitas satu item keranjang (tanpa menahan stok, BR-010)
export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const itemId = body?.itemId
    const quantity = body?.quantity

    if (!itemId || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Kuantitas tidak valid' }, { status: 400 })
    }

    const client = prisma()
    const keranjang = await ambilAtauBuatKeranjang(user.id)
    const item = await client.cartItem.findFirst({
      where: { id: itemId, cartId: keranjang.id },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item keranjang tidak ditemukan' }, { status: 404 })
    }

    const buku = await client.book.findUnique({ where: { id: item.bookId } })
    const tersedia = hitungStokTersedia(buku)

    if (!bukuDapatDijual(buku) || tersedia <= 0) {
      return NextResponse.json(
        { error: 'Buku sudah tidak tersedia di keranjang Anda' },
        { status: 400 }
      )
    }

    if (quantity > tersedia) {
      return NextResponse.json(
        { error: `Kuantitas melebihi stok tersedia (${tersedia} eksemplar)` },
        { status: 400 }
      )
    }

    await client.cartItem.update({ where: { id: item.id }, data: { quantity } })
    return NextResponse.json(await muatKeranjang(user.id))
  } catch (error: any) {
    console.error('API PATCH /api/keranjang error:', error)
    return NextResponse.json({ error: error?.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'setujui') {
      const payload = await setujuiKeranjang(user.id)
      return NextResponse.json(payload)
    }

    return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 })
  } catch (error: any) {
    console.error('API PUT /api/keranjang error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request)
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const url = new URL(request.url)
    const itemId = url.searchParams.get('itemId')
    const clearAll = url.searchParams.get('clearAll') === 'true'

    const keranjang = await ambilAtauBuatKeranjang(user.id)
    const client = prisma()

    if (clearAll) {
      await client.cartItem.deleteMany({ where: { cartId: keranjang.id } })
    } else if (itemId) {
      await client.cartItem.delete({
        where: { id: itemId, cartId: keranjang.id },
      })
    } else {
      return NextResponse.json({ error: 'Parameter itemId atau clearAll diperlukan' }, { status: 400 })
    }

    const payload = await muatKeranjang(user.id)
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('API DELETE /api/keranjang error:', error)
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 })
  }
}

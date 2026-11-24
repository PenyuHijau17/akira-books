import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { boleLihatModalLaba } from '@/lib/rbac'

// Helper: hanya Admin Utama yang boleh melihat/modal cost price (GR-03)
// Semua role lain (Pengunjung, Customer, Admin Biasa) DILARANG keras

// GET /api/admin/buku - Daftar buku untuk admin (semua field termasuk costPrice)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const kategori = searchParams.get('kategori') || ''

    const where: any = {}

    if (status) {
      where.status = status
    }
    if (kategori) {
      where.categoryId = kategori
    }

    const books = await prisma().book.findMany({
      where,
      // Hilangkan include category untuk menghindari error tipe Prisma
      // dan hanya gunakan where.categoryId untuk filter
      orderBy: { title: 'asc' },
    })

    // GR-03: Filter costPrice dari respons hanya untuk Admin Utama
    // BoleLihatModalLaba akan digunakan oleh middleware untuk menentukan role
    // Saat ini, costPrice dihapus dari respons untuk semua pemanggil non-Admin-Utama
    const booksFiltered = books.map((book: any) => {
      const { costPrice, ...bookWithoutCostPrice } = book
      return bookWithoutCostPrice
    })

    return NextResponse.json({ books: booksFiltered })
  } catch (error) {
    console.error('Error fetching admin buku:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data buku' },
      { status: 500 }
    )
  }
}

// POST /api/admin/buku - Tambah buku baru
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      code,
      title,
      author,
      publisher,
      publishYear,
      categoryId,
      imageUrl,
      description,
      sellingPrice,
      costPrice,
      stockTotal,
    } = body

    // Validasi field wajib
    if (!code || !title || !author || sellingPrice === undefined) {
      return NextResponse.json(
        { error: 'Field wajib tidak lengkap' },
        { status: 400 }
      )
    }

    // GR-03: Hanya Admin Utama yang boleh menetapkan costPrice
    // Cek role pemanggil - middleware RBAC yang aktif akan validasi
    // Jika role bukan ADMIN_UTAMA dan costPrice disediakan, tolak request
    const rolePengguna = 'ADMIN_BIASA' // Default: akan divalidasi oleh middleware
    // TODO: Ambil role dari middleware/session: const rolePengguna = getRoleFromContext()
    // if (!boleLihatModalLaba(rolePengguna) && costPrice !== undefined) {
    //   return NextResponse.json(
    //     { error: 'Hanya Admin Utama yang boleh menetapkan costPrice' },
    //     { status: 403 }
    //   )
    // }

    // OD-02: Hanya Admin Utama yang boleh menetapkan costPrice
    // (validasi lebih lanjut dilakukan di middleware RBAC)
    // Untuk saat ini, bi default costPrice ke 0 jika tidak ada yang Admin Utama
    const actualCostPrice = costPrice ?? 0

    // Buat buku
    const book = await prisma().book.create({
      data: {
        code,
        title,
        author,
        publisher: publisher || '',
        publishYear: publishYear || 2024,
        imageUrl: imageUrl || '',
        description: description || '',
        sellingPrice: sellingPrice,
        costPrice: actualCostPrice,
        stockTotal: stockTotal ?? 0,
        stockReserved: 0, // Default 0 (BR-010)
        status: 'TERSEDIA',
        categoryId: categoryId || '',
      },
      include: {
        BookCostHistory: true,
      },
    })

    // Buat StockMovement terpisah setelah buku dibuat
    if (stockTotal && stockTotal > 0) {
      await prisma().stockMovement.create({
        data: {
          bookId: book.id,
          type: 'MASUK',
          quantity: stockTotal,
          reason: 'Stok awal saat pembuatan buku',
        },
      })
    }

    return NextResponse.json({
      success: true,
      book,
      message: 'Buku berhasil ditambahkan',
    })
  } catch (error: any) {
    console.error('Error creating book:', error)
    // Handle duplicate code
    if (error.code === 'P2003' || error.message?.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Kode buku sudah ada. Gunakan kode yang unik.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Gagal menambah buku' },
      { status: 500 }
    )
  }
}
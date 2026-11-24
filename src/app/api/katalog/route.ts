import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/katalog - Daftar buku dengan pencarian, filter, dan pengurutan
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const kategori = searchParams.get('kategori') || ''
    const status = searchParams.get('status') || ''
    const sort = searchParams.get('sort') || 'terbaru'

    // Build where clause untuk pencarian
    const where: any = {
      status: status || 'TERSEDIA', // Default hanya tampilkan buku tersedia
    }

    // Pencarian judul/penulis/ISBN
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { author: { contains: query, mode: 'insensitive' } },
        { code: { contains: query, mode: 'insensitive' } },
      ]
    }

    // Filter kategori - hubungkan via categoryId
    if (kategori) {
      where.categoryId = kategori
    }

    // Pengurutan
    const orderBy: any = {}
    if (sort === 'harga_rendah') {
      orderBy.sellingPrice = 'asc'
    } else if (sort === 'harga_tinggi') {
      orderBy.sellingPrice = 'desc'
    } else {
      // Default: terbaru
      orderBy.id = 'desc'
    }

    const books = await prisma().book.findMany({
      where,
      include: {
        // costPrice DIKELUARGAKAN untuk semua peran kecuali Admin Utama
        //akan difilter di layer response di bawah
        BookCostHistory: false, // Hilangkan cost history dari hasil
      },
      orderBy,
      take: 50,
    })

    // Terapkan isolasi field modal (GR-03): costPrice tidak pernah terkirim ke Pengunjung, Customer, Admin Biasa
    // Field costPrice hanya terlihat oleh Admin Utama
    // Kami mengembalikan hanya field yang aman untuk publik
    const safeBooks = books.map((book: any) => ({
      id: book.id,
      code: book.code,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      publishYear: book.publishYear,
      imageUrl: book.imageUrl,
      description: book.description,
      sellingPrice: book.sellingPrice,
      stockTotal: book.stockTotal,
      status: book.status,
      kategori: book.category?.name || '',
      // Jika user adalah Admin Utama, kita bisa tambahkan costPrice,
      // namun di API level kami tidak tahu role user, jadi kita kirim field kosong/null
      // dan akan difilter lagi di middleware/server-side rendering
      costPrice: null, // Akan difilter oleh middleware RBAC
    }))

    return NextResponse.json({
      books: safeBooks,
      total: safeBooks.length,
      filters: { query, kategori, status, sort },
    })
  } catch (error) {
    console.error('Error fetching katalog:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data katalog' },
      { status: 500 }
    )
  }
}
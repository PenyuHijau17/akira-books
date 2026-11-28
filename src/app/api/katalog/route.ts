import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { bangunOrderKatalog, bangunWhereKatalog } from '@/lib/katalogFilter'
import { daftarNamaUnik } from '@/lib/namaBuku'
import { daftarIdTandaan, dtoBukuTandaan } from '@/lib/tandaiBuku'

// GET /api/katalog - Daftar buku dengan pencarian, filter (kategori/penulis/penerbit), dan pengurutan.
// GR-03: DTO publik tidak memuat costPrice / riwayat modal.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const kategori = searchParams.get('kategori') || ''
    const penulis = searchParams.get('penulis') || ''
    const penerbit = searchParams.get('penerbit') || ''
    const status = searchParams.get('status') || ''
    const sort = searchParams.get('sort') || 'terbaru'
    const hanyaTandaan = searchParams.get('tandai') === '1'

    // Filter cepat "Hanya Buku Ditandai" hanya untuk Customer login (GR-02).
    let idTandaan: string[] | null = null
    if (hanyaTandaan) {
      const user = await getSessionUser(request)
      if (!user || user.role !== 'CUSTOMER') {
        return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
      }
      const baris = await prisma().wishlistItem.findMany({
        where: { userId: user.id },
        select: { bookId: true },
      })
      idTandaan = daftarIdTandaan(baris)
    }

    const where = bangunWhereKatalog({ q: query, kategori, penulis, penerbit, status, sort })
    if (idTandaan) where.id = { in: idTandaan }
    const orderBy = bangunOrderKatalog(sort)

    // Opsi filter diambil dari seluruh buku, bukan hanya hasil yang sedang difilter.
    const [books, semuaBuku, daftarKategori] = await Promise.all([
      prisma().book.findMany({ where, orderBy, take: 50 }),
      prisma().book.findMany({ select: { author: true, publisher: true } }),
      prisma().category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ])

    const petaKategori = new Map(daftarKategori.map((item) => [item.id, item.name]))

    // Hanya field aman untuk publik; costPrice sengaja tidak disertakan sama sekali.
    const safeBooks = books.map((book: any) =>
      dtoBukuTandaan(book, petaKategori.get(book.categoryId) || '')
    )

    return NextResponse.json({
      books: safeBooks,
      total: safeBooks.length,
      filters: { query, kategori, penulis, penerbit, status: status || 'TERSEDIA', sort },
      facets: {
        kategori: daftarKategori.map((item) => ({ value: item.id, label: item.name })),
        penulis: daftarNamaUnik(semuaBuku.map((book) => book.author)),
        penerbit: daftarNamaUnik(semuaBuku.map((book) => book.publisher)),
      },
    })
  } catch (error) {
    console.error('Error fetching katalog:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data katalog' },
      { status: 500 }
    )
  }
}

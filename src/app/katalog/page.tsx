"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BannerCarousel from '@/components/BannerCarousel'
import { TandaiBukuProvider, useTandaiBuku } from '@/components/TandaiBukuContext'
import { TombolTandaiBuku } from '@/components/TombolTandaiBuku'
import { slugBuku } from '@/lib/slugBuku'
import { filterBukuTandaan } from '@/lib/tandaiBuku'

type Facets = {
  kategori: Array<{ value: string; label: string }>
  penulis: string[]
  penerbit: string[]
}

const facetsKosong: Facets = { kategori: [], penulis: [], penerbit: [] }

// Helper ambil query dari URL
function useQueryParams() {
  const [q, setQ] = useState<string>('')
  const [kategori, setKategori] = useState<string>('')
  const [penulis, setPenulis] = useState<string>('')
  const [penerbit, setPenerbit] = useState<string>('')
  const [status, setStatus] = useState<string>('TERSEDIA')
  const [sort, setSort] = useState<'terbaru' | 'harga_rendah' | 'harga_tinggi'>('terbaru')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setQ(params.get('q') || '')
    setKategori(params.get('kategori') || '')
    setPenulis(params.get('penulis') || '')
    setPenerbit(params.get('penerbit') || '')
    setStatus(params.get('status') || 'TERSEDIA')
    setSort(params.get('sort') as any || 'terbaru')
  }, [])

  return {
    q, setQ, kategori, setKategori, penulis, setPenulis,
    penerbit, setPenerbit, status, setStatus, sort, setSort,
  }
}

export default function KatalogPage() {
  return (
    <TandaiBukuProvider>
      <KatalogKonten />
    </TandaiBukuProvider>
  )
}

function KatalogKonten() {
  const {
    q, setQ, kategori, setKategori, penulis, setPenulis,
    penerbit, setPenerbit, status, setStatus, sort, setSort,
  } = useQueryParams()
  const [books, setBooks] = useState<any[]>([])
  const [facets, setFacets] = useState<Facets>(facetsKosong)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hanyaTandai, setHanyaTandai] = useState(false)

  // Sesi pembeli & daftar tandaan dibaca sekali oleh context. Tombol
  // "+ Keranjang"/"Tandai" tampil untuk Customer; otorisasi akhir tetap
  // diverifikasi server (GR-02).
  const { pengguna, bookIds, pesan: pesanTandai } = useTandaiBuku()
  const [menambahId, setMenambahId] = useState<string | null>(null)
  const [pesanKeranjang, setPesanKeranjang] = useState<Record<string, string>>({})

  // Fetch hanya bergantung pada nilai primitif filter. Fungsi fetch dibuat
  // di dalam effect (bukan fungsi non-memoized di dependency), dan status
  // loading selalu dimatikan di finally meskipun request gagal.
  useEffect(() => {
    let aktif = true
    setLoading(true)
    setError(null)

    async function muatKatalog() {
      try {
        const params = new URLSearchParams({
          q,
          kategori,
          penulis,
          penerbit,
          status,
          sort,
        })
        if (hanyaTandai) params.set('tandai', '1')
        const res = await fetch(`/api/katalog?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Gagal mengambil data')
        const data = await res.json()
        if (!aktif) return
        setBooks(Array.isArray(data.books) ? data.books : [])
        setFacets(data.facets ?? facetsKosong)
      } catch (e: any) {
        if (aktif) setError(e?.message || 'Terjadi kesalahan')
      } finally {
        if (aktif) setLoading(false)
      }
    }

    muatKatalog()
    return () => {
      aktif = false
    }
  }, [q, kategori, penulis, penerbit, status, sort, hanyaTandai])

  async function tambahKeKeranjang(book: any) {
    if (!book?.id) return
    setMenambahId(book.id)
    setPesanKeranjang((sebelum) => ({ ...sebelum, [book.id]: '' }))

    try {
      const res = await fetch('/api/keranjang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id, quantity: 1 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Gagal menambah buku ke keranjang')

      setPesanKeranjang((sebelum) => ({
        ...sebelum,
        [book.id]: 'Berhasil ditambahkan ke keranjang.',
      }))
    } catch (e: any) {
      setPesanKeranjang((sebelum) => ({
        ...sebelum,
        [book.id]: e?.message || 'Gagal menambah buku ke keranjang.',
      }))
    } finally {
      setMenambahId(null)
    }
  }

  // Saat filter tandaan aktif, daftar juga mengikuti perubahan tandaan
  // secara langsung tanpa menunggu fetch ulang.
  const daftarTampil = hanyaTandai ? filterBukuTandaan(books, bookIds) : books

  const pilihFilter = 'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'

  return (
    <div className="min-h-screen bg-gray-50 pt-8 sm:pt-10">
      {/* Banner Promosi */}
      <div className="mx-auto max-w-7xl px-4">
        <BannerCarousel />
      </div>

      {/* Pencarian — diberi ruang atas & scroll-margin agar tidak menempel
          pada Header sticky saat halaman dibuka/digulir. */}
      <div id="pencarian" className="scroll-mt-28 border-b border-gray-200 px-4 pb-4 pt-6 sm:pt-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul, penulis, atau kode buku..."
              className="rounded-l-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              aria-label="Cari judul, penulis, atau kode buku"
            />
            <button
              onClick={() => setQ('')}
              className="bg-amber-500 text-white px-4 py-2 rounded-r-md hover:bg-amber-600 transition-colors"
              aria-label="Bersihkan pencarian"
            >
              Bersihkan
            </button>
          </div>

          {/* Filter berdampingan dengan pencarian */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={kategori}
              onChange={(e) => {
                // Bersihkan pencarian langsung di handler agar tidak perlu effect
                // tambahan yang dapat memicu render/fetch berulang.
                setKategori(e.target.value)
                setQ('')
              }}
              className={pilihFilter}
              aria-label="Filter kategori"
            >
              <option value="">Semua Kategori</option>
              {facets.kategori.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>

            <select
              value={penulis}
              onChange={(e) => setPenulis(e.target.value)}
              className={pilihFilter}
              aria-label="Filter penulis"
            >
              <option value="">Semua Penulis</option>
              {facets.penulis.map((nama) => (
                <option key={nama} value={nama}>{nama}</option>
              ))}
            </select>

            <select
              value={penerbit}
              onChange={(e) => setPenerbit(e.target.value)}
              className={pilihFilter}
              aria-label="Filter penerbit"
            >
              <option value="">Semua Penerbit</option>
              {facets.penerbit.map((nama) => (
                <option key={nama} value={nama}>{nama}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={pilihFilter}
              aria-label="Filter status"
            >
              <option value="TERSEDIA">Tersedia</option>
              <option value="SEDANG_DIPESAN">Sedang Dipesan</option>
              <option value="TERJUAL">Terjual</option>
              <option value="NONAKTIF">Nonaktif</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className={pilihFilter}
              aria-label="Urutkan buku"
            >
              <option value="terbaru">Terbaru</option>
              <option value="harga_rendah">Harga Rendah</option>
              <option value="harga_tinggi">Harga Tinggi</option>
            </select>

            {pengguna?.role === 'CUSTOMER' && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#D9C4AD] bg-[#FFFDF9] px-3 py-2 text-sm text-[#4A2C2A]">
                <input
                  type="checkbox"
                  checked={hanyaTandai}
                  onChange={(e) => setHanyaTandai(e.target.checked)}
                  aria-label="Hanya Buku Ditandai"
                  className="h-4 w-4 accent-[#8D5B4C]"
                />
                Hanya Buku Ditandai
              </label>
            )}
          </div>
        </div>
        {error && (
          <p className="max-w-7xl mx-auto mt-2 text-sm text-red-600">{error}</p>
        )}
        {pesanTandai && (
          <p role="status" className="max-w-7xl mx-auto mt-2 text-sm text-[#3F6B45]">
            {pesanTandai}
          </p>
        )}
      </div>

      {/* Buku Grid */}
      <div className="max-w-7xl mx-auto p-4">
        {loading && (
          <div className="text-center py-8">
            <span className="animate-spin inline-block mr-2"></span>
            <span>Memuat...</span>
          </div>
        )}

        {!loading && daftarTampil.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <span className="text-xl">Tidak ada buku yang sesuai</span>
            <p className="mt-2">Coba filter lain atau kata kunci lain</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {daftarTampil.map((book) => {
            // Slug deterministik dari judul + kode; kode tetap jadi fallback.
            const slug = encodeURIComponent(
              String(book.slug || slugBuku(book.title, book.code) || book.code || book.id)
            )
            const bisaBeli =
              pengguna?.role === 'CUSTOMER' &&
              book.status === 'TERSEDIA' &&
              Number(book.stockTotal) > 0

            return (
              <article
                key={book.id}
                className="group flex flex-col overflow-hidden rounded-lg border border-[#E6DCD0] bg-[#FFFDF9] shadow-sm transition hover:-translate-y-0.5 hover:border-[#C8B6A6] hover:shadow-md"
              >
                {/* Sampul dan judul: seluruh area dapat diklik */}
                <Link
                  href={`/katalog/${slug}`}
                  aria-label={`Lihat detail ${book.title}`}
                  className="block cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8D5B4C]"
                >
                  {book.imageUrl ? (
                    <img
                      src={book.imageUrl}
                      alt={`Sampul ${book.title}`}
                      className="h-48 w-full object-cover transition group-hover:opacity-90"
                    />
                  ) : (
                    <div className="flex h-48 w-full items-center justify-center bg-[#F3ECE1] text-sm text-[#8D5B4C]">
                      <span>Tanpa Sampul</span>
                    </div>
                  )}

                  <div className="p-3">
                    <h4
                      className="line-clamp-2 text-sm font-medium text-[#3E2723] transition group-hover:text-[#8D5B4C]"
                      title={book.title}
                    >
                      {book.title}
                    </h4>
                    <p className="line-clamp-1 text-xs text-[#6B4F43]">{book.author}</p>
                    {book.publisher && (
                      <p className="line-clamp-1 text-xs text-[#8D5B4C]">{book.publisher}</p>
                    )}
                  </div>
                </Link>

                {/* Harga, status, dan aksi */}
                <div className="mt-auto border-t border-[#E6DCD0] px-3 pb-3 pt-3">
                  <p className="font-bold text-[#8D5B4C]">
                    Rp {Number(book.sellingPrice || 0).toLocaleString('id-ID')}
                  </p>

                  <p className="mt-1">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[11px] ${
                        book.status === 'TERSEDIA'
                          ? 'bg-[#E4F0E2] text-[#3F6B45]'
                          : book.status === 'SEDANG_DIPESAN'
                            ? 'bg-[#F7E9D2] text-[#8A5B22]'
                            : book.status === 'TERJUAL'
                              ? 'bg-[#EDE3D8] text-[#6B4F43]'
                              : 'bg-[#F3ECE1] text-[#8D5B4C]'
                      }`}
                    >
                      {book.status}
                    </span>
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/katalog/${slug}`}
                      className="inline-flex items-center rounded-sm border border-[#C8B6A6] bg-[#FFFDF9] px-3 py-1.5 text-xs font-semibold text-[#4A2C2A] transition hover:bg-[#F3ECE1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8D5B4C]"
                    >
                      Lihat Detail
                    </Link>

                    <TombolTandaiBuku bookId={book.id} judul={book.title} />

                    {bisaBeli && (
                      <button
                        type="button"
                        onClick={() => tambahKeKeranjang(book)}
                        disabled={menambahId === book.id}
                        className="inline-flex items-center rounded-sm bg-[#4A2C2A] px-3 py-1.5 text-xs font-semibold text-[#FAF6F0] transition hover:bg-[#5E3935] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {menambahId === book.id ? 'Menambah...' : '+ Keranjang'}
                      </button>
                    )}
                  </div>

                  {pesanKeranjang[book.id] && (
                    <p
                      role="status"
                      className={`mt-2 text-[11px] ${
                        pesanKeranjang[book.id].startsWith('Berhasil')
                          ? 'text-[#3F6B45]'
                          : 'text-[#9A4A34]'
                      }`}
                    >
                      {pesanKeranjang[book.id]}
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

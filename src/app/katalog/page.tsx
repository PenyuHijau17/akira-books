"use client"

import { useState, useEffect, useRef } from 'react'

// Helper ambil query dari URL
function useQueryParams() {
  const [q, setQ] = useState<string>('')
  const [kategori, setKategori] = useState<string>('')
  const [status, setStatus] = useState<string>('TERSEDIA')
  const [sort, setSort] = useState<'terbaru' | 'harga_rendah' | 'harga_tinggi'>('terbaru')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setQ(params.get('q') || '')
    setKategori(params.get('kategori') || '')
    setStatus(params.get('status') || 'TERSEDIA')
    setSort(params.get('sort') as any || 'terbaru')
  }, [])

  return { q, setQ, kategori, setKategori, status, setStatus, sort, setSort }
}

export default function KatalogPage() {
  const { q, setQ, kategori, setKategori, status, setStatus, sort, setSort } = useQueryParams()
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchKatalog()
  }, [q, kategori, status, sort])

  async function fetchKatalog() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/katalog?q=${encodeURIComponent(q)}&kategori=${encodeURIComponent(kategori)}&status=${status}&sort=${sort}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Gagal mengambil data')
      const data = await res.json()
      setBooks(data.books)
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  // Saat kategori filter berubah, reset query
  useEffect(() => {
    if (kategori && q) {
      // Jika ada kategori dan query, reset query saat memilih kategori baru
      setQ('')
    }
  }, [kategori])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul, penulis, atau ISBN..."
              className="rounded-l-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              aria-label="Bersihkan pencarian"
            />
            <button
              onClick={() => setQ('')}
              className="bg-amber-500 text-white px-4 py-2 rounded-r-md hover:bg-amber-600 transition-colors"
              aria-label="Bersihkan pencarian"
            >
              Bersihkan
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">Semua Kategori</option>
              <option value="FICTION">Fiksi</option>
              <option value="NON-FICTION">Non-Fiksi</option>
              <option value="KAITAN">Kaitan</option>
              <option value="BIOGRAFI">Biografi</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="TERSEDIA">Tersedia</option>
              <option value="SEDANG_DIPESAN">Sedang Dipesan</option>
              <option value="TERJUAL">Terjual</option>
              <option value="NONAKTIF">Nonaktif</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="terbaru">Terbaru</option>
              <option value="harga_rendah">Harga Rendah</option>
              <option value="harga_tinggi">Harga Tinggi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Buku Grid */}
      <div className="max-w-7xl mx-auto p-4">
        {loading && (
          <div className="text-center py-8">
            <span className="animate-spin inline-block mr-2"></span>
            <span>Memuat...</span>
          </div>
        )}

        {!loading && books.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <span className="text-xl">Tidak ada buku yang sesuai</span>
            <p className="mt-2">Coba filter lain atau kata kunci lain</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {books.map((book) => (
            <div
              key={book.id}
              className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Buku Cover */}
              {book.imageUrl ? (
                <img
                  src={book.imageUrl}
                  alt={book.title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div
                  className="w-full h-48 bg-amber-200 flex items-center justify-center text-gray-400 text-sm"
                >
                  <span>No Cover</span>
                </div>
              )}

              {/* Buku Info */}
              <div className="p-3">
                <h4
                  className="font-medium text-sm line-clamp-2"
                  title={book.title}
                >
                  {book.title}
                </h4>
                <p className="text-xs text-gray-500 line-clamp-1">
                  {book.author}
                </p>

                {/* Harga */}
                <p className="mt-2 font-bold text-amber-600">
                  Rp {book.sellingPrice.toLocaleString('id-ID')}
                </p>

                {/* Status */}
                <p className="mt-1 text-xs">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-capitalize text-xs ${
                      book.status === 'TERSEDIA' ? 'bg-amber-100 text-amber-800' :
                      book.status === 'SEDANG_DIPESAN' ? 'bg-amber-200 text-amber-700' :
                      book.status === 'TERJUAL' ? 'bg-gray-200 text-gray-600' :
                      'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {book.status}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
"use client"

import { useState, useEffect, useRef } from 'react'
import prisma from '@/lib/prisma'
import { MATRIX_AKSES, RolePengguna } from '@/lib/rbac'
import { useSearchParams, useRouter } from 'next/navigation'

// Cek apakah user bisa lihat cost price
function boleLihatModalLaba(): boolean {
  // Harus diimplementasikan di server-side, tapi kita cek di sisi client
  // dengan mengirim request ke API untuk mengecek role
  return false // Akan dihandle oleh middleware/server
}

export default function AdminBukuPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') || 'CUSTOMER'

  const [books, setBooks] = useState<any[]>([])
  const [newBook, setNewBook] = useState({
    code: '',
    title: '',
    author: '',
    publisher: '',
    publishYear: 2024,
    categoryId: '',
    imageUrl: '',
    description: '',
    sellingPrice: 0,
    costPrice: 0,
    stockTotal: 0,
  })

  const [editingBook, setEditingBook] = useState<any>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [action, setAction] = useState<'tambah' | 'edit' | 'nonaktifkan'>('tambah')

  const [kategoriOptions, setKategoriOptions] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [kategoriFilter, setKategoriFilter] = useState<string>('')

  // Load buku saat mount
  useEffect(() => {
    fetchBooks()
    fetchKategori()
  }, [])

  // Fetch daftar buku
  async function fetchBooks() {
    try {
      const res = await fetch(`/api/admin/buku?status=${statusFilter}&kategori=${kategoriFilter}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Gagal memuat buku')
      const data = await res.json()
      setBooks(data.books)
    } catch (e: any) {
      console.error(e)
    }
  }

  // Fetch kategori untuk filter
  async function fetchKategori() {
    try {
      const res = await fetch('/api/categories', {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Gagal memuat kategori')
      const data = await res.json()
      setKategoriOptions(data.categories || [])
    } catch (e: any) {
      console.error(e)
    }
  }

  // Toggle modal
  function toggleModal(mode: 'tambah' | 'edit' | 'nonaktifkan', book?: any) {
    setAction(mode)
    if (mode === 'edit' && book) {
      setEditingBook(book)
      setNewBook({
        code: book.code,
        title: book.title,
        author: book.author,
        publisher: book.publisher || '',
        publishYear: book.publishYear || '',
        categoryId: book.categoryId || '',
        imageUrl: book.imageUrl || '',
        description: book.description || '',
        sellingPrice: book.sellingPrice,
        costPrice: book.costPrice,
        stockTotal: book.stockTotal,
      })
    } else if (mode === 'nonaktifkan' && book) {
      setEditingBook(book)
      setNewBook({
        ...book,
        costPrice: Number(book.costPrice) || 0, // Pastikan numerik
      })
    } else {
      setEditingBook(null)
      setNewBook({
        code: '',
        title: '',
        author: '',
        publisher: '',
        publishYear: 2024,
        categoryId: '',
        imageUrl: '',
        description: '',
        sellingPrice: 0,
        costPrice: 0,
        stockTotal: 0,
      }
      )
    }
    setModalVisible(true)
  }

  // Simpan buku (tambah/ubah)
  async function handleSubmit() {
    if (!newBook.code || !newBook.title || !newBook.author) {
      alert('Field kode, judul, dan penulis wajib diisi')
      return
    }

    setModalVisible(false)
    
    try {
      // Validasi: costPrice hanya boleh diisi oleh Admin Utama
      // Klien bisa mengirimkan costPrice, tetapi server harus memvalidasi role terlebih dahulu
      // Di sini kita anggap request sudah lewat middleware RBAC
      
      if (action === 'tambah') {
        await fetch('/api/admin/buku', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newBook,
            status: 'TERSEDIA',
          }),
        })
      } else if (action === 'edit') {
        if (!editingBook?.id) return
        await fetch(`/api/admin/buku/${editingBook.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newBook,
            // Jika user bukan Admin Utama, costPrice harus di-set null/dilewati
            costPrice: role === 'ADMIN_UTAMA' ? newBook.costPrice : undefined,
          }),
        })
      } else if (action === 'nonaktifkan') {
        if (!editingBook?.id) return
        await fetch(`/api/admin/buku/${editingBook.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            costPrice: newBook.costPrice,
          }),
        })
      }

      fetchBooks()
    } catch (e: any) {
      console.error(e)
      alert('Gagal menyimpan buku: ' + (e.message || ''))
    }
  }

  // Hapus (permanent) buku - hanya Admin Utama
  async function handlePermanentHapus(id: string) {
    if (!confirm('Yakin ingin menghapus buku permanen? Tindakan ini tidak bisa dibatalkan.')) return
    try {
      await fetch(`/api/admin/buku/${id}`, {
        method: 'DELETE',
      })
      fetchBooks()
    } catch (e: any) {
      console.error(e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <h1 className="text-2xl font-bold text-amber-800">
            Pengelolaan Buku
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Role: {role === 'ADMIN_UTAMA' ? 'Admin Utama' : role === 'ADMIN_BIASA' ? 'Admin Biasa' : 'Pengunjung'}
            </span>
          </div>
        </div>
      </header>

      {/* Action Bar */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex gap-2">
          {/* Tombol Tambah Buku - hanya Admin Utama dan Admin Biasa */}
          {['ADMIN_UTAMA', 'ADMIN_BIASA'].includes(role as any) && (
            <button
              onClick={() => toggleModal('tambah')}
              className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 transition-colors flex items-center gap-1"
              aria-label="Tambah buku baru"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 4a2 2 0 012 2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3a2 2 0 012-2zm0 0a2 2 0 012 2h5.293l-1.083 1.083a6.007 6.007 0 00-1.837 1.837L16.72 16H4.28a6.007 6.007 0 00-1.837-1.837L5.293 7H10z" />
              </svg>
              Tambah Buku
            </button>
          )}

          {/* Filter */}
          <div className="relative">
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Filter Kategori</option>
              {kategoriOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <svg
              xmlns="http.w3.org/2000/svg"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path fill-rule="evenodd" d="M7.25 5.75a.75.75 0 011.089 0l3 3a.75.75 0 01-1.089.75H5.75a.75.75 0 01-.75-.75z" />
            </svg>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); router.refresh() }}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ml-2"
          >
            <option value="">Filter Status</option>
            <option value="TERSEDIA">Tersedia</option>
            <option value="SEDANG_DIPESAN">Sedang Dipesan</option>
            <option value="TERJUAL">Terjual</option>
            <option value="NONAKTIF">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Buku Tabel */}
      <div className="p-4 overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-amber-600 bg-white">
            <tr>
              <th className="py-3 px-6 font-medium text-amber-600">Kode</th>
              <th className="py-3 px-6 font-medium text-amber-600">Judul</th>
              <th className="py-3 px-6 font-medium text-amber-600">Penulis</th>
              <th className="py-3 px-6 font-medium text-amber-600">Kategori</th>
              <th className="py-3 px-6 font-medium text-amber-600">Harga Jual</th>
              <th className="py-3 px-6 font-medium text-amber-600">Stok</th>
              <th className="py-3 px-6 font-medium text-amber-600">Status</th>
              <th className="py-3 px-6 font-medium text-amber-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} className="border-b border-gray-100 hover:bg-amber-50">
                <td className="py-3 px-6">{book.code}</td>
                <td className="py-3 px-6 font-medium">{book.title}</td>
                <td className="py-3 px-6">{book.author}</td>
                <td className="py-3 px-6">{book.categoryName || '-'}</td>
                <td className="py-3 px-6">
                  {book.sellingPrice ? `Rp ${book.sellingPrice.toLocaleString('id-ID')}` : '-'}
                </td>
                <td className="py-3 px-6">
                  {book.stockTotal} ekstr
                </td>
                <td className="py-3 px-6">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${
                      book.status === 'TERSEDIA' ? 'bg-amber-100 text-amber-800' :
                      book.status === 'SEDANG_DIPESAN' ? 'bg-amber-200 text-amber-700' :
                      book.status === 'TERJUAL' ? 'bg-gray-200 text-gray-600' :
                      'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {book.status}
                  </span>
                </td>
                <td className="py-3 px-6">
                  {role === 'ADMIN_UTAMA' ? (
                    <>
                      <button
                        onClick={() => toggleModal('edit', book)}
                        className="text-amber-600 text-sm mr-2 hover:underline"
                        aria-label="Edit buku"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handlePermanentHapus(book.id)}
                        className="text-gray-500 text-sm hover:text-red-500 underline"
                        aria-label="Hapus buku permanen"
                      >
                        Hapus
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => toggleModal('nonaktifkan', book)}
                      className="text-amber-600 text-sm hover:underline"
                      aria-label="Nonaktifkan buku"
                    >
                      Nonaktifkan
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-500">
                  Tidak ada buku ditemukan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form Buku */}
      <div
        id="buku-modal"
        role="dialog"
        aria-modal="true"
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm items-center justify-center ${
          modalVisible ? 'visible opacity-100' : 'hidden opacity-0 transition-opacity'
        }`}
        onClick={() => setModalVisible(false)}
      >
        <div
          className={`bg-white rounded-lg p-6 w-full max-w-md transition-all ${
            modalVisible ? 'scale-100' : 'scale-95 translate-y-2'
          }`}
        >
          <h2 className="text-xl font-bold text-amber-800 mb-4">
            {action === 'tambah' ? 'Tambah Buku Baru' : action === 'edit' ? 'Edit Buku' : 'Nonaktifkan Buku'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field wajib selalu terlihat */}
            <div>
              <label className="text-sm text-gray-600 mb-1">Kode Buku*</label>
              <input
                type="text"
                value={newBook.code}
                onChange={(e) => setNewBook({ ...newBook, code: e.target.value })}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Contoh: AKB-001"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1">Judul Buku*</label>
              <input
                type="text"
                value={newBook.title}
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Judul buku"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1">Penulis*</label>
              <input
                type="text"
                value={newBook.author}
                onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Penulis"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1">Penerbit</label>
              <input
                type="text"
                value={newBook.publisher}
                onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Penerbit"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 mb-1">Tahun Terbit</label>
                <input
                  type="number"
                  value={newBook.publishYear}
                  onChange={(e) => setNewBook({ ...newBook, publishYear: Number(e.target.value) })}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  min="1000"
                  max="2100"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1">Kategori</label>
                <select
                  value={newBook.categoryId}
                  onChange={(e) => setNewBook({ ...newBook, categoryId: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Pilih kategori</option>
                  {kategoriOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1">Gambar Cover (URL)</label>
              <input
                type="text"
                value={newBook.imageUrl}
                onChange={(e) => setNewBook({ ...newBook, imageUrl: e.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="URL gambar cover"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1">Deskripsi</label>
              <textarea
                value={newBook.description}
                onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Deskripsi buku..."
              ></textarea>
            </div>

            {/* Field modal & laba - hanya untuk Admin Utama */}
            {role === 'ADMIN_UTAMA' && (
              <div>
                <label className="text-sm text-gray-600 mb-1">Harga Modal (HPP)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      value={newBook.costPrice}
                      onChange={(e) => setNewBook({ ...newBook, costPrice: Number(e.target.value) || 0 })}
                      className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Harga modal"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Diskon%</label>
                    <input
                      type="number"
                      value={newBook.sellingPrice}
                      onChange={(e) => setNewBook({ ...newBook, sellingPrice: Number(e.target.value) || 0 })}
                      className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Diskon persen"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Harga Jual - terlihat semua peran */}
            <div>
              <label className="text-sm text-gray-600 mb-1">Harga Jual*</label>
              <input
                type="number"
                value={newBook.sellingPrice}
                onChange={(e) => setNewBook({ ...newBook, sellingPrice: Number(e.target.value) || 0 })}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus-border-transparent"
                placeholder="Harga jual"
              />
            </div>

            {/* Stok - terlihat semua peran */}
            <div>
              <label className="text-sm text-gray-600 mb-1">Stok Total*</label>
              <input
                type="number"
                value={newBook.stockTotal}
                onChange={(e) => setNewBook({ ...newBook, stockTotal: Number(e.target.value) || 0 })}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Stok total"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className={`flex-1 bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 transition-colors font-medium`}
                disabled={!newBook.code || !newBook.title || !newBook.author}
              >
                {action === 'tambah' ? 'Simpan Buku' : action === 'edit' ? 'Perubahan Disimpan' : 'Nonaktifkan'}
              </button>
              <button
                type="button"
                onClick={() => setModalVisible(false)}
                className={`flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors font-medium`}
              >
                Batal
              </button>
            </div>
          </form>

          {/* Untuk aksi nonaktifkan, tampilkan konfirmasi */}
          {action === 'nonaktifkan' && editingBook && (
            <div className="mt-4 p-3 bg-red-50 rounded text-red-600 text-sm">
              <p>
                Yakin ingin nonaktifkan buku "<strong>{editingBook.title}</strong>"?
                Buku akan tetap tersimpan tetapi tidak muncul di katalog publik.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
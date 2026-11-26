"use client"

import { useState, useEffect } from 'react'

// Tipe untuk status toko
interface StoreStatusState {
  isOpen: boolean
  activeClosureReason: string
  lastUpdated: Date | null
  recentClosures: Array<{
    closedAt: Date
    actorNameSnapshot: string | null
    lastReason: string | null
  }>
}

export default function StoreStatusPage() {
  // State dengan tipe eksplisit
  const [storeStatus, setStoreStatus] = useState<StoreStatusState>({
    isOpen: true,
    activeClosureReason: '',
    // Tahap 13: jangan memanggil new Date() saat prerender Client Component.
    lastUpdated: null,
    recentClosures: [],
  })

  useEffect(() => {
    fetchStoreStatus()
  }, [])

  async function fetchStoreStatus() {
    try {
      const res = await fetch('/api/store-status', {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Gagal memuat status')
      const data = await res.json()
      // Normalisasi data ke tipe state
      setStoreStatus({
        isOpen: data.isOpen,
        activeClosureReason: data.activeClosureReason || '',
        lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
        recentClosures: data.recentClosures || [],
      })
    } catch (e: any) {
      console.error(e)
    }
  }

  function toggleStatus() {
    setStoreStatus(prev => ({
      ...prev,
      isOpen: !prev.isOpen,
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <h1 className="text-2xl font-bold text-amber-800">
            Status Toko Libur
          </h1>
        </div>
      </header>

      {/* Status Card */}
      <div className="max-w-3xl mx-auto p-4">
        <div
          className={`p-6 rounded-lg ${
            storeStatus.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          } border-t-4 ${
            storeStatus.isOpen ? 'border-green-500' : 'border-red-500'
          }`}
        >
          <div className="flex items-center gap-3">
            {storeStatus.isOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9 5h2v2H9V5zm0 3h2v2H9V8zm0 3h2v2H9v-2zm1.5-6.5a1 1 0 011.5 1.5h3a1 1 0 010 2h-3A1.5 1.5 0 0110.5 13zm0-8a1 1 0 011.5 1.5h3a1 1 0 010 2h-3a1.5 1.5 0 01-1.5-1.5zm0-3a1 1 0 011.5 1.5h3a1 1 0 010 2h-3A1.5 1.5 0 0110.5 7zm0-3a1 1 0 011.5 1.5h3a1 1 0 010 2h-3a1.5 1.5 0 01-1.5-1.5zm6 1a1 1 0 011.5 1.5h3a1 1 0 010 2h-3a1.5 1.5 0 01-1.5-1.5zm0-3a1 1 0 011.5 1.5h3a1 1 0 010 2h-3a1.5 1.5 0 01-1.5-1.5z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 01-1 1H7a1 1 0 100 2h5a1 1 0 011-1v-2zM5 9a1 1 0 011 1h2a1 1 0 100-2H5zm0 4a1 1 0 011 1h2a1 1 0 100-2H5zm3-8a1 1 0 011 1h2a1 1 0 100-2h-2zM8 7a1 1 0 011 1h4a1 1 0 100-2H9z" clip-rule="evenodd" />
              </svg>
            )}
            <span className="text-lg font-medium">
              {storeStatus.isOpen ? 'Toko BUKA' : 'Toko LIBUR'}
            </span>
          </div>
          <p className="mt-2 text-sm opacity-90">
            {storeStatus.activeClosureReason || storeStatus.isOpen ? '' : 'Toko sedang dalam status libur'}
          </p>
          <p className="mt-2 text-sm opacity-70">
            Terakhir diupdate: {storeStatus.lastUpdated ? storeStatus.lastUpdated.toLocaleDateString('id-ID') : '-'}
          </p>
        </div>

        {/* Tombol Toggle */}
        <div className="mt-6">
          <button
            onClick={toggleStatus}
            className={`w-full py-3 rounded ${
              storeStatus.isOpen ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
            } hover:bg-amber-600 transition-colors font-medium`}
            aria-label={storeStatus.isOpen ? 'Nonaktifkan toko' : 'Buka toko'}
          >
            {storeStatus.isOpen ? 'Kirim Toko ke Libur' : 'Buka Toko Kembali'}
          </button>
        </div>

        {/* Alasan libur input */}
        {!storeStatus.isOpen && storeStatus.activeClosureReason && (
          <div className="mt-4 p-3 bg-amber-50 rounded text-amber-700 text-xs">
            <strong>Alasan:</strong> {storeStatus.activeClosureReason}
          </div>
        )}

        {!storeStatus.isOpen && (
          <div className="mt-3">
            <label className="block text-sm text-gray-600 mb-1">
              Alasan libur (opsional)
            </label>
            <textarea
              className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent py-3"
              rows={2}
              placeholder="Masukkan alasan libur..."
              defaultValue={storeStatus.activeClosureReason}
            ></textarea>
          </div>
        )}
      </div>

      {/* Riwayat Penutupan */}
      <div className="mt-8 p-4 bg-white rounded-lg">
        <h2 className="text-xl font-bold text-amber-800 mb-3">
          Riwayat Penutupan Terbaru
        </h2>
        {storeStatus.recentClosures.length === 0 && (
          <p className="text-gray-500">Belum ada riwayat penutupan</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-amber-600 bg-gray-50">
              <tr>
                <th className="py-2 px-3">Tanggal</th>
                <th className="py-2 px-3">Alasan</th>
                <th className="py-2 px-3">Oleh</th>
              </tr>
            </thead>
            <tbody>
              {storeStatus.recentClosures.map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-sm">
                    {item.closedAt ? item.closedAt.toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="py-2 px-3 text-sm text-amber-600">
                    {item.lastReason || '-'}</td>
                  <td className="py-2 px-3 text-sm text-gray-400">
                    {item.actorNameSnapshot || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
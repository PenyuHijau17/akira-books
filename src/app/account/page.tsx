'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/timezone'
import { Button, Input, Card, AlertBanner } from '@/components/ui'

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [berhasil, setBerhasil] = useState<boolean>(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user)
          setNama(data.user.name || '')
          setEmail(data.user.email || '')
          setWhatsapp(data.user.whatsapp || '')
        } else {
          router.push('/login')
        }
      })
      .catch((err) => {
        console.error('Gagal load profil:', err)
        setError('Gagal memuat profil')
        router.push('/login')
      })
  }, [router])

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBerhasil(false)
    setLoading(true)

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateProfile', nama, whatsapp }),
      })
      const result: { success: boolean; error?: string; user?: any } = await response.json()

      if (result.success) {
        setBerhasil(true)
        setNama(result.user?.name || nama)
        setEmail(result.user?.email || email)
        setWhatsapp(result.user?.whatsapp || whatsapp)
      } else {
        setError(result.error || 'Gagal menyimpan perubahan')
      }
    } catch (err) {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
      const result: { success: boolean } = await response.json()

      if (result.success) {
        localStorage.removeItem('userRole')
        router.push('/')
      }
    } catch (err) {
      console.error('Gagal logout:', err)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h2 className="text-center text-3xl font-bold mb-8">Akun Saya</h2>

      {berhasil && <AlertBanner type="success" title="Sukses" />}

      {error && <AlertBanner type="error" title="Error">{error}</AlertBanner>}

      {user && (
        <div className="mb-6">
          <Button onClick={handleLogout} className="w-full py-2 px-4 text-sm">
            Keluar (Logout)
          </Button>
        </div>
      )}

      {user && (
        <form onSubmit={handleSimpan} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-2">Nama Lengkap</label>
            <Input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full px-4 py-3 border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
              placeholder="Nama lengkap"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Nomor WhatsApp</label>
            <Input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-600"
              placeholder="+628xxxxxxxxxx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <p className="text-sm text-gray-600 font-medium">
              {user.email || 'email terkunci'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Email digunakan sebagai identifikasi unik akun dan tidak dapat
              diubah untuk menjaga keamanan akun.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-6 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>

          <p className="text-center text-sm mt-6">
            <a href="/keranjang" className="font-medium text-primary-600 hover:underline">
              Kembali ke Katalog
            </a>
          </p>
        </form>
      )}

      {!user && (
        <p className="text-center text-sm text-gray-500 mt-8">
          Silakan <a href="/login">login</a> untuk melihat akun Anda.
        </p>
      )}
    </div>
  )
}
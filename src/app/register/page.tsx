'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card, AlertBanner } from '@/components/ui'

export default function RegisterPage() {
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password !== konfirmasi) {
      setError('Kata sandi tidak cocok')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', nama, email, password }),
      })
      const result = await response.json()

      if (result.success) {
        router.push('/login')
      } else {
        setError(result.error || 'Gagal daftar')
      }
    } catch (err) {
      setError('Sistem error, coba lagi nanti')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h2 className="text-center text-3xl font-bold mb-8">Daftar Akun Baru</h2>
      {error && <AlertBanner type="error" title="Error Daftar">{error}</AlertBanner>}
      <form onSubmit={handleRegister} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium mb-2">Nama Lengkap *</label>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap" required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email *</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contoh@domain.com" required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Kata Sandi *</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 8 karakter" required />
          <p className="text-sm text-muted-foreground">Minimal 8 karakter, campuran huruf dan angka</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Konfirmasi Kata Sandi *</label>
          <Input type="password" value={konfirmasi} onChange={(e) => setKonfirmasi(e.target.value)} placeholder="Ulangi kata sandi" required />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-6 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
          disabled={loading}
        >
          {loading ? 'Daftar...' : 'Daftar Akun'}
        </button>

        <p className="text-center text-sm mt-4">
          Sudah punya akun? <a href="/login">Masuk sekarang</a>
        </p>
      </form>
    </div>
  )
}
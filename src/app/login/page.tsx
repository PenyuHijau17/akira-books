'use client'

// src/app/login/page.tsx
// Halaman masuk — memanggil /api/auth dengan action: 'login'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input, AlertBanner, Card, CardContent } from '@/components/ui'
import { tentukanTujuanSetelahLogin } from '@/lib/admin-dashboard'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Jika sudah login, langsung arahkan sesuai peran
  useEffect(() => {
    let aktif = true
    fetch('/api/auth', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!aktif || !data?.user) return
        router.replace(tentukanTujuanSetelahLogin(data.user.role))
      })
      .catch(() => {
        /* abaikan */
      })
    return () => {
      aktif = false
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      })
      const result = await response.json()

      if (response.ok && result.success && result.user) {
        // Admin selalu masuk ke Dashboard Utama, walaupun API mengirim redirect lain.
        router.push(tentukanTujuanSetelahLogin(result.user.role))
      } else {
        setError(result.error || 'Login gagal')
      }
    } catch {
      setError('Terjadi kesalahan, silakan coba lagi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h2 className="mb-8 text-center text-3xl font-bold text-brown-700">
        Masuk ke Akira Books
      </h2>

      {error && <AlertBanner type="error" title="Gagal Masuk" description={error} />}

      <Card>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@domain.com"
              required
            />

            <Input
              type="password"
              label="Kata Sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata sandi"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#4d372d] px-6 py-3 font-medium text-[#f7f1e3] transition-colors hover:bg-[#3b2a20] disabled:opacity-50"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>

            <p className="mt-4 text-center text-sm">
              Belum punya akun?{' '}
              <a href="/register" className="font-medium text-[#4d372d] underline">
                Daftar sekarang
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

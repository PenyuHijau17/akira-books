'use client'

// src/app/account/page.tsx
// Halaman Akun Saya — profil klasik (krem & cokelat) dengan foto profil.
// 100% Bahasa Indonesia. Foto diunggah ke /api/account/avatar (milik sendiri).

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Input,
} from '@/components/ui'
import AvatarPengguna from '@/components/AvatarPengguna'
import { validasiAvatar } from '@/lib/avatar'

type Peran = 'CUSTOMER' | 'ADMIN_BIASA' | 'ADMIN_UTAMA' | string

function infoPeran(peran: Peran): { label: string; variant: 'neutral' | 'info' | 'success' } {
  if (peran === 'ADMIN_UTAMA') return { label: 'Admin Utama', variant: 'success' }
  if (peran === 'ADMIN_BIASA') return { label: 'Admin Biasa', variant: 'info' }
  if (peran === 'CUSTOMER') return { label: 'Customer', variant: 'neutral' }
  return { label: 'Pengunjung', variant: 'neutral' }
}

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [sedangUnggah, setSedangUnggah] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [berhasil, setBerhasil] = useState<boolean>(false)
  const [pesanFoto, setPesanFoto] = useState<{ teks: string; sukses: boolean } | null>(null)
  const router = useRouter()
  const inputFoto = useRef<HTMLInputElement>(null)
  // Pengaman ekstra untuk Strict Mode: effect hanya boleh mengambil profil sekali.
  const sudahMuat = useRef(false)

  useEffect(() => {
    if (sudahMuat.current) return
    sudahMuat.current = true

    // Sengaja dependency kosong: router/state tidak boleh memicu fetch ulang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user)
          setNama(data.user.name || '')
          setEmail(data.user.email || '')
          setWhatsapp(data.user.whatsapp || '')
          setAvatarUrl(data.user.avatarUrl || null)
        } else {
          router.push('/login')
        }
      })
      .catch((err) => {
        console.error('Gagal load profil:', err)
        setError('Gagal memuat profil')
        router.push('/login')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBerhasil(false)
    setMenyimpan(true)

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
        setAvatarUrl(result.user?.avatarUrl || null)
        setUser(result.user || user)
      } else {
        setError(result.error || 'Gagal menyimpan perubahan')
      }
    } catch (err) {
      setError('Gagal terhubung ke server')
    } finally {
      setMenyimpan(false)
    }
  }

  const handleUnggahFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const berkas = e.target.files?.[0]
    if (!berkas) return
    setPesanFoto(null)
    setSedangUnggah(true)

    try {
      const bytes = new Uint8Array(await berkas.arrayBuffer())
      const cek = validasiAvatar({ size: berkas.size, type: berkas.type, bytes })
      if (!cek.valid) {
        setPesanFoto({ teks: cek.alasan || 'Foto tidak valid.', sukses: false })
        return
      }

      const bentuk = new FormData()
      bentuk.append('file', berkas)
      const response = await fetch('/api/account/avatar', {
        method: 'POST',
        body: bentuk,
      })
      const hasil = await response.json()
      if (!response.ok) throw new Error(hasil?.error || 'Gagal menyimpan foto')

      setAvatarUrl(hasil.avatarUrl)
      setUser((sebelum: any) => ({ ...sebelum, avatarUrl: hasil.avatarUrl }))
      setPesanFoto({ teks: 'Foto profil berhasil diperbarui.', sukses: true })
    } catch (err: any) {
      setPesanFoto({
        teks: String(err?.message || 'Gagal mengunggah foto profil'),
        sukses: false,
      })
    } finally {
      setSedangUnggah(false)
      if (inputFoto.current) inputFoto.current.value = ''
    }
  }

  const handleHapusFoto = async () => {
    setPesanFoto(null)
    setSedangUnggah(true)
    try {
      const response = await fetch('/api/account/avatar', { method: 'DELETE' })
      const hasil = await response.json()
      if (!response.ok) throw new Error(hasil?.error || 'Gagal menghapus foto')
      setAvatarUrl(null)
      setUser((sebelum: any) => ({ ...sebelum, avatarUrl: null }))
      setPesanFoto({ teks: 'Foto profil berhasil dihapus.', sukses: true })
    } catch (err: any) {
      setPesanFoto({
        teks: String(err?.message || 'Gagal menghapus foto profil'),
        sukses: false,
      })
    } finally {
      setSedangUnggah(false)
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
        router.replace('/login')
      }
    } catch (err) {
      console.error('Gagal logout:', err)
    }
  }

  const peran = infoPeran(user?.role)

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-12">
      <Card className="rounded-2xl border border-[#E6DCD0] bg-[#FFFDF9] p-6 shadow-sm sm:p-8">
        {user ? (
          <>
            <CardHeader className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#E6DCD0] pb-5">
              <div className="flex items-center gap-3">
                <AvatarPengguna nama={nama} avatarUrl={avatarUrl} ukuran="besar" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8D5B4C]">
                    Profil Akun
                  </p>
                  <h1 className="truncate font-serif text-xl text-[#3E2723] sm:text-2xl">
                    {nama || 'Nama belum diisi'}
                  </h1>
                  <p className="truncate text-xs text-[#6B4F43]">{email}</p>
                  <div className="mt-1.5">
                    <Badge variant={peran.variant}>{peran.label}</Badge>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleLogout}
                aria-label="Keluar dari akun"
                className="px-3 py-1.5 text-xs"
              >
                Keluar
              </Button>
            </CardHeader>

            {(berhasil || error) && (
              <div className="mb-5 space-y-3">
                {berhasil && (
                  <AlertBanner
                    type="success"
                    title="Berhasil"
                    description="Perubahan profil berhasil disimpan."
                  />
                )}
                {error && <AlertBanner type="error" title="Gagal">{error}</AlertBanner>}
              </div>
            )}

            <CardContent>
              <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-[#E6DCD0] bg-[#FAF7F0] p-4">
                <AvatarPengguna nama={nama} avatarUrl={avatarUrl} ukuran="sedang" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-serif text-sm font-semibold text-[#4A2C2A]">
                    Foto Profil
                  </p>
                  <p className="mt-0.5 text-xs text-[#6B584E]">
                    Foto tampil pada akun dan kotak masuk. Tanpa foto, inisial nama yang
                    ditampilkan.
                  </p>
                  <input
                    ref={inputFoto}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleUnggahFoto}
                    className="hidden"
                    aria-label="Pilih foto profil"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => inputFoto.current?.click()}
                      isLoading={sedangUnggah}
                      loadingText="Mengunggah..."
                      className="px-3 py-1.5 text-xs"
                    >
                      {avatarUrl ? 'Ganti Foto Profil' : 'Unggah Foto Profil'}
                    </Button>
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleHapusFoto}
                        disabled={sedangUnggah}
                        className="px-3 py-1.5 text-xs"
                      >
                        Hapus Foto
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-[#9A887A]">
                    JPG, PNG, atau WEBP • maksimal 2 MB
                  </p>
                </div>
              </div>

              {pesanFoto && (
                <div className="mb-5">
                  <AlertBanner
                    type={pesanFoto.sukses ? 'success' : 'error'}
                    description={pesanFoto.teks}
                  />
                </div>
              )}

              <form id="form-akun" onSubmit={handleSimpan} className="space-y-5" noValidate>
                <Input
                  label="Nama Lengkap"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap"
                  autoComplete="name"
                />
                <Input
                  label="Nomor WhatsApp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+628xxxxxxxxxx"
                  autoComplete="tel"
                />
                <div>
                  <Input
                    label="Email"
                    value={email}
                    readOnly
                    aria-readonly="true"
                    className="cursor-default bg-[#F3ECE1] text-[#6B4F43]"
                  />
                  <div className="mt-2 rounded-lg border border-[#E6DCD0] bg-[#F3ECE1] px-3 py-2 text-xs leading-relaxed text-[#6B4F43]">
                    Email digunakan sebagai identifikasi unik akun dan tidak dapat diubah demi
                    keamanan akun.
                  </div>
                </div>
              </form>
            </CardContent>

            <CardFooter className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6DCD0] pt-5">
              <Button
                type="submit"
                form="form-akun"
                isLoading={menyimpan}
                loadingText="Menyimpan..."
                className="w-full bg-[#4A2C2A] text-[#FAF6F0] sm:w-auto"
              >
                Simpan Perubahan
              </Button>
              <a
                href="/katalog"
                className="text-xs font-medium text-[#8D5B4C] underline-offset-2 hover:underline"
              >
                Kembali ke Katalog
              </a>
            </CardFooter>
          </>
        ) : (
          <CardContent className="py-6 text-center">
            {loading ? (
              <p className="text-sm text-[#6B4F43]">Memuat profil…</p>
            ) : (
              <p className="text-sm text-[#6B4F43]">
                Silakan <a href="/login" className="font-semibold text-[#8D5B4C] hover:underline">masuk</a>{' '}
                untuk melihat akun Anda.
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

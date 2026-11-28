'use client'

// src/app/admin/pengguna/PanelPengguna.tsx
// Panel Kelola Pengguna untuk Admin Utama. 100% Bahasa Indonesia,
// memakai komponen @/components/ui. GR-03: tidak ada data modal/laba di sini.

import { useCallback, useEffect, useState } from 'react'
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Select,
} from '@/components/ui'
import type { AkunPengguna, RingkasanPeran } from '@/lib/kelolaPengguna'

type PeranTampilan = AkunPengguna['peran']

const ringkasanKosong: RingkasanPeran = {
  CUSTOMER: 0,
  ADMIN_BIASA: 0,
  ADMIN_UTAMA: 0,
  total: 0,
}

const formAwal = {
  nama: '',
  email: '',
  whatsapp: '',
  password: '',
  peran: 'ADMIN_BIASA',
  otp: '',
}

const pesanDari = (error: unknown, fallback: string) =>
  error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message || fallback)
    : fallback

const formatTanggal = (nilai: string | null) => {
  if (!nilai) return 'Tidak diketahui'
  const tanggal = new Date(nilai)
  if (Number.isNaN(tanggal.getTime())) return 'Tidak diketahui'
  return tanggal.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const inisialNama = (nama: string) =>
  nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((bagian) => bagian.charAt(0).toUpperCase())
    .join('') || 'A'

const labelPeran: Record<PeranTampilan, string> = {
  CUSTOMER: 'Pelanggan',
  ADMIN_BIASA: 'Admin Biasa',
  ADMIN_UTAMA: 'Admin Utama',
}

const varianPeran: Record<PeranTampilan, 'neutral' | 'info' | 'warning'> = {
  CUSTOMER: 'neutral',
  ADMIN_BIASA: 'info',
  ADMIN_UTAMA: 'warning',
}

export default function PanelPengguna() {
  const [daftar, setDaftar] = useState<AkunPengguna[]>([])
  const [ringkasan, setRingkasan] = useState<RingkasanPeran>(ringkasanKosong)
  const [cari, setCari] = useState('')
  const [peran, setPeran] = useState('SEMUA')
  const [memuat, setMemuat] = useState(true)
  const [memproses, setMemproses] = useState<string | null>(null)
  const [bukaFormTambah, setBukaFormTambah] = useState(false)
  const [form, setForm] = useState(formAwal)
  const [pesan, setPesan] = useState<{ teks: string; sukses: boolean } | null>(null)

  const muat = useCallback(async () => {
    setMemuat(true)
    try {
      const parameter = new URLSearchParams()
      if (cari.trim()) parameter.set('cari', cari.trim())
      if (peran !== 'SEMUA') parameter.set('peran', peran)
      const res = await fetch(`/api/admin/pengguna?${parameter.toString()}`, {
        cache: 'no-store',
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal memuat daftar pengguna')
      setDaftar((hasil.akun ?? []) as AkunPengguna[])
      setRingkasan((hasil.ringkasan ?? ringkasanKosong) as RingkasanPeran)
      setPesan(null)
    } catch (error: unknown) {
      setPesan({ teks: pesanDari(error, 'Gagal memuat daftar pengguna'), sukses: false })
    } finally {
      setMemuat(false)
    }
  }, [cari, peran])

  useEffect(() => {
    muat()
  }, [muat])

  async function mintaOtp() {
    setMemproses('otp')
    try {
      const res = await fetch('/api/admin/pengguna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'minta-otp' }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal mengirim OTP')
      setPesan({ teks: hasil.pesan || 'OTP berhasil dikirim.', sukses: true })
    } catch (error: unknown) {
      setPesan({ teks: pesanDari(error, 'Gagal mengirim OTP'), sukses: false })
    } finally {
      setMemproses(null)
    }
  }

  async function tambahAkun() {
    if (!form.nama.trim() || !form.email.trim()) {
      setPesan({ teks: 'Nama dan email wajib diisi.', sukses: false })
      return
    }
    if (form.password.length < 8) {
      setPesan({ teks: 'Kata sandi minimal 8 karakter.', sukses: false })
      return
    }
    if (!/^\d{6}$/.test(form.otp)) {
      setPesan({ teks: 'OTP 6 digit wajib diisi untuk membuat akun.', sukses: false })
      return
    }

    setMemproses('tambah')
    try {
      const res = await fetch('/api/admin/pengguna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal membuat akun')
      setForm(formAwal)
      setBukaFormTambah(false)
      await muat()
      setPesan({ teks: hasil.pesan || 'Akun berhasil dibuat.', sukses: true })
    } catch (error: unknown) {
      setPesan({ teks: pesanDari(error, 'Gagal membuat akun'), sukses: false })
    } finally {
      setMemproses(null)
    }
  }

  async function ubahPeran(akun: AkunPengguna) {
    const peranBaru = akun.peran === 'CUSTOMER' ? 'ADMIN_BIASA' : 'CUSTOMER'
    const kunci = `peran:${akun.id}`
    if (!/^\d{6}$/.test(form.otp)) {
      setPesan({ teks: 'OTP 6 digit wajib diisi untuk mengubah peran.', sukses: false })
      return
    }
    if (
      !window.confirm(
        `Ubah peran ${akun.nama} menjadi ${labelPeran[peranBaru]}?`
      )
    ) {
      return
    }

    setMemproses(kunci)
    try {
      const res = await fetch(`/api/admin/pengguna/${akun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: peranBaru, otp: form.otp }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal mengubah peran')
      await muat()
      setPesan({ teks: hasil.pesan || 'Peran berhasil diubah.', sukses: true })
    } catch (error: unknown) {
      setPesan({ teks: pesanDari(error, 'Gagal mengubah peran'), sukses: false })
    } finally {
      setMemproses(null)
    }
  }

  async function ubahStatus(akun: AkunPengguna) {
    const aktifBaru = !akun.isActive
    const kunci = `status:${akun.id}`
    let alasan = ''
    if (!aktifBaru) {
      const jawaban = window.prompt('Alasan penonaktifan akun (wajib):', '')
      alasan = String(jawaban ?? '').trim()
      if (!alasan) {
        setPesan({ teks: 'Alasan penonaktifan wajib diisi.', sukses: false })
        return
      }
    }
    if (akun.peran === 'ADMIN_BIASA' && !/^\d{6}$/.test(form.otp)) {
      setPesan({
        teks: 'OTP 6 digit wajib diisi untuk mengubah akun Admin Biasa.',
        sukses: false,
      })
      return
    }
    if (
      !window.confirm(
        aktifBaru
          ? `Aktifkan kembali akun ${akun.nama}?`
          : `Nonaktifkan akun ${akun.nama}?`
      )
    ) {
      return
    }

    setMemproses(kunci)
    try {
      const res = await fetch(`/api/admin/pengguna/${akun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: aktifBaru,
          alasan,
          otp: akun.peran === 'ADMIN_BIASA' ? form.otp : '',
        }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal mengubah status akun')
      await muat()
      setPesan({ teks: hasil.pesan || 'Status akun berhasil diubah.', sukses: true })
    } catch (error: unknown) {
      setPesan({ teks: pesanDari(error, 'Gagal mengubah status akun'), sukses: false })
    } finally {
      setMemproses(null)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 text-[#4A2C2A]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold">Kelola Pengguna</h1>
          <p className="mt-1 text-sm text-[#6B4F43]">
            Lihat seluruh akun toko, atur peran, dan kelola status keaktifan. Hanya Admin Utama
            yang dapat membuka halaman ini.
          </p>
        </div>
        <Button variant="secondary" onClick={muat} disabled={memuat || memproses !== null}>
          Muat Ulang
        </Button>
      </div>

      {pesan && (
        <div className="mt-4">
          <AlertBanner type={pesan.sukses ? 'success' : 'error'}>{pesan.teks}</AlertBanner>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent>
            <p className="text-2xl font-bold">{ringkasan.total}</p>
            <p className="text-xs text-[#6B4F43]">Total akun terdaftar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-2xl font-bold">{ringkasan.CUSTOMER}</p>
            <p className="text-xs text-[#6B4F43]">Pelanggan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-2xl font-bold">{ringkasan.ADMIN_BIASA}</p>
            <p className="text-xs text-[#6B4F43]">Admin Biasa</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-2xl font-bold">{ringkasan.ADMIN_UTAMA}</p>
            <p className="text-xs text-[#6B4F43]">Admin Utama</p>
          </CardContent>
        </Card>
      </div>

      <Card style={{ marginTop: '1.5rem' }}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-semibold">Daftar Akun</h2>
            <Button
              variant={bukaFormTambah ? 'secondary' : 'primary'}
              onClick={() => setBukaFormTambah((nilai) => !nilai)}
              disabled={memproses !== null}
            >
              {bukaFormTambah ? 'Tutup Formulir' : '+ Tambah Akun Baru'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
            <Input
              label="Cari nama atau email"
              value={cari}
              onChange={(event) => setCari(event.target.value)}
              placeholder="Misalnya: Ana atau @email.com"
            />
            <Select
              label="Filter peran"
              value={peran}
              onChange={(event) => setPeran(event.target.value)}
              options={[
                { value: 'SEMUA', label: 'Semua Peran' },
                { value: 'CUSTOMER', label: 'Pelanggan' },
                { value: 'ADMIN_BIASA', label: 'Admin Biasa' },
                { value: 'ADMIN_UTAMA', label: 'Admin Utama' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {bukaFormTambah && (
        <Card style={{ marginTop: '1rem' }}>
          <CardHeader>
            <h2 className="font-serif text-lg font-semibold">Tambah Akun Baru</h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Nama"
                value={form.nama}
                onChange={(event) => setForm((nilai) => ({ ...nilai, nama: event.target.value }))}
                placeholder="Nama lengkap"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((nilai) => ({ ...nilai, email: event.target.value }))}
                placeholder="nama@kontoh.com"
              />
              <Input
                label="No. HP (opsional)"
                value={form.whatsapp}
                onChange={(event) =>
                  setForm((nilai) => ({ ...nilai, whatsapp: event.target.value }))
                }
                placeholder="08123456789"
              />
              <Select
                label="Peran"
                value={form.peran}
                onChange={(event) => setForm((nilai) => ({ ...nilai, peran: event.target.value }))}
                options={[
                  { value: 'ADMIN_BIASA', label: 'Admin Biasa' },
                  { value: 'CUSTOMER', label: 'Pelanggan' },
                ]}
              />
              <Input
                label="Kata sandi"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((nilai) => ({ ...nilai, password: event.target.value }))
                }
                helperText="Minimal 8 karakter."
                placeholder="••••••••"
              />
              <Input
                label="OTP 6 digit"
                value={form.otp}
                onChange={(event) => setForm((nilai) => ({ ...nilai, otp: event.target.value }))}
                placeholder="123456"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={tambahAkun} isLoading={memproses === 'tambah'} disabled={memproses !== null}>
                Simpan Akun
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setBukaFormTambah(false)
                  setForm(formAwal)
                }}
                disabled={memproses !== null}
              >
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card style={{ marginTop: '1rem' }}>
        <CardHeader>
          <h2 className="font-serif text-lg font-semibold">Verifikasi Tindakan Sensitif</h2>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-[#6B4F43]">
            OTP wajib untuk membuat akun, mengubah peran, dan mengelola akun Admin Biasa. OTP dikirim
            ke terminal server dan berlaku 5 menit.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-full max-w-xs">
              <Input
                label="Kode OTP"
                value={form.otp}
                onChange={(event) => setForm((nilai) => ({ ...nilai, otp: event.target.value }))}
                placeholder="123456"
              />
            </div>
            <Button variant="secondary" onClick={mintaOtp} isLoading={memproses === 'otp'} disabled={memproses !== null}>
              Minta OTP
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card style={{ marginTop: '1.5rem' }}>
        <CardHeader>
          <h2 className="font-serif text-lg font-semibold">
            Daftar Pengguna ({daftar.length})
          </h2>
        </CardHeader>
        <CardContent>
          {memuat ? (
            <p className="text-sm text-[#6B4F43]">Memuat daftar akun…</p>
          ) : daftar.length === 0 ? (
            <p className="text-sm text-[#6B4F43]">
              Tidak ada akun yang cocok dengan pencarian atau filter ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#D9C9BA] text-xs uppercase tracking-wide text-[#6B4F43]">
                    <th className="py-2 pr-3">Pengguna</th>
                    <th className="py-2 pr-3">No. HP</th>
                    <th className="py-2 pr-3">Peran</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Pesanan</th>
                    <th className="py-2 pr-3">Tanggal Daftar</th>
                    <th className="py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((akun) => {
                    const diriSendiri = akun.peran === 'ADMIN_UTAMA'
                    return (
                      <tr key={akun.id} className="border-b border-[#EFE7DC] last:border-0">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            {akun.avatarUrl ? (
                              <img
                                src={akun.avatarUrl}
                                alt={`Foto profil ${akun.nama}`}
                                className="h-9 w-9 shrink-0 rounded-full border border-[#D9C9BA] object-cover"
                              />
                            ) : (
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#D9C9BA] bg-[#F3ECE1] text-xs font-bold text-[#6B4F43]">
                                {inisialNama(akun.nama)}
                              </span>
                            )}
                            <div>
                              <p className="font-semibold">{akun.nama}</p>
                              <p className="text-xs text-[#6B4F43]">{akun.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3">{akun.whatsapp || '—'}</td>
                        <td className="py-3 pr-3">
                          <Badge variant={varianPeran[akun.peran]}>
                            {labelPeran[akun.peran]}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant={akun.isActive ? 'success' : 'danger'}>
                            {akun.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3">{akun.jumlahPesanan}</td>
                        <td className="py-3 pr-3">{formatTanggal(akun.tanggalDaftar)}</td>
                        <td className="py-3">
                          {diriSendiri ? (
                            <span className="text-xs text-[#6B4F43]">Akun Anda</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="secondary"
                                className="px-3 py-1 text-xs"
                                onClick={() => ubahPeran(akun)}
                                isLoading={memproses === `peran:${akun.id}`}
                                loadingText="Menyimpan..."
                                disabled={memproses !== null}
                              >
                                Ubah Peran
                              </Button>
                              <Button
                                variant={akun.isActive ? 'danger' : 'primary'}
                                className="px-3 py-1 text-xs"
                                onClick={() => ubahStatus(akun)}
                                isLoading={memproses === `status:${akun.id}`}
                                loadingText="Menyimpan..."
                                disabled={memproses !== null}
                              >
                                {akun.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

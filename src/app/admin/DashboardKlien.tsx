'use client'

// src/app/admin/DashboardKlien.tsx
// Tampilan Dashboard Utama Admin: kartu ringkasan operasional + pintasan cepat.
// 100% Bahasa Indonesia, komponen @/components/ui, tema krem & cokelat.
// GR-03: tidak merender angka modal maupun laba.

import { useCallback, useEffect, useState } from 'react'
import { AlertBanner, Badge, Card, CardContent, CardHeader } from '@/components/ui'
import {
  AMBANG_STOK_MENIPIS,
  daftarPintasanAdmin,
  type RingkasanDashboard,
  type RoleDashboard,
} from '@/lib/admin-dashboard'
import { tanggalMingguKeDate } from '@/lib/pesanan'

type ResponsDashboard = {
  ringkasan: RingkasanDashboard
  ambangStokMenipis: number
}

const formatTanggalMinggu = (nilai: string | null) => {
  if (!nilai) return 'Belum ada jadwal terdaftar'
  return new Date(tanggalMingguKeDate(nilai)).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const kelasPintasan =
  'block rounded-lg border border-[#E6DCD0] bg-[#FFFDF9] p-4 transition hover:-translate-y-0.5 hover:border-[#B08D6D] hover:bg-[#F7EFE2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D372D]'

const kelasTautan =
  'inline-flex text-sm font-semibold text-[#7A4B32] underline decoration-[#C9A17D] underline-offset-4 hover:text-[#4D372D]'

export default function DashboardKlien({ role }: { role: RoleDashboard }) {
  const [ringkasan, setRingkasan] = useState<RingkasanDashboard | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  const [sedangMemuat, setSedangMemuat] = useState(true)
  const pintasan = daftarPintasanAdmin(role)

  const muat = useCallback(async () => {
    setSedangMemuat(true)
    setPesan(null)
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      const isi = (await res.json()) as ResponsDashboard & { error?: string }
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat ringkasan')
      setRingkasan(isi.ringkasan)
    } catch (error: any) {
      setRingkasan(null)
      setPesan(error?.message || 'Gagal memuat ringkasan dashboard')
    } finally {
      setSedangMemuat(false)
    }
  }, [])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#4D372D]">Dashboard Admin</h1>
          <p className="mt-1 text-sm text-[#6B4F43]">
            Ringkasan operasional Akira Books dalam satu halaman. Semua waktu menggunakan WIB.
          </p>
        </div>
        <Badge variant="neutral">
          {role === 'ADMIN_UTAMA' ? 'Admin Utama' : 'Admin Biasa'}
        </Badge>
      </div>

      {pesan && (
        <div className="mb-5">
          <AlertBanner type="error" title="Ringkasan belum tersedia" description={pesan} />
        </div>
      )}

      <section aria-label="Ringkasan operasional">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <h2 className="m-0 text-base font-semibold text-[#4D372D]">Pembayaran</h2>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#4D372D]">
                {sedangMemuat ? '…' : ringkasan?.pembayaranMenungguVerifikasi ?? 0}
              </p>
              <p className="mt-1 text-sm text-[#6B4F43]">Menunggu verifikasi / putusan</p>
              <a href="/admin/pembayaran" className={`mt-3 ${kelasTautan}`}>
                Buka verifikasi pembayaran
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="m-0 text-base font-semibold text-[#4D372D]">Jadwal Pengambilan</h2>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#4D372D]">
                {sedangMemuat ? '…' : ringkasan?.jadwalMingguTerdekat ?? 0}
              </p>
              <p className="mt-1 text-sm text-[#6B4F43]">
                Pesanan pada Minggu terdekat · {formatTanggalMinggu(ringkasan?.tanggalMingguTerdekat ?? null)}
              </p>
              <a href="/admin/jadwal" className={kelasTautan}>
                Buka jadwal pengambilan
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="m-0 text-base font-semibold text-[#4D372D]">Pembatalan &amp; Refund</h2>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#4D372D]">
                {sedangMemuat ? '…' : ringkasan?.pembatalanRefundAktif ?? 0}
              </p>
              <p className="mt-1 text-sm text-[#6B4F43]">Permintaan aktif yang belum selesai</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                <a href="/admin/pembatalan" className={kelasTautan}>
                  Pembatalan
                </a>
                <a href="/admin/refund" className={kelasTautan}>
                  Refund
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="m-0 text-base font-semibold text-[#4D372D]">Buku &amp; Stok</h2>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#4D372D]">
                {sedangMemuat ? '…' : ringkasan?.judulTersedia ?? 0}
              </p>
              <p className="mt-1 text-sm text-[#6B4F43]">Judul tersedia untuk dipesan</p>
              <p className="mt-2 text-sm text-[#8A5B22]">
                Stok menipis (≤ {AMBANG_STOK_MENIPIS}):{' '}
                <strong>{sedangMemuat ? '…' : ringkasan?.stokMenipis ?? 0}</strong> judul
              </p>
              <a href="/admin/buku" className={`mt-3 ${kelasTautan}`}>
                Kelola buku &amp; stok
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="m-0 text-base font-semibold text-[#4D372D]">Status Toko</h2>
            </CardHeader>
            <CardContent>
              {sedangMemuat ? (
                <p className="text-sm text-[#6B4F43]">Sedang memuat status toko…</p>
              ) : (
                <>
                  <Badge variant={ringkasan?.tokoBuka ? 'success' : 'warning'}>
                    {ringkasan?.tokoBuka ? 'Toko Buka' : 'Toko Libur'}
                  </Badge>
                  {!ringkasan?.tokoBuka && (
                    <p className="mt-2 text-sm text-[#6B4F43]">
                      {ringkasan?.alasanLibur || 'Alasan libur belum dicantumkan.'}
                    </p>
                  )}
                </>
              )}
              <a href="/store-status" className={`mt-3 ${kelasTautan}`}>
                Lihat informasi toko
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-label="Pintasan cepat admin" className="mt-9">
        <h2 className="mb-4 font-serif text-xl font-bold text-[#4D372D]">Pintasan Cepat</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pintasan.map((item) => (
            <a key={item.href} href={item.href} className={kelasPintasan}>
              <span className="block font-semibold text-[#4D372D]">{item.label}</span>
              <span className="mt-1 block text-sm text-[#6B4F43]">{item.deskripsi}</span>
              <span className="mt-3 block text-xs font-semibold uppercase tracking-wide text-[#8D5B4C]">
                Buka modul →
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}

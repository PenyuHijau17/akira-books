'use client'

// src/app/admin/penjualan/PenjualanHubKlien.tsx
// Hub Penjualan: enam kartu modul operasional dengan badge antrean/status.
// 100% Bahasa Indonesia, komponen @/components/ui, tema krem & cokelat.
// GR-03: badge diambil lewat daftar putih ringkasBadgeDashboard; tidak ada
// costPrice/laba yang diambil atau dirender untuk Admin Biasa.

import { useCallback, useEffect, useState } from 'react'
import { AlertBanner, Badge, Card, CardContent, CardHeader } from '@/components/ui'
import {
  MODUL_PENJUALAN,
  badgeUntukModul,
  bolehBukaTautan,
  ringkasBadgeDashboard,
  statusQrisDariRespons,
  type RingkasanBadgeHub,
  type RoleAdmin,
  type StatusQrisHub,
} from '@/lib/navigasiAdmin'

const RINGKASAN_KOSONG: RingkasanBadgeHub = {
  pembayaran: 0,
  jadwal: 0,
  pembatalanRefund: 0,
}

const kelasCard =
  'flex h-full flex-col rounded-xl border border-[#E6DCD0] bg-[#FFFDF9] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#C8B6A6] hover:shadow-md'

const kelasTautan =
  'inline-flex items-center gap-1.5 text-sm font-semibold text-[#7A4B32] underline decoration-[#C9A17D] underline-offset-4 hover:text-[#4D372D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4D372D]'

export default function PenjualanHubKlien({ role }: { role: RoleAdmin }) {
  const [ringkasan, setRingkasan] = useState<RingkasanBadgeHub>(RINGKASAN_KOSONG)
  const [statusQris, setStatusQris] = useState<StatusQrisHub>(
    role === 'ADMIN_UTAMA' ? null : 'terkunci'
  )
  const [pesan, setPesan] = useState<string | null>(null)
  const [sedangMemuat, setSedangMemuat] = useState(true)

  const muat = useCallback(async () => {
    setSedangMemuat(true)
    setPesan(null)
    try {
      // QRIS hanya bisa dibaca Admin Utama; Admin Biasa langsung diberi status
      // "terkunci" tanpa memanggil API yang akan menolak (403).
      const [dashboardRes, qrisRes] = await Promise.all([
        fetch('/api/admin/dashboard', { cache: 'no-store' }),
        role === 'ADMIN_UTAMA'
          ? fetch('/api/admin/qris', { cache: 'no-store' })
          : Promise.resolve(null),
      ])

      if (!dashboardRes.ok) {
        const isi = await dashboardRes.json().catch(() => null)
        throw new Error(isi?.error || 'Gagal memuat ringkasan antrean')
      }
      const dashboard = await dashboardRes.json()
      // Daftar putih di helper menjamin tidak ada field modal/laba yang dipakai.
      setRingkasan(ringkasBadgeDashboard(dashboard))

      if (qrisRes) {
        setStatusQris(qrisRes.ok ? statusQrisDariRespons(await qrisRes.json()) : 'kosong')
      }
    } catch (error: any) {
      setPesan(error?.message || 'Gagal memuat ringkasan antrean')
    } finally {
      setSedangMemuat(false)
    }
  }, [role])

  useEffect(() => {
    void muat()
  }, [muat])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#4D372D]">Penjualan</h1>
          <p className="mt-1 text-sm text-[#6B4F43]">
            Pusat operasional transaksi Akira Books. Pilih modul di bawah untuk melanjutkan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin" className={kelasTautan}>
            ← Dashboard
          </a>
          <Badge variant="neutral">
            {role === 'ADMIN_UTAMA' ? 'Admin Utama' : 'Admin Biasa'}
          </Badge>
        </div>
      </div>

      {pesan && (
        <div className="mb-5">
          <AlertBanner
            type="warning"
            title="Ringkasan antrean belum tersedia"
            description={`${pesan}. Modul tetap dapat dibuka.`}
          />
        </div>
      )}

      <section aria-label="Modul operasional penjualan">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODUL_PENJUALAN.map((modul) => {
            const boleh = bolehBukaTautan(role, modul)
            const badge = sedangMemuat
              ? { teks: 'Memuat…', variant: 'neutral' as const }
              : badgeUntukModul(modul.href, ringkasan, statusQris)

            return (
              <Card key={modul.href} className={kelasCard}>
                <CardHeader>
                  <div className="flex w-full items-start justify-between gap-2">
                    <h2 className="m-0 text-base font-semibold text-[#4D372D]">
                      {modul.label}
                    </h2>
                    {badge && <Badge variant={badge.variant}>{badge.teks}</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-[#6B4F43]">{modul.deskripsi}</p>
                  <div className="mt-5 flex items-center">
                    {boleh ? (
                      <a href={modul.href} className={kelasTautan}>
                        Buka modul <span aria-hidden="true">→</span>
                      </a>
                    ) : (
                      <span
                        aria-disabled="true"
                        className="text-sm font-semibold text-[#9A887A]"
                      >
                        Khusus Admin Utama
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <p className="mt-6 text-xs text-[#8A6B57]">
        Status antrean diambil dari ringkasan dashboard yang sudah disaring sesuai peran. Seluruh
        waktu dalam zona WIB.
      </p>
    </main>
  )
}

'use client'

// src/app/notifikasi/page.tsx
// Daftar notifikasi sederhana per akun: difilter menurut jenis dan status.
// Tanpa tampilan percakapan. 100% Bahasa Indonesia; komponen @/components/ui.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertBanner, Badge, Button, Card, CardContent } from '@/components/ui'
import { formatWaktuWIB } from '@/lib/notifikasi'
import type {
  FilterJenisNotifikasi,
  KartuNotifikasi,
} from '@/lib/notifikasiKartu'

type HasilInbox = {
  belumDibaca: number
  kartu: KartuNotifikasi[]
}

type FilterStatus = 'semua' | 'belum'

const PILIHAN_JENIS: Array<{
  nilai: FilterJenisNotifikasi
  label: string
}> = [
  { nilai: 'semua', label: 'Semua' },
  { nilai: 'pemesanan', label: 'Pemesanan' },
  { nilai: 'pembayaran', label: 'Pembayaran' },
  { nilai: 'jadwal', label: 'Jadwal' },
  { nilai: 'pembatalan-refund', label: 'Pembatalan & Refund' },
  { nilai: 'sistem', label: 'Sistem' },
]

const kelasJenis = (aktif: boolean) =>
  aktif
    ? 'whitespace-nowrap rounded-full bg-[#4A2C2A] px-3 py-1.5 text-xs font-semibold text-[#FAF6F0]'
    : 'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-[#6B4F43] transition hover:bg-white'

const kelasStatus = (aktif: boolean) =>
  aktif
    ? 'whitespace-nowrap rounded-full bg-[#FFFDF9] px-2.5 py-1 text-[11px] font-semibold text-[#4A2C2A] shadow-sm'
    : 'whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#6B584E]'

function varianBadge(label: string): 'danger' | 'warning' | 'info' | 'neutral' {
  if (label === 'PEMBATALAN') return 'danger'
  if (label === 'REFUND') return 'warning'
  if (label === 'PEMBAYARAN' || label === 'JADWAL') return 'warning'
  if (label === 'PEMESANAN' || label === 'KOREKSI HARGA') return 'info'
  return 'neutral'
}

export default function HalamanNotifikasi() {
  const [data, setData] = useState<HasilInbox | null>(null)
  const [jenis, setJenis] = useState<FilterJenisNotifikasi>('semua')
  const [status, setStatus] = useState<FilterStatus>('semua')
  const [memuat, setMemuat] = useState(true)
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState<{ teks: string; sukses: boolean } | null>(null)

  const muat = useCallback(async () => {
    setMemuat(true)
    try {
      const res = await fetch('/api/notifikasi?limit=200', { cache: 'no-store' })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal memuat notifikasi')
      setData({
        belumDibaca: Number(hasil?.belumDibaca) || 0,
        kartu: Array.isArray(hasil?.kartu) ? hasil.kartu : [],
      })
      setPesan(null)
    } catch (error: any) {
      setPesan({
        teks: String(error?.message || 'Gagal memuat notifikasi'),
        sukses: false,
      })
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  const kartuTampil = useMemo(() => {
    const semua = data?.kartu ?? []
    return semua.filter((kartu) => {
      if (jenis !== 'semua' && kartu.filterJenis !== jenis) return false
      if (status === 'belum' && !kartu.belumDibaca) return false
      return true
    })
  }, [data, jenis, status])

  async function tandai(ids: string[], semua: boolean = false) {
    if (ids.length === 0 && !semua) return
    setMemproses(true)
    try {
      const res = await fetch('/api/notifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tandai-dibaca', ids, semua }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal menandai notifikasi')
      const jumlah = Number(hasil?.belumDibaca)
      if (data) {
        setData({
          ...data,
          belumDibaca: Number.isFinite(jumlah) ? jumlah : data.belumDibaca,
          kartu: data.kartu.map((kartu) =>
            semua || kartu.ids.some((id) => ids.includes(id))
              ? { ...kartu, belumDibaca: false }
              : kartu
          ),
        })
      }
      setPesan({
        teks: `${hasil?.berubah ?? ids.length} notifikasi ditandai sudah dibaca.`,
        sukses: true,
      })
    } catch (error: any) {
      setPesan({
        teks: String(error?.message || 'Gagal menandai notifikasi'),
        sukses: false,
      })
    } finally {
      setMemproses(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl text-[#4A2C2A]">Notifikasi</h1>
          <p className="mt-1 text-sm text-[#6B584E]">
            Kabar pesanan, pembayaran, jadwal, dan peringatan toko.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            onClick={muat}
            disabled={memuat}
            className="px-3 py-1.5 text-xs"
          >
            Muat Ulang
          </Button>
          <Button
            variant="primary"
            onClick={() => tandai([], true)}
            disabled={memuat || memproses || !data || data.belumDibaca === 0}
            className="whitespace-nowrap px-3 py-1.5 text-xs"
          >
            Tandai Semua Dibaca
          </Button>
        </div>
      </div>

      {pesan && (
        <div className="mt-4">
          <AlertBanner type={pesan.sukses ? 'success' : 'error'} description={pesan.teks} />
        </div>
      )}

      <div className="mt-6 grid gap-3">
        <div
          className="flex flex-nowrap items-center gap-2 overflow-x-auto rounded-lg border border-[#E6DCD0] bg-[#FFFDF9] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Filter jenis notifikasi"
        >
          {PILIHAN_JENIS.map((pilihan) => (
            <button
              key={pilihan.nilai}
              type="button"
              aria-pressed={jenis === pilihan.nilai}
              onClick={() => setJenis(pilihan.nilai)}
              className={kelasJenis(jenis === pilihan.nilai)}
            >
              {pilihan.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-[#6B584E]">Status:</span>
          <div
            className="flex items-center gap-0.5 rounded-full bg-[#F3ECE1] p-0.5"
            role="group"
            aria-label="Filter status notifikasi"
          >
            <button
              type="button"
              aria-pressed={status === 'semua'}
              onClick={() => setStatus('semua')}
              className={kelasStatus(status === 'semua')}
            >
              Semua
            </button>
            <button
              type="button"
              aria-pressed={status === 'belum'}
              onClick={() => setStatus('belum')}
              className={kelasStatus(status === 'belum')}
            >
              Belum Dibaca
            </button>
          </div>
          {data && (
            <Badge variant={data.belumDibaca > 0 ? 'warning' : 'neutral'}>
              {data.belumDibaca} belum dibaca
            </Badge>
          )}
        </div>
      </div>

      {memuat && <p className="mt-6 text-sm text-[#6B584E]">Sedang memuat notifikasi…</p>}

      {!memuat && data && kartuTampil.length === 0 && (
        <Card className="mt-6">
          <CardContent>
            <p className="m-0 text-sm text-[#5D4037]">
              {status === 'belum'
                ? 'Tidak ada notifikasi belum dibaca pada filter ini.'
                : 'Belum ada notifikasi pada filter ini.'}
            </p>
          </CardContent>
        </Card>
      )}

      {!memuat && kartuTampil.length > 0 && (
        <ul className="m-0 mt-6 grid list-none gap-3 p-0">
          {kartuTampil.map((kartu) => (
            <li key={kartu.kunci}>
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={varianBadge(kartu.labelJenis)}
                    className="whitespace-nowrap uppercase tracking-wide"
                    style={{ fontWeight: 700, fontSize: '11px', padding: '4px 10px' }}
                  >
                    {kartu.labelJenis}
                  </Badge>
                  {kartu.belumDibaca && (
                    <Badge variant="warning" className="whitespace-nowrap text-[10px]">
                      Belum dibaca
                    </Badge>
                  )}
                </div>

                {(kartu.namaPelanggan || kartu.kode) && (
                  <p className="m-0 mt-3 break-words font-bold text-[#4A2C2A]">
                    {[kartu.namaPelanggan, kartu.kode].filter(Boolean).join(' • ')}
                  </p>
                )}

                <p className="m-0 mt-1 line-clamp-2 text-sm leading-relaxed text-[#5D4037]">
                  {kartu.ringkasan}
                </p>

                <p className="m-0 mt-2 text-[11px] text-[#9A887A]">
                  {formatWaktuWIB(kartu.waktuTerbaru)} WIB
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#EDE4D8] pt-3">
                  {kartu.belumDibaca && (
                    <Button
                      variant="secondary"
                      onClick={() => tandai(kartu.ids)}
                      disabled={memproses}
                      className="px-3 py-1.5 text-xs"
                    >
                      Tandai Dibaca
                    </Button>
                  )}
                  {kartu.tautan && kartu.labelTautan && (
                    <a
                      href={kartu.tautan}
                      className="inline-flex items-center justify-center rounded-lg bg-[#4A2C2A] px-3 py-1.5 text-xs font-semibold text-[#FAF6F0] shadow-sm transition hover:bg-[#5E3935] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8D5B4C]"
                    >
                      {kartu.labelTautan} →
                    </a>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

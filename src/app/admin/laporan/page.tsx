'use client'

// src/app/admin/laporan/page.tsx
// Dashboard laporan keuangan khusus Admin Utama (Tahap 11, FR-REP-001).
// GR-03: tidak merender modal/laba untuk peran lain; API juga Mengembalikan 403 di server.

import { useCallback, useEffect, useState } from 'react'
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

type Ringkasan = {
  pembayaranTerverifikasi: number
  penjualanOnline: number
  penjualanOffline: number
  totalPenjualanSelesai: number
  unitOnline: number
  unitOffline: number
  totalUnit: number
  jumlahOrderSelesai: number
  jumlahPenjualanOffline: number
  pembatalan: number
  nominalPembatalan: number
  refundSelesai: number
  nominalRefundSelesai: number
  refundMenunggu: number
  nominalRefundMenunggu: number
}

type Laba = {
  historisOnline: number
  historisOffline: number
  historisTotal: number
  hitungUlangOnline: number
  hitungUlangOffline: number
  hitungUlangTotal: number
  selisih: number
}

type EntriRiwayat = {
  jenis: string
  referensi: string
  waktu: string
  nominal: number
  keterangan: string
}

type Laporan = {
  periode: { jenis: string; label: string; mulai: string; sampai: string; zonaWaktu: string }
  ringkasan: Ringkasan
  laba: Laba
  riwayat: EntriRiwayat[]
}

const rupiah = (nilai: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(nilai || 0)

const tanggal = (nilai: string) =>
  new Date(nilai).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

const labelJenis: Record<string, string> = {
  PEMBAYARAN_TERVERIFIKASI: 'Pembayaran Terverifikasi',
  PENJUALAN_ONLINE: 'Penjualan Online Selesai',
  PENJUALAN_OFFLINE: 'Penjualan Offline',
  PEMBATALAN: 'Pembatalan',
  REFUND_SELESAI: 'Refund Selesai',
}

function tanggalWIBHariIni() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

export default function HalamanLaporanKeuangan() {
  const [diizinkan, setDiizinkan] = useState<boolean | null>(null)
  const [jenis, setJenis] = useState('harian')
  const [tanggalFilter, setTanggalFilter] = useState('')
  const [laporan, setLaporan] = useState<Laporan | null>(null)
  const [pesan, setPesan] = useState<{ jenis: 'error' | 'info'; teks: string } | null>(null)
  const [sedangMemuat, setSedangMemuat] = useState(true)

  useEffect(() => {
    let aktif = true
    async function muat() {
      try {
        const res = await fetch('/api/auth', { cache: 'no-store' })
        const isi = await res.json()
        if (!aktif) return
        const peran = String(isi?.user?.role || '')
        setDiizinkan(peran === 'ADMIN_UTAMA')
        const hariIni = tanggalWIBHariIni()
        setTanggalFilter(hariIni)
      } catch {
        if (aktif) setDiizinkan(false)
      }
    }
    muat()
    return () => {
      aktif = false
    }
  }, [])

  const muatLaporan = useCallback(async () => {
    if (!diizinkan) return
    setSedangMemuat(true)
    setPesan(null)
    try {
      const parameter = new URLSearchParams({ jenis })
      if (tanggalFilter) parameter.set('tanggal', tanggalFilter)
      const res = await fetch(`/api/admin/laporan?${parameter.toString()}`, {
        cache: 'no-store',
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat laporan keuangan')
      setLaporan(isi as Laporan)
    } catch (error: any) {
      setLaporan(null)
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat laporan keuangan' })
    } finally {
      setSedangMemuat(false)
    }
  }, [diizinkan, jenis, tanggalFilter])

  useEffect(() => {
    if (diizinkan) void muatLaporan()
    else if (diizinkan === false) setSedangMemuat(false)
  }, [diizinkan, muatLaporan])

  function gantiJenis(nilai: string) {
    setJenis(nilai)
    const hariIni = tanggalWIBHariIni()
    if (nilai === 'harian') setTanggalFilter(hariIni)
    if (nilai === 'bulanan') setTanggalFilter(hariIni.slice(0, 7))
    if (nilai === 'tahunan') setTanggalFilter(hariIni.slice(0, 4))
  }

  if (diizinkan === false) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <AlertBanner
          type="error"
          title="Akses ditolak"
          description="Laporan keuangan hanya tersedia untuk Admin Utama."
        />
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ color: '#4d372d', marginBottom: '0.5rem' }}>Laporan Keuangan</h1>
      <p style={{ color: '#5d4037', marginBottom: '1.5rem' }}>
        Seluruh periode menggunakan zona waktu Asia/Jakarta (WIB). Pembayaran terverifikasi
        yang bukunya belum diserahkan dihitung sebagai uang diterima, bukan penjualan selesai.
      </p>

      {pesan && <AlertBanner type={pesan.jenis} title="Informasi" description={pesan.teks} />}

      <Card style={{ marginBottom: '1rem' }}>
        <CardContent
          style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'end' }}
        >
          <Input
            as="select"
            label="Periode"
            value={jenis}
            onChange={(e) => gantiJenis(e.target.value)}
            options={[
              { value: 'harian', label: 'Harian' },
              { value: 'bulanan', label: 'Bulanan' },
              { value: 'tahunan', label: 'Tahunan' },
            ]}
          />
          <Input
            type={jenis === 'harian' ? 'date' : jenis === 'bulanan' ? 'month' : 'number'}
            label={jenis === 'harian' ? 'Tanggal' : jenis === 'bulanan' ? 'Bulan' : 'Tahun'}
            min={jenis === 'tahunan' ? 2000 : undefined}
            max={jenis === 'tahunan' ? 2100 : undefined}
            value={tanggalFilter}
            onChange={(e) => setTanggalFilter(e.target.value)}
          />
          <Button onClick={muatLaporan} isLoading={sedangMemuat}>
            Tampilkan Laporan
          </Button>
        </CardContent>
      </Card>

      {laporan && (
        <>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Badge variant="info">Periode {laporan.periode.label}</Badge>
            <Badge variant="neutral">Zona Waktu {laporan.periode.zonaWaktu}</Badge>
            <Badge variant="success">Total Unit {laporan.ringkasan.totalUnit}</Badge>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
              gap: '1rem',
            }}
          >
            <Card>
              <CardHeader>
                <h2 style={{ margin: 0, color: '#4d372d', fontSize: '1.05rem' }}>
                  Uang Diterima vs Penjualan Selesai
                </h2>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '0.5rem', color: '#5d4037' }}>
                <div>Pembayaran terverifikasi: {rupiah(laporan.ringkasan.pembayaranTerverifikasi)}</div>
                <div>Penjualan online selesai: {rupiah(laporan.ringkasan.penjualanOnline)}</div>
                <div>Penjualan offline: {rupiah(laporan.ringkasan.penjualanOffline)}</div>
                <div>
                  <strong>Total penjualan selesai: {rupiah(laporan.ringkasan.totalPenjualanSelesai)}</strong>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 style={{ margin: 0, color: '#4d372d', fontSize: '1.05rem' }}>
                  Kanal &amp; Unit Terjual
                </h2>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '0.5rem', color: '#5d4037' }}>
                <div>Unit online: {laporan.ringkasan.unitOnline}</div>
                <div>Unit offline: {laporan.ringkasan.unitOffline}</div>
                <div>Pesanan selesai: {laporan.ringkasan.jumlahOrderSelesai}</div>
                <div>Transaksi offline: {laporan.ringkasan.jumlahPenjualanOffline}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 style={{ margin: 0, color: '#4d372d', fontSize: '1.05rem' }}>
                  Laba Kotor
                </h2>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '0.5rem', color: '#5d4037' }}>
                <div>Historis online: {rupiah(laporan.laba.historisOnline)}</div>
                <div>Historis offline: {rupiah(laporan.laba.historisOffline)}</div>
                <div>
                  <strong>Total laba historis: {rupiah(laporan.laba.historisTotal)}</strong>
                </div>
                <div>Hitung ulang modal terbaru: {rupiah(laporan.laba.hitungUlangTotal)}</div>
                <div>Selisih hitung ulang: {rupiah(laporan.laba.selisih)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 style={{ margin: 0, color: '#4d372d', fontSize: '1.05rem' }}>
                  Pembatalan &amp; Refund
                </h2>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '0.5rem', color: '#5d4037' }}>
                <div>Jumlah pembatalan: {laporan.ringkasan.pembatalan}</div>
                <div>Nominal pembatalan: {rupiah(laporan.ringkasan.nominalPembatalan)}</div>
                <div>Refund selesai: {rupiah(laporan.ringkasan.nominalRefundSelesai)}</div>
                <div>
                  Refund menunggu: {laporan.ringkasan.refundMenunggu} transaksi ·{' '}
                  {rupiah(laporan.ringkasan.nominalRefundMenunggu)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card style={{ marginTop: '1rem' }}>
            <CardHeader>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#4d372d' }}>
                Riwayat Transaksi
              </h2>
            </CardHeader>
            <CardContent style={{ display: 'grid', gap: '0.55rem' }}>
              {laporan.riwayat.length === 0 ? (
                <p>Tidak ada transaksi pada periode ini.</p>
              ) : (
                laporan.riwayat.map((entri, indeks) => (
                  <div
                    key={`${entri.jenis}-${entri.referensi}-${indeks}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      borderBottom: '1px solid #efe3cf',
                      paddingBottom: '0.4rem',
                      fontSize: '0.9rem',
                      color: '#5d4037',
                    }}
                  >
                    <span>
                      <Badge variant="neutral">{labelJenis[entri.jenis] || entri.jenis}</Badge>{' '}
                      {entri.referensi} · {tanggal(entri.waktu)} WIB
                    </span>
                    <strong>{rupiah(entri.nominal)}</strong>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter>
              <Button variant="secondary" onClick={muatLaporan} isLoading={sedangMemuat}>
                Muat Ulang
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  )
}

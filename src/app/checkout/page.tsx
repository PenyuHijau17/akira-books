"use client"

// src/app/checkout/page.tsx
// Halaman Checkout (Tahap 7) — 100% Bahasa Indonesia, tema kertas klasik.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertBanner, Badge, Button, Card, CardContent, CardFooter, CardHeader, Input } from '@/components/ui'
import { daftarMingguBerikutnya, TENGGAT_PEMBAYARAN_JAM } from '@/lib/pesanan'

type ItemKeranjang = {
  id: string
  bookId: string
  quantity: number
  subtotal: number
  book: { title: string; code: string; sellingPrice: number } | null
}

type PayloadKeranjang = {
  versi: number
  versiDisetujui: number
  perluTinjauUlang: boolean
  alasanTinjau: string | null
  items: ItemKeranjang[]
  total: number
}

type HasilCheckout = {
  pesanan?: { id: string; orderNumber: string } | null
  pesan?: string
  dibuatUlang?: boolean
  error?: string
}

const rupiah = (nilai: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(nilai || 0)

export default function HalamanCheckout() {
  const router = useRouter()
  const [keranjang, setKeranjang] = useState<PayloadKeranjang | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [sedangProses, setSedangProses] = useState(false)
  const [pesanError, setPesanError] = useState<string | null>(null)
  const [perluLogin, setPerluLogin] = useState(false)
  const [tokoLibur, setTokoLibur] = useState(false)
  const [alasanLibur, setAlasanLibur] = useState<string | null>(null)
  const [metodePembayaran, setMetodePembayaran] = useState<'QRIS' | 'TUNAI_CFD'>('QRIS')
  const [tanggalAmbil, setTanggalAmbil] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')

  const daftarTanggal = useMemo(() => daftarMingguBerikutnya(8), [])

  useEffect(() => {
    setIdempotencyKey(
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    if (daftarTanggal.length > 0) setTanggalAmbil(daftarTanggal[0])
  }, [daftarTanggal])

  const muat = useCallback(async () => {
    setMemuat(true)
    setPesanError(null)
    try {
      const [resKeranjang, resStatus] = await Promise.all([
        fetch('/api/keranjang', { cache: 'no-store' }),
        fetch('/api/store-status', { cache: 'no-store' }),
      ])

      if (resKeranjang.status === 401) {
        setPerluLogin(true)
        setKeranjang(null)
      } else {
        const data = await resKeranjang.json()
        if (!resKeranjang.ok) throw new Error(data?.error || 'Gagal memuat keranjang')
        setPerluLogin(false)
        setKeranjang(data as PayloadKeranjang)
      }

      if (resStatus.ok) {
        const status = await resStatus.json()
        setTokoLibur(!status.isOpen)
        setAlasanLibur(status.activeClosureReason || null)
      } else {
        // Gagal diverifikasi → checkout tetap diblokir di server
        setTokoLibur(true)
        setAlasanLibur('Status toko belum dapat diverifikasi. Silakan coba lagi nanti.')
      }
    } catch (error: any) {
      setPesanError(error?.message || 'Terjadi kesalahan saat memuat checkout')
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  async function buatPesanan() {
    if (!idempotencyKey) return
    setSedangProses(true)
    setPesanError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          paymentMethod: metodePembayaran,
          pickupSundayDate: tanggalAmbil,
        }),
      })
      const data: HasilCheckout = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Checkout gagal')

      if (data.pesanan?.id) {
        router.push(`/pesanan/${data.pesanan.id}?berhasil=1`)
      } else {
        router.push('/pesanan')
      }
    } catch (error: any) {
      // Kunci idempotensi sengaja tidak diganti agar retry tidak membuat pesanan ganda.
      setPesanError(error?.message || 'Checkout gagal. Keranjang Anda tetap tersimpan.')
      setSedangProses(false)
    }
  }

  if (perluLogin) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <AlertBanner
          type="warning"
          title="Silakan masuk terlebih dahulu"
          description="Checkout hanya tersedia bagi pelanggan yang sudah masuk."
        />
        <Button onClick={() => router.push('/login')}>Masuk ke Akun</Button>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ color: '#4d372d', marginBottom: '0.5rem' }}>Checkout Pesanan</h1>
      <p style={{ color: '#5d4037', marginBottom: '1.5rem' }}>
        Pembayaran wajib diselesaikan dalam {TENGGAT_PEMBAYARAN_JAM} jam setelah pesanan dibuat.
      </p>

      {tokoLibur && (
        <AlertBanner
          type="warning"
          isStoreClosed
          title="Toko sedang libur"
          closureReason={
            alasanLibur ||
            'Checkout tidak dapat diproses saat toko tutup. Keranjang Anda tetap tersimpan.'
          }
        />
      )}

      {pesanError && (
        <AlertBanner type="error" title="Checkout tidak berhasil" description={pesanError} />
      )}

      {memuat ? (
        <Card><CardContent><p>Sedang menyiapkan checkout...</p></CardContent></Card>
      ) : !keranjang ? null : (
        <>
          {keranjang.perluTinjauUlang && (
            <AlertBanner
              type="warning"
              title="Keranjang perlu ditinjau ulang"
              description={
                keranjang.alasanTinjau ||
                'Stok berubah. Kembali ke keranjang dan setujui ulang sebelum checkout.'
              }
            >
              <div style={{ marginTop: '0.75rem' }}>
                <Button variant="secondary" onClick={() => router.push('/keranjang')}>
                  Kembali ke Keranjang
                </Button>
              </div>
            </AlertBanner>
          )}

          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <Card>
              <CardHeader>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#4d372d' }}>
                  Detail Pesanan
                </h2>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '1rem' }}>
                <Input
                  as="select"
                  label="Metode Pembayaran"
                  value={metodePembayaran}
                  onChange={(event) => setMetodePembayaran(event.target.value as 'QRIS' | 'TUNAI_CFD')}
                  options={[
                    { value: 'QRIS', label: 'QRIS (Unggah Bukti Transfer)' },
                    { value: 'TUNAI_CFD', label: 'Tunai di Tempat (CFD)' },
                  ]}
                />
                <Input
                  as="select"
                  label="Tanggal Pengambilan (Minggu)"
                  value={tanggalAmbil}
                  onChange={(event) => setTanggalAmbil(event.target.value)}
                  options={daftarTanggal.map((tanggal) => ({
                    value: tanggal,
                    label: tanggal,
                  }))}
                  helperText="Pengambilan hanya tersedia pada hari Minggu pukul 09.00 WIB."
                />
                <Badge variant="info">Status awal: Menunggu Pembayaran</Badge>
                <Badge variant="warning">Jadwal: Menunggu Konfirmasi</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#4d372d' }}>
                  Ringkasan Belanja
                </h2>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '0.75rem' }}>
                {keranjang.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      borderBottom: '1px solid #d7ccc8',
                      paddingBottom: '0.5rem',
                    }}
                  >
                    <span>
                      {item.book?.title || 'Buku'} × {item.quantity}
                      <span style={{ display: 'block', fontSize: '0.8rem', color: '#5d4037' }}>
                        {item.book?.code || '-'}
                      </span>
                    </span>
                    <strong style={{ color: '#4d372d' }}>{rupiah(item.subtotal)}</strong>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <strong>Total</strong>
                  <strong style={{ color: '#4d372d' }}>{rupiah(keranjang.total)}</strong>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={buatPesanan}
                  isLoading={sedangProses}
                  disabled={
                    tokoLibur ||
                    keranjang.perluTinjauUlang ||
                    keranjang.items.length === 0 ||
                    !tanggalAmbil ||
                    !idempotencyKey
                  }
                >
                  Buat Pesanan
                </Button>
              </CardFooter>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

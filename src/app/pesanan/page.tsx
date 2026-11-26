"use client"

// src/app/pesanan/page.tsx
// Daftar pesanan milik pelanggan (Tahap 7) — 100% Bahasa Indonesia.

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertBanner, Badge, Button, Card, CardContent, CardFooter, CardHeader } from '@/components/ui'
import { labelStatusPesanan } from '@/lib/pesanan'

type ItemPesanan = {
  id: string
  snapshotCode: string
  snapshotTitle: string
  quantity: number
  subtotal: number
}

type Pesanan = {
  id: string
  orderNumber: string
  orderStatus: string
  paymentProofStatus: string
  pickupStatus: string
  paymentMethod: string
  paymentDeadline: string
  totalAmount: number
  createdAt: string
  orderItems: ItemPesanan[]
}

const rupiah = (nilai: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(nilai || 0)

const tanggalSingkat = (nilai: string) =>
  new Date(nilai).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

function warnaStatus(status: string) {
  if (status === 'SELESAI') return 'success' as const
  if (status === 'DIBATALKAN') return 'danger' as const
  if (status === 'MENUNGGU_PEMBAYARAN') return 'warning' as const
  return 'info' as const
}

export default function HalamanPesanan() {
  const router = useRouter()
  const [daftar, setDaftar] = useState<Pesanan[]>([])
  const [memuat, setMemuat] = useState(true)
  const [pesanError, setPesanError] = useState<string | null>(null)
  const [perluLogin, setPerluLogin] = useState(false)

  const muat = useCallback(async () => {
    setMemuat(true)
    setPesanError(null)
    try {
      const res = await fetch('/api/pesanan', { cache: 'no-store' })
      if (res.status === 401) {
        setPerluLogin(true)
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal memuat pesanan')
      setPerluLogin(false)
      setDaftar(data.pesanan || [])
    } catch (error: any) {
      setPesanError(error?.message || 'Terjadi kesalahan saat memuat pesanan')
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  if (perluLogin) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <AlertBanner
          type="warning"
          title="Silakan masuk terlebih dahulu"
          description="Daftar pesanan hanya tersedia bagi pelanggan yang sudah masuk."
        />
        <Button onClick={() => router.push('/login')}>Masuk ke Akun</Button>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ color: '#4d372d', marginBottom: '1.5rem' }}>Pesanan Saya</h1>

      {pesanError && (
        <AlertBanner type="error" title="Gagal memuat pesanan" description={pesanError} />
      )}

      {memuat ? (
        <Card><CardContent><p>Sedang memuat pesanan...</p></CardContent></Card>
      ) : daftar.length === 0 ? (
        <Card>
          <CardContent>
            <p>Anda belum memiliki pesanan.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/katalog')}>Mulai Belanja</Button>
          </CardFooter>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {daftar.map((pesanan) => (
            <Card key={pesanan.id}>
              <CardHeader
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <strong style={{ color: '#4d372d' }}>{pesanan.orderNumber}</strong>
                <Badge variant={warnaStatus(pesanan.orderStatus)}>
                  {labelStatusPesanan(pesanan.orderStatus)}
                </Badge>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#5d4037' }}>
                  Dibuat: {tanggalSingkat(pesanan.createdAt)}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#5d4037' }}>
                  Tenggat pembayaran: {tanggalSingkat(pesanan.paymentDeadline)} WIB
                </span>
                <span style={{ fontSize: '0.9rem', color: '#5d4037' }}>
                  Metode: {pesanan.paymentMethod === 'QRIS' ? 'QRIS' : 'Tunai di Tempat (CFD)'}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#5d4037' }}>
                  {pesanan.orderItems.length} judul buku
                </span>
              </CardContent>
              <CardFooter
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <strong style={{ color: '#4d372d' }}>{rupiah(pesanan.totalAmount)}</strong>
                <Button variant="secondary" onClick={() => router.push(`/pesanan/${pesanan.id}`)}>
                  Lihat Detail
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

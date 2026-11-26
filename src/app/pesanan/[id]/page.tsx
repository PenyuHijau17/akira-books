"use client"

// src/app/pesanan/[id]/page.tsx
// Detail pesanan: snapshot buku, status, tenggat, dan metode pembayaran.
// 100% Bahasa Indonesia, tema kertas klasik. GR-03: tidak ada field modal/laba.

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertBanner, Badge, Button, Card, CardContent, CardFooter, CardHeader } from '@/components/ui'
import {
  labelStatusBukti,
  labelStatusJadwal,
  labelStatusPesanan,
} from '@/lib/pesanan'

type ItemPesanan = {
  id: string
  snapshotCode: string
  snapshotTitle: string
  quantity: number
  snapshotSellingPrice: number
  subtotal: number
}

type Pesanan = {
  id: string
  orderNumber: string
  orderStatus: string
  paymentProofStatus: string
  pickupStatus: string
  refundStatus: string
  paymentMethod: string
  pickupSundayDate: string
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

const tanggalLengkap = (nilai: string) =>
  new Date(nilai).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'short',
  })

export default function HalamanDetailPesanan({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [idPesanan, setIdPesanan] = useState<string | null>(null)
  const [pesanan, setPesanan] = useState<Pesanan | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [pesanError, setPesanError] = useState<string | null>(null)
  const [perluLogin, setPerluLogin] = useState(false)

  useEffect(() => {
    params.then((p) => setIdPesanan(p.id))
  }, [params])

  const muat = useCallback(async () => {
    if (!idPesanan) return
    setMemuat(true)
    setPesanError(null)
    try {
      const res = await fetch(`/api/pesanan/${encodeURIComponent(idPesanan)}`, {
        cache: 'no-store',
      })
      if (res.status === 401) {
        setPerluLogin(true)
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Pesanan tidak ditemukan')
      setPerluLogin(false)
      setPesanan(data.pesanan as Pesanan)
    } catch (error: any) {
      setPesanError(error?.message || 'Terjadi kesalahan saat memuat pesanan')
    } finally {
      setMemuat(false)
    }
  }, [idPesanan])

  useEffect(() => {
    muat()
  }, [muat])

  if (perluLogin) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <AlertBanner
          type="warning"
          title="Silakan masuk terlebih dahulu"
          description="Detail pesanan hanya tersedia bagi pemilik pesanan."
        />
        <Button onClick={() => router.push('/login')}>Masuk ke Akun</Button>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      {searchParams.get('berhasil') === '1' && (
        <AlertBanner
          type="success"
          title="Pesanan berhasil dibuat"
          description="Silakan selesaikan pembayaran sebelum tenggat berakhir."
        />
      )}

      <h1 style={{ color: '#4d372d', marginBottom: '1.5rem' }}>Detail Pesanan</h1>

      {pesanError && (
        <AlertBanner type="error" title="Detail tidak tersedia" description={pesanError} />
      )}

      {memuat || !idPesanan ? (
        <Card><CardContent><p>Sedang memuat detail pesanan...</p></CardContent></Card>
      ) : !pesanan ? null : (
        <>
          <Card style={{ marginBottom: '1rem' }}>
            <CardHeader
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#4d372d' }}>
                {pesanan.orderNumber}
              </h2>
              <Badge variant="warning">{labelStatusPesanan(pesanan.orderStatus)}</Badge>
            </CardHeader>
            <CardContent style={{ display: 'grid', gap: '0.4rem' }}>
              <div>Status pembayaran: {labelStatusBukti(pesanan.paymentProofStatus)}</div>
              <div>Status jadwal: {labelStatusJadwal(pesanan.pickupStatus)}</div>
              <div>Metode pembayaran: {pesanan.paymentMethod === 'QRIS' ? 'QRIS' : 'Tunai di Tempat (CFD)'}</div>
              <div>Pengambilan: {tanggalLengkap(pesanan.pickupSundayDate)} WIB</div>
              <div>Tenggat pembayaran: {tanggalLengkap(pesanan.paymentDeadline)} WIB</div>
              <div>Dibuat: {tanggalLengkap(pesanan.createdAt)} WIB</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#4d372d' }}>
                Buku yang Dipesan
              </h2>
            </CardHeader>
            <CardContent style={{ display: 'grid', gap: '0.75rem' }}>
              {pesanan.orderItems.map((item) => (
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
                  <div>
                    <strong style={{ color: '#3e2723' }}>{item.snapshotTitle}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#5d4037' }}>
                      Kode: {item.snapshotCode || '-'} · {item.quantity} eksemplar ·{' '}
                      {rupiah(item.snapshotSellingPrice)} / eksemplar
                    </div>
                  </div>
                  <strong style={{ color: '#4d372d' }}>{rupiah(item.subtotal)}</strong>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Total Pesanan</strong>
                <strong style={{ color: '#4d372d' }}>{rupiah(pesanan.totalAmount)}</strong>
              </div>
            </CardContent>
            <CardFooter style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => router.push('/pesanan')}>
                Kembali ke Daftar Pesanan
              </Button>
              <Button onClick={() => router.push('/katalog')}>Belanja Lagi</Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  )
}

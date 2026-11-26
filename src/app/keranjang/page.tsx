"use client"

// src/app/keranjang/page.tsx
// Halaman Keranjang Belanja (Tahap 7) — 100% Bahasa Indonesia, tema kertas klasik.

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertBanner, Badge, Button, Card, CardContent, CardFooter, CardHeader, Modal } from '@/components/ui'

type BukuRingkas = {
  id: string
  code: string
  title: string
  author: string
  imageUrl: string | null
  sellingPrice: number
  status: string
}

type ItemKeranjang = {
  id: string
  bookId: string
  quantity: number
  stokTersedia: number
  subtotal: number
  book: BukuRingkas | null
}

type Penyesuaian = {
  id?: string
  itemId: string
  bookId: string
  jenis: 'DIHAPUS' | 'DIKURANGI'
  kuantitasLama: number
  kuantitasBaru: number
  stokTersedia: number
  alasan: string
}

type PayloadKeranjang = {
  cartId: string
  versi: number
  versiDisetujui: number
  perluTinjauUlang: boolean
  alasanTinjau: string | null
  items: ItemKeranjang[]
  total: number
  penyesuaian: Penyesuaian[]
}

const rupiah = (nilai: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(nilai || 0)

export default function HalamanKeranjang() {
  const router = useRouter()
  const [keranjang, setKeranjang] = useState<PayloadKeranjang | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [sedangProses, setSedangProses] = useState(false)
  const [pesanError, setPesanError] = useState<string | null>(null)
  const [perluLogin, setPerluLogin] = useState(false)
  const [bukaKonfirmasi, setBukaKonfirmasi] = useState(false)

  const muat = useCallback(async () => {
    setMemuat(true)
    setPesanError(null)
    try {
      const res = await fetch('/api/keranjang', { cache: 'no-store' })
      if (res.status === 401) {
        setPerluLogin(true)
        setKeranjang(null)
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal memuat keranjang')
      setPerluLogin(false)
      setKeranjang(data as PayloadKeranjang)
    } catch (error: any) {
      setPesanError(error?.message || 'Terjadi kesalahan saat memuat keranjang')
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  async function kirim(method: string, url: string, body?: unknown) {
    setSedangProses(true)
    setPesanError(null)
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Aksi gagal dilakukan')
      setKeranjang(data as PayloadKeranjang)
      return data
    } catch (error: any) {
      setPesanError(error?.message || 'Terjadi kesalahan')
      return null
    } finally {
      setSedangProses(false)
    }
  }

  async function perbaruiKuantitas(itemId: string, kuantitasBaru: number) {
    if (!Number.isInteger(kuantitasBaru) || kuantitasBaru < 1) return
    await kirim('PATCH', '/api/keranjang', { itemId, quantity: kuantitasBaru })
  }

  async function hapusItem(itemId: string) {
    await kirim('DELETE', `/api/keranjang?itemId=${encodeURIComponent(itemId)}`)
  }

  async function setujuiUlang() {
    const hasil = await kirim('PUT', '/api/keranjang', { action: 'setujui' })
    if (hasil) setBukaKonfirmasi(false)
  }

  if (perluLogin) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <AlertBanner
          type="warning"
          title="Silakan masuk terlebih dahulu"
          description="Keranjang belanja hanya tersedia bagi pelanggan yang sudah masuk."
        />
        <Button onClick={() => router.push('/login')}>Masuk ke Akun</Button>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ color: '#4d372d', marginBottom: '0.5rem' }}>Keranjang Belanja</h1>
      <p style={{ color: '#5d4037', marginBottom: '1.5rem' }}>
        Periksa kembali buku yang akan Anda pesan. Item di keranjang belum menahan stok.
      </p>

      {pesanError && (
        <AlertBanner type="error" title="Aksi tidak berhasil" description={pesanError} />
      )}

      {memuat ? (
        <Card><CardContent><p>Sedang memuat keranjang...</p></CardContent></Card>
      ) : !keranjang ? null : (
        <>
          {keranjang.perluTinjauUlang && (
            <AlertBanner
              type="warning"
              title="Keranjang perlu ditinjau ulang"
              description={
                keranjang.alasanTinjau ||
                'Stok buku berubah sehingga isi keranjang disesuaikan otomatis.'
              }
            >
              <div style={{ marginTop: '0.75rem' }}>
                <Button onClick={() => setBukaKonfirmasi(true)} isLoading={sedangProses}>
                  Tinjau dan Setujui Ulang
                </Button>
              </div>
            </AlertBanner>
          )}

          {keranjang.penyesuaian.length > 0 && (
            <Card style={{ marginBottom: '1rem' }}>
              <CardHeader>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#4d372d' }}>
                  Perubahan Stok Terkini
                </h2>
              </CardHeader>
              <CardContent>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#5d4037' }}>
                  {keranjang.penyesuaian.map((p, indeks) => (
                    <li key={`${p.itemId}-${indeks}`}>
                      {p.jenis === 'DIHAPUS'
                        ? `Item dihapus: ${p.alasan}`
                        : `Kuantitas dikurangi dari ${p.kuantitasLama} menjadi ${p.kuantitasBaru}`}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {keranjang.items.length === 0 ? (
            <Card>
              <CardContent>
                <p>Keranjang Anda masih kosong.</p>
              </CardContent>
              <CardFooter>
                <Button onClick={() => router.push('/katalog')}>Jelajahi Katalog</Button>
              </CardFooter>
            </Card>
          ) : (
            <>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {keranjang.items.map((item) => (
                  <Card key={item.id}>
                    <CardContent
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ flex: '1 1 260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {item.book?.imageUrl ? (
                            <img
                              src={item.book.imageUrl}
                              alt={item.book.title}
                              style={{
                                width: 56,
                                height: 76,
                                objectFit: 'cover',
                                border: '1px solid #d7ccc8',
                                borderRadius: 4,
                              }}
                            />
                          ) : null}
                          <div>
                            <strong style={{ color: '#3e2723' }}>
                              {item.book?.title || 'Buku tidak tersedia'}
                            </strong>
                            <div style={{ fontSize: '0.85rem', color: '#5d4037' }}>
                              {item.book?.author || '-'} · {item.book?.code || '-'}
                            </div>
                            <div style={{ marginTop: '0.35rem' }}>
                              <Badge variant={item.stokTersedia > 0 ? 'success' : 'danger'}>
                                Stok tersedia: {item.stokTersedia}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label htmlFor={`qty-${item.id}`}>Jumlah</label>
                        <input
                          id={`qty-${item.id}`}
                          type="number"
                          min={1}
                          max={item.stokTersedia}
                          defaultValue={item.quantity}
                          key={`${item.id}-${item.quantity}`}
                          onBlur={(event) =>
                            perbaruiKuantitas(item.id, Number(event.target.value))
                          }
                          style={{
                            width: 72,
                            padding: '0.35rem',
                            border: '1px solid #d7ccc8',
                            borderRadius: 4,
                            background: '#f5f0e5',
                            color: '#3e2723',
                          }}
                        />
                        <Button
                          variant="secondary"
                          disabled={sedangProses}
                          onClick={() => perbaruiKuantitas(item.id, Math.max(1, item.quantity - 1))}
                        >
                          Kurangi
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={sedangProses || item.quantity >= item.stokTersedia}
                          onClick={() => perbaruiKuantitas(item.id, item.quantity + 1)}
                        >
                          Tambah
                        </Button>
                      </div>

                      <div style={{ textAlign: 'right', minWidth: 120 }}>
                        <div style={{ fontWeight: 600, color: '#4d372d' }}>
                          {rupiah(item.subtotal)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#5d4037' }}>
                          {rupiah(item.book?.sellingPrice || 0)} / eksemplar
                        </div>
                        <Button
                          variant="danger"
                          style={{ marginTop: '0.5rem' }}
                          disabled={sedangProses}
                          onClick={() => hapusItem(item.id)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card style={{ marginTop: '1.5rem' }}>
                <CardHeader>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#4d372d' }}>
                    Ringkasan Belanja
                  </h2>
                </CardHeader>
                <CardContent>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total sementara</span>
                    <strong style={{ color: '#4d372d' }}>{rupiah(keranjang.total)}</strong>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#5d4037' }}>
                    Harga final mengikuti snapshot saat checkout. Perubahan katalog tidak
                    memengaruhi pesanan yang sudah dibuat.
                  </p>
                </CardContent>
                <CardFooter
                  style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}
                >
                  <Button
                    disabled={keranjang.perluTinjauUlang || sedangProses}
                    onClick={() => router.push('/checkout')}
                  >
                    Lanjut ke Checkout
                  </Button>
                  <Button variant="secondary" onClick={() => router.push('/katalog')}>
                    Terus Belanja
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}

          <Modal
            open={bukaKonfirmasi}
            onOpenChange={setBukaKonfirmasi}
            title="Setujui Ulang Keranjang"
            confirmText="Setujui Keranjang"
            cancelText="Nanti"
            onConfirm={setujuiUlang}
          >
            <p style={{ color: '#5d4037' }}>
              {keranjang.alasanTinjau ||
                'Stok berubah sehingga isi keranjang perlu diperiksa kembali.'}
            </p>
            <p style={{ color: '#5d4037' }}>
              Dengan menyetujui, Anda mengonfirmasi kuantitas dan isi keranjang saat ini
              sebelum checkout.
            </p>
          </Modal>
        </>
      )}
    </div>
  )
}

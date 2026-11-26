"use client"

// src/app/pesanan/[id]/page.tsx
// Detail pesanan: snapshot buku, status, tenggat, QRIS, bukti bayar, dan pengajuan.
// 100% Bahasa Indonesia, tema kertas klasik. GR-03: tidak ada field modal/laba.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

type Bukti = {
  id: string
  imageUrl: string
  status: string
  amount: number
  isLatest: boolean
  rejectionReason: string | null
  proofRequestReason: string | null
  uploadedAt: string
}

type PesananLain = {
  id: string
  orderNumber: string
  totalAmount: number
}

type Pesanan = {
  id: string
  orderNumber: string
  orderStatus: string
  paymentProofStatus: string
  paymentReviewStatus: string
  paymentRejectReason: string | null
  proofRequestReason: string | null
  proofDeadline: string | null
  paidAt: string | null
  pickupStatus: string
  refundStatus: string
  paymentMethod: string
  pickupSundayDate: string
  paymentDeadline: string
  methodChangeStatus: string
  methodChangeTo: string | null
  methodChangeReason: string | null
  methodChangeRequestedAt: string | null
  pausedAt: string | null
  pausedRemainingSeconds: number | null
  cancelReason: string | null
  totalAmount: number
  createdAt: string
  orderItems: ItemPesanan[]
  riwayatBukti: Bukti[]
  perubahanMetode: Array<{ id: string; toMethod: string; status: string; createdAt: string }>
  perpanjangan: Array<{ id: string; proposedDeadline: string; status: string; reason: string }>
}

type QrisAktif = { id: string; imageUrl: string; keterangan: string | null; pesan: string }

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

function formatSisa(detik: number): string {
  if (!Number.isFinite(detik) || detik <= 0) return 'Waktu habis'
  const jam = Math.floor(detik / 3600)
  const menit = Math.floor((detik % 3600) / 60)
  const detikAkhir = detik % 60
  return [jam, menit, detikAkhir].map((n) => String(n).padStart(2, '0')).join(':')
}

export default function HalamanDetailPesanan({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [idPesanan, setIdPesanan] = useState<string | null>(null)
  const [pesanan, setPesanan] = useState<Pesanan | null>(null)
  const [qris, setQris] = useState<QrisAktif | null>(null)
  const [pesananLain, setPesananLain] = useState<PesananLain[]>([])
  const [daftarTerpilih, setDaftarTerpilih] = useState<string[]>([])
  const [berkasBukti, setBerkasBukti] = useState<File | null>(null)
  const [totalTransfer, setTotalTransfer] = useState('')
  const [metodeBaru, setMetodeBaru] = useState('TUNAI_CFD')
  const [alasanMetode, setAlasanMetode] = useState('')
  const [jamTambahan, setJamTambahan] = useState('24')
  const [alasanTenggat, setAlasanTenggat] = useState('')
  const [detikSekarang, setDetikSekarang] = useState(0)
  const [sedangMemproses, setSedangMemproses] = useState(false)
  const [memuat, setMemuat] = useState(true)
  const [pesanError, setPesanError] = useState<string | null>(null)
  const [pesanSukses, setPesanSukses] = useState<string | null>(null)
  const [perluLogin, setPerluLogin] = useState(false)

  useEffect(() => {
    params.then((p) => setIdPesanan(p.id))
  }, [params])

  const muat = useCallback(async () => {
    if (!idPesanan) return
    setMemuat(true)
    setPesanError(null)
    try {
      const [res, resDaftar] = await Promise.all([
        fetch(`/api/pesanan/${encodeURIComponent(idPesanan)}`, { cache: 'no-store' }),
        fetch('/api/pesanan', { cache: 'no-store' }),
      ])
      if (res.status === 401) {
        setPerluLogin(true)
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Pesanan tidak ditemukan')
      setPerluLogin(false)
      const detail = data.pesanan as Pesanan
      setPesanan(detail)
      setDaftarTerpilih([detail.id])
      setTotalTransfer(String(detail.totalAmount))

      if (resDaftar.ok) {
        const daftar = await resDaftar.json()
        setPesananLain(
          (daftar.pesanan || [])
            .filter(
              (p: PesananLain & { orderStatus: string }) =>
                p.id !== detail.id && p.orderStatus === 'MENUNGGU_PEMBAYARAN'
            )
            .map((p: PesananLain) => ({ id: p.id, orderNumber: p.orderNumber, totalAmount: p.totalAmount }))
        )
      }
    } catch (error: any) {
      setPesanError(error?.message || 'Terjadi kesalahan saat memuat pesanan')
    } finally {
      setMemuat(false)
    }
  }, [idPesanan])

  useEffect(() => {
    muat()
  }, [muat])

  useEffect(() => {
    if (!pesanan || pesanan.paymentMethod !== 'QRIS') return
    fetch('/api/qris', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((isi) => setQris(isi?.qris || null))
      .catch(() => setQris(null))
  }, [pesanan?.paymentMethod])

  const menungguPembayaran: boolean =
    !!pesanan &&
    pesanan.orderStatus === 'MENUNGGU_PEMBAYARAN' &&
    pesanan.paymentProofStatus !== 'TERVERIFIKASI'

  const totalTerpilih = useMemo(() => {
    const semua = pesanan
      ? [pesanan, ...pesananLain.filter((p) => daftarTerpilih.includes(p.id))]
          .filter((p) => daftarTerpilih.includes(p.id))
      : []
    return semua.reduce((jumlah, p) => jumlah + Number(p.totalAmount || 0), 0)
  }, [pesanan, pesananLain, daftarTerpilih])

  const sisaDetikDihitung = useMemo(() => {
    if (!pesanan) return 0
    if (pesanan.pausedAt && typeof pesanan.pausedRemainingSeconds === 'number') {
      return pesanan.pausedRemainingSeconds
    }
    return Math.max(
      0,
      Math.floor((new Date(pesanan.paymentDeadline).getTime() - detikSekarang) / 1000)
    )
  }, [pesanan, detikSekarang])

  useEffect(() => {
    setDetikSekarang(Date.now())
    const interval = setInterval(() => setDetikSekarang(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  async function unggahBukti() {
    if (!berkasBukti) {
      setPesanError('Pilih gambar bukti transfer terlebih dahulu')
      return
    }
    if (daftarTerpilih.length === 0) {
      setPesanError('Pilih minimal satu pesanan')
      return
    }
    setSedangMemproses(true)
    setPesanError(null)
    setPesanSukses(null)
    try {
      const form = new FormData()
      form.append('file', berkasBukti)
      form.append('orderIds', JSON.stringify(daftarTerpilih))
      form.append('totalTransfer', totalTransfer)
      const res = await fetch('/api/pembayaran/bukti', { method: 'POST', body: form })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal mengunggah bukti')
      setPesanSukses(isi.pesan || 'Bukti berhasil diunggah.')
      setBerkasBukti(null)
      await muat()
    } catch (error: any) {
      setPesanError(error?.message || 'Gagal mengunggah bukti')
    } finally {
      setSedangMemproses(false)
    }
  }

  async function ajukanMetode(aksi: 'AJUKAN' | 'BATAL') {
    if (aksi === 'AJUKAN' && alasanMetode.trim().length < 3) {
      setPesanError('Alasan perubahan metode wajib diisi')
      return
    }
    setSedangMemproses(true)
    setPesanError(null)
    setPesanSukses(null)
    try {
      const res = await fetch('/api/pembayaran/metode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: aksi,
          orderId: pesanan!.id,
          metodeBaru,
          alasan: alasanMetode,
        }),
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Pengajuan gagal')
      setPesanSukses(isi.pesan || 'Pengajuan metode berhasil diproses.')
      setAlasanMetode('')
      await muat()
    } catch (error: any) {
      setPesanError(error?.message || 'Pengajuan metode gagal')
    } finally {
      setSedangMemproses(false)
    }
  }

  async function ajukanTenggat() {
    if (alasanTenggat.trim().length < 3) {
      setPesanError('Alasan perpanjangan wajib diisi')
      return
    }
    setSedangMemproses(true)
    setPesanError(null)
    setPesanSukses(null)
    try {
      const res = await fetch('/api/pembayaran/tenggat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: pesanan!.id,
          alasan: alasanTenggat,
          jamTambahan: Number(jamTambahan),
        }),
      })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Pengajuan gagal')
      setPesanSukses(isi.pesan || 'Pengajuan perpanjangan berhasil dikirim.')
      setAlasanTenggat('')
      await muat()
    } catch (error: any) {
      setPesanError(error?.message || 'Pengajuan perpanjangan gagal')
    } finally {
      setSedangMemproses(false)
    }
  }

  function gantiPilihan(id: string, dicentang: boolean) {
    setDaftarTerpilih((sebelumnya) =>
      dicentang
        ? [...new Set([...sebelumnya, id])]
        : sebelumnya.filter((nilai) => nilai !== id)
    )
  }

  useEffect(() => {
    if (!daftarTerpilih.length || !pesanan) return
    const nilai = daftarTerpilih.reduce((jumlah: number, id) => {
      if (id === pesanan.id) return jumlah + pesanan.totalAmount
      const lain = pesananLain.find((p) => p.id === id)
      return jumlah + (lain?.totalAmount || 0)
    }, 0)
    setTotalTransfer(String(nilai))
  }, [daftarTerpilih, pesanan, pesananLain])

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
        <AlertBanner type="error" title="Perhatian" description={pesanError} />
      )}
      {pesanSukses && (
        <AlertBanner type="success" title="Berhasil" description={pesanSukses} />
      )}

      {memuat || !idPesanan ? (
        <Card><CardContent><p>Sedang memuat detail pesanan...</p></CardContent></Card>
      ) : !pesanan ? null : (
        <>
          {pesanan.cancelReason && (
            <AlertBanner
              type="warning"
              title="Pesanan dibatalkan"
              description={pesanan.cancelReason}
            />
          )}

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
              <div>
                Sisa waktu:{' '}
                <strong style={{ color: '#7b2d26' }}>
                  {formatSisa(sisaDetikDihitung)}
                  {pesanan.pausedAt && typeof pesanan.pausedRemainingSeconds === 'number'
                    ? ' (dijeda karena pengajuan ubah metode)'
                    : ''}
                </strong>
              </div>
              {pesanan.paidAt && (
                <div>Lunas pada: {tanggalLengkap(pesanan.paidAt)} WIB</div>
              )}
              {pesanan.paymentRejectReason && (
                <div style={{ color: '#7b2d26' }}>
                  Alasan penolakan: {pesanan.paymentRejectReason}
                </div>
              )}
              {pesanan.proofRequestReason && (
                <div style={{ color: '#7b2d26' }}>
                  Bukti baru diminta: {pesanan.proofRequestReason}
                </div>
              )}
              <div>Dibuat: {tanggalLengkap(pesanan.createdAt)} WIB</div>
            </CardContent>
          </Card>

          {menungguPembayaran && pesanan.paymentMethod === 'QRIS' && (
            <Card style={{ marginBottom: '1rem' }}>
              <CardHeader>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#4d372d' }}>
                  Pembayaran QRIS
                </h2>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '0.75rem' }}>
                {qris ? (
                  <>
                    <img
                      src={qris.imageUrl}
                      alt="Kode QRIS toko"
                      style={{ maxWidth: 280, maxHeight: 280, borderRadius: 8 }}
                    />
                    <p style={{ color: '#5d4037' }}>{qris.pesan}</p>
                    {qris.keterangan && (
                      <p style={{ color: '#5d4037', fontSize: '0.9rem' }}>
                        Keterangan: {qris.keterangan}
                      </p>
                    )}
                  </>
                ) : (
                  <p>QRIS toko belum tersedia. Hubungi Admin Utama.</p>
                )}
              </CardContent>
            </Card>
          )}

          {menungguPembayaran && (
            <Card style={{ marginBottom: '1rem' }}>
              <CardHeader>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#4d372d' }}>
                  Unggah Bukti Transfer
                </h2>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '0.85rem' }}>
                {pesananLain.length > 0 && (
                  <div style={{ display: 'grid', gap: '0.4rem' }}>
                    <div style={{ color: '#5d4037' }}>
                      Jika satu transfer QRIS membayar beberapa pesanan, centang semua pesanan
                      yang terkait:
                    </div>
                    {pesananLain.map((item) => (
                      <label key={item.id} style={{ color: '#4d372d' }}>
                        <input
                          type="checkbox"
                          checked={daftarTerpilih.includes(item.id)}
                          onChange={(e) => gantiPilihan(item.id, e.target.checked)}
                        />{' '}
                        {item.orderNumber} — {rupiah(item.totalAmount)}
                      </label>
                    ))}
                  </div>
                )}
                <Input
                  label="Gambar bukti transfer (JPG/PNG/WebP, maksimal 5 MB)"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setBerkasBukti(e.target.files?.[0] ?? null)}
                />
                <Input
                  label="Nominal transfer (Rupiah)"
                  type="number"
                  min={1}
                  value={totalTransfer}
                  onChange={(e) => setTotalTransfer(e.target.value)}
                  helperText={`Total pesanan terpilih: ${rupiah(totalTerpilih)}`}
                />
              </CardContent>
              <CardFooter>
                <Button onClick={unggahBukti} isLoading={sedangMemproses} disabled={!berkasBukti}>
                  Kirim Bukti Pembayaran
                </Button>
              </CardFooter>
            </Card>
          )}

          {pesanan.riwayatBukti.length > 0 && (
            <Card style={{ marginBottom: '1rem' }}>
              <CardHeader>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#4d372d' }}>
                  Riwayat Bukti Pembayaran
                </h2>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '0.75rem' }}>
                {pesanan.riwayatBukti.map((bukti) => (
                  <div
                    key={bukti.id}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      borderBottom: '1px solid #d7ccc8',
                      paddingBottom: '0.75rem',
                    }}
                  >
                    <img
                      src={bukti.imageUrl}
                      alt="Bukti transfer"
                      style={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 6 }}
                    />
                    <div style={{ color: '#5d4037' }}>
                      <div>
                        {tanggalLengkap(bukti.uploadedAt)} WIB · {rupiah(bukti.amount)}
                      </div>
                      <div>Status: {labelStatusBukti(bukti.status)}</div>
                      {bukti.rejectionReason && (
                        <div style={{ color: '#7b2d26' }}>Alasan: {bukti.rejectionReason}</div>
                      )}
                      {bukti.proofRequestReason && (
                        <div style={{ color: '#7b2d26' }}>
                          Bukti baru: {bukti.proofRequestReason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {menungguPembayaran && (
            <Card style={{ marginBottom: '1rem' }}>
              <CardHeader>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#4d372d' }}>
                  Pengajuan Perubahan
                </h2>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '0.85rem' }}>
                {pesanan.methodChangeStatus === 'MENUNGGU_PERSETUJUAN' ? (
                  <>
                    <AlertBanner
                      type="info"
                      title="Pengajuan menunggu keputusan"
                      description={`Perubahan metode ke ${
                        pesanan.methodChangeTo === 'TUNAI_CFD'
                          ? 'Tunai di Tempat (CFD)'
                          : 'QRIS'
                      } sedang menunggu keputusan admin. Hitung mundur dijeda.`}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => ajukanMetode('BATAL')}
                      isLoading={sedangMemproses}
                    >
                      Batalkan Pengajuan
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      as="select"
                      label="Metode pembayaran yang diajukan"
                      value={metodeBaru}
                      onChange={(e) => setMetodeBaru(e.target.value)}
                      options={[
                        { value: 'TUNAI_CFD', label: 'Tunai di Tempat (CFD)' },
                        { value: 'QRIS', label: 'QRIS' },
                      ]}
                    />
                    <Input
                      as="textarea"
                      label="Alasan perubahan metode"
                      rows={2}
                      value={alasanMetode}
                      onChange={(e) => setAlasanMetode(e.target.value)}
                    />
                    <Button onClick={() => ajukanMetode('AJUKAN')} isLoading={sedangMemproses}>
                      Ajukan Ubah Metode
                    </Button>
                  </>
                )}

                <div style={{ borderTop: '1px solid #d7ccc8', paddingTop: '0.85rem' }}>
                  <Input
                    label="Tambahan waktu (jam, maksimal 168)"
                    type="number"
                    min={1}
                    max={168}
                    value={jamTambahan}
                    onChange={(e) => setJamTambahan(e.target.value)}
                    helperText="Pengajuan ini TIDAK menjeda hitung mundur pembayaran."
                  />
                  <Input
                    as="textarea"
                    label="Alasan perpanjangan tenggat"
                    rows={2}
                    value={alasanTenggat}
                    onChange={(e) => setAlasanTenggat(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    onClick={ajukanTenggat}
                    isLoading={sedangMemproses}
                    style={{ marginTop: '0.75rem' }}
                  >
                    Ajukan Perpanjangan Tenggat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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

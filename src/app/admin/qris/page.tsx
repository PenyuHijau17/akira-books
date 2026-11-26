'use client';

// src/app/admin/qris/page.tsx
// Manajemen satu QRIS aktif toko — khusus Admin Utama (FR-PAY-001).
// Tema krem/cokelat, 100% Bahasa Indonesia, komponen @/components/ui.

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
  Modal,
} from '@/components/ui'

type QrisRingkas = {
  id: string
  imageUrl: string
  keterangan: string | null
  uploadedById: string
  replacedAt: string | null
  createdAt: string
}

type DataQris = {
  aktif: QrisRingkas | null
  riwayat: QrisRingkas[]
  jumlahPesananAktif: number
  peringatan: string | null
}

const tanggalLengkap = (nilai: string) =>
  new Date(nilai).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'long',
    timeStyle: 'short',
  })

export default function HalamanKelolaQris() {
  const [data, setData] = useState<DataQris | null>(null)
  const [berkas, setBerkas] = useState<File | null>(null)
  const [konfirmasi, setKonfirmasi] = useState('')
  const [kataSandi, setKataSandi] = useState('')
  const [otp, setOtp] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [pesan, setPesan] = useState<{ jenis: 'success' | 'error' | 'info'; teks: string } | null>(null)
  const [sedangMemuat, setSedangMemuat] = useState(true)
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false)
  const [sedangMintaOtp, setSedangMintaOtp] = useState(false)
  const [tampilkanKonfirmasi, setTampilkanKonfirmasi] = useState(false)

  const muat = useCallback(async () => {
    setSedangMemuat(true)
    try {
      const res = await fetch('/api/admin/qris', { cache: 'no-store' })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal memuat QRIS')
      setData(isi as DataQris)
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal memuat QRIS' })
    } finally {
      setSedangMemuat(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  async function mintaOtp() {
    setSedangMintaOtp(true)
    setPesan(null)
    try {
      const res = await fetch('/api/admin/qris/otp', { method: 'POST' })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal mengirim OTP')
      setPesan({ jenis: 'info', teks: isi.pesan })
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal mengirim OTP' })
    } finally {
      setSedangMintaOtp(false)
    }
  }

  async function simpanQris() {
    if (!berkas) {
      setPesan({ jenis: 'error', teks: 'Pilih gambar QRIS terlebih dahulu' })
      return
    }
    setSedangMenyimpan(true)
    setPesan(null)
    try {
      const form = new FormData()
      form.append('file', berkas)
      form.append('konfirmasi', konfirmasi)
      form.append('password', kataSandi)
      form.append('otp', otp)
      form.append('keterangan', keterangan)

      const res = await fetch('/api/admin/qris', { method: 'POST', body: form })
      const isi = await res.json()
      if (!res.ok) throw new Error(isi?.error || 'Gagal menyimpan QRIS')

      setPesan({ jenis: 'success', teks: isi.pesan })
      setBerkas(null)
      setKonfirmasi('')
      setKataSandi('')
      setOtp('')
      setKeterangan('')
      await muat()
    } catch (error: any) {
      setPesan({ jenis: 'error', teks: error?.message || 'Gagal menyimpan QRIS' })
    } finally {
      setSedangMenyimpan(false)
    }
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ color: '#4d372d', marginBottom: '0.5rem' }}>Kelola QRIS Toko</h1>
      <p style={{ color: '#5d4037', marginBottom: '1.5rem' }}>
        Hanya Admin Utama yang dapat mengganti QRIS. Riwayat QRIS lama tetap disimpan.
      </p>

      {pesan && (
        <AlertBanner
          type={pesan.jenis}
          title={pesan.jenis === 'error' ? 'Perhatian' : 'Informasi'}
          description={pesan.teks}
        />
      )}

      {sedangMemuat ? (
        <Card>
          <CardContent>
            <p>Sedang memuat QRIS...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {data?.peringatan && (
            <AlertBanner
              type="warning"
              title="Pesanan aktif terdampak"
              description={data.peringatan}
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <Card>
              <CardHeader>
                <h2 style={{ margin: 0, color: '#4d372d' }}>QRIS Aktif</h2>
              </CardHeader>
              <CardContent>
                {data?.aktif ? (
                  <>
                    <img
                      src={data.aktif.imageUrl}
                      alt="QRIS toko yang sedang aktif"
                      style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8 }}
                    />
                    <p style={{ marginTop: '0.75rem', color: '#5d4037' }}>
                      Diunggah: {tanggalLengkap(data.aktif.createdAt)} WIB
                    </p>
                    <p style={{ color: '#5d4037' }}>
                      Keterangan: {data.aktif.keterangan || '-'}
                    </p>
                  </>
                ) : (
                  <p>Belum ada QRIS aktif. Unggah gambar QRIS toko melalui formulir di samping.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 style={{ margin: 0, color: '#4d372d' }}>Ganti QRIS</h2>
              </CardHeader>
              <CardContent style={{ display: 'grid', gap: '0.85rem' }}>
                <Input
                  label="Gambar QRIS (JPG/PNG/WebP, maksimal 5 MB)"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
                />
                <Input
                  label="Keterangan (opsional)"
                  value={keterangan}
                  maxLength={200}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Misalnya: QRIS baru mulai 1 Desember"
                />
                <Button onClick={mintaOtp} isLoading={sedangMintaOtp} variant="secondary">
                  Kirim OTP ke Terminal Server
                </Button>
                <Input
                  label="Kata sandi Admin Utama"
                  type="password"
                  value={kataSandi}
                  onChange={(e) => setKataSandi(e.target.value)}
                  autoComplete="current-password"
                />
                <Input
                  label="OTP 6 digit"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  helperText="OTP dikirim ke terminal server dan berlaku 5 menit."
                />
                <Input
                  label='Ketik "YA" untuk mengonfirmasi penggantian'
                  value={konfirmasi}
                  onChange={(e) => setKonfirmasi(e.target.value)}
                  placeholder="YA"
                />
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => setTampilkanKonfirmasi(true)}
                  isLoading={sedangMenyimpan}
                  disabled={!berkas}
                >
                  Periksa dan Simpan QRIS
                </Button>
              </CardFooter>
            </Card>
          </div>

          <Card style={{ marginTop: '1rem' }}>
            <CardHeader>
              <h2 style={{ margin: 0, color: '#4d372d' }}>Riwayat QRIS</h2>
            </CardHeader>
            <CardContent style={{ display: 'grid', gap: '0.75rem' }}>
              {data?.riwayat.length ? (
                data.riwayat.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center',
                      borderBottom: '1px solid #d7ccc8',
                      paddingBottom: '0.75rem',
                    }}
                  >
                    <img
                      src={item.imageUrl}
                      alt="QRIS lama"
                      style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 6 }}
                    />
                    <div>
                      <div style={{ color: '#3e2723', fontWeight: 600 }}>
                        Diunggah {tanggalLengkap(item.createdAt)} WIB
                      </div>
                      <div style={{ color: '#5d4037', fontSize: '0.9rem' }}>
                        {item.keterangan || 'Tanpa keterangan'}
                      </div>
                      {item.replacedAt && (
                        <Badge variant="neutral">
                          Diganti {tanggalLengkap(item.replacedAt)} WIB
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p>Belum ada riwayat penggantian QRIS.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tampilkanKonfirmasi && (
        <Modal
          open={tampilkanKonfirmasi}
          onOpenChange={setTampilkanKonfirmasi}
          title="Konfirmasi Penggantian QRIS"
          confirmText="Ya, Simpan QRIS"
          cancelText="Periksa Kembali"
          onConfirm={simpanQris}
        >
          <p style={{ color: '#5d4037' }}>
            QRIS aktif akan diganti. QRIS lama tetap tersimpan sebagai riwayat dan pelanggan
            dengan pesanan aktif akan menerima notifikasi. Pastikan kata sandi dan OTP sudah benar.
          </p>
        </Modal>
      )}
    </div>
  )
}

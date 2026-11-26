'use client'

// src/app/notifikasi/page.tsx
// Inbox notifikasi Tahap 12 untuk Customer, Admin Biasa, dan Admin Utama.
// 100% Bahasa Indonesia; komponen @/components/ui; tema krem/cokelat.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertBanner, Badge, Button, Card, CardContent, CardHeader } from '@/components/ui'
import {
  formatWaktuWIB,
  kelompokkanNotifikasi,
  type NotifikasiItem,
} from '@/lib/notifikasi'

type HasilInbox = {
  belumDibaca: number
  daftar: NotifikasiItem[]
  grup: ReturnType<typeof kelompokkanNotifikasi>
}

export default function HalamanNotifikasi() {
  const [data, setData] = useState<HasilInbox | null>(null)
  const [filter, setFilter] = useState<'semua' | 'belum'>('semua')
  const [memuat, setMemuat] = useState(true)
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState<{ teks: string; sukses: boolean } | null>(null)

  const muat = useCallback(async () => {
    setMemuat(true)
    try {
      const res = await fetch('/api/notifikasi?limit=200', { cache: 'no-store' })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal memuat notifikasi')
      setData(hasil as HasilInbox)
      setPesan(null)
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal memuat notifikasi'), sukses: false })
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  const grupTampil = useMemo(() => {
    if (!data) return []
    const daftar =
      filter === 'belum' ? data.daftar.filter((item) => !item.isRead) : data.daftar
    return kelompokkanNotifikasi(daftar)
  }, [data, filter])

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
      setPesan({ teks: `${hasil.berubah} notifikasi ditandai sudah dibaca.`, sukses: true })
      await muat()
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal menandai notifikasi'), sukses: false })
    } finally {
      setMemproses(false)
    }
  }

  return (
    <main className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Notifikasi</h1>
          <p style={{ margin: 0, color: '#6b584e' }}>
            Semua kabar pesanan, pembayaran, jadwal, dan sistem dalam satu tempat.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={muat} disabled={memuat}>
            Muat Ulang
          </Button>
          <Button
            variant="primary"
            onClick={() => tandai([], true)}
            disabled={memuat || memproses || !data || data.belumDibaca === 0}
          >
            Tandai Semua Dibaca
          </Button>
        </div>
      </div>

      {pesan && (
        <div style={{ marginTop: '1rem' }}>
          <AlertBanner type={pesan.sukses ? 'success' : 'error'}>{pesan.teks}</AlertBanner>
        </div>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Button
          variant={filter === 'semua' ? 'primary' : 'secondary'}
          onClick={() => setFilter('semua')}
        >
          Semua
        </Button>
        <Button
          variant={filter === 'belum' ? 'primary' : 'secondary'}
          onClick={() => setFilter('belum')}
        >
          Belum Dibaca
        </Button>
        {data && (
          <Badge variant={data.belumDibaca > 0 ? 'warning' : 'neutral'}>
            {data.belumDibaca} belum dibaca
          </Badge>
        )}
      </div>

      {memuat && <p style={{ marginTop: '1.5rem' }}>Sedang memuat notifikasi…</p>}

      {!memuat && data && grupTampil.length === 0 && (
        <Card style={{ marginTop: '1.5rem' }}>
          <CardContent>
            <p style={{ margin: 0 }}>
              {filter === 'belum'
                ? 'Tidak ada notifikasi yang belum dibaca.'
                : 'Belum ada notifikasi untuk akun ini.'}
            </p>
          </CardContent>
        </Card>
      )}

      <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
        {grupTampil.map((grup) => (
          <Card key={grup.kunci}>
            <CardHeader
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
                  {grup.label}
                  {grup.entitasId ? ` — ${grup.entitasId.slice(0, 8)}` : ''}
                </h2>
                <small style={{ color: '#7a685d' }}>
                  {grup.jumlah} notifikasi • terbaru {formatWaktuWIB(grup.waktuTerbaru)}
                </small>
              </div>
              <Badge variant={grup.belumDibaca > 0 ? 'warning' : 'success'}>
                {grup.belumDibaca > 0 ? `${grup.belumDibaca} baru` : 'Sudah dibaca'}
              </Badge>
            </CardHeader>
            <CardContent>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
                {grup.items.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem',
                      border: '1px solid #e7ded2',
                      borderRadius: '0.5rem',
                      background: item.isRead ? '#faf7f0' : '#fff7e8',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: item.isRead ? 400 : 600 }}>{item.message}</div>
                      <small style={{ color: '#7a685d' }}>{formatWaktuWIB(item.createdAt)}</small>
                    </div>
                    {!item.isRead && (
                      <Button
                        variant="ghost"
                        onClick={() => tandai([item.id])}
                        disabled={memproses}
                      >
                        Tandai dibaca
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}

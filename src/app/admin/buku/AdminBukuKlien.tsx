'use client'

// src/app/admin/buku/AdminBukuKlien.tsx
// Kelola buku untuk Admin Biasa/Utama. GR-02: peran diambil dari sesi server (/api/auth),
// bukan dari query string. GR-03: costPrice hanya dirender untuk Admin Utama.

import { useCallback, useEffect, useState } from 'react'
import { AlertBanner, Badge, Button, Card, CardContent, CardHeader, Input } from '@/components/ui'

type Peran = 'PENGUNGGUNG' | 'CUSTOMER' | 'ADMIN_BIASA' | 'ADMIN_UTAMA'

type Buku = {
  id: string
  code: string
  title: string
  author: string
  publisher: string
  publishYear: number
  imageUrl: string | null
  description: string | null
  sellingPrice: number
  costPrice?: number
  stockTotal: number
  status: string
  categoryId: string
}

type FormBuku = {
  code: string
  title: string
  author: string
  publisher: string
  publishYear: number
  imageUrl: string
  description: string
  sellingPrice: number
  costPrice: number
  stockTotal: number
  categoryId: string
}

const formKosong: FormBuku = {
  code: '',
  title: '',
  author: '',
  publisher: '',
  publishYear: 2024,
  imageUrl: '',
  description: '',
  sellingPrice: 0,
  costPrice: 0,
  stockTotal: 0,
  categoryId: '',
}

const rupiah = (nilai: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(nilai || 0)

export default function AdminBukuKlien() {
  const [peran, setPeran] = useState<Peran | null>(null)
  const [daftar, setDaftar] = useState<Buku[]>([])
  const [form, setForm] = useState<FormBuku>(formKosong)
  const [menyunting, setMenyunting] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [memproses, setMemproses] = useState(false)
  const [pesan, setPesan] = useState<{ teks: string; sukses: boolean } | null>(null)

  const muat = useCallback(async () => {
    setMemuat(true)
    try {
      const [resAuth, resBuku] = await Promise.all([
        fetch('/api/auth', { cache: 'no-store' }),
        fetch('/api/admin/buku', { cache: 'no-store' }),
      ])
      const auth = await resAuth.json()
      setPeran((auth?.user?.role as Peran) ?? null)
      if (!resBuku.ok) throw new Error('Gagal memuat daftar buku')
      const hasil = await resBuku.json()
      setDaftar((hasil.books ?? []) as Buku[])
      setPesan(null)
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal memuat buku'), sukses: false })
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  const adalahAdminUtama = peran === 'ADMIN_UTAMA'

  async function simpan() {
    if (!form.code || !form.title || !form.author) {
      setPesan({ teks: 'Kode, judul, dan penulis wajib diisi.', sukses: false })
      return
    }
    setMemproses(true)
    try {
      const payload = { ...form }
      if (!adalahAdminUtama) delete (payload as Partial<FormBuku>).costPrice
      const res = await fetch(menyunting ? `/api/admin/buku/${menyunting}` : '/api/admin/buku', {
        method: menyunting ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal menyimpan buku')
      setPesan({ teks: 'Buku berhasil disimpan.', sukses: true })
      setForm(formKosong)
      setMenyunting(null)
      await muat()
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal menyimpan buku'), sukses: false })
    } finally {
      setMemproses(false)
    }
  }

  async function nonaktifkan(buku: Buku) {
    setMemproses(true)
    try {
      const res = await fetch(`/api/admin/buku/${buku.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanyaNonaktifkan: true, alasan: 'Dinonaktifkan dari panel admin' }),
      })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal menonaktifkan buku')
      setPesan({ teks: 'Buku berhasil dinonaktifkan.', sukses: true })
      await muat()
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal menonaktifkan buku'), sukses: false })
    } finally {
      setMemproses(false)
    }
  }

  async function hapusPermanen(buku: Buku) {
    if (!window.confirm(`Yakin menghapus permanen buku "${buku.title}"?`)) return
    setMemproses(true)
    try {
      const res = await fetch(`/api/admin/buku/${buku.id}`, { method: 'DELETE' })
      const hasil = await res.json()
      if (!res.ok) throw new Error(hasil?.error || 'Gagal menghapus buku')
      setPesan({ teks: 'Buku berhasil dihapus permanen.', sukses: true })
      await muat()
    } catch (error: any) {
      setPesan({ teks: String(error?.message || 'Gagal menghapus buku'), sukses: false })
    } finally {
      setMemproses(false)
    }
  }

  function pilih(buku: Buku) {
    setMenyunting(buku.id)
    setForm({
      code: buku.code,
      title: buku.title,
      author: buku.author,
      publisher: buku.publisher || '',
      publishYear: buku.publishYear,
      imageUrl: buku.imageUrl || '',
      description: buku.description || '',
      sellingPrice: buku.sellingPrice,
      costPrice: buku.costPrice ?? 0,
      stockTotal: buku.stockTotal,
      categoryId: buku.categoryId || '',
    })
  }

  return (
    <main className="container" style={{ padding: '2rem 1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Pengelolaan Buku</h1>
      {pesan && (
        <AlertBanner type={pesan.sukses ? 'success' : 'error'}>{pesan.teks}</AlertBanner>
      )}

      <Card style={{ marginTop: '1.5rem' }}>
        <CardHeader>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
            {menyunting ? 'Ubah Buku' : 'Tambah Buku Baru'}
          </h2>
        </CardHeader>
        <CardContent style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Input label="Kode Buku" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Input label="Judul" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Penulis" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            <Input label="Penerbit" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
            <Input label="Tahun Terbit" type="number" value={form.publishYear} onChange={(e) => setForm({ ...form, publishYear: Number(e.target.value) })} />
            <Input label="Kategori ID" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} />
            <Input label="Harga Jual" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} />
            {adalahAdminUtama && (
              <Input label="Harga Modal (khusus Admin Utama)" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} />
            )}
            <Input label="Stok Total" type="number" value={form.stockTotal} onChange={(e) => setForm({ ...form, stockTotal: Number(e.target.value) })} />
            <Input label="URL Sampul" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <Input label="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button onClick={simpan} isLoading={memproses}>Simpan Buku</Button>
            {menyunting && (
              <Button variant="secondary" onClick={() => { setMenyunting(null); setForm(formKosong) }} disabled={memproses}>
                Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card style={{ marginTop: '1.5rem' }}>
        <CardHeader><h2 style={{ margin: 0, fontSize: '1.1rem' }}>Daftar Buku</h2></CardHeader>
        <CardContent>
          {memuat && <p>Sedang memuat daftar buku…</p>}
          {!memuat && daftar.length === 0 && <p>Belum ada buku.</p>}
          {!memuat && daftar.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Kode', 'Judul', 'Harga Jual', 'Stok', 'Status', 'Aksi'].map((header) => (
                      <th key={header} style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #d7ccc8' }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((buku) => (
                    <tr key={buku.id}>
                      <td style={{ padding: '0.5rem' }}>{buku.code}</td>
                      <td style={{ padding: '0.5rem' }}>{buku.title}</td>
                      <td style={{ padding: '0.5rem' }}>{rupiah(buku.sellingPrice)}</td>
                      <td style={{ padding: '0.5rem' }}>{buku.stockTotal}</td>
                      <td style={{ padding: '0.5rem' }}><Badge variant="neutral">{buku.status}</Badge></td>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <Button variant="ghost" onClick={() => pilih(buku)} disabled={memproses}>Ubah</Button>
                          {buku.status !== 'NONAKTIF' && (
                            <Button variant="secondary" onClick={() => nonaktifkan(buku)} disabled={memproses}>Nonaktifkan</Button>
                          )}
                          {adalahAdminUtama && (
                            <Button variant="danger" onClick={() => hapusPermanen(buku)} disabled={memproses}>Hapus</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

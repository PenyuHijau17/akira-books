import { describe, expect, it, vi } from 'vitest'

const sesi = vi.hoisted(() => ({
  id: 'uji-session',
  role: 'ADMIN_BIASA' as string,
}))

vi.mock('@/lib/auth', () => ({
  getSessionUser: async () => ({
    id: sesi.id,
    email: 'uji@example.test',
    name: 'Uji',
    whatsapp: null,
    role: sesi.role,
    isActive: true,
  }),
}))

import { GET } from '@/app/api/admin/laporan/route'

describe('Tahap 11 — isolasi endpoint laporan keuangan (GR-03, BR-002)', () => {
  it('mengembalikan 403 untuk Admin Biasa tanpa menjalankan query laporan', async () => {
    sesi.role = 'ADMIN_BIASA'
    const respons = await GET(new Request('http://localhost/api/admin/laporan?jenis=harian'))
    expect(respons.status).toBe(403)
    const isi = await respons.json()
    expect(isi.error).toContain('Admin Utama')
  })

  it('mengembalikan 403 untuk Customer', async () => {
    sesi.role = 'CUSTOMER'
    const respons = await GET(new Request('http://localhost/api/admin/laporan?jenis=bulanan'))
    expect(respons.status).toBe(403)
  })
})

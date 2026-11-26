import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tahap 14 — pembaca audit hanya untuk Admin Utama (GR-06).
 * Endpoint bersifat read-only; tidak ada operasi tulis pada pengujian ini.
 */
const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  dapatkanRiwayatAudit: vi.fn(async () => [{ id: 'audit-1', action: 'BUAT_ADMIN' }]),
}))

vi.mock('@/lib/auth', () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock('@/lib/prisma', () => ({ default: () => ({}) }))
vi.mock('@/lib/audit', () => ({
  dapatkanRiwayatAudit: mocks.dapatkanRiwayatAudit,
  EnumRoleActor: {
    CUSTOMER: 'CUSTOMER',
    ADMIN: 'ADMIN',
    SYSTEM: 'SYSTEM',
    ADMIN_UTAMA: 'ADMIN_UTAMA',
  },
}))

import { GET } from '@/app/api/admin/audit/route'

const permintaan = new Request('http://localhost/api/admin/audit')

function sesi(role: string | null) {
  mocks.getSessionUser.mockResolvedValue(
    role ? { id: 'user-uji', email: 'uji@example.test', role, isActive: true } : null
  )
}

describe('Tahap 14 — isolasi pembaca audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('menolak Pengunjung, Customer, dan Admin Biasa', async () => {
    sesi(null)
    expect((await GET(permintaan)).status).toBe(401)

    sesi('CUSTOMER')
    expect((await GET(permintaan)).status).toBe(403)

    sesi('ADMIN_BIASA')
    expect((await GET(permintaan)).status).toBe(403)

    expect(mocks.dapatkanRiwayatAudit).not.toHaveBeenCalled()
  })

  it('Admin Utama dapat membaca riwayat audit', async () => {
    sesi('ADMIN_UTAMA')
    const respons = await GET(permintaan)
    expect(respons.status).toBe(200)
    expect(mocks.dapatkanRiwayatAudit).toHaveBeenCalledTimes(1)
    const isi = await respons.json()
    expect(isi.daftar).toHaveLength(1)
  })
})

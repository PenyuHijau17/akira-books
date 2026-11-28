import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tahap 15 — API Kelola Pengguna. Handler diuji langsung dengan sesi & Prisma
 * yang dimock: otorisasi Admin Utama (GR-02), DTO tanpa data sensitif (GR-03),
 * OTP sekali pakai (FR-ACC-004), dan audit append-only (GR-06).
 */
const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  hashPassword: vi.fn(() => 'salt:hash-aman'),
  generateOTP: vi.fn(() => '123456'),
  hashToken: vi.fn((token: string) => `hash-${token}`),
  kirimEmailKeTerminal: vi.fn(),
  catatAudit: vi.fn(async () => undefined),
  userFindMany: vi.fn(async () => [] as unknown[]),
  userFindUnique: vi.fn(),
  userGroupBy: vi.fn(async () => [] as unknown[]),
  orderGroupBy: vi.fn(async () => [] as unknown[]),
  userCreate: vi.fn(),
  userUpdate: vi.fn(),
  sessionDeleteMany: vi.fn(async () => ({ count: 0 })),
  otpFindFirst: vi.fn(),
  otpCreate: vi.fn(async () => ({})),
  otpUpdate: vi.fn(async () => ({})),
  otpUpdateMany: vi.fn(async () => ({ count: 1 })),
  transaction: vi.fn(),
}))

const client: any = {
  $transaction: (...args: any[]) => mocks.transaction(...args),
  user: {
    findMany: mocks.userFindMany,
    findUnique: mocks.userFindUnique,
    groupBy: mocks.userGroupBy,
    create: mocks.userCreate,
    update: mocks.userUpdate,
  },
  order: { groupBy: mocks.orderGroupBy },
  session: { deleteMany: mocks.sessionDeleteMany },
  otpAndRecoveryToken: {
    findFirst: mocks.otpFindFirst,
    create: mocks.otpCreate,
    update: mocks.otpUpdate,
    updateMany: mocks.otpUpdateMany,
  },
}

vi.mock('@/lib/auth', () => ({
  getSessionUser: mocks.getSessionUser,
  hashPassword: mocks.hashPassword,
  generateOTP: mocks.generateOTP,
  hashToken: mocks.hashToken,
  kirimEmailKeTerminal: mocks.kirimEmailKeTerminal,
}))
vi.mock('@/lib/prisma', () => ({ default: () => client }))
vi.mock('@/lib/pembayaranServer', () => ({ catatAudit: mocks.catatAudit }))

import { GET, POST } from '@/app/api/admin/pengguna/route'
import { PATCH } from '@/app/api/admin/pengguna/[id]/route'

const permintaanGet = (query = '') =>
  new Request(`http://localhost/api/admin/pengguna${query}`)
const permintaanPost = (body: unknown) =>
  new Request('http://localhost/api/admin/pengguna', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
const permintaanPatch = (id: string, body: unknown) =>
  new Request(`http://localhost/api/admin/pengguna/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
const konteks = (id: string) => ({ params: Promise.resolve({ id }) })

function sesi(role: string | null) {
  mocks.getSessionUser.mockResolvedValue(
    role
      ? { id: 'utama-1', email: 'utama@example.test', name: 'Admin Utama', role, isActive: true }
      : null
  )
}

function otpValid() {
  mocks.otpFindFirst.mockResolvedValue({
    id: 'otp-uji',
    codeHash: 'hash-123456',
    failedAttempts: 0,
    expiresAt: new Date(Date.now() + 4 * 60 * 1000),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation(async (fn: any) => fn(client))
  otpValid()
  mocks.userFindUnique.mockImplementation(async (args: any) => {
    if (args?.where?.email) return null
    return {
      id: 'pelanggan-1',
      name: 'Ana',
      email: 'ana@example.test',
      whatsapp: null,
      avatarUrl: null,
      role: 'CUSTOMER',
      isActive: true,
      createdAt: new Date('2026-11-28T01:00:00.000Z'),
    }
  })
  mocks.userUpdate.mockImplementation(async (args: any) => ({
    id: 'pelanggan-1',
    name: 'Ana',
    email: 'ana@example.test',
    whatsapp: null,
    avatarUrl: null,
    role: args?.data?.role ?? 'CUSTOMER',
    isActive: args?.data?.isActive ?? true,
    createdAt: new Date('2026-11-28T01:00:00.000Z'),
  }))
  mocks.userCreate.mockResolvedValue({
    id: 'akun-baru',
    name: 'Admin Baru',
    email: 'baru@example.test',
    whatsapp: null,
    avatarUrl: null,
    role: 'ADMIN_BIASA',
    isActive: true,
    createdAt: new Date('2026-11-28T02:00:00.000Z'),
  })
})

describe('API Kelola Pengguna — otorisasi dan DTO', () => {
  it('menolak semua aksi untuk Pengunjung, Customer, dan Admin Biasa', async () => {
    for (const peran of ['CUSTOMER', 'ADMIN_BIASA'] as const) {
      sesi(peran)
      expect((await GET(permintaanGet())).status).toBe(403)
      expect((await POST(permintaanPost({ action: 'minta-otp' }))).status).toBe(403)
      expect(
        (await PATCH(permintaanPatch('pelanggan-1', { isActive: true }), konteks('pelanggan-1')))
          .status
      ).toBe(403)
    }
    sesi(null)
    expect((await GET(permintaanGet())).status).toBe(401)
    expect(mocks.userFindMany).not.toHaveBeenCalled()
  })

  it('mengembalikan daftar akun tanpa passwordHash dan menyertakan jumlah pesanan', async () => {
    sesi('ADMIN_UTAMA')
    mocks.userFindMany.mockResolvedValue([
      {
        id: 'pelanggan-1',
        name: 'Ana',
        email: 'ana@example.test',
        whatsapp: '08123',
        avatarUrl: null,
        role: 'CUSTOMER',
        isActive: true,
        createdAt: new Date('2026-11-28T01:00:00.000Z'),
        passwordHash: 'jangan-keluar',
        deactivationReason: 'jangan-keluar',
      },
    ])
    mocks.orderGroupBy.mockResolvedValue([
      { customerId: 'pelanggan-1', _count: { _all: 2 } },
    ])
    mocks.userGroupBy.mockResolvedValue([
      { role: 'CUSTOMER', _count: { _all: 1 } },
      { role: 'ADMIN_UTAMA', _count: { _all: 1 } },
    ])

    const respons = await GET(permintaanGet('?cari=ana&peran=CUSTOMER'))
    expect(respons.status).toBe(200)
    const hasil = await respons.json()
    expect(hasil.akun).toHaveLength(1)
    expect(hasil.akun[0].jumlahPesanan).toBe(2)
    expect(hasil.ringkasan).toEqual({
      CUSTOMER: 1,
      ADMIN_BIASA: 0,
      ADMIN_UTAMA: 1,
      total: 2,
    })
    expect(JSON.stringify(hasil)).not.toContain('jangan-keluar')
    expect(mocks.userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: 'CUSTOMER' }),
      })
    )
  })
})

describe('API Kelola Pengguna — pembuatan akun', () => {
  it('memvalidasi email, kata sandi, peran, OTP, dan email duplikat', async () => {
    sesi('ADMIN_UTAMA')
    const dasar = {
      nama: 'Admin Baru',
      email: 'baru@example.test',
      password: 'rahasia123',
      peran: 'ADMIN_BIASA',
    }
    expect((await POST(permintaanPost({ ...dasar, otp: '' }))).status).toBe(400)
    expect((await POST(permintaanPost({ ...dasar, email: 'salah', otp: '123456' }))).status).toBe(400)
    expect((await POST(permintaanPost({ ...dasar, password: 'pendek', otp: '123456' }))).status).toBe(400)
    expect((await POST(permintaanPost({ ...dasar, peran: 'ADMIN_UTAMA', otp: '123456' }))).status).toBe(400)

    mocks.userFindUnique.mockResolvedValueOnce({ id: 'sudah-ada' })
    expect((await POST(permintaanPost({ ...dasar, otp: '123456' }))).status).toBe(409)
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it('membuat akun dengan hash aman, OTP sekali pakai, dan audit', async () => {
    sesi('ADMIN_UTAMA')
    const respons = await POST(
      permintaanPost({
        nama: 'Admin Baru',
        email: 'baru@example.test',
        whatsapp: '08123',
        password: 'rahasia123',
        peran: 'ADMIN_BIASA',
        otp: '123456',
      })
    )
    expect(respons.status).toBe(200)
    expect(mocks.hashPassword).toHaveBeenCalledWith('rahasia123')
    expect(mocks.otpUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usedAt: expect.any(Date) }) })
    )
    expect(mocks.catatAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'BUAT_ADMIN', targetEntity: 'User' })
    )
    const hasil = await respons.json()
    expect(JSON.stringify(hasil)).not.toContain('rahasia123')
  })
})

describe('API Kelola Pengguna — perubahan peran dan status', () => {
  it('menolak OTP salah tanpa mengubah akun', async () => {
    sesi('ADMIN_UTAMA')
    mocks.otpFindFirst.mockResolvedValue({
      id: 'otp-uji',
      codeHash: 'hash-123456',
      failedAttempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    })
    const respons = await PATCH(
      permintaanPatch('pelanggan-1', { role: 'ADMIN_BIASA', otp: '000000' }),
      konteks('pelanggan-1')
    )
    expect(respons.status).toBe(401)
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it('mengubah peran dengan OTP dan mencatat audit', async () => {
    sesi('ADMIN_UTAMA')
    const respons = await PATCH(
      permintaanPatch('pelanggan-1', { role: 'ADMIN_BIASA', otp: '123456' }),
      konteks('pelanggan-1')
    )
    expect(respons.status).toBe(200)
    expect(mocks.userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'ADMIN_BIASA' }) })
    )
    expect(mocks.catatAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UBAH_PERAN', targetEntity: 'User' })
    )
  })

  it('menonaktifkan pelanggan tanpa OTP tetapi wajib alasan dan mencabut sesi', async () => {
    sesi('ADMIN_UTAMA')
    expect(
      (await PATCH(
        permintaanPatch('pelanggan-1', { isActive: false }),
        konteks('pelanggan-1')
      )).status
    ).toBe(400)

    const respons = await PATCH(
      permintaanPatch('pelanggan-1', { isActive: false, alasan: 'Melanggar aturan' }),
      konteks('pelanggan-1')
    )
    expect(respons.status).toBe(200)
    expect(mocks.sessionDeleteMany).toHaveBeenCalledWith({ where: { userId: 'pelanggan-1' } })
    expect(mocks.catatAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'NONAKTIFKAN_AKUN', reason: 'Melanggar aturan' })
    )
  })

  it('melindungi akun sendiri dan akun Admin Utama lain', async () => {
    sesi('ADMIN_UTAMA')
    mocks.userFindUnique.mockResolvedValueOnce({
      id: 'utama-1',
      role: 'ADMIN_UTAMA',
      isActive: true,
    })
    expect(
      (await PATCH(
        permintaanPatch('utama-1', { isActive: false, alasan: 'x', otp: '123456' }),
        konteks('utama-1')
      )).status
    ).toBe(403)
    mocks.userFindUnique.mockResolvedValueOnce({
      id: 'utama-2',
      role: 'ADMIN_UTAMA',
      isActive: true,
    })
    expect(
      (await PATCH(
        permintaanPatch('utama-2', { role: 'ADMIN_BIASA', otp: '123456' }),
        konteks('utama-2')
      )).status
    ).toBe(403)
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })
})

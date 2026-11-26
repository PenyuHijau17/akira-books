import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tahap 14 — regresi keamanan endpoint /api/admin (GR-02, GR-04, GR-06, FR-ACC-004/007).
 * Handler diuji langsung dengan sesi & Prisma yang dimock, tanpa menyentuh data nyata.
 */
const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  generateOTP: vi.fn(() => '123456'),
  hashToken: vi.fn(() => 'hash-otp'),
  hashPassword: vi.fn(() => 'salt:derived'),
  kirimEmailKeTerminal: vi.fn(),
  catatAudit: vi.fn(async () => undefined),
  findMany: vi.fn(async () => []),
  findUnique: vi.fn(),
  update: vi.fn(async () => ({})),
  create: vi.fn(async () => ({})),
  delete: vi.fn(async () => ({})),
  hapusSesi: vi.fn(async () => ({ count: 0 })),
  otpFindFirst: vi.fn(),
  otpCreate: vi.fn(async () => ({})),
  otpUpdate: vi.fn(async () => ({})),
  otpUpdateMany: vi.fn(async () => ({ count: 1 })),
  transaction: vi.fn(),
}))

const client: any = {
  $transaction: (...args: any[]) => mocks.transaction(...args),
  user: {
    findMany: mocks.findMany,
    findUnique: mocks.findUnique,
    update: mocks.update,
    create: mocks.create,
    delete: mocks.delete,
  },
  session: { deleteMany: mocks.hapusSesi },
  otpAndRecoveryToken: {
    findFirst: mocks.otpFindFirst,
    create: mocks.otpCreate,
    update: mocks.otpUpdate,
    updateMany: mocks.otpUpdateMany,
  },
}

vi.mock('@/lib/auth', () => ({
  getSessionUser: mocks.getSessionUser,
  generateOTP: mocks.generateOTP,
  hashToken: mocks.hashToken,
  hashPassword: mocks.hashPassword,
  kirimEmailKeTerminal: mocks.kirimEmailKeTerminal,
}))

vi.mock('@/lib/prisma', () => ({ default: () => client }))

vi.mock('@/lib/pembayaranServer', () => ({ catatAudit: mocks.catatAudit }))

import { GET, POST } from '@/app/api/admin/route'

const permintaanGet = new Request('http://localhost/api/admin')

function permintaanPost(body: unknown) {
  return new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function sesi(role: string | null) {
  mocks.getSessionUser.mockResolvedValue(
    role
      ? { id: 'admin-uji', email: 'admin@example.test', name: 'Admin Uji', role, isActive: true }
      : null
  )
}

function otpValid() {
  mocks.otpFindFirst.mockResolvedValue({
    id: 'otp-uji',
    codeHash: 'hash-otp',
    failedAttempts: 0,
    expiresAt: new Date(Date.now() + 4 * 60 * 1000),
  })
}

describe('Tahap 14 — otorisasi endpoint pengelolaan akun', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockImplementation(async (fn: any) => fn(client))
    mocks.findUnique.mockImplementation(async (args: any) => {
      // Pengecekan email saat membuat admin harus menganggap email baru tersedia.
      if (args?.where?.email) return null
      return {
        id: 'target-uji',
        email: 'target@example.test',
        role: 'CUSTOMER',
        isActive: true,
      }
    })
    mocks.update.mockResolvedValue({ id: 'target-uji', isActive: false })
    mocks.create.mockResolvedValue({
      id: 'admin-baru',
      email: 'admin.biasa@example.test',
      name: 'Admin Baru',
      role: 'ADMIN_BIASA',
    })
    otpValid()
  })

  it('menolak GET tanpa sesi (401) dan bukan admin (403)', async () => {
    sesi(null)
    expect((await GET(permintaanGet)).status).toBe(401)
    expect(mocks.findMany).not.toHaveBeenCalled()

    sesi('CUSTOMER')
    expect((await GET(permintaanGet)).status).toBe(403)
    expect(mocks.findMany).not.toHaveBeenCalled()
  })

  it('mengizinkan Admin Biasa membaca daftar akun', async () => {
    sesi('ADMIN_BIASA')
    expect((await GET(permintaanGet)).status).toBe(200)
    expect(mocks.findMany).toHaveBeenCalledTimes(1)
  })

  it('menolak nonaktifkan user dari Customer dan Pengunjung', async () => {
    sesi('CUSTOMER')
    const respons = await POST(permintaanPost({ action: 'disable-user', targetUserId: 'target-uji', reason: 'x' }))
    expect(respons.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()

    sesi(null)
    const respons2 = await POST(permintaanPost({ action: 'disable-user', targetUserId: 'target-uji', reason: 'x' }))
    expect(respons2.status).toBe(401)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('mewajibkan alasan saat menonaktifkan Customer', async () => {
    sesi('ADMIN_BIASA')
    const respons = await POST(permintaanPost({ action: 'disable-user', targetUserId: 'target-uji' }))
    expect(respons.status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('mencabut sesi dan mencatat audit saat menonaktifkan Customer', async () => {
    sesi('ADMIN_BIASA')
    const respons = await POST(
      permintaanPost({ action: 'disable-user', targetUserId: 'target-uji', reason: 'Melanggar aturan' })
    )
    expect(respons.status).toBe(200)
    expect(mocks.hapusSesi).toHaveBeenCalledWith({ where: { userId: 'target-uji' } })
    expect(mocks.catatAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'NONAKTIFKAN_AKUN', targetEntity: 'User' })
    )
  })

  it('menolak perubahan pada Admin Utama (GR-04)', async () => {
    sesi('ADMIN_UTAMA')
    mocks.findUnique.mockResolvedValue({ id: 'utama', email: 'utama@example.test', role: 'ADMIN_UTAMA', isActive: true })
    const respons = await POST(
      permintaanPost({ action: 'disable-user', targetUserId: 'utama', reason: 'x' })
    )
    expect(respons.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('Admin Biasa tidak dapat membuat Admin Biasa lain', async () => {
    sesi('ADMIN_BIASA')
    const respons = await POST(
      permintaanPost({
        action: 'create-admin-biasa',
        email: 'admin.biasa@example.test',
        name: 'Admin Baru',
        password: 'rahasia123',
        otp: '123456',
      })
    )
    expect(respons.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('Admin Utama butuh OTP & kata sandi valid untuk membuat Admin Biasa', async () => {
    sesi('ADMIN_UTAMA')

    const tanpaOtp = await POST(
      permintaanPost({
        action: 'create-admin-biasa',
        email: 'admin.biasa@example.test',
        name: 'Admin Baru',
        password: 'rahasia123',
      })
    )
    expect(tanpaOtp.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()

    const sandiPendek = await POST(
      permintaanPost({
        action: 'create-admin-biasa',
        email: 'admin.biasa@example.test',
        name: 'Admin Baru',
        password: 'pendek',
        otp: '123456',
      })
    )
    expect(sandiPendek.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()

    const berhasil = await POST(
      permintaanPost({
        action: 'create-admin-biasa',
        email: 'admin.biasa@example.test',
        name: 'Admin Baru',
        password: 'rahasia123',
        otp: '123456',
      })
    )
    expect(berhasil.status).toBe(200)
    expect(mocks.hashPassword).toHaveBeenCalledWith('rahasia123')
    expect(mocks.catatAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'BUAT_ADMIN', targetEntity: 'User' })
    )
  })

  it('menghasilkan OTP pengelolaan akun hanya untuk Admin Utama', async () => {
    sesi('ADMIN_BIASA')
    expect((await POST(permintaanPost({ action: 'minta-otp' }))).status).toBe(403)
    expect(mocks.otpCreate).not.toHaveBeenCalled()

    // Tidak ada OTP aktif → Admin Utama boleh meminta OTP baru.
    mocks.otpFindFirst.mockResolvedValue(null)
    sesi('ADMIN_UTAMA')
    expect((await POST(permintaanPost({ action: 'minta-otp' }))).status).toBe(200)
    expect(mocks.otpCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'OTP_ADMIN' }),
      })
    )
    expect(mocks.kirimEmailKeTerminal).toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tahap 13 — isolasi akses endpoint backup: hanya Admin Utama (GR-02/GR-03).
 * Handler diuji langsung dengan sesi dan helper yang dimock, tanpa menyentuh data nyata.
 */
const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  validasiKredensial: vi.fn(() => true),
  daftarRiwayatBackup: vi.fn(async () => ({ daftar: [], ringkasan: {}, konfigurasi: {} })),
  jalankanBackup: vi.fn(async () => ({ id: 'backup-uji' })),
  mintaOtpBackup: vi.fn(async () => ({ pesan: 'OTP terkirim' })),
  konsumsiOtpBackup: vi.fn(async () => true),
  catatAudit: vi.fn(async () => undefined),
  findUnique: vi.fn(async () => ({ passwordHash: 'salt:hash' })),
  transaction: vi.fn(async (fn: any) => fn({})),
}))

vi.mock('@/lib/auth', () => ({
  getSessionUser: mocks.getSessionUser,
  validasiKredensial: mocks.validasiKredensial,
}))

vi.mock('@/lib/prisma', () => ({
  default: () => ({
    user: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  }),
}))

vi.mock('@/lib/backupServer', () => ({
  daftarRiwayatBackup: mocks.daftarRiwayatBackup,
  jalankanBackup: mocks.jalankanBackup,
  mintaOtpBackup: mocks.mintaOtpBackup,
  konsumsiOtpBackup: mocks.konsumsiOtpBackup,
}))

vi.mock('@/lib/pembayaranServer', () => ({ catatAudit: mocks.catatAudit }))

import { GET, POST } from '@/app/api/admin/backup/route'

const permintaan = new Request('http://localhost/api/admin/backup')

function sesi(role: string | null) {
  mocks.getSessionUser.mockResolvedValue(
    role ? { id: 'user-uji', email: 'uji@example.test', name: null, role, isActive: true } : null
  )
}

describe('Tahap 13 — isolasi endpoint backup per peran', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.validasiKredensial.mockReturnValue(true)
    mocks.konsumsiOtpBackup.mockResolvedValue(true)
  })

  it('menolak Pengunjung (401) dan peran bukan Admin Utama (403) pada GET', async () => {
    sesi(null)
    expect((await GET(permintaan)).status).toBe(401)
    expect(mocks.daftarRiwayatBackup).not.toHaveBeenCalled()

    sesi('CUSTOMER')
    expect((await GET(permintaan)).status).toBe(403)

    sesi('ADMIN_BIASA')
    expect((await GET(permintaan)).status).toBe(403)
    expect(mocks.daftarRiwayatBackup).not.toHaveBeenCalled()
  })

  it('mengizinkan Admin Utama membaca riwayat', async () => {
    sesi('ADMIN_UTAMA')
    const respons = await GET(permintaan)
    expect(respons.status).toBe(200)
    expect(mocks.daftarRiwayatBackup).toHaveBeenCalledTimes(1)
  })

  it('menolak backup manual dari Admin Biasa meski membawa kredensial lengkap', async () => {
    sesi('ADMIN_BIASA')
    const respons = await POST(
      new Request('http://localhost/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'jalankan', konfirmasi: 'YA', password: 'x', otp: '123456' }),
      })
    )
    expect(respons.status).toBe(403)
    expect(mocks.jalankanBackup).not.toHaveBeenCalled()
    expect(mocks.konsumsiOtpBackup).not.toHaveBeenCalled()
  })

  it('menolak permintaan OTP backup dari Customer', async () => {
    sesi('CUSTOMER')
    const respons = await POST(
      new Request('http://localhost/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'minta-otp' }),
      })
    )
    expect(respons.status).toBe(403)
    expect(mocks.mintaOtpBackup).not.toHaveBeenCalled()
  })

  it('Admin Utama dapat meminta OTP lalu menjalankan backup dengan konfirmasi sensitif', async () => {
    sesi('ADMIN_UTAMA')
    const permintaanOtp = new Request('http://localhost/api/admin/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'minta-otp' }),
    })
    expect((await POST(permintaanOtp)).status).toBe(200)
    expect(mocks.mintaOtpBackup).toHaveBeenCalled()

    const permintaanJalankan = new Request('http://localhost/api/admin/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'jalankan',
        konfirmasi: 'YA',
        password: 'rahasia',
        otp: '123456',
        keterangan: 'Sebelum go-live',
      }),
    })
    expect((await POST(permintaanJalankan)).status).toBe(200)
    expect(mocks.konsumsiOtpBackup).toHaveBeenCalledTimes(1)
    expect(mocks.jalankanBackup).toHaveBeenCalledWith(
      expect.objectContaining({ jenis: 'MANUAL', keterangan: 'Sebelum go-live' })
    )
  })

  it('menolak konfirmasi sensitif yang tidak lengkap', async () => {
    sesi('ADMIN_UTAMA')
    const respons = await POST(
      new Request('http://localhost/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'jalankan', konfirmasi: 'YA', password: '', otp: '123' }),
      })
    )
    expect(respons.status).toBe(400)
    expect(mocks.jalankanBackup).not.toHaveBeenCalled()
  })
})

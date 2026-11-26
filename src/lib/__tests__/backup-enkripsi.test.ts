import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { namaArsipBackup, validasiKunciPublikAge } from '@/lib/backup'

/**
 * Tahap 13 — enkripsi/dekripsi age nyata & integritas arsip.
 * Memakai biner age yang dipasang di Dockerfile (GR-01: tanpa layanan eksternal).
 */
describe('Tahap 13 — enkripsi & integritas arsip age (biner nyata)', () => {
  let direktori: string
  let kunciPrivat: string
  let kunciPublik: string

  beforeAll(async () => {
    direktori = await fs.mkdtemp(path.join(os.tmpdir(), 'akira-age-test-'))
    kunciPrivat = path.join(direktori, 'identity.txt')
    execFileSync('age-keygen', ['-o', kunciPrivat])
    kunciPublik = execFileSync('age-keygen', ['-y', kunciPrivat], { encoding: 'utf8' }).trim()
  })

  afterAll(async () => {
    await fs.rm(direktori, { recursive: true, force: true })
  })

  it('menghasilkan kunci publik age1 yang diterima aplikasi', () => {
    expect(kunciPublik.startsWith('age1')).toBe(true)
    expect(validasiKunciPublikAge(kunciPublik)).toEqual({ valid: true, alasan: null })
    expect(validasiKunciPublikAge('').valid).toBe(false)
    expect(validasiKunciPublikAge('kunci-rahasia').valid).toBe(false)
  })

  it('nama arsip deterministik, unik per jenis, dan tidak memuat kunci', () => {
    const waktu = new Date('2026-11-29T02:00:00.000Z')
    const nama = namaArsipBackup('HARIAN', waktu)
    expect(nama).toBe('akira-backup-20261129T020000Z-harian.tar.gz.age')
    expect(namaArsipBackup('MANUAL', waktu)).toContain('-manual.tar.gz.age')
    expect(nama).not.toContain(kunciPublik)
  })

  it('mendekripsi arsip dengan kunci privat dan menjaga checksum payload', async () => {
    const asli = path.join(direktori, 'isi.txt')
    const terenkripsi = path.join(direktori, 'arsip.age')
    const hasilDekripsi = path.join(direktori, 'hasil.txt')
    const isi = Buffer.from(' Akira Books — dump database + media uji restore\n'.repeat(64))
    await fs.writeFile(asli, isi)

    execFileSync('age', ['-r', kunciPublik, '-o', terenkripsi, asli])
    expect(validasiKunciPublikAge(kunciPublik).valid).toBe(true)

    const arsip = await fs.readFile(terenkripsi)
    expect(arsip.subarray(0, 21).toString()).toContain('age-encryption.org/v1')

    execFileSync('age', ['-d', '-i', kunciPrivat, '-o', hasilDekripsi, terenkripsi])
    const dipulihkan = await fs.readFile(hasilDekripsi)
    expect(dipulihkan.equals(isi)).toBe(true)
    expect(createHash('sha256').update(dipulihkan).digest('hex')).toBe(
      createHash('sha256').update(isi).digest('hex')
    )
  })

  it('menolak arsip yang dimodifikasi (integritas rusak)', async () => {
    const asli = path.join(direktori, 'isi-rusak.txt')
    const terenkripsi = path.join(direktori, 'arsip-rusak.age')
    const hasilDekripsi = path.join(direktori, 'hasil-rusak.txt')
    await fs.writeFile(asli, 'data uji integritas')

    execFileSync('age', ['-r', kunciPublik, '-o', terenkripsi, asli])
    const isi = await fs.readFile(terenkripsi)
    isi[isi.length - 1] = isi[isi.length - 1] === 0 ? 1 : 0
    await fs.writeFile(terenkripsi, isi)

    expect(() =>
      execFileSync('age', ['-d', '-i', kunciPrivat, '-o', hasilDekripsi, terenkripsi], {
        stdio: 'pipe',
      })
    ).toThrow()
  })
})

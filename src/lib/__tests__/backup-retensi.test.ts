import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '@/lib/prisma'
import {
  apakahKedaluwarsa,
  daftarKedaluwarsa,
  ringkasanRetensi,
  RETENSI_HARI_DEFAULT,
  sudahWaktunyaBackupHarian,
} from '@/lib/backup'
import { bersihkanArsipKedaluwarsa } from '@/lib/backupServer'

/** Tahap 13 — kebijakan retensi 30 hari (murni + database nyata, GR-10). */
describe('Tahap 13 — retensi 30 hari', () => {
  it('menghitung batas 30 hari dengan tepat', () => {
    const sekarang = new Date('2026-11-29T02:00:00.000Z')
    const hariKe29 = new Date(sekarang.getTime() - 29 * 24 * 60 * 60 * 1000)
    const hariKe30 = new Date(sekarang.getTime() - 30 * 24 * 60 * 60 * 1000)
    const hariKe31 = new Date(sekarang.getTime() - 31 * 24 * 60 * 60 * 1000)

    expect(RETENSI_HARI_DEFAULT).toBe(30)
    expect(apakahKedaluwarsa(hariKe29, sekarang)).toBe(false)
    expect(apakahKedaluwarsa(hariKe30, sekarang)).toBe(true)
    expect(apakahKedaluwarsa(hariKe31, sekarang)).toBe(true)
  })

  it('tidak memilih arsip yang sudah ditandai DIHAPUS', () => {
    const sekarang = new Date('2026-11-29T02:00:00.000Z')
    const lama = new Date(sekarang.getTime() - 40 * 24 * 60 * 60 * 1000)
    const daftar = [
      { namaFile: 'a.age', dibuatPada: lama, status: 'BERHASIL' },
      { namaFile: 'b.age', dibuatPada: lama, status: 'DIHAPUS' },
      { namaFile: 'c.age', dibuatPada: sekarang, status: 'BERHASIL' },
    ]

    expect(daftarKedaluwarsa(daftar, sekarang).map((x) => x.namaFile)).toEqual(['a.age'])
    const ringkasan = ringkasanRetensi(daftar, sekarang)
    expect(ringkasan.total).toBe(3)
    expect(ringkasan.tersimpan).toBe(1)
    expect(ringkasan.kedaluwarsa).toBe(1)
    expect(ringkasan.sudahDihapus).toBe(1)
  })

  it('menentukan jadwal backup harian sekali per hari WIB', () => {
    const sebelumJam = new Date('2026-11-28T17:59:00.000Z') // 00.59 WIB
    const sesudahJam = new Date('2026-11-28T18:00:00.000Z') // 01.00 WIB
    expect(sudahWaktunyaBackupHarian({ sekarang: sebelumJam, jamWIB: '01:00' })).toBe(false)
    expect(sudahWaktunyaBackupHarian({ sekarang: sesudahJam, jamWIB: '01:00' })).toBe(true)
    expect(
      sudahWaktunyaBackupHarian({
        sekarang: sesudahJam,
        jamWIB: '01:00',
        backupBerhasilTerakhirPada: sesudahJam,
      })
    ).toBe(false)
  })
})

describe('Tahap 13 — pembersihan arsip nyata (database nyata)', () => {
  let direktori: string
  let idLama: string
  let idBaru: string
  const unik = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const namaLama = `uji-retensi-lama-${unik}.age`
  const namaBaru = `uji-retensi-baru-${unik}.age`
  const direktoriArsipLama = process.env.AKIRA_BACKUP_DIR

  beforeAll(async () => {
    direktori = await fs.mkdtemp(path.join(os.tmpdir(), 'akira-retensi-'))
    process.env.AKIRA_BACKUP_DIR = direktori
    await fs.writeFile(path.join(direktori, namaLama), 'arsip lama')
    await fs.writeFile(path.join(direktori, namaBaru), 'arsip baru')

    const db = prisma()
    const sekarang = Date.now()
    const lama = await db.backupArsip.create({
      data: {
        namaFile: namaLama,
        ukuranByte: 10,
        jenis: 'HARIAN',
        status: 'BERHASIL',
        createdAt: new Date(sekarang - 31 * 24 * 60 * 60 * 1000),
      },
    })
    const baru = await db.backupArsip.create({
      data: {
        namaFile: namaBaru,
        ukuranByte: 10,
        jenis: 'HARIAN',
        status: 'BERHASIL',
        createdAt: new Date(sekarang),
      },
    })
    idLama = lama.id
    idBaru = baru.id
  })

  afterAll(async () => {
    const db = prisma()
    await db.backupArsip.deleteMany({ where: { id: { in: [idLama, idBaru] } } })
    await fs.rm(direktori, { recursive: true, force: true })
    if (direktoriArsipLama === undefined) delete process.env.AKIRA_BACKUP_DIR
    else process.env.AKIRA_BACKUP_DIR = direktoriArsipLama
  })

  it('menghapus berkas > 30 hari dan mencatat audit append-only (GR-06)', async () => {
    const db = prisma()
    const auditSebelum = await db.adminAuditLog.count({
      where: { action: 'BACKUP_RETENSI_DIHAPUS' },
    })

    const hasil = await bersihkanArsipKedaluwarsa({ sekarang: new Date() })

    expect(hasil.namaFile).toContain(namaLama)
    expect(hasil.dihapus).toBeGreaterThanOrEqual(1)
    await expect(fs.access(path.join(direktori, namaLama))).rejects.toThrow()
    await expect(fs.access(path.join(direktori, namaBaru))).resolves.toBeUndefined()

    const rekamanLama = await db.backupArsip.findUniqueOrThrow({ where: { id: idLama } })
    const rekamanBaru = await db.backupArsip.findUniqueOrThrow({ where: { id: idBaru } })
    expect(rekamanLama.status).toBe('DIHAPUS')
    expect(rekamanLama.dihapusPada).not.toBeNull()
    expect(rekamanBaru.status).toBe('BERHASIL')

    const auditSesudah = await db.adminAuditLog.count({
      where: { action: 'BACKUP_RETENSI_DIHAPUS' },
    })
    expect(auditSesudah).toBeGreaterThan(auditSebelum)
  }, 60000)
})

// src/lib/backupServer.ts
// Tahap 13 — eksekusi backup nyata: pg_dump + direktori media → tar.gz → age.
// Semua akses database memakai prisma() (Prisma 7 adapter). Kunci privat tidak pernah
// dibaca/disimpan aplikasi; pemilik toko menyimpannya terpisah (NFR-04).

import { execFile } from 'child_process'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { promisify } from 'util'
import prisma from '@/lib/prisma'
import { catatAudit } from '@/lib/pembayaranServer'
import { generateOTP, hashToken, kirimEmailKeTerminal } from '@/lib/auth'
import {
  apakahKedaluwarsa,
  daftarKedaluwarsa,
  formatUkuranByte,
  JAM_BACKUP_HARIAN_DEFAULT,
  namaArsipBackup,
  RETENSI_HARI_DEFAULT,
  ringkasanRetensi,
  sudahWaktunyaBackupHarian,
  validasiKunciPublikAge,
  type JenisBackup,
} from '@/lib/backup'

const jalankanPerintah = promisify(execFile)
const MASA_BERLAKU_OTP = 5 * 60 * 1000

export type KonfigurasiBackup = {
  direktoriArsip: string
  direktoriMedia: string
  publicKeyTersedia: boolean
  jamWIB: string
  retensiHari: number
}

export function konfigurasiBackup(): KonfigurasiBackup {
  return {
    direktoriArsip:
      process.env.AKIRA_BACKUP_DIR || path.join(process.cwd(), 'backup-arsip'),
    direktoriMedia:
      process.env.AKIRA_BACKUP_MEDIA_DIR || path.join(process.cwd(), 'storage'),
    publicKeyTersedia: validasiKunciPublikAge(process.env.AKIRA_BACKUP_AGE_PUBLIC_KEY).valid,
    jamWIB: process.env.AKIRA_BACKUP_JAM_WIB || JAM_BACKUP_HARIAN_DEFAULT,
    retensiHari: Number(process.env.AKIRA_BACKUP_RETENSI_HARI || RETENSI_HARI_DEFAULT),
  }
}

/** Ubah URL Prisma menjadi argumen libpq; kata sandi tidak pernah masuk ke argumen/LOG. */
function opsiKoneksiPg(databaseUrl: string): {
  env: NodeJS.ProcessEnv
  args: string[]
} {
  const url = new URL(databaseUrl)
  return {
    env: {
      ...process.env,
      PGPASSWORD: decodeURIComponent(url.password || ''),
      PGCONNECT_TIMEOUT: '15',
    },
    args: [
      '-h',
      url.hostname,
      '-p',
      url.port || '5432',
      '-U',
      decodeURIComponent(url.username || ''),
      '-d',
      decodeURIComponent(url.pathname.replace(/^\//, '')),
    ],
  }
}

async function sham256(pathBerkas: string): Promise<string> {
  const { createReadStream } = await import('fs')
  const hash = createHash('sha256')
  for await (const potongan of createReadStream(pathBerkas)) hash.update(potongan as Buffer)
  return hash.digest('hex')
}

export type HasilBackup = {
  id: string
  namaFile: string
  jenis: JenisBackup
  ukuranByte: number
  checksumSha256: string
  dibuatPada: string
}

export type ParameterBackup = {
  jenis: JenisBackup
  dibuatOlehId?: string | null
  keterangan?: string | null
  sekarang?: Date
}

/**
 * Jalankan satu backup lengkap. Arsip akhir hanya berisi hasil terenkripsi;
 * berkas sementara (dump & tar plaintext) dihapus dalam blok finally.
 */
export async function jalankanBackup(params: ParameterBackup): Promise<HasilBackup> {
  const sekarang = params.sekarang ?? new Date()
  const kunci = process.env.AKIRA_BACKUP_AGE_PUBLIC_KEY
  const cekKunci = validasiKunciPublikAge(kunci)
  if (!cekKunci.valid) throw new Error(cekKunci.alasan || 'Kunci publik age tidak valid')

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL belum diatur')

  const konfigurasi = konfigurasiBackup()
  const namaFile = namaArsipBackup(params.jenis, sekarang)
  await fs.mkdir(konfigurasi.direktoriArsip, { recursive: true })
  await fs.mkdir(konfigurasi.direktoriMedia, { recursive: true })

  const sementara = path.join(
    konfigurasi.direktoriArsip,
    `.sementara-${sekarang.getTime()}-${Math.random().toString(36).slice(2, 8)}`
  )
  const konten = path.join(sementara, 'konten')
  const keluaran = path.join(/* turbopackIgnore: true */ konfigurasi.direktoriArsip, namaFile)

  try {
    await fs.mkdir(konten, { recursive: true })

    const { env, args } = opsiKoneksiPg(databaseUrl)
    await jalankanPerintah('pg_dump', [...args, '-Fc', '-f', path.join(konten, 'database.dump')], {
      env,
      maxBuffer: 16 * 1024 * 1024,
    })

    await jalankanPerintah('tar', ['-czf', path.join(konten, 'media.tar.gz'), '-C', konfigurasi.direktoriMedia, '.'])

    const manifest = {
      versi: 1,
      aplikasi: 'Akira Books',
      dibuatPada: sekarang.toISOString(),
      jenis: params.jenis,
      konfigurasi: {
        database: 'database.dump (pg_dump custom format)',
        media: 'media.tar.gz (seluruh direktori media/upload)',
      },
    }
    await fs.writeFile(path.join(konten, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

    const tarGabungan = path.join(sementara, 'gabungan.tar.gz')
    await jalankanPerintah('tar', ['-czf', tarGabungan, '-C', konten, '.'])
    await jalankanPerintah('age', ['-r', String(kunci).trim(), '-o', keluaran, tarGabungan])

    const stat = await fs.stat(/* turbopackIgnore: true */ keluaran)
    const checksum = await sham256(keluaran)
    const db = prisma()
    const rekaman = await db.backupArsip.create({
      data: {
        namaFile,
        ukuranByte: stat.size,
        jenis: params.jenis,
        status: 'BERHASIL',
        checksumSha256: checksum,
        dibuatOlehId: params.dibuatOlehId ?? null,
        keterangan: params.keterangan?.slice(0, 300) || null,
        createdAt: sekarang,
      },
    })

    await catatAudit({
      actorId: params.dibuatOlehId || 'SYSTEM',
      actorRole: params.dibuatOlehId ? 'ADMIN_UTAMA' : 'SYSTEM',
      action: params.jenis === 'MANUAL' ? 'BACKUP_MANUAL' : 'BACKUP_HARIAN',
      targetEntity: 'BackupArsip',
      targetId: rekaman.id,
      oldValue: {},
      newValue: {
        namaFile,
        ukuranByte: stat.size,
        jenis: params.jenis,
        checksumSha256: checksum,
      },
      reason: params.keterangan || `Backup ${params.jenis.toLowerCase()} Akira Books`,
    })

    await bersihkanArsipKedaluwarsa({
      sekarang,
      actorId: params.dibuatOlehId || 'SYSTEM',
      aktorPeran: params.dibuatOlehId ? 'ADMIN_UTAMA' : 'SYSTEM',
    })

    return {
      id: rekaman.id,
      namaFile,
      jenis: params.jenis,
      ukuranByte: stat.size,
      checksumSha256: checksum,
      dibuatPada: sekarang.toISOString(),
    }
  } catch (error) {
    const pesan = String((error as Error)?.message || 'Gagal membuat backup')
    try {
      const db = prisma()
      const gagal = await db.backupArsip.create({
        data: {
          namaFile: `${namaFile}.gagal`,
          ukuranByte: 0,
          jenis: params.jenis,
          status: 'GAGAL',
          dibuatOlehId: params.dibuatOlehId ?? null,
          keterangan: pesan.slice(0, 300),
          createdAt: sekarang,
        },
      })
      await catatAudit({
        actorId: params.dibuatOlehId || 'SYSTEM',
        actorRole: params.dibuatOlehId ? 'ADMIN_UTAMA' : 'SYSTEM',
        action: 'BACKUP_GAGAL',
        targetEntity: 'BackupArsip',
        targetId: gagal.id,
        oldValue: {},
        newValue: { namaFile, alasan: pesan.slice(0, 300) },
        reason: 'Backup gagal dibuat',
      })
    } catch (auditError) {
      console.error('[BACKUP] gagal mencatat kegagalan:', auditError)
    }
    throw new Error(pesan)
  } finally {
    await fs.rm(sementara, { recursive: true, force: true }).catch(() => undefined)
  }
}

export type HasilPembersihan = {
  diperiksa: number
  dihapus: number
  gagal: number
  namaFile: string[]
}

/** Hapus arsip lebih tua dari retensi; riwayat tetap tersimpan dengan status DIHAPUS. */
export async function bersihkanArsipKedaluwarsa(params: {
  sekarang?: Date
  actorId?: string
  aktorPeran?: string
} = {}): Promise<HasilPembersihan> {
  const sekarang = params.sekarang ?? new Date()
  const konfigurasi = konfigurasiBackup()
  const db = prisma()
  const daftar = await db.backupArsip.findMany({
    where: { status: { in: ['BERHASIL', 'GAGAL'] } },
    orderBy: { createdAt: 'asc' },
  })
  const kedaluwarsa = daftarKedaluwarsa(
    daftar.map((item: any) => ({
      namaFile: String(item.namaFile),
      dibuatPada: new Date(item.createdAt),
      status: String(item.status),
    })),
    sekarang,
    konfigurasi.retensiHari
  )

  const hasil: HasilPembersihan = {
    diperiksa: daftar.length,
    dihapus: 0,
    gagal: 0,
    namaFile: [],
  }

  for (const item of kedaluwarsa) {
    const rekaman = daftar.find((baris: any) => baris.namaFile === item.namaFile)
    if (!rekaman) continue
    try {
      await fs.unlink(path.join(/* turbopackIgnore: true */ konfigurasi.direktoriArsip, item.namaFile)).catch((error: any) => {
        if (error?.code !== 'ENOENT') throw error
      })
      await db.backupArsip.update({
        where: { id: rekaman.id },
        data: { status: 'DIHAPUS', dihapusPada: sekarang },
      })
      await catatAudit({
        actorId: params.actorId || 'SYSTEM',
        actorRole: params.aktorPeran || 'SYSTEM',
        action: 'BACKUP_RETENSI_DIHAPUS',
        targetEntity: 'BackupArsip',
        targetId: rekaman.id,
        oldValue: { status: 'BERHASIL', namaFile: item.namaFile },
        newValue: { status: 'DIHAPUS', dihapusPada: sekarang.toISOString() },
        reason: `Retensi ${konfigurasi.retensiHari} hari`,
      })
      hasil.dihapus += 1
      hasil.namaFile.push(item.namaFile)
    } catch (error) {
      console.error('[BACKUP] gagal membersihkan arsip:', item.namaFile, error)
      hasil.gagal += 1
    }
  }

  return hasil
}

export type RiwayatBackup = {
  id: string
  namaFile: string
  ukuranByte: number
  ukuranTampil: string
  jenis: JenisBackup
  status: string
  checksumSha256: string | null
  keterangan: string | null
  dibuatPada: string
  dihapusPada: string | null
  kedaluwarsa: boolean
  dibuatOleh: string | null
}

export async function daftarRiwayatBackup(sekarang: Date = new Date()): Promise<{
  daftar: RiwayatBackup[]
  ringkasan: ReturnType<typeof ringkasanRetensi>
  konfigurasi: KonfigurasiBackup
}> {
  const db = prisma()
  const konfigurasi = konfigurasiBackup()
  const baris = await db.backupArsip.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const daftar: RiwayatBackup[] = baris.map((item: any) => ({
    id: item.id,
    namaFile: item.namaFile,
    ukuranByte: item.ukuranByte,
    ukuranTampil: formatUkuranByte(item.ukuranByte),
    jenis: item.jenis as JenisBackup,
    status: item.status,
    checksumSha256: item.checksumSha256,
    keterangan: item.keterangan,
    dibuatPada: new Date(item.createdAt).toISOString(),
    dihapusPada: item.dihapusPada ? new Date(item.dihapusPada).toISOString() : null,
    kedaluwarsa:
      item.status !== 'DIHAPUS' &&
      apakahKedaluwarsa(new Date(item.createdAt), sekarang, konfigurasi.retensiHari),
    dibuatOleh: item.dibuatOlehId ? 'Admin Utama' : 'Sistem',
  }))

  return {
    daftar,
    ringkasan: ringkasanRetensi(
      daftar.map((item) => ({
        namaFile: item.namaFile,
        dibuatPada: new Date(item.dibuatPada),
        status: item.status,
      })),
      sekarang,
      konfigurasi.retensiHari
    ),
    konfigurasi,
  }
}

/** Backup harian: sekali per hari WIB, berdasarkan riwayat BERHASIL di database. */
export async function jalankanBackupHarian(sekarang: Date = new Date()): Promise<HasilBackup | null> {
  const konfigurasi = konfigurasiBackup()
  const db = prisma()
  const terakhir = await db.backupArsip.findFirst({
    where: { jenis: 'HARIAN', status: 'BERHASIL' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  const perlu = sudahWaktunyaBackupHarian({
    sekarang,
    jamWIB: konfigurasi.jamWIB,
    backupBerhasilTerakhirPada: terakhir?.createdAt ?? null,
  })
  if (!perlu) return null
  return jalankanBackup({ jenis: 'HARIAN', sekarang, keterangan: 'Backup otomatis harian' })
}

/** OTP tindakan sensitif khusus backup (terpisah dari OTP QRIS). */
export async function mintaOtpBackup(params: {
  userId: string
  email: string
  sekarang?: Date
}): Promise<{ pesan: string }> {
  const sekarang = params.sekarang ?? new Date()
  const db = prisma()
  const aktif = await db.otpAndRecoveryToken.findFirst({
    where: {
      userId: params.userId,
      type: 'OTP_BACKUP',
      usedAt: null,
      expiresAt: { gt: sekarang },
    },
    orderBy: { expiresAt: 'desc' },
  })
  if (aktif && aktif.expiresAt.getTime() - sekarang.getTime() > 60_000) {
    throw new Error('OTP masih berlaku. Tunggu maksimal 1 menit sebelum meminta ulang.')
  }

  const otp = generateOTP()
  await db.otpAndRecoveryToken.create({
    data: {
      userId: params.userId,
      userUserId: params.userId,
      codeHash: hashToken(otp),
      type: 'OTP_BACKUP',
      failedAttempts: 0,
      expiresAt: new Date(sekarang.getTime() + MASA_BERLAKU_OTP),
    },
  })
  kirimEmailKeTerminal(
    params.email,
    'OTP Backup Manual Akira Books',
    `Kode OTP: ${otp}. Berlaku 5 menit. Jangan bagikan kepada pihak lain.`
  )
  return { pesan: 'OTP dikirim ke terminal server dan berlaku selama 5 menit.' }
}

/** Konsumsi OTP sekali pakai di dalam transaksi yang sama dengan backup (anti-replay). */
export async function konsumsiOtpBackup(params: {
  userId: string
  otp: string
  sekarang?: Date
  client?: any
}): Promise<boolean> {
  const sekarang = params.sekarang ?? new Date()
  const db = params.client ?? prisma()
  const rekaman = await db.otpAndRecoveryToken.findFirst({
    where: {
      userId: params.userId,
      type: 'OTP_BACKUP',
      usedAt: null,
      expiresAt: { gt: sekarang },
    },
    orderBy: { expiresAt: 'desc' },
  })

  if (!rekaman || rekaman.codeHash !== hashToken(String(params.otp || ''))) {
    if (rekaman) {
      const gagal = rekaman.failedAttempts + 1
      await db.otpAndRecoveryToken.update({
        where: { id: rekaman.id },
        data: { failedAttempts: gagal, ...(gagal >= 5 ? { usedAt: sekarang } : {}) },
      })
    }
    return false
  }

  const dikonsumsi = await db.otpAndRecoveryToken.updateMany({
    where: { id: rekaman.id, usedAt: null },
    data: { usedAt: sekarang },
  })
  return dikonsumsi.count === 1
}

// src/lib/auth.ts
// Helper otorisasi server-side untuk 4 peran: Pengunjung, Customer, Admin Biasa, Admin Utama
// Semua validasi hak akses divalidasi di server (GR-02, BR-002)

import crypto from 'crypto'
import prisma from '@/lib/prisma'

// Nama cookie sesi yang dipakai bersama oleh route auth & route lain
export const SESSION_COOKIE = 'akira_session'

// ==========================================
// Rate limit (in-memory, sederhana)
// ==========================================
const rateLimitCache = new Map<string, number>()

// Fungsi rate limit
export function cekRateLimitLogin(ip: string): { terlaluCepat: boolean; sisaMenit: number } {
  const now = Date.now()
  const cooldown = 60_000 // 1 menit
  const last = rateLimitCache.get(ip) || 0
  if (now - last < cooldown) {
    const sisaMenit = Math.ceil((cooldown - (now - last)) / 60000)
    return { terlaluCepat: true, sisaMenit }
  }
  rateLimitCache.set(ip, now)
  return { terlaluCepat: false, sisaMenit: 0 }
}

/// <summary>
/// Abstraksi layanan email ke terminal server
/// sesuai OD-04 (email ke terminal, tanpa layanan eksternal)
/// </summary>
export function kirimEmailKeTerminal(to: string, subject: string, body: string) {
  console.log('[EMAIL]', to, subject, body)
}

/// <summary>
/// Generate OTP 6 digit dengan sumber acak kriptografis (FR-ACC-004).
/// </summary>
export function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

/// <summary>
/// Validasi kredensial (delegasi ke verifyPassword)
/// </summary>
export async function validasiKredensial(password: string, hash: string): Promise<boolean> {
  return verifyPassword(password, hash)
}

/// <summary>
/// Proses lupa password via API
/// </summary>
export async function lupaPassword(email: string): Promise<{ success: boolean; error: string | null }> {
  return { success: true, error: null }
}

// ==========================================
// Hashing kata sandi (scrypt) — server-side only
// Format tersimpan: "<salt-hex>:<derived-hex>"
// ==========================================
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const derived = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

/// <summary>
/// Verify password against stored hash
/// </summary>
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':')
  if (parts.length !== 2) return false
  const [salt, expected] = parts
  if (!salt || !expected) return false

  const actual = crypto.scryptSync(password, salt, 64)
  let expectedBuf: Buffer
  try {
    expectedBuf = Buffer.from(expected, 'hex')
  } catch {
    return false
  }
  if (expectedBuf.length !== actual.length) return false
  return crypto.timingSafeEqual(actual, expectedBuf)
}

// ==========================================
// Sesi (cookie httpOnly + token di database)
// ==========================================
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Ambil token sesi dari header Cookie pada Request
export function parseSessionToken(request: Request): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null

  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    if (key === SESSION_COOKIE) {
      return decodeURIComponent(trimmed.slice(eq + 1))
    }
  }
  return null
}

export type SessionUser = {
  id: string
  email: string
  name: string | null
  whatsapp: string | null
  role: 'PENGUNGGUNG' | 'CUSTOMER' | 'ADMIN_BIASA' | 'ADMIN_UTAMA'
  isActive: boolean
}

/**
 * Ambil user yang sedang login dari cookie sesi (validasi server-side, GR-02).
 * Mengembalikan null jika tidak ada sesi / sesi kedaluwarsa / akun nonaktif.
 */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = parseSessionToken(request)
  if (!token) return null

  const client = prisma()

  const session = await client.session.findUnique({
    where: { tokenHash: hashToken(token) },
  })

  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) return null

  const user = await client.user.findUnique({
    where: { id: session.userId },
  })

  if (!user || !user.isActive) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    whatsapp: user.whatsapp,
    role: user.role as SessionUser['role'],
    isActive: user.isActive,
  }
}

/**
 * Ambil peran user dari sesi, atau null jika belum login.
 */
export async function getUserRoleFromSession(
  request: Request
): Promise<SessionUser['role'] | null> {
  const user = await getSessionUser(request)
  return user ? user.role : null
}

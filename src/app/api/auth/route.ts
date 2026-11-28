import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashToken,
  parseSessionToken,
  getSessionUser,
} from '@/lib/auth'
import { tentukanTujuanSetelahLogin } from '@/lib/admin-dashboard'

const SESSION_DAYS = 7

// Rate limit percobaan login (in-memory)
const loginAttemptCache = new Map<string, number>()
const LOGIN_COOLDOWN_MS = 60_000

// GET /api/auth — ambil user yang sedang login (atau { user: null })
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'rate-limit') {
      const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
      const now = Date.now()
      const lastAttempt = loginAttemptCache.get(ip) || 0

      if (now - lastAttempt < LOGIN_COOLDOWN_MS) {
        const sisaMenit = Math.ceil((LOGIN_COOLDOWN_MS - (now - lastAttempt)) / 60000)
        return NextResponse.json({ terlaluCepat: true, sisaMenit }, { status: 429 })
      }

      loginAttemptCache.set(ip, now)
      return NextResponse.json({ terlaluCepat: false, sisaMenit: 0 })
    }

    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        whatsapp: user.whatsapp,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role,
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching auth:', error)
    return NextResponse.json({ error: 'Gagal mengambil sesi' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    // ===== Register =====
    if (action === 'register') {
      const { nama, email, password } = body

      if (!nama || String(nama).trim().length === 0) {
        return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!email || !emailRegex.test(String(email).trim())) {
        return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 })
      }

      if (!password || String(password).length < 8) {
        return NextResponse.json(
          { error: 'Kata sandi minimal 8 karakter' },
          { status: 400 }
        )
      }

      const client = prisma()
      const emailBersih = String(email).trim().toLowerCase()

      const existingUser = await client.user.findUnique({
        where: { email: emailBersih },
      })

      if (existingUser) {
        return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })
      }

      const user = await client.user.create({
        data: {
          email: emailBersih,
          passwordHash: hashPassword(String(password)),
          name: String(nama).trim(),
          role: 'CUSTOMER',
          isActive: true,
        },
      })

      return NextResponse.json(
        {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl ?? null,
            role: user.role,
          },
        },
        { status: 201 }
      )
    }

    // ===== Login =====
    if (action === 'login') {
      const { email, password } = body

      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email dan kata sandi wajib diisi' },
          { status: 400 }
        )
      }

      // Rate limiting berbasis email + IP
      const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
      const rateKey = `login:${String(email).toLowerCase()}:${ip}`
      const now = Date.now()
      const last = loginAttemptCache.get(rateKey) || 0

      if (now - last < LOGIN_COOLDOWN_MS) {
        const sisaMenit = Math.ceil((LOGIN_COOLDOWN_MS - (now - last)) / 60000)
        return NextResponse.json(
          { error: `Terlalu banyak percobaan. Coba lagi dalam ${sisaMenit} menit.` },
          { status: 429 }
        )
      }

      const client = prisma()
      const user = await client.user.findUnique({
        where: { email: String(email).trim().toLowerCase() },
      })

      if (!user || !verifyPassword(String(password), user.passwordHash)) {
        loginAttemptCache.set(rateKey, now)
        return NextResponse.json({ error: 'Kredensial salah' }, { status: 401 })
      }

      if (!user.isActive) {
        return NextResponse.json({ error: 'Akun dinonaktifkan' }, { status: 401 })
      }

      // Hapus sesi lama milik user, lalu buat sesi baru
      await client.session.deleteMany({ where: { userId: user.id } })

      const token = generateSessionToken()
      const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

      await client.session.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt,
        },
      })

      const redirectUrl = tentukanTujuanSetelahLogin(user.role)

      const response = NextResponse.json(
        {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl ?? null,
            role: user.role,
          },
          redirectUrl,
        },
        { status: 200 }
      )

      response.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_DAYS * 24 * 60 * 60,
      })

      // Cookie peran untuk keperluan tampilan/middleware (bukan batas keamanan;
      // otorisasi sesungguhnya tetap divalidasi server-side di setiap API).
      response.cookies.set('userRole', user.role, {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_DAYS * 24 * 60 * 60,
      })

      loginAttemptCache.delete(rateKey)

      return response
    }

    // ===== Perbarui profil =====
    if (action === 'updateProfile') {
      const sessionUser = await getSessionUser(request)
      if (!sessionUser) {
        return NextResponse.json({ error: 'Silakan masuk terlebih dahulu' }, { status: 401 })
      }

      const { nama, whatsapp } = body
      if (!nama || String(nama).trim().length === 0) {
        return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
      }

      const updated = await prisma().user.update({
        where: { id: sessionUser.id },
        data: {
          name: String(nama).trim(),
          whatsapp: whatsapp ? String(whatsapp).trim() : null,
        },
      })

      return NextResponse.json({
        success: true,
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          whatsapp: updated.whatsapp,
          avatarUrl: updated.avatarUrl ?? null,
          role: updated.role,
        },
      })
    }

    // ===== Logout =====
    if (action === 'logout') {
      const token = parseSessionToken(request)

      if (token) {
        try {
          await prisma().session.deleteMany({
            where: { tokenHash: hashToken(token) },
          })
        } catch (err) {
          console.error('Gagal hapus sesi dari DB (non-fatal):', err)
        }
      }

      const response = NextResponse.json({ success: true })
      response.cookies.delete(SESSION_COOKIE)
      response.cookies.delete('userRole')
      return response
    }

    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Error auth POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

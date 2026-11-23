// src/app/api/admin/route.ts
// API Endpoint Pengelolaan Akun Admin
// GR-02, BR-005: Otorisasi server-side, Admin Utama tunggal

import { NextResponse } from 'next/server';

// Fungsi helper untuk Prisma Client (sesuai pattern di src/lib/prisma.ts)
function getPrisma() {
  // @ts-ignore - Prisma 7 memerlukan adapter di options tapi project ini
  // menggunakan data source dari environment variable yang terkonfigurasi di Docker
  const { PrismaClient } = require('@prisma/client');
  return new PrismaClient({ log: ['error', 'warn'] });
}

const prisma = getPrisma();

// GET: Daftar user berdasarkan role
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  const where: any = {};

  if (role) {
    where.role = role;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  return NextResponse.json({ users });
}

// POST: Operasi pengelolaan akun
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, targetUserId, reason } = body;

    if (!action || !['disable-user', 'enable-user', 'create-admin-biasa', 'delete-admin-biasa'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Aksi tidak valid' },
        { status: 400 }
      );
    }

    if (action === 'disable-user' || action === 'enable-user') {
      if (!targetUserId) {
        return NextResponse.json(
          { success: false, error: 'targetUserId wajib diisi' },
          { status: 400 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: 'User tidak ditemukan' },
          { status: 404 }
        );
      }

      const newIsActive = action === 'enable-user';

      await prisma.user.update({
        where: { id: targetUserId },
        data: { isActive: newIsActive, deactivationReason: reason || null },
      });

      return NextResponse.json({
        success: true,
        message: action === 'disable-user' ? 'Akun dinonaktifkan' : 'Akun diaktifkan kembali',
      });
    }

    if (action === 'create-admin-biasa') {
      const { email, name } = body;

      if (!email || !name) {
        return NextResponse.json(
          { success: false, error: 'Email dan nama wajib diisi' },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Email sudah terdaftar' },
          { status: 409 }
        );
      }

      const crypto = require('crypto');
      const salt = crypto.randomBytes(16).toString('hex');
      const derivedKey = crypto.scryptSync('password', salt, 64, { n: 16384, r: 8, p: 1 });
      const passwordHash = derivedKey.toString('hex');

      const adminBiasa = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'ADMIN_BIASA',
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Admin Biasa berhasil dibuat',
        user: {
          id: adminBiasa.id,
          email: adminBiasa.email,
          name: adminBiasa.name,
          role: adminBiasa.role,
        },
      });
    }

    if (action === 'delete-admin-biasa') {
      const { targetUserId } = body;

      if (!targetUserId) {
        return NextResponse.json(
          { success: false, error: 'targetUserId wajib diisi' },
          { status: 400 }
        );
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: 'User tidak ditemukan' },
          { status: 404 }
        );
      }

      if (targetUser.role === 'ADMIN_UTAMA') {
        return NextResponse.json(
          { success: false, error: 'Tidak dapat menghapus Admin Utama' },
          { status: 403 }
        );
      }

      await prisma.user.delete({
        where: { id: targetUserId },
      });

      return NextResponse.json({
        success: true,
        message: 'Admin Biasa berhasil dicabut',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Aksi tidak dikenali' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
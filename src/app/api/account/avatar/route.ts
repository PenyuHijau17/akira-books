// src/app/api/account/avatar/route.ts
// Foto profil milik sendiri: unggah/ganti/hapus. GR-02: sesi divalidasi server.
// Berkas disimpan lokal di public/uploads/avatars (tanpa layanan eksternal, GR-01).

import { NextResponse } from 'next/server'
import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { getSessionUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { berkasAvatarDariUrl, urlAvatar, validasiAvatar } from '@/lib/avatar'

const DIRECTORI = path.join(process.cwd(), 'public', 'uploads', 'avatars')

function gagal(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status })
}

async function hapusBerkas(url: string | null | undefined) {
  const nama = berkasAvatarDariUrl(url)
  if (!nama) return
  await unlink(path.join(DIRECTORI, nama)).catch(() => undefined)
}

export async function POST(request: Request) {
  try {
    const pengguna = await getSessionUser(request)
    if (!pengguna) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)

    const bentuk = await request.formData().catch(() => null)
    const berkas = bentuk?.get('file')
    if (!(berkas instanceof File))
      return gagal('Pilih foto profil terlebih dahulu.', 400)

    const bytes = new Uint8Array(await berkas.arrayBuffer())
    const cek = validasiAvatar({ size: berkas.size, type: berkas.type, bytes })
    if (!cek.valid || !cek.ekstensi)
      return gagal(cek.alasan || 'Foto profil tidak valid.', 400)

    const sebelum = await prisma().user.findUnique({
      where: { id: pengguna.id },
      select: { avatarUrl: true },
    })

    await mkdir(DIRECTORI, { recursive: true })
    const avatarBaru = urlAvatar(pengguna.id, cek.ekstensi)
    await writeFile(path.join(DIRECTORI, berkasAvatarDariUrl(avatarBaru)!), bytes)

    try {
      await prisma().user.update({
        where: { id: pengguna.id },
        data: { avatarUrl: avatarBaru },
      })
    } catch (error) {
      await hapusBerkas(avatarBaru)
      throw error
    }

    await hapusBerkas(sebelum?.avatarUrl)
    return NextResponse.json({ success: true, avatarUrl: avatarBaru })
  } catch (error) {
    console.error('Gagal menyimpan foto profil:', error)
    return gagal('Gagal menyimpan foto profil', 500)
  }
}

export async function DELETE(request: Request) {
  try {
    const pengguna = await getSessionUser(request)
    if (!pengguna) return gagal('Sesi tidak valid. Silakan masuk kembali.', 401)

    const sebelum = await prisma().user.findUnique({
      where: { id: pengguna.id },
      select: { avatarUrl: true },
    })
    await prisma().user.update({
      where: { id: pengguna.id },
      data: { avatarUrl: null },
    })
    await hapusBerkas(sebelum?.avatarUrl)

    return NextResponse.json({ success: true, avatarUrl: null })
  } catch (error) {
    console.error('Gagal menghapus foto profil:', error)
    return gagal('Gagal menghapus foto profil', 500)
  }
}

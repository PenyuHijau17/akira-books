// src/app/admin/pengguna/page.tsx
// Kelola Pengguna — halaman khusus Admin Utama. Otorisasi terjadi di server (GR-02).
// Next.js 16 Cache Components: halaman bergantung pada cookie sesi saat runtime.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import PanelPengguna from './PanelPengguna'

export const instant = false

export default async function HalamanKelolaPengguna() {
  const cookieStore = await cookies()
  const cookie = cookieStore
    .getAll()
    .map((item) => `${item.name}=${encodeURIComponent(item.value)}`)
    .join('; ')
  const permintaan = new Request('http://localhost/admin/pengguna', {
    headers: cookie ? { cookie } : {},
  })
  const pengguna = await getSessionUser(permintaan)

  if (!pengguna) redirect('/login?redirect=/admin/pengguna')
  if (pengguna.role !== 'ADMIN_UTAMA') redirect('/admin')

  return <PanelPengguna />
}

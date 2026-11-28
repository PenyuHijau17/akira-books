// src/app/admin/page.tsx
// Dashboard Utama Admin. Pengaman halaman dilakukan di server (GR-02):
// tanpa sesi → /login; peran bukan admin → /katalog.

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import DashboardKlien from './DashboardKlien'

// Next.js 16 Cache Components: halaman ini bergantung pada cookie sesi saat runtime.
export const instant = false

export default async function HalamanDashboardAdmin() {
  const cookieStore = await cookies()
  const cookie = cookieStore
    .getAll()
    .map((item) => `${item.name}=${encodeURIComponent(item.value)}`)
    .join('; ')
  const permintaan = new Request('http://localhost/admin', {
    headers: cookie ? { cookie } : {},
  })
  const pengguna = await getSessionUser(permintaan)

  if (!pengguna) redirect('/login?redirect=/admin')
  if (pengguna.role !== 'ADMIN_BIASA' && pengguna.role !== 'ADMIN_UTAMA') {
    redirect('/katalog')
  }

  return <DashboardKlien role={pengguna.role} />
}

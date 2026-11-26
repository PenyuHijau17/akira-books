// src/instrumentation.ts
// Menjalankan pekerjaan terjadwal pembayaran sekali per proses server (BR-025).
// Status pekerjaan disimpan di database, sehingga aman saat container di-restart.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { mulaiPenjadwalPembayaran } = await import('./lib/penjadwal')
    mulaiPenjadwalPembayaran()
  }
}

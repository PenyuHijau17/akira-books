// src/lib/timezone.ts
// Helper waktu WIB (Asia/Jakarta)
// Semua logika tenggat, validasi, dan audit menggunakan waktu server (BR-009)
// Tampilan antarmuka menggunakan zona waktu Asia/Jakarta (WIB) (BR-009, NFR-06)

// Konstanta zona waktu
export const ZONE_WIB = 'Asia/Jakarta';

// Konstanta tenggat default (24 jam sejak pesanan dibuat) (BR-009, BR-DUE-001)
export const TENGGAT_DEFAULT_MENIT = 24 * 60; // 1440 menit

// Konstanta pengingat 2 jam (BR-025)
export const PINGINGAT_2_JAM_MENIT = 2 * 60; // 120 menit

// Fungkonversi tanggal ke WIB
export function toWIB(date: Date | string | null | undefined): Date {
  const d = date ? new Date(date) : new Date();
  // Konversi ke WIB (GMT+7)
  const wib = new Date(d.getTime() + (7 * 60 * 60 * 1000));
  return wib;
}

// Format tanggal ke string WIB.
// Catatan: jangan menggeser dengan toWIB() sebelum memformat dengan timeZone Asia/Jakarta,
// karena akan terjadi penambahan +7 jam dua kali.
export function toWIBString(date: Date | string | null | undefined): string {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

// Hitung selisih menit antara dua tanggal dalam WIB
export function hitungSelisihMenit(dari: Date, ke: Date): number {
  const dariWIB = toWIB(dari);
  const keWIB = toWIB(ke);
  const selisihMenit = Math.floor((keWIB.getTime() - dariWIB.getTime()) / (1000 * 60));
  return selisihMenit;
}

// Cek apakah tanggal sudah lewat tenggat 24 jam (BR-009, BR-DUE-001)
export function cekTenggatLewati(tanggalDibuat: Date): boolean {
  const sekarang = toWIB(new Date());
  const tenggat = new Date(tanggalDibuat);
  tenggat.setMinutes(tenggat.getMinutes() + TENGGAT_DEFAULT_MENIT);
  return hitungSelisihMenit(tanggalDibuat, sekarang) >= TENGGAT_DEFAULT_MENIT;
}

// Cek apakah perlu pengingat 2 jam (BR-025)
export function cekPeringkat2Jam(tanggalDibuat: Date): boolean {
  const sekarang = toWIB(new Date());
  const selisihMenit = hitungSelisihMenit(tanggalDibuat, sekarang);
  return selisihMenit > 0 && selisihMenit <= PINGINGAT_2_JAM_MENIT;
}

// Format rupiah dengan format Indonesia
export function formatRupiah(angka: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
}

// Waktu server saat ini (dari database/container)
export const waktuServerWIB = () => new Date().toLocaleString('id-ID', {
  timeZone: 'Asia/Jakarta',
});
// src/lib/rbac.ts
// Helper otorisasi server-side untuk 4 peran pengguna:
// - Pengunjung (tidak login)
// - Customer (pelanggan)
// - Admin Biasa (operator toko)
// - Admin Utama (pemilik toko, satu-satunya)

// Type user role
export type RolePengguna =
  | 'PENGUNGGUNG' // Pengunjung umum, belum login
  | 'CUSTOMER'    // Pelanggan terautentikasi
  | 'ADMIN_BIASA' // Admin operasional (bisa banyak)
  | 'ADMIN_UTAMA' // Admin Utama (pemilik toko, satu-satunya);

// Matriks akses: peran vs operasi
// `L` = Lihat/Baca, `T` = Tindakan/Ubah
// Referensi: plans/01-requirements.md §3 - Matriks Hak Akses RBAC
export const MATRIX_AKSES: Record<RolePengguna, Record<string, boolean>> = {
  // === PENGGUNGGUNG (tidak login) ===
  PENGUNGGUNG: {
    // Akses umum tanpa login
    LihatBeranda: true,
    LihatKatalog: true,
    LihatDetailBuku: true,
    DaftarAkun: true,
    Login: true,

    // Akses terbatas
    Checkout: false,
    KelolaProfil: false,
    UploadBuktiPembayaran: false,
    AjukanUbahJadwal: false,
    NonaktifkanAkun: false,
    KelolaAdmin: false,
    KelolaBuku: false,
    LihatModalLaba: false, // GR-03: dilarang keras

    // Fitur banner (GR-09: ditunda MVP)
    LihatBanner: true, // Bisa tapi fitur ditunda dari MVP
  },

  // === CUSTOMER (pelanggan terautentikasi) ===
  CUSTOMER: {
    // Akses dasar
    LihatBeranda: true,
    LihatKatalog: true,
    LihatDetailBuku: true,
    DaftarAkun: false, // Sudah punya akun
    Login: false,

    // Keranjang & pemesanan
    KelolaKeranjang: true,
    BuatPesanan: true,
    LihatPesananSaya: true,
    BukaBuktiPembayaran: true,

    // Pembayaran
    UploadBuktiPembayaran: true,
    MengubahMetodeBayar: false, // Butuh persetujuan Admin Biasa/Utama

    // Profil
    KelolaProfilSendiri: true, // nama, WA opsional (email terkunci)

    // Admin features (terbatas)
    AjukanUbahJadwal: true,
    NonaktifkanAkun: false,
    KelolaAdmin: false,
    KelolaBuku: false,
    LihatModalLaba: false, // GR-03: dilarang keras

    // Banner (GR-09: ditunda MVP)
    LihatBanner: true,
  },

  // === ADMIN BIASA (operator toko) ===
  ADMIN_BIASA: {
    // Akses lengkap operasional
    LihatSemua: true,
    LihatBeranda: true,
    LihatKatalog: true,
    LihatDetailBuku: true,
    DaftarAkun: false,
    Login: true,

    // Kelola data master
    KelolaBuku: true,
    KelolaKategori: true,
    KoreksiHargaOffline: true, // Butuh persetujuan Admin Utama (BR-019)

    // Stok & modal (GR-03, BR-004)
    KelolaStok: true, // Bisa mereservasi stok
    // costPrice, modal, laba: FIELD TERPROTEKSI (lihat isolasi.ts)
    LihatModalLaba: false, // GR-03: Admin Biasa dilarang keras melihat modal & laba
    // Field berikut HILANG dari respons API/Admin Biasa:
    // - costPrice
    // - snapshotCostPrice
    // - oldCostPrice
    // - newCostPrice

    // Toko Libur
    BukaTokoLibur: true, // Hanya Admin Utama tapi dibaca Admin Biasa
    TutupTokoLibur: true,
    LihatRiwayatTokoLibur: true,

    // Pesanan & pembayaran
    VerifikasiBukti: true, // Pemeriksaan awal 2 tahap (BR-014)
    AjukanUbahJadwal: true,
    NonaktifkanAkun: true,
    KelolaAdmin: false, // Bukan admin yang bisa membuat admin lain (GR-03: hanya Admin Utama)

    // Batal & Refund
    BatalPesanan: true, // Admin Biasa bisa batal sebelum pembayaran final
    LihatRefund: true,

    // Banner (GR-09: ditunda MVP)
    AjukanBanner: true, // Admin Biasa boleh ajukan (maks 3 pending)
    LihatBanner: true, // Bisa lihat daftar tanpa identitas pengaju
    SetujuiBanner: false, // Harus Admin Utama
    TolakBanner: false, // Harus Admin Utama

    // Admin features terlarang
    // costPrice sama sekali tidak ada di DTO/Admin Biasa
  },

  // === ADMIN UTAMA (pemilik toko, satu-satunya) ===
  ADMIN_UTAMA: {
    // Akses penuh SEMUA
    LihatSemua: true,
    LihatBeranda: true,
    LihatKatalog: true,
    LihatDetailBuku: true,
    DaftarAkun: true,
    Login: true,

    // Kontrol penuh
    KelolaBuku: true,
    KelolaStok: true,
    KoreksiHargaOffline: true,
    // Modal & laba: HANYA Admin Utama
    LihatModalLaba: true, // Bisa lihat laba historis dan hitung ulang

    // Semua field cost/price tersedia
    costPrice: true,
    snapshotCostPrice: true,
    oldCostPrice: true,
    newCostPrice: true,

    // Toko Libur (mutlak Admin Utama)
    BukaTokoLibur: true,
    TutupTokoLibur: true,
    HapusRiwayatTokoLibur: true, // Admin Utama bisa menghapus riwayat

    // Semua peran bisa diakses
    NonaktifkanAkun: true,
    KelolaAdmin: true, // Bisa membuat nonaktifkan akun admin lain
    // Tapi: hanya 1 Admin Utama (BR-005), tidak ada eskalasi

    // Pembayaran & refund
    VerifikasiBukti: true,
    SetujuiPembayaranFinal: true, // Persetujuan final tanpa eskalasi otomatis (BR-005)
    TolakPemeriksaan: true,
    TolakPembayaran: true,
    KelolaRefund: true,
    KoreksiPembayaran: true, // Tapi tidak bisa ubah nominal (BR-017)

    // Banner (GR-09: ditunda MVP)
    AjukanBanner: true,
    SetujuiBanner: true, // Bisa setujui/tolak pengajuan
    TolakBanner: true,
    KelolaBanner: true, // Buat/kelola banner terbit (maks 7 aktif)

    // Semua fitur tersedia
  },
};

// Dapatkan izin untuk operasi tertentu berdasarkan peran
export const can = (role: RolePengguna, operation: keyof typeof MATRIX_AKSES[RolePengguna]): boolean => {
  const roleMatrix = MATRIX_AKSES[role];
  if (!roleMatrix) return false;
  return roleMatrix[operation] === true;
};

// Cek apakah peran valid
export const isValidRole = (role: string): role is RolePengguna => {
  return Object.keys(MATRIX_AKSES).includes(role as RolePengguna);
};

// Cek khusus: apakah hanya Admin Utama saja
export const hanyaAdminUtama = (role: RolePengguna): boolean => {
  return role === 'ADMIN_UTAMA';
};

// Cek apakah boleh mengakses endpoint admin
export const butuhAksesAdmin = (role: RolePengguna): boolean => {
  return role === 'ADMIN_BIASA' || role === 'ADMIN_UTAMA';
};

// Cek apakah boleh mengakses fitur pembayaran
export const butuhAksesPembayaran = (role: RolePengguna): boolean => {
  return role === 'CUSTOMER' || role === 'ADMIN_BIASA' || role === 'ADMIN_UTAMA';
};

// Cek apakah boleh checkout
export const boleCheckout = (role: RolePengguna): boolean => {
  return role === 'CUSTOMER';
};

// Cek apakah boleh melihat modal/laba (GR-03)
export const boleLihatModalLaba = (role: RolePengguna): boolean => {
  return role === 'ADMIN_UTAMA';
};

// Cek apakah boleh mengubah modal
export const boleUbahModal = (role: RolePengguna): boolean => {
  return role === 'ADMIN_UTAMA';
};
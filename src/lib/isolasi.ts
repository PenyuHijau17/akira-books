// src/lib/isolasi.ts
// Helper isolasi field modal & laba
// Dilarang keras muncul di UI, respons API, DTO, atau payload browser untuk Admin Biasa (GR-03, BR-004)

// Field-field yang RAHASIA: Khusus Admin Utama
// Field ini tidak boleh pernah ada dalam respons API, DTO, atau payload browser untuk Admin Biasa.
// GR-03: Isolasi Modal & Laba
// BR-004: field modal/laba tidak boleh ada dalam respons API, DTO, atau payload HTML/JSON untuk Admin Biasa

// Daftar field modal yang harus TERPROTEKSI dari Admin Biasa
// field ini akan ter-filter otomatis saat respons API
export const FIELD_MODAL_RAHASIA = [
  'costPrice',
  'snapshotCostPrice',
  'oldCostPrice',
  'newCostPrice',
  'modalPerUnit',
  'labaKotor',
  'modalAktual',
  'marginLaba',
];

// Field-field yang aman untuk semua peran (terlihat semua)
export const FIELD_AMAN_SEMUA = [
  'id',
  'code',
  'title',
  'author',
  'publisher',
  'publishYear',
  'imageUrl',
  'description',
  'sellingPrice',
  'stockTotal',
  'status',
];

// Filter objek: hapus field rahasia sesuai peran
export const filterForRole = <T>(
  obj: T,
  role: 'ADMIN_UTAMA' | 'ADMIN_BIASA' | 'CUSTOMER' | 'PENGUNGGUNG',
  customExcluded?: string[],
): T => {
  if (obj === null || obj === undefined) return obj;

  const excluded = [
    ...FIELD_MODAL_RAHASIA,
    ...(customExcluded || []),
  ];

  const result = { ...obj } as any;

  for (const field of excluded) {
    if (field in result) {
      delete result[field];
    }
  }

  return result;
};

// Filter array of objects untuk Admin Biasa
export const filterArrayForAdminBiasa = <T>(
  arr: T[],
  customExcluded?: string[],
): T[] => {
  if (!arr || arr.length === 0) return arr;

  return arr.map((item) => filterForRole(item, 'ADMIN_BIASA', customExcluded));
};

// Filter untuk Customer (hanya field yang aman)
export const filterForCustomer = <T>(obj: T): T => {
  if (obj === null || obj === undefined) return obj;

  const result = { ...obj } as any;

  // Hapus field modal dan field admin sensitif
  for (const field of FIELD_MODAL_RAHASIA) {
    if (field in result) {
      delete result[field];
    }
  }

  // Hapus field yang hanya untuk admin
  const adminOnlyFields = ['costPrice', 'oldCostPrice', 'newCostPrice'];
  for (const field of adminOnlyFields) {
    if (field in result) {
      delete result[field];
    }
  }

  return result;
};

// Middleware Express untuk filter respons otomatis
// Menggantikan res.json dengan versi yang sudah difilter
export const middlewareFilterAdminBiasa = () => {
  return async (req: any, res: any, next: any) => {
    // Simpan fungsi json asli
    const originalJson = res.json;

    // Jika user adalah Admin Biasa, filter respons
    if (req.user && req.user.role === 'ADMIN_BIASA') {
      res.json = function (body: any) {
        const filtered = filterForRole(body, 'ADMIN_BIASA');
        return originalJson.call(this, filtered);
      };
    }
    // Jika Customer, filter field yang lebih ringan
    else if (req.user && req.user.role === 'CUSTOMER') {
      res.json = function (body: any) {
        const filtered = filterForCustomer(body);
        return originalJson.call(this, filtered);
      };
    }

    next();
  };
};

// Dapatkan daftar field yang TERPROTEKSI untuk Admin Biasa
// Gunakan ini di dokumentasi API atau validasi DTO
export const dapatkanFieldTerproteksiAdminBiasa = (): readonly string[] => {
  return [...FIELD_MODAL_RAHASIA] as readonly string[];
};

// Cek apakah field aman untuk ditampilkan ke peran tertentu
export const cekFieldAman = (
  field: string,
  role: 'ADMIN_UTAMA' | 'ADMIN_BIASA' | 'CUSTOMER' | 'PENGUNGGUNG',
): boolean => {
  const terproteksi = FIELD_MODAL_RAHASIA.includes(field);

  if (role === 'ADMIN_UTAMA') return true; // Admin Utama bisa semua
  if (role === 'ADMIN_BIASA') return !terproteksi; // Admin Biasa tidak boleh field rahasia
  if (role === 'CUSTOMER') return !terproteksi && !['costPrice', 'oldCostPrice', 'newCostPrice'].includes(field);
  if (role === 'PENGUNGGUNG') return false; // Pengunjung tidak boleh data transaksional

  return false;
};
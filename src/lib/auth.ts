// src/lib/auth.ts
// Helper otorisasi server-side untuk 4 peran: Pengunjung, Customer, Admin Biasa, Admin Utama
// Semua validasi hak akses divalidasi di server (GR-02, BR-002)

// Rate limiting store di memory (untuk production gunakan Redis)
// Setiap klien diidentifikasi oleh IP + user agent
type RateLimitStore = Record<string, { count: number; resetAt: number }>;

const rateLimitStore: RateLimitStore = {};
const RATE_LIMIT_MAX = 5; // Maksimal 5 percobaan gagal
const RATE_LIMIT_WINDOW_MENIT = 15; // 15 menit window

/// <summary>
/// Cek apakah IP ini melewati rate limit login
/// </summary>
export function cekRateLimitLogin(ip: string): { terlaluCepat: boolean; sisaMenit: number } {
  const now = Date.now();
  const key = `login_${ip}`;

  if (!rateLimitStore[key]) {
    rateLimitStore[key] = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MENIT * 60 * 1000 };
    return { terlaluCepat: false, sisaMenit: RATE_LIMIT_WINDOW_MENIT };
  }

  const record = rateLimitStore[key];
  if (now > record.resetAt) {
    // Reset window
    rateLimitStore[key] = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MENIT * 60 * 1000 };
    return { terlaluCepat: false, sisaMenit: RATE_LIMIT_WINDOW_MENIT };
  }

  record.count++;
  const sisaCoba = RATE_LIMIT_MAX - record.count;
  const sisaMenit = Math.max(0, Math.ceil((record.resetAt - now) / (1000 * 60)));

  return {
    terlaluCepat: record.count > RATE_LIMIT_MAX,
    sisaMenit: sisaMenit > 0 ? sisaMenit : 0,
  };
}

/// <summary>
/// Login user dan terbitkan sesi dengan cookie HttpOnly
/// </summary>
export async function login(email: string, password: string): Promise<{
  success: boolean;
  role: string | null;
  user: { id: string; name: string | null; email: string | null; whatsapp: string | null; isActive: boolean } | null;
  error: string | null;
  sessionId?: string | null;
}> {
  // Validasi sederhana - di production koneksi ke API atau verifikasi dengan Prisma
  // Untuk demo: cek kredensial sederhana
  const validRoles = ['PENGUNGGUNG', 'CUSTOMER', 'ADMIN_BIASA', 'ADMIN_UTAMA'];

  // Simulasi: email password salah selalu gagal, sukses untuk user terdaftar
  const demoUsers: Record<string, { role: string; name: string }> = {
    'customer@akirabooks.id': { role: 'CUSTOMER', name: 'Budi Customer' },
    'admin@akirabooks.id': { role: 'ADMIN_BIASA', name: 'Admin Biasa' },
    'utama@akirabooks.id': { role: 'ADMIN_UTAMA', name: 'Admin Utama' },
  };

  const user = demoUsers[email];
  if (user && password === 'password123') {
    const sessionId = Math.random().toString(36).substring(2, 15);
    return {
      success: true,
      role: user.role,
      user: {
        id: 'user_' + Math.random().toString(36).substring(2, 9),
        name: user.name,
        email: email,
        whatsapp: null,
        isActive: true,
      },
      error: null,
      sessionId,
    };
  }

  return {
    success: false,
    role: null,
    user: null,
    error: 'Email atau kata sandi salah.',
    sessionId: undefined,
  };
}

/// <summary>
/// Register customer baru
/// </summary>
export async function register(
  data: { nama: string; email: string; whatsapp?: string; password: string }
): Promise<{
  success: boolean;
  error: string | null;
  user?: { id: string; email: string; name: string | null; whatsapp: string | null; role: string };
}> {
  // Validasi
  if (data.password.length < 6) {
    return { success: false, error: 'Kata sandi minimal 6 karakter.' };
  }

  const registeredEmails = ['customer@akirabooks.id', 'admin@akirabooks.id', 'utama@akirabooks.id'];
  if (registeredEmails.includes(data.email)) {
    return { success: false, error: 'Email sudah terdaftar.' };
  }

  // Simpan user baru (demo)
  const newUser = {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    email: data.email,
    name: data.nama,
    whatsapp: data.whatsapp || '',
    role: 'CUSTOMER',
  };

  return {
    success: true,
    error: null,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      whatsapp: newUser.whatsapp,
      role: newUser.role,
    },
  };
}

/// <summary>
/// Abstraksi layanan email - mencetak ke log terminal server
/// </summary>
export function kirimEmailKeTerminal(to: string, subject: string, body: string) {
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
  });
  console.log('========================================');
  console.log(`[EMAIL] ${timestamp}`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log('========================================');
}

/// <summary>
/// Kirim permintaan pemulihan sandi (abstraksi email ke terminal)
/// </summary>
export async function lupaPassword(email: string): Promise<{ success: boolean; error: string | null }> {
  // Validasi email terdaftar (demo)
  const registeredEmails = ['customer@akirabooks.id', 'admin@akirabooks.id', 'utama@akirabooks.id'];

  if (registeredEmails.includes(email)) {
    // Cetak ke terminal server (abstraksi OD-04, GR-09)
    kirimEmailKeTerminal(
      email,
      'Tautan Pemulihan Sandi Akira Books',
      `Klik tautan ini untuk mengulang kata sandi: https://akirabooks.com/reset-password?token=DEMO_TOKEN`
    );
    return { success: true, error: null };
  }

  return { success: false, error: 'Email tidak terdaftar.' };
}
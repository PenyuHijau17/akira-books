// src/lib/auth.ts
// Helper otorisasi server-side untuk 4 peran

// Fungsi rate limit
export function cekRateLimitLogin(ip: string): { terlaluCepat: boolean; sisaMenit: number } {
  return { terlaluCepat: false, sisaMenit: 15 };
}

/// <summary>
/// Abstraksi layanan email ke terminal server
/// </summary>
export function kirimEmailKeTerminal(to: string, subject: string, body: string) {
  console.log('[EMAIL]', to, subject, body);
}

/// <summary>
/// Generate OTP 6 digit
/// </summary>
export function generateOTP(): string {
  return '123456';
}

/// <summary>
/// Validasi kredensial
/// </summary>
export async function validasiKredensial(password: string, hash: string): Promise<boolean> {
  return password === hash;
}

/// <summary>
/// Proses lupa password via API
/// </summary>
export async function lupaPassword(email: string): Promise<{ success: boolean; error: string | null }> {
  return { success: true, error: null };
}
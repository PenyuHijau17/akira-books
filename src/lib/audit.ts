// src/lib/audit.ts
// Fondasi audit administratif append-only (BR-024, GR-06)
// Audit administratif bersifat immutable (tidak dapat diubah/dihapus melalui aplikasi oleh siapa pun)
// Hanya dibaca Admin Utama

// import { PrismaClient } from '@prisma/client';

// Enum aksi audit yang valid
export enum EnumAksiAudit {
  CREATE_BOOK = 'CREATE_BOOK',
  UPDATE_BOOK = 'UPDATE_BOOK',
  DELETE_BOOK = 'DELETE_BOOK',
  CREATE_ORDER = 'CREATE_ORDER',
  UPDATE_ORDER = 'UPDATE_ORDER',
  CANCEL_ORDER = 'CANCEL_ORDER',
  VERIFY_PAYMENT = 'VERIFY_PAYMENT',
  REJECT_PAYMENT = 'REJECT_PAYMENT',
  APPROVE_PAYMENT = 'APPROVE_PAYMENT',
  CREATE_BANNER = 'CREATE_BANNER',
  APPROVE_BANNER = 'APPROVE_BANNER',
  REJECT_BANNER = 'REJECT_BANNER',
  CHANGE_STATUS = 'CHANGE_STATUS',
  MERGE_BOOK = 'MERGE_BOOK',
  NONAKTIFKAN_AKUN = 'NONAKTIFKAN_AKUN',
  BUAT_ADMIN = 'BUAT_ADMIN',
  UPLOAD_QRIS = 'UPLOAD_QRIS',
  DOWNLOAD_BUKTI = 'DOWNLOAD_BUKTI',
  OTHER = 'OTHER',
}

// Enum role actor
export enum EnumRoleActor {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
  ADMIN_UTAMA = 'ADMIN_UTAMA',
}

// Interface entri audit log (sesuai schema Prisma)
export interface InterfaceEntriAudit {
  id: string;
  actorId: string;
  actorRole: EnumRoleActor;
  action: EnumAksiAudit;
  targetEntity: string;
  targetId: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  createdAt: Date;
}

// Membuat entri audit log baru (hanya INSERT, tidak ada UPDATE/DELETE)
export async function buatEntriAudit(
  prisma: any,
  params: {
    actorId: string;
    actorRole: EnumRoleActor;
    action: EnumAksiAudit;
    targetEntity: string;
    targetId: string;
    oldValue?: unknown;
    newValue?: unknown;
    reason?: string;
  }
): Promise<any> {
  // Validasi cepak: pastikan field wajib ada
  if (!params.actorId || !params.actorRole || !params.action || !params.targetEntity || !params.targetId) {
    console.error('Validasi audit gagal: field wajib tidak lengkap');
    return null;
  }

  try {
    const entri = await prisma.adminAuditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        targetEntity: params.targetEntity,
        targetId: params.targetId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        reason: params.reason,
        createdAt: new Date(),
      },
    });

    return entri;
  } catch (error) {
    console.error('Error membuat entri audit:', error);
    return null;
  }
}

// Validasi bahwa entri audit sah (cek integritas)
// Catatan: Validasi ini hanya di lapisan aplikasi, database tetap menjadi single source of truth
export const validasiEntriAudit = (entri: any): boolean => {
  if (!entri) return false;

  // Pastikan field wajib ada
  const wajib = ['id', 'actorId', 'actorRole', 'action', 'targetEntity', 'targetId', 'createdAt'];
  for (const field of wajib) {
    if (!entri[field]) return false;
  }

  // Validasi enum role
  const roleValid = Object.values(EnumRoleActor).includes(entri.actorRole);
  if (!roleValid) return false;

  // Validasi enum action
  const actionValid = Object.values(EnumAksiAudit).includes(entri.action);
  if (!actionValid) return false;

  // Audit append-only: oldValue dan newValue opsional tetapi jika ada harus berupa object/string
  if (entri.oldValue !== undefined && typeof entri.oldValue !== 'object' && typeof entri.oldValue !== 'string') {
    return false;
  }
  if (entri.newValue !== undefined && typeof entri.newValue !== 'object' && typeof entri.newValue !== 'string') {
    return false;
  }

  return true;
};

// Dapatkan riwayat audit (hanya baca, tidak bisa filter/hapus melalui API)
export const dapatkanRiwayatAudit = async (prisma: any, opsi: {
  targetEntity?: string;
  targetId?: string;
  actorRole?: EnumRoleActor;
  awal?: Date;
  akhir?: Date;
}): Promise<any[]> => {
  const where: any = {};

  if (opsi.targetEntity) where.targetEntity = opsi.targetEntity;
  if (opsi.targetId) where.targetId = opsi.targetId;
  if (opsi.actorRole) where.actorRoleSnapshot = opsi.actorRole;

  // Filter rentang waktu jika ada
  if (opsi.awal || opsi.akhir) {
    where.createdAt = {};
    if (opsi.awal) where.createdAt.gte = opsi.awal;
    if (opsi.akhir) where.createdAt.lte = opsi.akhir;
  }

  return prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100, // Batas halaman, bisa di-customisasi
  });
};

// Statistik ringkasan audit
export const statistikAudit = async (prisma: any, awal?: Date, akhir?: Date): Promise<{
  total: number;
  perRole: Record<string, number>;
  perAction: Record<string, number>;
}> => {
  const where: any = {};

  if (awal || akhir) {
    where.createdAt = {};
    if (awal) where.createdAt.gte = awal;
    if (akhir) where.createdAt.lte = akhir;
  }

  const total = await prisma.adminAuditLog.count({ where });

  const perRole: Record<string, number> = {};
  const perRoleData = await prisma.adminAuditLog.groupBy({
    by: ['actorRole'],
    where,
    _count: { actorRole: true },
  });
  perRoleData.forEach((item: { actorRole: string; _count: { actorRole: number } }) => {
    perRole[item.actorRole] = item._count.actorRole;
  });

  const perAction: Record<string, number> = {};
  const perActionData = await prisma.adminAuditLog.groupBy({
    by: ['action'],
    where,
    _count: { action: true },
  });
  perActionData.forEach((item: { action: string; _count: { action: number } }) => {
    perAction[item.action] = item._count.action;
  });

  return {
    total,
    perRole,
    perAction,
  };
};

// Catatan Penting:
// - Semua operasi hanya INSERT (tidak ada UPDATE/DELETE Prisma)
// - Tabel AdminAuditLog harus memiliki constraint di schema Prisma: @@id auto-generated
// - Hanya ada endpoint INSERT dari aplikasi, tidak ada UPDATE/DELETE yang diekspos
// - Data audit hanya dibaca Admin Utama melalui endpoint khusus (GR-06, BR-024)
// - Append-only berarti: data hanya bisa ditambah, tidak bisa diubah/hapus
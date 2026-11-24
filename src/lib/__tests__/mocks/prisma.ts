import { vi } from 'vitest'

// Mock Prisma Client untuk Test Unit
// File ini digunakan oleh berbagai test file di src/lib/__tests__

export const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  book: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  stockMovement: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  BookCostHistory: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  order: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  paymentEvidence: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  orderPaymentAllocation: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  storeStatus: {
    findFirst: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
  },
  storeClosureHistory: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}
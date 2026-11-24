import { describe, it, expect, vi } from 'vitest'
import { FIELD_MODAL_RAHASIA, FIELD_AMAN_SEMUA } from '../isolasi'

// Mock data buku dengan field modal dan non-modal
const mockBukuLengkap = {
  id: 'buku-001',
  code: 'AKB-001',
  title: 'Buku Contoh',
  author: 'Penulis A',
  publisher: 'Penerbit X',
  publishYear: 2023,
  imageUrl: 'cover.jpg',
  description: 'Deskripsi buku',
  sellingPrice: 50000,
  costPrice: 30000,  // RAHASIA: Khusus Admin Utama (GR-03, BR-004)
  stockTotal: 50,
  status: 'TERSEDIA',
  snapshotCostPrice: 28000,  // RAHASIA
  oldCostPrice: 25000,  // RAHASIA
  newCostPrice: 30000,  // RAHASIA
  modalPerUnit: 25000,  // RAHASIA
  labaKotor: 15000,  // RAHASIA
  marginLaba: 30,  // RAHASIA
  kategori: 'FICTION',
}

const mockBukuPublik = {
  id: 'buku-001',
  code: 'AKB-001',
  title: 'Buku Contoh',
  author: 'Penulis A',
  publisher: 'Penerbit X',
  publishYear: 2023,
  imageUrl: 'cover.jpg',
  description: 'Deskripsi buku',
  sellingPrice: 50000,
  stockTotal: 50,
  status: 'TERSEDIA',
  kategori: 'FICTION',
}

// Fungsi filter yang akan diuji (diimplementasikan dari isolasi.ts)
function filterBukuUntukPeran(role: string, buku: any): any {
  const result: any = { ...buku }
  
  // Terapkan isolasi field modal (GR-03, BR-004)
  if (role !== 'ADMIN_UTAMA') {
    // Hapus field modal rahasia untuk Admin Biasa dan pengguna lain
    FIELD_MODAL_RAHASIA.forEach(field => {
      delete result[field]
    })
    // Pastikan field aman untuk semua peran terlihat
    FIELD_AMAN_SEMUA.forEach(field => {
      if (!(field in result) && buku[field]) {
        result[field] = buku[field]
      }
    })
  }
  
  return result
}

describe('Isolasi Field Modal (GR-03, BR-004)', () => {
  describe('untuk Admin Biasa', () => {
    it('WAHIB: costPrice tidak boleh muncul di respons API', () => {
      const result = filterBukuUntukPeran('ADMIN_BIASA', { ...mockBukuLengkap })
      
      // costPrice seharusnya dihapus/dilarang
      expect(result.costPrice).toBeUndefined()
      expect(result).not.toHaveProperty('costPrice')
    })

    it('WAHIB: snapshotCostPrice tidak boleh muncul', () => {
      const result = filterBukuUntukPeran('ADMIN_BIASA', { ...mockBukuLengkap })
      
      expect(result.snapshotCostPrice).toBeUndefined()
    })

    it('WAHIB: oldCostPrice tidak boleh muncul', () => {
      const result = filterBukuUntukPeran('ADMIN_BIASA', { ...mockBukuLengkap })
      
      expect(result.oldCostPrice).toBeUndefined()
    })

    it('WAHIB: newCostPrice tidak boleh muncul', () => {
      const result = filterBukuUntukPeran('ADMIN_BIASA', { ...mockBukuLengkap })
      
      expect(result.newCostPrice).toBeUndefined()
    })

    it('WAHIB: modalPerUnit tidak boleh muncul', () => {
      const result = filterBukuUntukPeran('ADMIN_BIASA', { ...mockBukuLengkap })
      
      expect(result.modalPerUnit).toBeUndefined()
    })

    it('WAHIB: labaKotor tidak boleh muncul', () => {
      const result = filterBukuUntukPeran('ADMIN_BIASA', { ...mockBukuLengkap })
      
      expect(result.labaKotor).toBeUndefined()
    })

    it('WAHIB: marginLaba tidak boleh muncul', () => {
      const result = filterBukuUntukPeran('ADMIN_BIASA', { ...mockBukuLengkap })
      
      expect(result.marginLaba).toBeUndefined()
    })
  })

  describe('untuk Pengunjung', () => {
    it('WAHIB: Semua field modal harus hilang', () => {
      const result = filterBukuUntukPeran('PENGUNGGUNG', { ...mockBukuLengkap })
      
      const fieldModalRahasia = ['costPrice', 'snapshotCostPrice', 'oldCostPrice', 'newCostPrice', 'modalPerUnit', 'labaKotor', 'marginLaba']
      fieldModalRahasia.forEach(field => {
        expect(result[field]).toBeUndefined()
      })
    })
  })

  describe('untuk Customer', () => {
    it('WAHIB: costPrice tidak boleh muncul', () => {
      const result = filterBukuUntukPeran('CUSTOMER', { ...mockBukuLengkap })
      
      expect(result.costPrice).toBeUndefined()
    })

    it('WAHIB: Boleh melihat field yang aman (sellingPrice, stockTitle)', () => {
      const result = filterBukuUntukPeran('CUSTOMER', { ...mockBukuLengkap })
      
      expect(result.sellingPrice).toBe(50000)
      expect(result.stockTotal).toBe(50)
      expect(result.title).toBe('Buku Contoh')
    })
  })

  describe('untuk Admin Utama', () => {
    it('WAHIB: Boleh melihat semua field termasuk costPrice', () => {
      const result = filterBukuUntukPeran('ADMIN_UTAMA', { ...mockBukuLengkap })
      
      // Admin Utama boleh semua
      expect(result.costPrice).toBe(30000)
      expect(result.snapshotCostPrice).toBeDefined()
      expect(result.oldCostPrice).toBeDefined()
      expect(result.newCostPrice).toBeDefined()
      expect(result.modalPerUnit).toBeDefined()
      expect(result.labaKotor).toBeDefined()
      expect(result.marginLaba).toBeDefined()
    })

    it('WAHIB: Field aman tetap terlihat', () => {
      const result = filterBukuUntukPeran('ADMIN_UTAMA', { ...mockBukuLengkap })
      
      expect(result.title).toBe('Buku Contoh')
      expect(result.author).toBe('Penulis A')
    })
  })
})

describe('Konstanta Field Isolasi', () => {
  it('FIELD_MODAL_RAHASIA harus berisi field modal yang dikunci', () => {
    const fieldModal: string[] = ['costPrice', 'snapshotCostPrice', 'oldCostPrice', 'newCostPrice', 'modalPerUnit', 'labaKotor', 'marginLaba']
    
    fieldModal.forEach(field => {
      expect(FIELD_MODAL_RAHASIA.includes(field)).toBe(true)
    })
  })

  it('FIELD_AMAN_SEMUA harus berisi field yang bisa dilihat semua', () => {
    const fieldAman: string[] = ['id', 'code', 'title', 'author', 'publisher', 'publishYear', 'imageUrl', 'description', 'sellingPrice', 'stockTotal', 'status']
    
    fieldAman.forEach(field => {
      expect(FIELD_AMAN_SEMUA.includes(field)).toBe(true)
    })
  })
})
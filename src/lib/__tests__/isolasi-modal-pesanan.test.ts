import { describe, it, expect } from 'vitest'
import { saringFieldModal } from '../pesanan'

describe('Tahap 7 — Isolasi field modal & laba (GR-03, BR-004)', () => {
  const pesananDenganModal = {
    id: 'order-1',
    orderNumber: 'AKB-20261126-123456',
    totalAmount: 190000,
    costPrice: 40000,
    orderItems: [
      {
        id: 'item-1',
        snapshotTitle: 'Laskar Pelangi',
        snapshotSellingPrice: 95000,
        snapshotCostPrice: 55000,
        subtotal: 190000,
      },
    ],
  }

  it('menghapus field modal dari pesanan yang dikirim ke Customer', () => {
    const hasil = saringFieldModal(pesananDenganModal)

    expect(hasil).not.toHaveProperty('costPrice')
    expect(hasil.orderItems[0]).not.toHaveProperty('snapshotCostPrice')
    expect(hasil.orderNumber).toBe('AKB-20261126-123456')
    expect(hasil.totalAmount).toBe(190000)
  })

  it('membuang field modal di dalam array dan objek bersarang', () => {
    const hasil = saringFieldModal({
      buku: {
        modalPerUnit: 20000,
        marginLaba: 25,
        labaKotor: 30000,
        judul: 'Buku Aman',
      },
      daftar: [{ oldCostPrice: 10000 }, { newCostPrice: 12000 }],
    }) as any

    expect(hasil.buku).toEqual({ judul: 'Buku Aman' })
    expect(hasil.daftar[0]).toEqual({})
    expect(hasil.daftar[1]).toEqual({})
  })

  it('mempertahankan field harga jual yang aman', () => {
    const hasil = saringFieldModal({
      sellingPrice: 95000,
      subtotal: 190000,
      snapshotSellingPrice: 95000,
      snapshotCode: 'LP-001',
      snapshotTitle: 'Laskar Pelangi',
    })

    expect(hasil).toEqual({
      sellingPrice: 95000,
      subtotal: 190000,
      snapshotSellingPrice: 95000,
      snapshotCode: 'LP-001',
      snapshotTitle: 'Laskar Pelangi',
    })
  })

  it('tidak mengubah objek tanpa field modal', () => {
    const aman = { id: 'order-2', totalAmount: 50000 }
    expect(saringFieldModal(aman)).toEqual(aman)
  })
})

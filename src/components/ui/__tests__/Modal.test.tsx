import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Modal } from '@/components/ui/Modal'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Modal', () => {
  it('tidak merender dialog saat open=false', () => {
    const html = renderToStaticMarkup(
      <Modal open={false} onOpenChange={() => {}} title="Setujui Ulang Keranjang">
        <p>Isi dialog</p>
      </Modal>
    )

    expect(html).toBe('')
  })

  it('merender dialog dan tombol tanpa peringatan unique key', () => {
    // Peringatan React muncul lewat console.error pada render development.
    const konsolError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const html = renderToStaticMarkup(
      <Modal
        open
        onOpenChange={() => {}}
        title="Setujui Ulang Keranjang"
        confirmText="Setujui Keranjang"
        cancelText="Nanti"
        onCancel={() => {}}
        onConfirm={() => {}}
      >
        <p>Isi dialog</p>
      </Modal>
    )

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-label="Setujui Ulang Keranjang"')
    expect(html).toContain('Setujui Keranjang')
    expect(html).toContain('Nanti')
    expect(konsolError.mock.calls.flat().join(' ')).not.toContain('unique "key" prop')
  })
})

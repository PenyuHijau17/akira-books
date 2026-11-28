import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Badge } from '@/components/ui/Badge'

describe('Badge', () => {
  it('tidak meneruskan prop kustom ke elemen DOM dan tidak memicu warning React', () => {
    const konsolError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const html = renderToStaticMarkup(
        <Badge variant="warning" className="kustom-badge">
          2 belum dibaca
        </Badge>
      )

      expect(html).not.toContain('variant=')
      expect(html).toContain('kustom-badge')
      expect(html).toContain('2 belum dibaca')
      expect(konsolError.mock.calls.flat().join(' ')).toBe('')
    } finally {
      konsolError.mockRestore()
    }
  })
})

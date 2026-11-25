import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  test: {
    alias: {
      '@': '/src',
      '@/components': '/src/components',
    },
    // Timeout untuk test (diabaikan selama development tsc check)
    // timeout: 30000,
    // Coverage reporter
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  plugins: [tsconfigPaths()],
})
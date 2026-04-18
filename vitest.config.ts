import { defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/store/**/*.ts'],
    },
    setupFiles: ['./vitest.setup.ts'],
  },
})

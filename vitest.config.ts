import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/.upstream/**',
      '**/.tools/**',
      '**/.artifacts/**',
    ],
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
})

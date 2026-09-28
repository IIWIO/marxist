import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/components/**/*.test.tsx', 'tests/hooks/**/*.test.ts', 'tests/hooks/**/*.test.tsx', 'tests/utils/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'src/hooks/useAIAgent.ts',
        'src/hooks/useAutoSave.ts',
        'src/hooks/useQuitHandler.ts',
        'src/main/services/openRouterService.ts',
        'src/main/services/sessionService.ts',
        'src/stores/**/*.ts',
        'src/utils/diff.ts',
        'src/utils/markdown.ts',
        'src/utils/markdownProcessor.ts',
        'src/utils/recovery.ts',
      ],
      exclude: ['node_modules/', 'tests/'],
      thresholds: {
        statements: 69,
        branches: 50,
        functions: 68,
        lines: 74,
      },
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})

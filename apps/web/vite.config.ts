import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import sourceLoc from './design-mode/babel-plugin-source-loc'
import designMode from './design-mode/vite-plugin-design-mode'

const apiProxyTarget = process.env.API_PROXY_TARGET

export default defineConfig(({ command }) => {
  // serve only, and never under vitest (would stamp data-loc into test DOM)
  const dev = command === 'serve' && !process.env.VITEST
  return {
    plugins: [
      react(dev ? { babel: { plugins: [sourceLoc] } } : undefined),
      tailwindcss(),
      designMode(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', '@tanstack/react-router'],
            'vendor-charts': ['recharts'],
            'vendor-motion': ['motion'],
            'vendor-ui': [
              '@radix-ui/react-avatar',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-label',
              '@radix-ui/react-separator',
              '@radix-ui/react-slot',
              '@radix-ui/react-switch',
            ],
          },
        },
      },
    },
    server: apiProxyTarget
      ? {
          proxy: {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true,
            },
          },
        }
      : undefined,
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/support/vitest.setup.ts'],
    },
  }
})

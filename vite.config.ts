/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/perpetual-presentation/',
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      include: ['buffer'],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg'],
      manifest: {
        name: 'LooPPT - Perpetual Presentation',
        short_name: 'LooPPT',
        description: 'Perpetual Presentation Player for Kiosks',
        theme_color: '#000000',
        start_url: '/perpetual-presentation/',
        scope: '/perpetual-presentation/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ],
        display: 'standalone'
      }
    })
  ],
  // @ts-ignore - Vitest test config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})

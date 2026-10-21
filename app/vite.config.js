import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'logo/*.svg'],
      manifest: {
        name: 'QChef — o que tem na geladeira vira receita',
        short_name: 'QChef',
        description: 'Diga os ingredientes que você tem e a IA monta a receita com passo a passo e cronômetro.',
        lang: 'pt-BR',
        start_url: './#/inicio',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1F2328',
        theme_color: '#1F2328',
        categories: ['food', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // As fotos do banco ficam fora do pré-cache (3 MB): são guardadas conforme a pessoa vê
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          { urlPattern: /\/fotos\/.*\.webp$/, handler: 'CacheFirst', options: { cacheName: 'fotos', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 180 } } },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 900 },
})

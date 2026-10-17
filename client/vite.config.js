import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Hosted on GitHub Pages at https://grxnitt.github.io/bloom-words/
export default defineConfig({
  base: '/bloom-words/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Bloom — английские слова',
        short_name: 'Bloom',
        lang: 'ru',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#FCF1F4',
        theme_color: '#FCF1F4',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  server: { port: 5173 },
});

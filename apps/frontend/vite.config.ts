import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '../..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@rive-app/react-canvas': path.resolve(__dirname, 'node_modules/@rive-app/react-canvas/dist/index.js'),
      '@rive-app/canvas': path.resolve(__dirname, 'node_modules/@rive-app/canvas/dist/cjs/runtime.js'),
    },
  },
  optimizeDeps: {
    include: ['@rive-app/react-canvas', '@rive-app/canvas']
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '探Qメイト - 探究学習支援アプリ',
        short_name: '探Qメイト',
        description: 'AIを活用した探究学習支援アプリケーション',
        theme_color: '#73bbff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1週間
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    },
    allowedHosts: [
      'mammoth-enabled-bird.ngrok-free.app',
      'localhost',
      '127.0.0.1',
      'demo.tanqmates.org',
      'dev.tanqmates.local.test'
    ],
    watch: {
      // ポーリングを使用してファイル監視のメモリ使用量を削減
      usePolling: false,
      interval: 1000,
      // 無視するパスを追加
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/coverage/**'],
    },
    fs: {
      // ファイルシステムの監視を制限
      strict: true,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}); 

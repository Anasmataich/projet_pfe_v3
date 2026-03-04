import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 3000,

    // مهم: نخلي الفرونت يطلب /api/v1 (same-origin) و Vite يوجّهها للبـاك
    proxy: {
      '/api/v1': {
        target: process.env.VITE_BACKEND_URL ?? 'http://localhost:5000',
        changeOrigin: true,
        secure: false,

        // مهم للكوكيز ديال auth (refresh/access)
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: { '*': '/' },
      },

      '/health': {
        target: process.env.VITE_BACKEND_URL ?? 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand', 'axios'],
        },
      },
    },
  },
});
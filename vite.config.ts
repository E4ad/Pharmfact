import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      filter: /\.(js|css|json|txt|html|ico|svg)$/i,
      threshold: 10240,
      deleteOriginFile: false,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('@mui/material') || id.includes('@mui/icons-material')) {
            return 'mui';
          }
          if (id.includes('pdf-lib') || id.includes('jspdf')) {
            return 'pdf';
          }
          if (id.includes('react-router-dom')) {
            return 'react-router';
          }
          if (id.includes('date-fns')) {
            return 'date-fns';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'server/**/*.{test,spec}.js',
      'src/**/__tests__/**/*.{ts,tsx}',
      'server/__tests__/**/*.js',
    ],
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
  },
});

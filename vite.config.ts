import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
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
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**', '.kilo/**'],
  },
});

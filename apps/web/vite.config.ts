import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN ?? '';

export default defineConfig({
  plugins: [
    react(),
    ...(SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            authToken: SENTRY_AUTH_TOKEN,
            org: process.env.SENTRY_ORG ?? '',
            project: 'web',
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    // 排除 exFAT 上的 AppleDouble 元数据(._xxx)避免被 Vitest 当 .ts 文件 transform
    exclude: ['**/node_modules/**', '**/dist/**', '**/._*'],
  },
});

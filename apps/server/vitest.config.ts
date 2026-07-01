import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // 排除 exFAT 上的 AppleDouble 元数据(._xxx)避免被 Vitest 当 .ts 文件 transform
    exclude: ['**/node_modules/**', '**/dist/**', '**/._*'],
  },
});

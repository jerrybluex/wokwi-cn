import js from '@eslint/js';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/build/**',
      '**/out/**',
      '**/coverage/**',
      '.harness/**',
      'wokwi-clone.html',
      '**/*.min.js',
      '**/pnpm-lock.yaml',
      // AppleDouble metadata (exFAT auto-generated)
      '**/._*',
      // D1 阶段 ESLint 不解析 TS 文件(等 typescript-eslint D5 加入),避免 "no matching config" 错
      '**/*.ts',
      '**/*.tsx',
      '**/*.d.ts',
    ],
  },
  // D1 临时限定到 .js 文件。TS 文件用 tsc 做检查。
  // D5 装 typescript-eslint + 加 typescript parser 后,扩展 *.ts/*.tsx。
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        HTMLElement: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-empty': 'warn',
      'no-console': 'off',
    },
  },
];

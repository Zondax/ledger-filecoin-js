import unusedImports from 'eslint-plugin-unused-imports';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tsdoc from 'eslint-plugin-tsdoc';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'eslint.config.js', 'jest.config.js'],
  },
  {
    files: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: '.',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
    plugins: {
      'unused-imports': unusedImports,
      '@typescript-eslint': typescriptEslint,
      'tsdoc': tsdoc,
    },
    rules: {
      curly: 'warn',
      'prefer-const': 'warn',
      'no-else-return': 'warn',
      complexity: ['warn', 1000],
      'no-unneeded-ternary': 'warn',
      'no-alert': 'warn',
      'no-empty': 'warn',
      'no-useless-catch': 'error',
      'require-await': 'warn',
      'no-continue': 'warn',
      'no-console': 'warn',
      'unused-imports/no-unused-imports': 'warn',
      'no-magic-numbers': 'off',
    },
  },
];
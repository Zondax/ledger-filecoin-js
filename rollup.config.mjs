import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';

// Externalize CommonJS-compatible deps - only bundle ESM-only deps (currently none)
const external = [/@zondax\/ledger-js/, /varint/];

export default [
  // CJS Build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'named',
      interop: 'auto',
    },
    external,
    plugins: [
      resolve({ preferBuiltins: true, exportConditions: ['node', 'default'] }),
      commonjs({ transformMixedEsModules: true }),
      json(),
      typescript({ tsconfig: './tsconfig.build.json', declaration: false }),
    ],
  },
  // Type declarations
  {
    input: 'src/index.ts',
    output: { file: 'dist/types/index.d.ts', format: 'es' },
    external: [/@ledgerhq/, /@zondax/],
    plugins: [dts({ tsconfig: './tsconfig.build.json' })],
  },
];

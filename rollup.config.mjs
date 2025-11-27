import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';

// Bundle everything - no external dependencies
// This makes the package self-contained and easier for consumers

export default [
  // CJS Build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/cjs/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      interop: 'auto',
    },
    plugins: [
      resolve({ preferBuiltins: true, exportConditions: ['node', 'default'] }),
      commonjs({ transformMixedEsModules: true }),
      json(),
      typescript({ tsconfig: './tsconfig.build.json', declaration: false }),
    ],
  },
  // ESM Build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/esm/index.mjs',
      format: 'es',
      sourcemap: true,
    },
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

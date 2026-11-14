import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// eslint-config-next 16 ships native flat configs (the FlatCompat shim for
// "next/core-web-vitals" + "next/typescript" is gone), and Next 16 removed
// `next lint` — `npm run lint` runs the ESLint CLI directly.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Node build scripts (icon generator) are CommonJS by design.
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  globalIgnores(['.next/**', '.next-*/**', 'out/**', 'build/**', 'next-env.d.ts', 'public/**', 'e2e/**', 'coverage/**']),
]);

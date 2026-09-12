import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'scripts/verify-migration-history.test.mjs'],
  },
  resolve: {
    alias: {
      '@': path.join(projectDirectory, 'src'),
      'server-only': path.join(projectDirectory, 'src/test/server-only.ts'),
    },
  },
});

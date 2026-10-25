import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    cacheDir: 'node_modules/.vite/vitest',
    test: {
      env: { VITE_ENABLE_REALTIME: 'false' },
      setupFiles: ['./src/test/setup.ts'],
      maxWorkers: 2,
      testTimeout: 10000,
    },
  }),
);

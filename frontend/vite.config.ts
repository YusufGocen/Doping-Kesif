import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  cacheDir: 'node_modules/.vite/dev',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [react()],
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:8080', ws: true } },
  },
});

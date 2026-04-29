import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist-playground',
    target: 'es2022',
    rollupOptions: {
      input: 'playground.html',
    },
  },
  server: {
    port: 3001,
    open: '/playground.html',
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'es2022',
    rollupOptions: {
      input: {
        main: 'index.html',
        playground: 'playground.html',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});

import { defineConfig, type Plugin } from 'vite';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

// Vite plugin: watch .comb files → recompile to src/generated/
function combHmrPlugin(): Plugin {
  let compileModule: any = null;

  return {
    name: 'comb-hmr',
    configureServer(server) {
      // Watch examples/ directory for .comb changes
      server.watcher.add(resolve('examples'));

      server.watcher.on('change', async (file) => {
        if (!file.endsWith('.comb')) return;

        try {
          // Lazy-load compiler (it's a TS file, use dynamic import)
          if (!compileModule) {
            compileModule = await import('./src/core/compiler.js');
          }

          const source = readFileSync(file, 'utf-8');
          const result = compileModule.compile(source);

          if (result.errors.length > 0) {
            server.config.logger.warn(`[comb] Compile errors in ${basename(file)}:`);
            for (const err of result.errors) {
              server.config.logger.warn(`  ${err.message} (line ${err.line})`);
            }
            return;
          }

          // Write to src/generated/<name>.js
          const name = basename(file, '.comb');
          const outPath = resolve('src/generated', `${name}.js`);
          if (existsSync(outPath)) {
            writeFileSync(outPath, result.js!);
            server.config.logger.info(`[comb] Recompiled ${basename(file)} → ${name}.js`);
          }
        } catch (e: any) {
          server.config.logger.error(`[comb] Failed to compile ${basename(file)}: ${e.message}`);
        }
      });
    },
  };
}

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
        docs: 'docs.html',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  plugins: [combHmrPlugin()],
});

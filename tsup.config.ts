import { defineConfig } from 'tsup';
import { cpSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  define: {
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  onSuccess: async () => {
    // Copy scaffold templates and sample designs to dist
    const srcTemplates = join(process.cwd(), 'src', 'templates');
    const distTemplates = join(process.cwd(), 'dist', 'templates');

    if (existsSync(srcTemplates)) {
      mkdirSync(distTemplates, { recursive: true });
      cpSync(srcTemplates, distTemplates, { recursive: true });
    }

    const srcData = join(process.cwd(), 'src', 'data');
    const distData = join(process.cwd(), 'dist', 'data');

    if (existsSync(srcData)) {
      mkdirSync(distData, { recursive: true });
      cpSync(srcData, distData, {
        recursive: true,
        filter: (src) => !src.includes('__tests__'),
      });
    }
  },
});

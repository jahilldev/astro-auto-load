import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import autoLoad from '../../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'server',
  integrations: [autoLoad()],
  server: {
    port: 4567,
  },
});

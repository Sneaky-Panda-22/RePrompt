import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add Types for TypeScript support
export default defineConfig({
  integrations: [react()],
  output: 'static',
  outDir: '../static',
  site: 'https://reprompt.app',
  compressHTML: true,
  build: {
    inlineStylesheets: 'never',
    assets: 'assets',
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "../frontend/src"),
      },
    },
    server: {
      proxy: {
        "/api": "http://localhost:8080",
      },
      fs: {
        allow: [
          path.resolve(__dirname, '../frontend'),
          path.resolve(__dirname)
        ]
      }
    }
  },
});

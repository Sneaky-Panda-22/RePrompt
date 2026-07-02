import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../frontend/src"),
    },
  },
  // Enable React support
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  // Build optimizations
  build: {
    rollupOptions: {
      // Ensure React is properly bundled
      external: [],
    },
  },
});

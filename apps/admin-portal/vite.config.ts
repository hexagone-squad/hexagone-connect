import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          fluent: ['@fluentui/react-components', '@fluentui/react-icons'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:4100',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});

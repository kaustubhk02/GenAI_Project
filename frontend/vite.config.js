import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api calls are proxied to the Express backend (no CORS issues).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [
      'nexusclient-production-c185.up.railway.app',
      '.up.railway.app',
      'localhost',
      '127.0.0.1',
    ],
  },
});

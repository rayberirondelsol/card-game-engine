import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // M6-Nachtrag: der Raum-WebSocket laeuft ueber dieselbe Herkunft wie die
      // Seite (nginx macht das im Betrieb, hier Vite) - sonst braeuchte die
      // Entwicklung eine eigene Regel und der Betrieb eine zweite.
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});

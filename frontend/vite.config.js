import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Triggering Vite restart to reload tailwind.config.js
// Triggering Vite restart to revert to standard config
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listens on 0.0.0.0 (all network interfaces, enabling LAN access)
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})

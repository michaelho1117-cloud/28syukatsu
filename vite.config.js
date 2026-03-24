import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'],
    open: true,
    proxy: {
      '/api/core': 'http://127.0.0.1:8789',
      '/api/email': 'http://127.0.0.1:8787',
    },
  },
})

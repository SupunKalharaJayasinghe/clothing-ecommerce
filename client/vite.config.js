import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // allow external access (needed for ngrok)
    // If you want to pin the port, uncomment the next line
    // port: 5173,
    allowedHosts: [
      'inevitably-unpretty-serita.ngrok-free.dev'
    ],
    hmr: {
      // HMR over HTTPS reverse proxies like ngrok
      host: 'inevitably-unpretty-serita.ngrok-free.dev',
      clientPort: 443
    },
    proxy: {
      // Forward API calls to local backend to avoid CORS and use relative /api in the client
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

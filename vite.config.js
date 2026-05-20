import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000, // Increase from default 500KB to 1000KB
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate vendor chunks for better caching
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor'
            }
            if (id.includes('firebase')) {
              return 'firebase'
            }
            if (id.includes('react-router')) {
              return 'router'
            }
            return 'vendor' // other node_modules
          }
        },
      },
    },
  },
})

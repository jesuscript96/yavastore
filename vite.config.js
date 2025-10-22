import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'react-hot-toast'],
          forms: ['react-hook-form'],
          charts: ['recharts']
        }
      }
    }
  },
  define: {
    // Asegurar que las variables de entorno estén disponibles
    'import.meta.env.VITE_APP_URL': JSON.stringify(process.env.VITE_APP_URL)
  }
})

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
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'react-hot-toast'],
          forms: ['react-hook-form'],
          charts: ['recharts'],
          utils: ['date-fns', 'clsx']
        }
      }
    },
    // Optimize bundle size
    chunkSizeWarningLimit: 1000,
    // Enable compression
    reportCompressedSize: true,
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        'lucide-react',
        'react-hot-toast',
        'react-hook-form',
        'recharts',
        'date-fns',
        'clsx',
        'zustand'
      ]
    }
  },
  define: {
    // Asegurar que las variables de entorno estén disponibles
    'import.meta.env.VITE_APP_URL': JSON.stringify(process.env.VITE_APP_URL)
  },
  // Optimize CSS
  css: {
    devSourcemap: false
  }
})

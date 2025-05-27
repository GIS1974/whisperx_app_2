// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    include: "**/*.{jsx,js,ts,tsx}"
  })],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.ts': 'tsx'
      }
    }
  },
  server: {
    port: 3000,
    open: true, // Automatically open browser
    // Optional: proxy API requests to backend during development
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:5000', // Your backend server
    //     changeOrigin: true,
    //     // rewrite: (path) => path.replace(/^\/api/, '') // if your backend doesn't expect /api prefix
    //   }
    // }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10000000, // 10MB for AI models
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.elevenlabs\.io\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'elevenlabs-api',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Living Heirloom - Preserve Your Legacy',
        short_name: 'Living Heirloom',
        description: 'An emotionally intelligent app for preserving family voices, stories, and wisdom across generations',
        theme_color: '#8B5CF6',
        background_color: '#FEFEFE',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
    include: ['dexie', 'zustand', 'react', 'react-dom']
  },
  define: {
    global: 'globalThis',
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          
          // UI libraries
          'ui-radix': [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu', 
            '@radix-ui/react-select',
            '@radix-ui/react-progress',
            '@radix-ui/react-slider'
          ],
          'ui-icons': ['lucide-react'],
          
          // Heavy AI libraries (separate chunk for lazy loading)
          'ai-webllm': ['@mlc-ai/web-llm'],
          
          // Storage and state management
          'storage': ['dexie', 'zustand'],
          
          // Voice and worker libraries
          'voice': ['comlink'],
          
          // Utility libraries
          'utils': ['clsx', 'tailwind-merge', 'zod', 'date-fns'],
          
          // Query and async libraries
          'async': ['@tanstack/react-query']
        }
      }
    },
    // Optimize chunk size and compression
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    sourcemap: false, // Disable sourcemaps in production for smaller builds
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  }
})
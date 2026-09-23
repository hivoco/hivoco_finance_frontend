import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Pinned so it never collides with other local Vite apps (5173).
  server: { port: 5180, strictPort: true },
  preview: {
    port: 6024, // production serve port
    strictPort: true,
    // Vite blocks unknown Host headers; production is served behind this domain.
    allowedHosts: ["finance.thefirstimpression.ai"],
  },
  build: {
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks: cached across deploys, keeps the entry small.
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/, priority: 30 },
            {
              name: 'vendor-ui',
              test: /node_modules[\\/](radix-ui|@radix-ui|@base-ui|@floating-ui|lucide-react|sonner|cmdk|vaul|react-day-picker|next-themes)[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor-data',
              test: /node_modules[\\/](@tanstack|openapi-fetch|openapi-react-query|zod|react-hook-form|@hookform|date-fns|decimal\.js|zustand|use-debounce)[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
})

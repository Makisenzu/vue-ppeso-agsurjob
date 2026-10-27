import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // No source maps: DevTools' Sources tab only gets the minified bundle, never the original code
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Production drops every console.* call and debugger statement, so errors logged with records,
        // responses or IDs never reach the Console of a deployed site (`npm run dev` keeps them)
        minify: {
          compress: { dropConsole: true, dropDebugger: true },
        },
      },
    },
  },
})

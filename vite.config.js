import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Strip console/debugger in production builds.
  // Uses define instead of esbuild.drop because this project
  // uses rolldown-vite which replaces esbuild with Rolldown.
  define: {
    'import.meta.env.PROD': JSON.stringify(true),
  },
  build: {
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
})
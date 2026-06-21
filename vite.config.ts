import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  base: isGitHubActions ? '/chessboardmagic-os/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

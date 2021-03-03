import React from '@vitejs/plugin-react-refresh'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    React(),
  ],
  build: {
    outDir: 'dist/client',
  },
})

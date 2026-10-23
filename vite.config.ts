import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Phase 1 (security): the old GEMINI_API_KEY define block was removed.
// The app never called the Gemini API, so the key (which had been committed
// in .env.local) served no purpose. If an AI feature is added later, its key
// goes in an untracked .env.local — never in this repo.
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});

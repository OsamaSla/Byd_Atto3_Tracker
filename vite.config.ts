import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Byd_Atto3_Tracker/', // Add this line!
  build: {
    modulePreload: {
      polyfill: false
    }
  }
});

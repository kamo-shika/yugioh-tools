import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages は https://<user>.github.io/<repo>/ で配信されるため base を合わせる
export default defineConfig({
  base: process.env.PAGES_BASE ?? '/yugioh-tools/',
  plugins: [react()],
});

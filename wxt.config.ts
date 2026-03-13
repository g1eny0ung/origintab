import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'dist',
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'OriginTab - Save Your Tabs',
    description: 'Save tabs with one click and restore them at any time.',
    version: '1.0.0',
    permissions: ['tabs', 'storage'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});

import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'dist',
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    version: '1.0.0',
    default_locale: 'en',
    permissions: ['tabs', 'storage'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});

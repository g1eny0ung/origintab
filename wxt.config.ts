import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'dist',
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    version: '1.1.0',
    default_locale: 'en',
    permissions: ['tabs', 'storage', 'contextMenus'],
    browser_specific_settings: {
      gecko: {
        id: 'origintab@app.g1en.dev',
        // https://github.com/wxt-dev/wxt/issues/1975
        // @ts-ignore
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
})

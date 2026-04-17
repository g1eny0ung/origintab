import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

import { commonPermissions, manifest } from './wxt.config'

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    ...manifest,
    permissions: commonPermissions,
    sidebar_action: {
      default_icon: 'origintab.svg',
      default_panel: 'origintab.html',
      open_at_install: false,
    },
    browser_specific_settings: {
      gecko: {
        id: 'origintab@app.g1en.dev',
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

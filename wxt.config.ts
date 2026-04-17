import tailwindcss from '@tailwindcss/vite'
import { UserManifest, defineConfig } from 'wxt'

export const commonPermissions = ['tabs', 'storage', 'contextMenus']
export const manifest: UserManifest = {
  name: '__MSG_extName__',
  description: '__MSG_extDescription__',
  version: '1.1.3',
  default_locale: 'en',
  commands: {
    open: {
      suggested_key: {
        default: 'Alt+R',
        mac: 'MacCtrl+R',
      },
      description: '__MSG_openOriginTab__',
    },
    openInSidePanel: {
      suggested_key: {
        default: 'Alt+Shift+R',
        mac: 'MacCtrl+Shift+R',
      },
      description: '__MSG_openOriginTabInSidePanel__',
    },
    saveAllTabs: {
      description: '__MSG_saveAllTabs__',
    },
    saveCurrentTab: {
      description: '__MSG_saveCurrentTab__',
    },
  },
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'dist',
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    ...manifest,
    permissions: [...commonPermissions, 'sidePanel'],
    side_panel: {
      default_path: 'origintab.html',
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
})

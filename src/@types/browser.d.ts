import type { SidebarAction } from 'webextension-polyfill'

declare module '@wxt-dev/browser' {
  namespace Browser {
    const sidebarAction: SidebarAction.Static
  }
}

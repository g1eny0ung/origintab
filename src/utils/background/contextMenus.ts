import { getUserGroups } from '~/store'

import { collectAllTabs, collectCurrentTab } from './tabCollection'

const MENU_ROOT = 'origintab-root'
const MENU_SAVE_ALL = 'save-all-tabs'
const MENU_SAVE_CURRENT = 'save-current-tab'
const MENU_SEPARATOR = 'separator-1'
const MENU_SAVE_ALL_TO_GROUP = 'save-all-to-group'
const MENU_SAVE_CURRENT_TO_GROUP = 'save-current-to-group'

export async function notifyContextMenusRefresh() {
  try {
    await browser.runtime.sendMessage({ action: 'refreshContextMenus' })
  } catch {
    // Ignore errors (e.g., background not ready)
  }
}

function createStaticMenus() {
  browser.contextMenus.create({
    id: MENU_ROOT,
    title: 'OriginTab',
    contexts: ['page'],
  })

  browser.contextMenus.create({
    id: MENU_SAVE_ALL,
    parentId: MENU_ROOT,
    title: browser.i18n.getMessage('saveAllTabs'),
    contexts: ['page'],
  })

  browser.contextMenus.create({
    id: MENU_SAVE_CURRENT,
    parentId: MENU_ROOT,
    title: browser.i18n.getMessage('saveCurrentTab'),
    contexts: ['page'],
  })
}

function createSaveToGroupMenus() {
  browser.contextMenus.create({
    id: MENU_SEPARATOR,
    parentId: MENU_ROOT,
    type: 'separator',
    contexts: ['page'],
  })

  browser.contextMenus.create({
    id: MENU_SAVE_ALL_TO_GROUP,
    parentId: MENU_ROOT,
    title: browser.i18n.getMessage('saveAllTabsToGroup'),
    contexts: ['page'],
  })

  browser.contextMenus.create({
    id: MENU_SAVE_CURRENT_TO_GROUP,
    parentId: MENU_ROOT,
    title: browser.i18n.getMessage('saveCurrentTabToGroup'),
    contexts: ['page'],
  })
}

function createGroupSubmenus(groups: { id: string; name: string }[]) {
  for (const group of groups) {
    browser.contextMenus.create({
      id: `${MENU_SAVE_ALL_TO_GROUP}:${group.id}`,
      parentId: MENU_SAVE_ALL_TO_GROUP,
      title: group.name,
      contexts: ['page'],
    })

    browser.contextMenus.create({
      id: `${MENU_SAVE_CURRENT_TO_GROUP}:${group.id}`,
      parentId: MENU_SAVE_CURRENT_TO_GROUP,
      title: group.name,
      contexts: ['page'],
    })
  }
}

async function removeSaveToGroupMenus() {
  for (const id of [
    MENU_SEPARATOR,
    MENU_SAVE_ALL_TO_GROUP,
    MENU_SAVE_CURRENT_TO_GROUP,
  ]) {
    try {
      await browser.contextMenus.remove(id)
    } catch {
      // Ignore if doesn't exist
    }
  }
}

export async function createContextMenus() {
  try {
    await browser.contextMenus.removeAll()

    createStaticMenus()

    const groups = await getUserGroups()
    if (groups.length > 1) {
      createSaveToGroupMenus()
      createGroupSubmenus(groups)
    }
  } catch (error) {
    console.error('Failed to create context menus:', error)
  }
}

export async function refreshContextMenus() {
  try {
    const groups = await getUserGroups()

    if (groups.length <= 1) {
      await removeSaveToGroupMenus()
      return
    }

    // ContextMenu API doesn't support reordering, so we have to
    // remove all and recreate to maintain the correct order
    await removeSaveToGroupMenus()
    createSaveToGroupMenus()
    createGroupSubmenus(groups)
  } catch (error) {
    console.error('Failed to refresh context menus:', error)
  }
}

export function handleContextMenuClick(info: { menuItemId: string | number }) {
  const { menuItemId } = info

  if (menuItemId === MENU_SAVE_ALL) {
    collectAllTabs()
  } else if (menuItemId === MENU_SAVE_CURRENT) {
    collectCurrentTab()
  } else if (typeof menuItemId === 'string') {
    if (menuItemId.startsWith(`${MENU_SAVE_ALL_TO_GROUP}:`)) {
      collectAllTabs(menuItemId.split(':')[1])
    } else if (menuItemId.startsWith(`${MENU_SAVE_CURRENT_TO_GROUP}:`)) {
      collectCurrentTab(menuItemId.split(':')[1])
    }
  }
}

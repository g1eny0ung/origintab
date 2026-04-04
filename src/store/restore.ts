import type { SelectedTabRef, TabGroup } from '~/utils/types'

import { db } from './base'
import { deleteTabGroup } from './tabGroups'
import {
  filterTabsByIds,
  removeTabFromGroup,
  updateOrDeleteGroup,
} from './tabs'

interface RestoreOptions {
  active?: boolean
  newWindow?: boolean
}

function waitForTabLoadThenDiscard(newTab: Browser.tabs.Tab) {
  let title: string | undefined
  let favIconUrl: string | undefined
  let timeoutId: number | undefined

  const listener = (tabId: number, changeInfo: Browser.tabs.OnUpdatedInfo) => {
    if (tabId === newTab.id && changeInfo.title) {
      title = changeInfo.title
    }

    if (tabId === newTab.id && changeInfo.favIconUrl) {
      favIconUrl = changeInfo.favIconUrl
    }

    if (title && favIconUrl) {
      browser.tabs.discard(tabId)
      browser.tabs.onUpdated.removeListener(listener)
      clearTimeout(timeoutId)
    }
  }

  browser.tabs.onUpdated.addListener(listener)
  // Set a timeout to remove listener if tab takes too long to load, give up discard it.
  timeoutId = window.setTimeout(() => {
    browser.tabs.onUpdated.removeListener(listener)
  }, 10000)
}

async function createTabInGroup(tabInfo: { url: string; active: boolean }) {
  return browser.tabs.create({ ...tabInfo }).then(waitForTabLoadThenDiscard)
}

export async function restoreGroup(
  groupId: string,
  options: RestoreOptions = {},
) {
  const { newWindow = false } = options
  const group = await db.tabGroups.get(groupId)

  if (!group || group.tabs.length === 0) {
    throw new Error('Group not found or empty')
  }

  const tabs = group.tabs.map((t) => t.url)
  if (newWindow) {
    browser.windows
      .create({
        url: tabs,
        focused: true,
      })
      .then((win) => {
        win?.tabs?.forEach(waitForTabLoadThenDiscard)
      })
  } else {
    tabs.map((url, i) => {
      createTabInGroup({
        url,
        active: i === 0 ? true : false,
      })
    })
  }
}

export async function restoreAndDeleteGroup(
  groupId: string,
  options: RestoreOptions = {},
) {
  await restoreGroup(groupId, options)
  await deleteTabGroup(groupId)
}

export async function restoreTab(
  groupId: string,
  tabId: string,
  options: RestoreOptions = {},
) {
  const { active = false } = options
  const group = await db.tabGroups.get(groupId)

  if (!group) {
    throw new Error('Group not found')
  }

  const tab = group.tabs.find((t) => t.id === tabId)
  if (!tab) {
    throw new Error('Tab not found')
  }

  await browser.tabs.create({ url: tab.url, active })
}

export async function restoreAndDeleteTab(
  groupId: string,
  tabId: string,
  options: RestoreOptions = {},
) {
  await restoreTab(groupId, tabId, options)
  await removeTabFromGroup(groupId, tabId)
}

export async function restoreSelectedTabs(
  selectedTabs: SelectedTabRef[],
  options: RestoreOptions & { remove?: boolean } = {},
) {
  if (selectedTabs.length === 0) {
    return
  }

  const { active = false, remove = false } = options
  const sourceGroupsById = new Map<string, TabGroup>()

  for (const groupId of new Set(selectedTabs.map((tab) => tab.tabGroupId))) {
    sourceGroupsById.set(groupId, (await db.tabGroups.get(groupId))!)
  }

  // Open tabs sequentially so the first restored tab can reliably become active.
  for (const [index, { tabGroupId, tabId }] of selectedTabs.entries()) {
    const sourceGroup = sourceGroupsById.get(tabGroupId)!
    const tab = sourceGroup.tabs.find((sourceTab) => sourceTab.id === tabId)!

    await browser.tabs.create({
      url: tab.url,
      active: active && index === 0,
    })
  }

  if (!remove) {
    return
  }

  await db.transaction('rw', db.tabGroups, async () => {
    // Delete only after restore succeeds, so a failed restore does not lose data.
    const selectedTabIdsByGroupId = new Map<string, Set<string>>()

    for (const { tabGroupId, tabId } of selectedTabs) {
      const selectedTabIds = selectedTabIdsByGroupId.get(tabGroupId)

      if (!selectedTabIds) {
        selectedTabIdsByGroupId.set(tabGroupId, new Set([tabId]))
      } else {
        selectedTabIds.add(tabId)
      }
    }

    for (const [groupId, selectedTabIds] of selectedTabIdsByGroupId) {
      const sourceGroup = sourceGroupsById.get(groupId)!
      const remainingTabs = filterTabsByIds(sourceGroup.tabs, selectedTabIds)

      await updateOrDeleteGroup(groupId, remainingTabs)
    }
  })
}

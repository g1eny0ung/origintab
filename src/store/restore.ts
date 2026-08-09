import { canRestoreBrowserTabGroups } from '~/utils/browserTabGroups'
import type {
  BrowserTabGroup,
  SelectedTabRef,
  TabGroup,
  TabItem,
} from '~/utils/types'

import { db } from './base'
import { removeSelectedTabs, removeTabFromGroup } from './tabs'

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

async function recreateBrowserTabGroups(
  sourceTabs: TabItem[],
  restoredTabs: Browser.tabs.Tab[],
  browserTabGroups: BrowserTabGroup[] | undefined,
  windowId?: number,
) {
  if (!browserTabGroups || !canRestoreBrowserTabGroups()) {
    return
  }

  const browserTabGroupById = new Map(
    browserTabGroups.map((group) => [group.id, group]),
  )
  const orderedBrowserTabGroupIds = [
    ...new Set(
      sourceTabs.flatMap((tab) =>
        tab.browserTabGroupId ? [tab.browserTabGroupId] : [],
      ),
    ),
  ]

  for (const savedGroupId of orderedBrowserTabGroupIds) {
    const savedGroup = browserTabGroupById.get(savedGroupId)
    if (!savedGroup) {
      continue
    }

    const tabIds = sourceTabs.flatMap((tab, index) => {
      const restoredTabId = restoredTabs[index]?.id

      return tab.browserTabGroupId === savedGroupId &&
        restoredTabId !== undefined
        ? [restoredTabId]
        : []
    })

    if (tabIds.length === 0) {
      continue
    }

    const containsActiveTab = restoredTabs.some(
      (tab) => tab.active && tab.id !== undefined && tabIds.includes(tab.id),
    )

    const groupId = await browser.tabs.group({
      tabIds: tabIds as [number, ...number[]],
      ...(windowId === undefined ? {} : { createProperties: { windowId } }),
    })

    await browser.tabGroups.update(groupId, {
      title: savedGroup.title,
      color: savedGroup.color,
      // A collapsed group hides its tabs. Keep the group containing the
      // requested active tab visible so OpenAndJump remains effective.
      collapsed: savedGroup.collapsed && !containsActiveTab,
    })
  }
}

async function restoreTabs(
  tabs: TabItem[],
  browserTabGroups: BrowserTabGroup[] | undefined,
  options: RestoreOptions,
) {
  const { active = false, newWindow = false } = options
  const savedBrowserGroupIds = new Set(
    (browserTabGroups ?? []).map((browserTabGroup) => browserTabGroup.id),
  )
  const hasGroupedTabs = tabs.some(
    (tab) =>
      tab.browserTabGroupId && savedBrowserGroupIds.has(tab.browserTabGroupId),
  )
  // Unsupported browsers still restore every URL; they only omit the native
  // grouping step and therefore do not need exact restored-tab ID mapping.
  const shouldRecreateBrowserTabGroups =
    hasGroupedTabs && canRestoreBrowserTabGroups()

  if (newWindow) {
    const restoredWindow = await browser.windows.create({
      url: tabs.map((tab) => tab.url),
      focused: true,
    })
    let restoredTabs = restoredWindow?.tabs ?? []

    if (
      shouldRecreateBrowserTabGroups &&
      restoredTabs.length < tabs.length &&
      restoredWindow?.id !== undefined
    ) {
      restoredTabs = await browser.tabs.query({ windowId: restoredWindow.id })
      restoredTabs.sort((left, right) => left.index - right.index)
    }

    if (
      shouldRecreateBrowserTabGroups &&
      (restoredTabs.length !== tabs.length ||
        restoredTabs.some((tab) => tab.id === undefined))
    ) {
      throw new Error('Unable to identify restored tabs for grouping')
    }

    restoredTabs.forEach(waitForTabLoadThenDiscard)
    await recreateBrowserTabGroups(
      tabs,
      restoredTabs,
      browserTabGroups,
      restoredWindow?.id,
    )
    return
  }

  const restoredTabs: Browser.tabs.Tab[] = []

  for (const [index, tab] of tabs.entries()) {
    const restoredTab = await browser.tabs.create({
      url: tab.url,
      active: active && index === 0,
    })

    restoredTabs.push(restoredTab)
    waitForTabLoadThenDiscard(restoredTab)
  }

  if (
    shouldRecreateBrowserTabGroups &&
    restoredTabs.some((tab) => tab.id === undefined)
  ) {
    throw new Error('Unable to identify restored tabs for grouping')
  }

  await recreateBrowserTabGroups(tabs, restoredTabs, browserTabGroups)
}

async function restoreSavedTabGroup(
  groupId: string,
  options: RestoreOptions = {},
) {
  const group = await db.tabGroups.get(groupId)

  if (!group || group.tabs.length === 0) {
    throw new Error('Group not found or empty')
  }

  await restoreTabs(group.tabs, group.browserTabGroups, options)
  return group
}

export async function restoreGroup(
  groupId: string,
  options: RestoreOptions = {},
) {
  await restoreSavedTabGroup(groupId, options)
}

export async function restoreAndDeleteGroup(
  groupId: string,
  options: RestoreOptions = {},
) {
  const group = await restoreSavedTabGroup(groupId, options)

  // Remove exactly the snapshot that was restored. Tabs added concurrently
  // stay saved instead of being deleted without ever having been opened.
  await removeSelectedTabs(
    group.tabs.map((tab) => ({ tabGroupId: group.id, tabId: tab.id })),
  )
}

async function restoreSavedBrowserTabGroup(
  groupId: string,
  browserTabGroupId: string,
  options: RestoreOptions,
) {
  const group = await db.tabGroups.get(groupId)
  const browserTabGroup = group?.browserTabGroups?.find(
    (savedGroup) => savedGroup.id === browserTabGroupId,
  )
  const tabs = group?.tabs.filter(
    (tab) => tab.browserTabGroupId === browserTabGroupId,
  )

  if (!group || !browserTabGroup || !tabs || tabs.length === 0) {
    throw new Error('Browser tab group not found or empty')
  }

  await restoreTabs(tabs, [browserTabGroup], options)
  return { group, tabs }
}

export async function restoreBrowserTabGroup(
  groupId: string,
  browserTabGroupId: string,
  options: RestoreOptions = {},
) {
  await restoreSavedBrowserTabGroup(groupId, browserTabGroupId, options)
}

export async function restoreAndDeleteBrowserTabGroup(
  groupId: string,
  browserTabGroupId: string,
  options: RestoreOptions = {},
) {
  const { group, tabs } = await restoreSavedBrowserTabGroup(
    groupId,
    browserTabGroupId,
    options,
  )

  await removeSelectedTabs(
    tabs.map((tab) => ({ tabGroupId: group.id, tabId: tab.id })),
  )
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
    const sourceGroup = await db.tabGroups.get(groupId)

    if (!sourceGroup) {
      throw new Error('One or more selected tab groups were not found')
    }

    sourceGroupsById.set(groupId, sourceGroup)
  }

  const tabsToRestore = selectedTabs.map(({ tabGroupId, tabId }) => {
    const tab = sourceGroupsById
      .get(tabGroupId)
      ?.tabs.find((sourceTab) => sourceTab.id === tabId)

    if (!tab) {
      throw new Error('One or more selected tabs were not found')
    }

    return tab
  })

  // Open tabs sequentially so the first restored tab can reliably become active.
  for (const [index, tab] of tabsToRestore.entries()) {
    await browser.tabs.create({
      url: tab.url,
      active: active && index === 0,
    })
  }

  if (!remove) {
    return
  }

  // Delete only after every restore succeeds, using the latest stored groups.
  await removeSelectedTabs(selectedTabs)
}

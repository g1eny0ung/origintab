import {
  createTabGroup,
  generateId,
  getLastUserGroup,
  getUserGroup,
} from '~/store'
import { getLocalSettings } from '~/store/localSettings'
import { canReadBrowserTabGroups } from '~/utils/browserTabGroups'
import { findOriginTab } from '~/utils/helpers'
import type { BrowserTabGroup, TabItem } from '~/utils/types'

type TabCollectionDirection = 'left' | 'right'
type CollectableTab = Browser.tabs.Tab & { id: number; url: string }

async function snapshotBrowserTabGroups(tabs: Browser.tabs.Tab[]) {
  const browserTabGroups: BrowserTabGroup[] = []
  const savedGroupIdByBrowserGroupId = new Map<number, string>()

  const browserGroupIds = [
    ...new Set(
      tabs
        .map((tab) => tab.groupId)
        .filter((groupId) => groupId !== undefined && groupId !== -1),
    ),
  ]

  if (browserGroupIds.length === 0) {
    return { browserTabGroups, savedGroupIdByBrowserGroupId }
  }

  if (!canReadBrowserTabGroups()) {
    // Older browsers expose groupId on tabs inconsistently or not at all.
    // Save every tab normally and simply omit native-group metadata.
    return { browserTabGroups, savedGroupIdByBrowserGroupId }
  }

  const snapshots = await Promise.all(
    browserGroupIds.map(async (browserGroupId) => {
      const browserGroup = await browser.tabGroups.get(browserGroupId)
      const savedGroupId = generateId()

      return {
        browserGroupId,
        browserTabGroup: {
          id: savedGroupId,
          title: browserGroup.title,
          color: browserGroup.color,
          collapsed: browserGroup.collapsed,
        },
      }
    }),
  )

  for (const snapshot of snapshots) {
    browserTabGroups.push(snapshot.browserTabGroup)
    savedGroupIdByBrowserGroupId.set(
      snapshot.browserGroupId,
      snapshot.browserTabGroup.id,
    )
  }

  return { browserTabGroups, savedGroupIdByBrowserGroupId }
}

async function getTargetGroupId(userGroupId?: string) {
  if (userGroupId) {
    return userGroupId
  }

  const localSettings = await getLocalSettings()
  if (localSettings.defaultUserGroupId) {
    const userGroup = await getUserGroup(localSettings.defaultUserGroupId)
    if (userGroup) {
      return localSettings.defaultUserGroupId
    }
  }

  return (await getLastUserGroup())?.id
}

async function collectTabs(tabs: Browser.tabs.Tab[], userGroupId?: string) {
  const existingOriginTabId = await findOriginTab()

  const validTabs = tabs.filter((tab): tab is CollectableTab => {
    if (
      tab.id === undefined ||
      !tab.url ||
      tab.id === existingOriginTabId ||
      tab.url === 'about:newtab' ||
      tab.url === 'about:blank' ||
      tab.pinned
    ) {
      return false
    }
    return true
  })

  if (validTabs.length === 0) {
    return
  }

  const { browserTabGroups, savedGroupIdByBrowserGroupId } =
    await snapshotBrowserTabGroups(validTabs)
  const createdAt = Date.now()
  const tabItems: TabItem[] = validTabs.map((tab) => ({
    id: '',
    title: tab.title || 'Untitled',
    url: tab.url,
    favicon: tab.favIconUrl,
    createdAt,
    browserTabGroupId:
      tab.groupId === undefined
        ? undefined
        : savedGroupIdByBrowserGroupId.get(tab.groupId),
  }))

  await createTabGroup(
    tabItems,
    await getTargetGroupId(userGroupId),
    browserTabGroups,
  )
  await browser.tabs.remove(validTabs.map((tab) => tab.id))
}

export async function collectCurrentTab(userGroupId?: string) {
  try {
    const [activeTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })

    if (!activeTab || activeTab.id === undefined || !activeTab.url) {
      console.info('No active tab found')
      return
    }

    await collectTabs([activeTab], userGroupId)
  } catch (error) {
    console.error('Failed to collect current tab:', error)
  }
}

export async function collectAllTabs(userGroupId?: string) {
  try {
    const tabs = await browser.tabs.query({ currentWindow: true })
    await collectTabs(tabs, userGroupId)
  } catch (error) {
    console.error('Failed to collect tabs:', error)
  }
}

export async function collectCurrentAndAdjacentTabs(
  direction: TabCollectionDirection,
  userGroupId?: string,
) {
  try {
    const tabs = await browser.tabs.query({ currentWindow: true })
    const activeTab = tabs.find((tab) => tab.active)

    if (!activeTab) {
      console.info('No active tab found')
      return
    }

    const tabsToCollect = tabs.filter((tab) => {
      if (direction === 'left') {
        return tab.index <= activeTab.index
      }
      return tab.index >= activeTab.index
    })

    await collectTabs(tabsToCollect, userGroupId)
  } catch (error) {
    console.error(`Failed to collect current and ${direction} tabs:`, error)
  }
}

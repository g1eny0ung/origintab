import { createTabGroup, getLastUserGroup, getUserGroup } from '~/store'
import { getLocalSettings } from '~/store/localSettings'
import { findOriginTab } from '~/utils/helpers'
import type { TabItem } from '~/utils/types'

type TabCollectionDirection = 'left' | 'right'

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

  const validTabs = tabs.filter((tab) => {
    if (
      !tab.id ||
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

  const createdAt = Date.now()
  const tabItems: TabItem[] = validTabs.map((tab) => ({
    id: '',
    title: tab.title || 'Untitled',
    url: tab.url!,
    favicon: tab.favIconUrl,
    createdAt,
  }))

  await createTabGroup(tabItems, await getTargetGroupId(userGroupId))
  await browser.tabs.remove(validTabs.map((tab) => tab.id!))
}

export async function collectCurrentTab(userGroupId?: string) {
  try {
    const [activeTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })

    if (!activeTab || !activeTab.id || !activeTab.url) {
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

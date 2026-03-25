import { createTabGroup, getLastUserGroup } from '~/store'
import { findOriginTab, getOriginTabUrl } from '~/utils/helpers'
import type { TabItem } from '~/utils/types'

async function getTargetGroupId(userGroupId?: string) {
  return userGroupId || (await getLastUserGroup())?.id
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

    if (activeTab.url === getOriginTabUrl()) {
      return
    }

    if (activeTab.url === 'about:newtab' || activeTab.url === 'about:blank') {
      console.info('Cannot collect new tab page')
      return
    }

    if (activeTab.pinned) {
      console.info('Skip pinned tab')
      return
    }

    const tabItem: TabItem = {
      id: '',
      title: activeTab.title || 'Untitled',
      url: activeTab.url,
      favicon: activeTab.favIconUrl,
      createdAt: Date.now(),
    }

    await createTabGroup([tabItem], await getTargetGroupId(userGroupId))

    await browser.tabs.remove(activeTab.id)
  } catch (error) {
    console.error('Failed to collect current tab:', error)
  }
}

export async function collectAllTabs(userGroupId?: string) {
  try {
    const tabs = await browser.tabs.query({ currentWindow: true })
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

    const tabItems: TabItem[] = validTabs.map((tab) => ({
      id: '',
      title: tab.title || 'Untitled',
      url: tab.url!,
      favicon: tab.favIconUrl,
      createdAt: Date.now(),
    }))

    await createTabGroup(tabItems, await getTargetGroupId(userGroupId))

    const collectedTabIds = validTabs.map((tab) => tab.id!)
    const tabsToClose = existingOriginTabId
      ? collectedTabIds.filter((id) => id !== existingOriginTabId)
      : collectedTabIds

    if (tabsToClose.length > 0) {
      await browser.tabs.remove(tabsToClose)
    }
  } catch (error) {
    console.error('Failed to collect tabs:', error)
  }
}

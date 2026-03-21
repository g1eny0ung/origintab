import {
  Settings,
  createTabGroup,
  getLastUserGroup,
  getSettings,
} from '~/store'
import {
  createOriginTab,
  findOriginTab,
  getOriginTabUrl,
  openOriginTab,
} from '~/utils/helpers'
import { ClickAction, type TabItem } from '~/utils/types'

// Notify all origintab pages to refresh (for settings changes)
async function notifyOriginTabUpdate() {
  const originTabId = await findOriginTab()

  if (originTabId) {
    await browser.tabs.sendMessage(originTabId, { action: 'dataUpdated' })
  }
}

// Collect current tab only
async function collectCurrentTab(userGroupId?: string) {
  try {
    // Get current active tab
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

    // Convert to storage format
    const tabItem: TabItem = {
      id: '', // Will be generated in createTabGroup
      title: activeTab.title || 'Untitled',
      url: activeTab.url,
      favicon: activeTab.favIconUrl,
      createdAt: Date.now(),
    }

    // Save tab
    await createTabGroup(
      [tabItem],
      userGroupId || (await getLastUserGroup())?.id,
    )

    // Close the original tab
    await browser.tabs.remove(activeTab.id)
  } catch (error) {
    console.error('Failed to collect current tab:', error)
  }
}

// Collect all tabs
async function collectAllTabs(userGroupId?: string) {
  try {
    // Get all tabs in current window
    const tabs = await browser.tabs.query({ currentWindow: true })

    // Find existing OriginTab
    const existingOriginTabId = await findOriginTab()

    // Filter out extension pages, invalid tabs, and existing OriginTab
    const validTabs = tabs.filter((tab) => {
      // Exclude OriginTab page
      // Exclude new tab pages
      // Exclude pinned tabs
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
      // No tabs to collect
      return
    }

    // Convert to storage format
    const tabItems: TabItem[] = validTabs.map((tab) => ({
      id: '', // Will be generated in createTabGroup
      title: tab.title || 'Untitled',
      url: tab.url!,
      favicon: tab.favIconUrl,
      createdAt: Date.now(),
    }))

    // Save tabs
    await createTabGroup(
      tabItems,
      userGroupId || (await getLastUserGroup())?.id,
    )

    // Close collected tabs (exclude existing OriginTab if it was open)
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

// Update action behavior based on settings
async function updateActionBehavior() {
  try {
    const clickAction = (await getSettings()).clickAction

    if (clickAction === 'showPopup') {
      // Show popup when clicked
      await browser.action.setPopup({ popup: 'popup.html' })
    } else {
      // No popup, use onClicked listener
      await browser.action.setPopup({ popup: '' })
    }
  } catch (error) {
    console.error('Failed to update action behavior:', error)
  }
}

// Handle icon click based on settings
async function handleIconClick() {
  const originTab = await findOriginTab()
  if (!originTab) {
    await createOriginTab()
  }

  try {
    const clickAction = (await getSettings()).clickAction

    switch (clickAction) {
      case ClickAction.SaveCurrent:
        await collectCurrentTab()
        break
      case ClickAction.SaveAll:
      default:
        await collectAllTabs()
        break
    }
  } catch (error) {
    console.error('Failed to handle icon click:', error)
  }
}

// Background script main entry
export default defineBackground(() => {
  // Initialize action behavior
  updateActionBehavior()

  // Listen for settings changes
  storage.watch<Settings>('sync:settings', () => {
    updateActionBehavior()
    notifyOriginTabUpdate()
  })

  // Listen for extension icon click (only when popup is not set)
  browser.action.onClicked.addListener(() => {
    handleIconClick()
  })

  // Listen for messages from popup
  browser.runtime.onMessage.addListener(
    async (message: { action: string; userGroupId?: string }) => {
      switch (message.action) {
        case 'collectTabs':
          await collectAllTabs(message.userGroupId)
          break
        case 'collectCurrentTab':
          await collectCurrentTab(message.userGroupId)
          break
        case 'openOriginTab':
          await openOriginTab()
          break
        default:
          break
      }
    },
  )

  // Open management page on install and update behavior
  browser.runtime.onInstalled.addListener(async (details) => {
    // Update action behavior on install/update
    await updateActionBehavior()

    if (details.reason === 'install') {
      // On first install, open with default settings (auto-open and auto-pin enabled)
      await openOriginTab()
    }
  })

  // Open OriginTab on browser startup (respects user settings)
  browser.runtime.onStartup.addListener(() => {
    openOriginTab()
  })
})

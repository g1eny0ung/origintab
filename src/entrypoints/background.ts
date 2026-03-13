import { saveTabs, getDefaultGroupId } from '~/utils/storage'
import type { TabItem, ClickAction } from '~/utils/types'
import { storage } from '@wxt-dev/storage'

// Get OriginTab page URL
function getOriginTabUrl(): string {
  return browser.runtime.getURL('/origintab.html')
}

// Check if OriginTab page is already open
async function findOriginTab(): Promise<number | undefined> {
  const tabs = await browser.tabs.query({})
  const originTabUrl = getOriginTabUrl()
  const originTab = tabs.find((tab) => tab.url?.startsWith(originTabUrl))
  return originTab?.id
}

// Notify all origintab pages to refresh
async function notifyOriginTabUpdate(): Promise<void> {
  const tabs = await browser.tabs.query({})
  const originTabUrl = getOriginTabUrl()
  
  for (const tab of tabs) {
    if (tab.url?.startsWith(originTabUrl) && tab.id) {
      try {
        await browser.tabs.sendMessage(tab.id, { action: 'dataUpdated' })
      } catch {
        // Tab may not have content script loaded yet, ignore
      }
    }
  }
}

// Collect current tab only
async function collectCurrentTab(userGroupId?: string): Promise<void> {
  try {
    // Get current active tab
    const [activeTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })

    if (!activeTab || !activeTab.url || !activeTab.id) {
      console.error('No active tab found')
      return
    }

    // Exclude extension pages and invalid URLs
    if (
      activeTab.url.startsWith('chrome-extension://') ||
      activeTab.url.startsWith('moz-extension://')
    ) {
      console.error('Cannot collect extension page')
      return
    }
    if (activeTab.url.includes('/origintab.html')) {
      console.error('Cannot collect OriginTab page')
      return
    }
    if (
      activeTab.url === 'chrome://newtab/' ||
      activeTab.url === 'about:newtab' ||
      activeTab.url === 'about:home'
    ) {
      console.error('Cannot collect new tab page')
      return
    }

    // Convert to storage format
    const tabItem: TabItem = {
      id: '', // Will be generated in saveTabs
      title: activeTab.title || 'Untitled',
      url: activeTab.url,
      favicon: activeTab.favIconUrl,
      createdAt: Date.now(),
    }

    // Save tab
    await saveTabs([tabItem], userGroupId || getDefaultGroupId())

    // Notify origintab pages to update
    await notifyOriginTabUpdate()

    // Close the original tab
    await browser.tabs.remove(activeTab.id)
  } catch (error) {
    console.error('Failed to collect current tab:', error)
  }
}

// Collect all tabs
async function collectAllTabs(userGroupId?: string): Promise<void> {
  try {
    // Get all tabs in current window
    const tabs = await browser.tabs.query({ currentWindow: true })

    // Find existing OriginTab
    const existingOriginTabId = await findOriginTab()

    // Filter out extension pages, invalid tabs, and existing OriginTab
    const validTabs = tabs.filter((tab) => {
      if (!tab.url || !tab.id) return false
      // Exclude extension pages
      if (
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('moz-extension://')
      )
        return false
      // Exclude OriginTab page
      if (tab.url.includes('/origintab.html')) return false
      // Exclude new tab pages
      if (
        tab.url === 'chrome://newtab/' ||
        tab.url === 'about:newtab' ||
        tab.url === 'about:home'
      )
        return false
      return true
    })

    if (validTabs.length === 0) {
      // No tabs to collect
      return
    }

    // Convert to storage format
    const tabItems: TabItem[] = validTabs.map((tab) => ({
      id: '', // Will be generated in saveTabs
      title: tab.title || 'Untitled',
      url: tab.url!,
      favicon: tab.favIconUrl,
      createdAt: Date.now(),
    }))

    // Save tabs
    await saveTabs(tabItems, userGroupId || getDefaultGroupId())

    // Notify origintab pages to update
    await notifyOriginTabUpdate()

    // Close collected tabs (exclude existing OriginTab if it was open)
    const tabIdsToClose = validTabs.map((tab) => tab.id!)
    const idsToClose = existingOriginTabId
      ? tabIdsToClose.filter((id) => id !== existingOriginTabId)
      : tabIdsToClose

    if (idsToClose.length > 0) {
      await browser.tabs.remove(idsToClose)
    }
  } catch (error) {
    console.error('Failed to collect tabs:', error)
  }
}

// Open OriginTab page on browser startup based on settings
async function openOriginTabOnStartup(): Promise<void> {
  try {
    // Check if auto-open is enabled
    const autoOpen = await storage.getItem<boolean>('local:autoOpenOnStartup')
    if (autoOpen === false) {
      return // Disabled, do nothing
    }

    const existingTabId = await findOriginTab()

    if (existingTabId) {
      // If exists, pin it
      await browser.tabs.update(existingTabId, { pinned: true })
    } else {
      // Create new tab and pin it
      const tab = await browser.tabs.create({
        url: getOriginTabUrl(),
        pinned: true,
        index: 0, // Place at leftmost
      })
      // Ensure active
      if (tab.id) {
        await browser.tabs.update(tab.id, { active: true })
      }
    }
  } catch (error) {
    console.error('Failed to open OriginTab on startup:', error)
  }
}

// Update action behavior based on settings
async function updateActionBehavior(): Promise<void> {
  try {
    const clickAction =
      (await storage.getItem<ClickAction>('local:clickAction')) ?? 'saveAll'

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
async function handleIconClick(): Promise<void> {
  try {
    const clickAction =
      (await storage.getItem<ClickAction>('local:clickAction')) ?? 'saveAll'

    switch (clickAction) {
      case 'saveCurrent':
        await collectCurrentTab()
        break
      case 'saveAll':
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
  console.log('OriginTab background script loaded')

  // Initialize action behavior
  updateActionBehavior()

  // Listen for settings changes
  storage.watch<ClickAction>('local:clickAction', () => {
    updateActionBehavior()
  })

  // Listen for extension icon click (only when popup is not set)
  browser.action.onClicked.addListener(async () => {
    await handleIconClick()
  })

  // Listen for messages from popup
  browser.runtime.onMessage.addListener(async (message) => {
    if (message.action === 'collectTabs') {
      await collectAllTabs(message.userGroupId)
    }
  })

  // Open management page on install and update behavior
  browser.runtime.onInstalled.addListener(async (details) => {
    // Update action behavior on install/update
    await updateActionBehavior()

    if (details.reason === 'install') {
      // On first install, open with default settings (auto-open and auto-pin enabled)
      await openOriginTabOnStartup()
    }
  })

  // Open OriginTab on browser startup (respects user settings)
  browser.runtime.onStartup.addListener(async () => {
    await openOriginTabOnStartup()
  })
})

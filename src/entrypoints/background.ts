import {
  DEFAULT_GROUP_ID,
  Settings,
  createTabGroup,
  getSettings,
} from '~/store'
import { ClickAction, type TabItem } from '~/utils/types'

// Get OriginTab page URL
function getOriginTabUrl(): string {
  return browser.runtime.getURL('/origintab.html')
}

// Check if OriginTab page is already open
async function findOriginTab() {
  const tabs = await browser.tabs.query({})
  const originTabUrl = getOriginTabUrl()
  const originTab = tabs.find((tab) => tab.url?.startsWith(originTabUrl))
  return originTab?.id
}

// Notify all origintab pages to refresh (for settings changes)
async function notifyOriginTabUpdate() {
  const originTabId = await findOriginTab()

  if (originTabId) {
    await browser.tabs.sendMessage(originTabId, { action: 'dataUpdated' })
  }
}

// Collect current tab only
async function collectCurrentTab() {
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

    if (
      activeTab.url === 'chrome://newtab/' ||
      activeTab.url === 'about:blank'
    ) {
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
    await createTabGroup([tabItem], DEFAULT_GROUP_ID)

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
        tab.url === 'chrome://newtab/' ||
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
    await createTabGroup(tabItems, userGroupId || DEFAULT_GROUP_ID)

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

async function openOriginTab() {
  return browser.tabs.create({
    url: getOriginTabUrl(),
    active: false,
    pinned: true,
    index: 0, // Place at leftmost
  })
}

// Open OriginTab page on browser startup based on settings
async function openOriginTabOnStartup() {
  try {
    const autoOpen = (await getSettings()).autoOpenOnStartup
    if (autoOpen === false) {
      return
    }

    const originTab = await findOriginTab()

    if (originTab) {
      // If exists, pin it
      await browser.tabs.update(originTab, { pinned: true })
    } else {
      await openOriginTab()
    }
  } catch (error) {
    console.error('Failed to open OriginTab on startup:', error)
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
    await openOriginTab()
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
  storage.watch<Settings>('local:settings', () => {
    updateActionBehavior()
    notifyOriginTabUpdate()
  })

  // Listen for extension icon click (only when popup is not set)
  browser.action.onClicked.addListener(() => {
    handleIconClick()
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
  browser.runtime.onStartup.addListener(() => {
    openOriginTabOnStartup()
  })
})

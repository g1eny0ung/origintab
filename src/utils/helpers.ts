import { getSettings } from '@/store'

export function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, length))
}

// Get OriginTab page URL
export function getOriginTabUrl(): string {
  return browser.runtime.getURL('/origintab.html')
}

// Check if OriginTab page is already open
export async function findOriginTab() {
  const tabs = await browser.tabs.query({})
  const originTabUrl = getOriginTabUrl()
  const originTab = tabs.find((tab) => tab.url?.startsWith(originTabUrl))
  return originTab?.id
}

export async function createOriginTab(options?: { active?: boolean }) {
  const { active = false } = options || {}

  return browser.tabs.create({
    url: getOriginTabUrl(),
    active,
    pinned: true,
    index: 0, // Place at leftmost
  })
}

export async function initOriginTab() {
  try {
    const settings = await getSettings()
    if (settings.autoOpenOnStartup === false) {
      return
    }

    const originTab = await findOriginTab()

    if (originTab) {
      // If exists, pin it
      await browser.tabs.update(originTab, { pinned: true })
    } else {
      await createOriginTab()
    }
  } catch (error) {
    console.error('Failed to open OriginTab on startup:', error)
  }
}

export async function returnOriginTab() {
  try {
    const originTab = await findOriginTab()

    if (originTab) {
      await browser.tabs.update(originTab, { active: true })
    } else {
      await createOriginTab({ active: true })
    }
  } catch (error) {
    console.error('Failed to return OriginTab:', error)
  }
}

// NOTE: https://stackoverflow.com/a/77213912/5676489
export function openOriginTabInSidePanel() {
  if (import.meta.env.BROWSER === 'firefox') {
    browser.sidebarAction.toggle()
  } else {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        browser.sidePanel.open({
          windowId: tabs[0].windowId,
        })
      }
    })
  }
}

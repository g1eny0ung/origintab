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

export async function createOriginTab() {
  return browser.tabs.create({
    url: getOriginTabUrl(),
    active: false,
    pinned: true,
    index: 0, // Place at leftmost
  })
}

export async function initOriginTab() {
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
      await createOriginTab()
    }
  } catch (error) {
    console.error('Failed to return OriginTab:', error)
  }
}

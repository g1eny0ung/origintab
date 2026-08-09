import type { BrowserTabGroup, TabItem } from './types'

export function canReadBrowserTabGroups() {
  return typeof browser.tabGroups?.get === 'function'
}

export function canRestoreBrowserTabGroups() {
  return (
    typeof browser.tabs.group === 'function' &&
    typeof browser.tabGroups?.update === 'function'
  )
}

interface BrowserTabGroupStats {
  firstIndex: number
  lastIndex: number
  count: number
}

type TabGroupListItem =
  | {
      type: 'browserTabGroupHeader'
      key: string
      browserTabGroup: BrowserTabGroup
      firstTabIndex: number
    }
  | {
      type: 'tab'
      key: string
      tab: TabItem
      index: number
      browserTabGroup?: BrowserTabGroup
    }

export function getTabGroupListItems(
  tabs: TabItem[],
  browserTabGroups: BrowserTabGroup[] | undefined,
) {
  const browserTabGroupById = new Map(
    (browserTabGroups ?? []).map((browserTabGroup) => [
      browserTabGroup.id,
      browserTabGroup,
    ]),
  )
  const renderedBrowserTabGroupIds = new Set<string>()
  const listItems: TabGroupListItem[] = []

  // A header is a separate keyed DOM item; otherwise dragging the first tab
  // would also move its native-group header.
  tabs.forEach((tab, index) => {
    const browserTabGroup = tab.browserTabGroupId
      ? browserTabGroupById.get(tab.browserTabGroupId)
      : undefined

    if (
      browserTabGroup &&
      !renderedBrowserTabGroupIds.has(browserTabGroup.id)
    ) {
      renderedBrowserTabGroupIds.add(browserTabGroup.id)
      listItems.push({
        type: 'browserTabGroupHeader',
        key: `browser-tab-group-header:${browserTabGroup.id}`,
        browserTabGroup,
        firstTabIndex: index,
      })
    }

    listItems.push({
      type: 'tab',
      key: `tab:${tab.id}`,
      tab,
      index,
      browserTabGroup,
    })
  })

  return listItems
}

export function getBrowserTabGroupStatsById(tabs: TabItem[]) {
  const statsById = new Map<string, BrowserTabGroupStats>()

  tabs.forEach((tab, index) => {
    const browserTabGroupId = tab.browserTabGroupId

    if (!browserTabGroupId) {
      return
    }

    const stats = statsById.get(browserTabGroupId)

    if (stats) {
      stats.lastIndex = index
      stats.count += 1
      return
    }

    statsById.set(browserTabGroupId, {
      firstIndex: index,
      lastIndex: index,
      count: 1,
    })
  })

  return statsById
}

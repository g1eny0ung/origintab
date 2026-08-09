import type { BrowserTabGroup, TabGroup, TabItem } from '../utils/types'
import { DEFAULT_GROUP_ID, db, generateId } from './base'

export function filterBrowserTabGroups(
  tabs: TabItem[],
  browserTabGroups: BrowserTabGroup[] | undefined,
) {
  if (!browserTabGroups) {
    return undefined
  }

  const referencedGroupIds = new Set(
    tabs.flatMap((tab) =>
      tab.browserTabGroupId ? [tab.browserTabGroupId] : [],
    ),
  )
  const seenGroupIds = new Set<string>()
  const filteredGroups = browserTabGroups.filter((group) => {
    if (!referencedGroupIds.has(group.id) || seenGroupIds.has(group.id)) {
      return false
    }

    seenGroupIds.add(group.id)
    return true
  })

  return filteredGroups.length > 0 ? filteredGroups : undefined
}

export function normalizeBrowserTabGroupData(
  tabs: TabItem[],
  browserTabGroups: BrowserTabGroup[] | undefined,
) {
  const knownGroupIds = new Set(
    (browserTabGroups ?? []).map((browserTabGroup) => browserTabGroup.id),
  )
  const cleanedTabs = tabs.map((tab) => {
    if (!tab.browserTabGroupId || knownGroupIds.has(tab.browserTabGroupId)) {
      return tab
    }

    const normalizedTab = { ...tab }
    delete normalizedTab.browserTabGroupId
    return normalizedTab
  })
  const tabsByBrowserGroupId = new Map<string, TabItem[]>()

  for (const tab of cleanedTabs) {
    if (tab.browserTabGroupId) {
      const groupedTabs = tabsByBrowserGroupId.get(tab.browserTabGroupId) ?? []
      groupedTabs.push(tab)
      tabsByBrowserGroupId.set(tab.browserTabGroupId, groupedTabs)
    }
  }

  const emittedBrowserGroupIds = new Set<string>()
  const normalizedTabs = cleanedTabs.flatMap((tab) => {
    if (!tab.browserTabGroupId) {
      return [tab]
    }

    if (emittedBrowserGroupIds.has(tab.browserTabGroupId)) {
      return []
    }

    // Native browser groups are contiguous. Preserve that invariant after
    // bulk moves so the UI and restore order describe one unambiguous block.
    emittedBrowserGroupIds.add(tab.browserTabGroupId)
    return tabsByBrowserGroupId.get(tab.browserTabGroupId) ?? []
  })

  return {
    tabs: normalizedTabs,
    browserTabGroups: filterBrowserTabGroups(normalizedTabs, browserTabGroups),
  }
}

export async function createTabGroup(
  tabs: TabItem[],
  userGroupId: string = DEFAULT_GROUP_ID,
  browserTabGroups?: BrowserTabGroup[],
) {
  if (tabs.length === 0) {
    throw new Error('No tabs to save')
  }

  // Newly collected tabs have no internal ID yet, while tabs moved between
  // saved collections must keep theirs.
  const normalizedData = normalizeBrowserTabGroupData(
    tabs.map((tab) => ({ ...tab, id: tab.id || generateId() })),
    browserTabGroups,
  )
  const newGroup: TabGroup = {
    id: generateId(),
    ...normalizedData,
    createdAt: Date.now(),
    userGroupId,
  }

  await db.tabGroups.add(newGroup)

  return newGroup
}

export async function deleteTabGroup(groupId: string) {
  await db.tabGroups.delete(groupId)
}

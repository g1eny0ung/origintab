import { clampIndex } from '~/utils/helpers'
import type {
  BrowserTabGroup,
  SelectedTabRef,
  TabGroup,
  TabItem,
} from '~/utils/types'

import { db } from './base'
import {
  createTabGroup,
  filterBrowserTabGroups,
  normalizeBrowserTabGroupData,
} from './tabGroups'

function mergeBrowserTabGroups(
  ...browserTabGroupLists: (BrowserTabGroup[] | undefined)[]
) {
  const browserTabGroupById = new Map<string, BrowserTabGroup>()

  for (const browserTabGroups of browserTabGroupLists) {
    for (const browserTabGroup of browserTabGroups ?? []) {
      browserTabGroupById.set(browserTabGroup.id, browserTabGroup)
    }
  }

  const browserTabGroups = [...browserTabGroupById.values()]
  return browserTabGroups.length > 0 ? browserTabGroups : undefined
}

export async function removeTabFromGroup(groupId: string, tabId: string) {
  await db.transaction('rw', db.tabGroups, async () => {
    const group = await db.tabGroups.get(groupId)

    if (!group) {
      return
    }

    const newTabs = group.tabs.filter((t) => t.id !== tabId)

    await updateOrDeleteGroup(groupId, newTabs, group)
  })
}

export async function removeBrowserTabGroup(
  groupId: string,
  browserTabGroupId: string,
) {
  await db.transaction('rw', db.tabGroups, async () => {
    const group = await db.tabGroups.get(groupId)

    if (!group) {
      return
    }

    const remainingTabs = group.tabs.filter(
      (tab) => tab.browserTabGroupId !== browserTabGroupId,
    )

    if (remainingTabs.length === group.tabs.length) {
      return
    }

    await updateOrDeleteGroup(groupId, remainingTabs, group)
  })
}

export async function updateTabTitle(
  groupId: string,
  tabId: string,
  title: string,
) {
  await db.transaction('rw', db.tabGroups, async () => {
    const group = await db.tabGroups.get(groupId)

    if (!group) {
      return
    }

    const newTabs = group.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, title } : tab,
    )

    await updateGroupTabs(groupId, newTabs, group.browserTabGroups)
  })
}

export async function moveTabBetweenGroups(
  sourceGroupId: string,
  targetGroupId: string,
  tabId: string,
  targetIndex: number,
  targetBrowserTabGroupId?: string | null,
) {
  await moveTabsBetweenGroups(
    sourceGroupId,
    targetGroupId,
    [tabId],
    targetIndex,
    targetBrowserTabGroupId,
  )
}

function moveTabsToBrowserTabGroup(
  tabs: TabItem[],
  browserTabGroupId: string | null | undefined,
) {
  // undefined preserves membership, null removes it, and an id joins a group.
  if (browserTabGroupId === undefined) {
    return tabs
  }

  return tabs.map((tab) => ({
    ...tab,
    browserTabGroupId: browserTabGroupId ?? undefined,
  }))
}

function getTabsByIds<
  T extends {
    id: string
  },
>(tabs: T[], tabIds: string[]) {
  const selectedTabIdSet = new Set(tabIds)

  return tabs.filter((tab) => selectedTabIdSet.has(tab.id))
}

function filterTabsByIds<T extends { id: string }>(
  tabs: T[],
  tabIdsToExclude: Set<string>,
) {
  return tabs.filter((tab) => !tabIdsToExclude.has(tab.id))
}

async function updateGroupTabs(
  groupId: string,
  tabs: TabItem[],
  browserTabGroups: BrowserTabGroup[] | undefined,
) {
  await db.tabGroups.update(
    groupId,
    normalizeBrowserTabGroupData(tabs, browserTabGroups),
  )
}

async function updateOrDeleteGroup(
  groupId: string,
  tabs: TabItem[],
  sourceGroup: TabGroup,
) {
  if (tabs.length === 0) {
    await db.tabGroups.delete(groupId)
  } else {
    await updateGroupTabs(groupId, tabs, sourceGroup.browserTabGroups)
  }
}

export async function moveTabsBetweenGroups(
  sourceGroupId: string,
  targetGroupId: string,
  tabIds: string[],
  targetIndex: number,
  targetBrowserTabGroupId?: string | null,
) {
  if (tabIds.length === 0) {
    return
  }

  await db.transaction('rw', db.tabGroups, async () => {
    const sourceGroup = await db.tabGroups.get(sourceGroupId)
    const targetGroup = await db.tabGroups.get(targetGroupId)

    if (!sourceGroup || !targetGroup) {
      throw new Error('Source or target tab group not found')
    }

    const movedTabs = getTabsByIds(sourceGroup.tabs, tabIds)

    if (movedTabs.length !== new Set(tabIds).size) {
      throw new Error('One or more tabs to move were not found')
    }

    if (
      targetBrowserTabGroupId &&
      !targetGroup.browserTabGroups?.some(
        (browserTabGroup) => browserTabGroup.id === targetBrowserTabGroupId,
      )
    ) {
      throw new Error('Target browser tab group not found')
    }

    const nextMovedTabs = moveTabsToBrowserTabGroup(
      movedTabs,
      targetBrowserTabGroupId,
    )

    const selectedTabIdSet = new Set(movedTabs.map((tab) => tab.id))

    if (sourceGroupId === targetGroupId) {
      const nextTabs = filterTabsByIds(sourceGroup.tabs, selectedTabIdSet)
      const nextIndex = clampIndex(targetIndex, nextTabs.length)
      nextTabs.splice(nextIndex, 0, ...nextMovedTabs)

      await updateGroupTabs(
        sourceGroupId,
        nextTabs,
        sourceGroup.browserTabGroups,
      )
      return
    }

    const nextSourceTabs = filterTabsByIds(sourceGroup.tabs, selectedTabIdSet)
    const nextTargetTabs = [...targetGroup.tabs]
    const nextIndex = clampIndex(targetIndex, nextTargetTabs.length)

    nextTargetTabs.splice(nextIndex, 0, ...nextMovedTabs)

    await updateOrDeleteGroup(sourceGroupId, nextSourceTabs, sourceGroup)
    await updateGroupTabs(
      targetGroupId,
      nextTargetTabs,
      targetBrowserTabGroupId === undefined
        ? mergeBrowserTabGroups(
            targetGroup.browserTabGroups,
            filterBrowserTabGroups(movedTabs, sourceGroup.browserTabGroups),
          )
        : targetGroup.browserTabGroups,
    )
  })
}

export async function moveTabsToNewGroupInUserGroup(
  sourceGroupId: string,
  userGroupId: string,
  tabIds: string[],
  targetBrowserTabGroupId?: string | null,
) {
  if (tabIds.length === 0) {
    return
  }

  await db.transaction('rw', db.tabGroups, async () => {
    const sourceGroup = await db.tabGroups.get(sourceGroupId)

    if (!sourceGroup) {
      throw new Error('Source tab group not found')
    }

    if (
      targetBrowserTabGroupId &&
      !sourceGroup.browserTabGroups?.some(
        (browserTabGroup) => browserTabGroup.id === targetBrowserTabGroupId,
      )
    ) {
      throw new Error('Target browser tab group not found')
    }

    const movedTabs = moveTabsToBrowserTabGroup(
      getTabsByIds(sourceGroup.tabs, tabIds),
      targetBrowserTabGroupId,
    )

    if (movedTabs.length !== new Set(tabIds).size) {
      throw new Error('One or more tabs to move were not found')
    }

    const selectedTabIdSet = new Set(movedTabs.map((tab) => tab.id))
    const remainingTabs = filterTabsByIds(sourceGroup.tabs, selectedTabIdSet)

    await updateOrDeleteGroup(sourceGroupId, remainingTabs, sourceGroup)

    await createTabGroup(
      movedTabs,
      userGroupId,
      targetBrowserTabGroupId !== null
        ? filterBrowserTabGroups(movedTabs, sourceGroup.browserTabGroups)
        : undefined,
    )
  })
}

export async function moveSelectedTabsToUserGroup(
  selectedTabs: SelectedTabRef[],
  userGroupId: string,
) {
  if (selectedTabs.length === 0) {
    return
  }

  const uniqueSelectedTabs = [
    ...new Map(
      selectedTabs.map((selectedTab) => [
        `${selectedTab.tabGroupId}\0${selectedTab.tabId}`,
        selectedTab,
      ]),
    ).values(),
  ]

  await db.transaction('rw', db.tabGroups, async () => {
    const sourceGroupsById = new Map<string, TabGroup>()

    for (const groupId of new Set(
      uniqueSelectedTabs.map((tab) => tab.tabGroupId),
    )) {
      const sourceGroup = await db.tabGroups.get(groupId)

      if (!sourceGroup) {
        throw new Error('One or more source tab groups were not found')
      }

      sourceGroupsById.set(groupId, sourceGroup)
    }

    const movedTabs: TabItem[] = []
    const movedBrowserTabGroups: BrowserTabGroup[] = []
    const tabIdsToRemoveByGroup = new Map<string, Set<string>>()

    for (const { tabGroupId, tabId } of uniqueSelectedTabs) {
      const sourceGroup = sourceGroupsById.get(tabGroupId)

      if (!sourceGroup) {
        throw new Error('Source tab group not found')
      }

      const movedTab = sourceGroup.tabs.find((tab) => tab.id === tabId)

      if (!movedTab) {
        throw new Error('One or more tabs to move were not found')
      }

      movedTabs.push(movedTab)

      const movedBrowserTabGroup = sourceGroup.browserTabGroups?.find(
        (group) => group.id === movedTab.browserTabGroupId,
      )
      if (movedBrowserTabGroup) {
        movedBrowserTabGroups.push(movedBrowserTabGroup)
      }

      // Track which tabs to remove from each group
      const tabIdsToRemove = tabIdsToRemoveByGroup.get(tabGroupId)
      if (!tabIdsToRemove) {
        tabIdsToRemoveByGroup.set(tabGroupId, new Set([tabId]))
      } else {
        tabIdsToRemove.add(tabId)
      }
    }

    if (movedTabs.length === 0) {
      return
    }

    // Update all affected source groups
    for (const [groupId, tabIdsToRemove] of tabIdsToRemoveByGroup) {
      const sourceGroup = sourceGroupsById.get(groupId)
      if (!sourceGroup) {
        throw new Error('Source tab group not found')
      }

      const remainingTabs = filterTabsByIds(sourceGroup.tabs, tabIdsToRemove)
      await updateOrDeleteGroup(groupId, remainingTabs, sourceGroup)
    }

    await createTabGroup(
      movedTabs,
      userGroupId,
      mergeBrowserTabGroups(movedBrowserTabGroups),
    )
  })
}

export async function removeSelectedTabs(selectedTabs: SelectedTabRef[]) {
  if (selectedTabs.length === 0) {
    return
  }

  await db.transaction('rw', db.tabGroups, async () => {
    const selectedTabIdsByGroupId = new Map<string, Set<string>>()

    for (const { tabGroupId, tabId } of selectedTabs) {
      const selectedTabIds = selectedTabIdsByGroupId.get(tabGroupId)

      if (!selectedTabIds) {
        selectedTabIdsByGroupId.set(tabGroupId, new Set([tabId]))
      } else {
        selectedTabIds.add(tabId)
      }
    }

    for (const [groupId, selectedTabIds] of selectedTabIdsByGroupId) {
      const sourceGroup = await db.tabGroups.get(groupId)

      if (!sourceGroup) {
        continue
      }

      const remainingTabs = filterTabsByIds(sourceGroup.tabs, selectedTabIds)

      await updateOrDeleteGroup(groupId, remainingTabs, sourceGroup)
    }
  })
}

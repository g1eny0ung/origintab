import { clampIndex } from '~/utils/helpers'
import type { SelectedTabRef, TabGroup, TabItem } from '~/utils/types'

import { db, generateId } from './base'
import { createTabGroupWithExistingTabs, deleteTabGroup } from './tabGroups'

export async function removeTabFromGroup(groupId: string, tabId: string) {
  const group = await db.tabGroups.get(groupId)

  if (!group) {
    return
  }

  const newTabs = group.tabs.filter((t) => t.id !== tabId)

  if (newTabs.length === 0) {
    await deleteTabGroup(groupId)
  } else {
    await db.tabGroups.update(groupId, { tabs: newTabs })
  }
}

export async function moveTabBetweenGroups(
  sourceGroupId: string,
  targetGroupId: string,
  tabId: string,
  targetIndex: number,
) {
  await moveTabsBetweenGroups(
    sourceGroupId,
    targetGroupId,
    [tabId],
    targetIndex,
  )
}

function getTabsByIds<
  T extends {
    id: string
  },
>(tabs: T[], tabIds: string[]) {
  const selectedTabIdSet = new Set(tabIds)

  return tabs.filter((tab) => selectedTabIdSet.has(tab.id))
}

export function filterTabsByIds<T extends { id: string }>(
  tabs: T[],
  tabIdsToExclude: Set<string>,
) {
  return tabs.filter((tab) => !tabIdsToExclude.has(tab.id))
}

export async function updateOrDeleteGroup(groupId: string, tabs: TabItem[]) {
  if (tabs.length === 0) {
    await db.tabGroups.delete(groupId)
  } else {
    await db.tabGroups.update(groupId, { tabs })
  }
}

export async function moveTabsBetweenGroups(
  sourceGroupId: string,
  targetGroupId: string,
  tabIds: string[],
  targetIndex: number,
) {
  if (tabIds.length === 0) {
    return
  }

  await db.transaction('rw', db.tabGroups, async () => {
    const sourceGroup = await db.tabGroups.get(sourceGroupId)
    const targetGroup = await db.tabGroups.get(targetGroupId)

    if (!sourceGroup || !targetGroup) {
      return
    }

    const movedTabs = getTabsByIds(sourceGroup.tabs, tabIds)

    if (movedTabs.length === 0) {
      return
    }

    const selectedTabIdSet = new Set(movedTabs.map((tab) => tab.id))

    if (sourceGroupId === targetGroupId) {
      const nextTabs = filterTabsByIds(sourceGroup.tabs, selectedTabIdSet)
      const nextIndex = clampIndex(targetIndex, nextTabs.length)
      nextTabs.splice(nextIndex, 0, ...movedTabs)

      await db.tabGroups.update(sourceGroupId, { tabs: nextTabs })
      return
    }

    const nextSourceTabs = filterTabsByIds(sourceGroup.tabs, selectedTabIdSet)
    const nextTargetTabs = [...targetGroup.tabs]
    const nextIndex = clampIndex(targetIndex, nextTargetTabs.length)

    nextTargetTabs.splice(nextIndex, 0, ...movedTabs)

    await updateOrDeleteGroup(sourceGroupId, nextSourceTabs)
    await db.tabGroups.update(targetGroupId, { tabs: nextTargetTabs })
  })
}

export async function moveTabsToNewGroupInUserGroup(
  sourceGroupId: string,
  userGroupId: string,
  tabIds: string[],
) {
  if (tabIds.length === 0) {
    return
  }

  await db.transaction('rw', db.tabGroups, async () => {
    const sourceGroup = await db.tabGroups.get(sourceGroupId)

    if (!sourceGroup) {
      return
    }

    const movedTabs = getTabsByIds(sourceGroup.tabs, tabIds)

    if (movedTabs.length === 0) {
      return
    }

    const selectedTabIdSet = new Set(movedTabs.map((tab) => tab.id))
    const remainingTabs = filterTabsByIds(sourceGroup.tabs, selectedTabIdSet)

    await updateOrDeleteGroup(sourceGroupId, remainingTabs)

    await createTabGroupWithExistingTabs(movedTabs, userGroupId)
  })
}

export async function moveSelectedTabsToUserGroup(
  selectedTabs: SelectedTabRef[],
  userGroupId: string,
) {
  if (selectedTabs.length === 0) {
    return
  }

  await db.transaction('rw', db.tabGroups, async () => {
    const sourceGroupsById = new Map<string, TabGroup>()

    for (const groupId of new Set(selectedTabs.map((tab) => tab.tabGroupId))) {
      const sourceGroup = await db.tabGroups.get(groupId)

      if (!sourceGroup) {
        continue
      }

      sourceGroupsById.set(groupId, sourceGroup)
    }

    const movedTabs: TabItem[] = []
    const tabIdsToRemoveByGroup = new Map<string, Set<string>>()

    for (const { tabGroupId, tabId } of selectedTabs) {
      const sourceGroup = sourceGroupsById.get(tabGroupId)

      if (!sourceGroup) {
        continue
      }

      const movedTab = sourceGroup.tabs.find((tab) => tab.id === tabId)

      if (!movedTab) {
        continue
      }

      movedTabs.push(movedTab)

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
        continue
      }

      const remainingTabs = filterTabsByIds(sourceGroup.tabs, tabIdsToRemove)
      await updateOrDeleteGroup(groupId, remainingTabs)
    }

    await db.tabGroups.add({
      id: generateId(),
      tabs: movedTabs,
      createdAt: Date.now(),
      userGroupId,
    })
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
      const sourceGroup = (await db.tabGroups.get(groupId))!
      const remainingTabs = filterTabsByIds(sourceGroup.tabs, selectedTabIds)

      await updateOrDeleteGroup(groupId, remainingTabs)
    }
  })
}

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
      const nextTabs = sourceGroup.tabs.filter(
        (tab) => !selectedTabIdSet.has(tab.id),
      )
      const nextIndex = clampIndex(targetIndex, nextTabs.length)
      nextTabs.splice(nextIndex, 0, ...movedTabs)

      await db.tabGroups.update(sourceGroupId, { tabs: nextTabs })
      return
    }

    const nextSourceTabs = sourceGroup.tabs.filter(
      (tab) => !selectedTabIdSet.has(tab.id),
    )
    const nextTargetTabs = [...targetGroup.tabs]
    const nextIndex = clampIndex(targetIndex, nextTargetTabs.length)

    nextTargetTabs.splice(nextIndex, 0, ...movedTabs)

    if (nextSourceTabs.length === 0) {
      await db.tabGroups.delete(sourceGroupId)
    } else {
      await db.tabGroups.update(sourceGroupId, { tabs: nextSourceTabs })
    }

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
    const remainingTabs = sourceGroup.tabs.filter(
      (tab) => !selectedTabIdSet.has(tab.id),
    )

    if (remainingTabs.length === 0) {
      await db.tabGroups.delete(sourceGroupId)
    } else {
      await db.tabGroups.update(sourceGroupId, { tabs: remainingTabs })
    }

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
      const sourceGroup = (await db.tabGroups.get(groupId))!
      sourceGroupsById.set(groupId, sourceGroup)
    }

    const movedTabs: TabItem[] = []

    for (const { tabGroupId, tabId } of selectedTabs) {
      const sourceGroup = sourceGroupsById.get(tabGroupId)!
      const movedTab = sourceGroup.tabs.find((tab) => tab.id === tabId)!

      movedTabs.push(movedTab)

      // Remove this tab from source group
      sourceGroup.tabs = sourceGroup.tabs.filter((tab) => tab.id !== tabId)
      sourceGroupsById.set(tabGroupId, sourceGroup)
    }

    if (movedTabs.length === 0) {
      return
    }

    for (const [id, group] of sourceGroupsById) {
      if (group.tabs.length === 0) {
        // No remaining tabs in this group, delete it
        await db.tabGroups.delete(id)
      } else {
        await db.tabGroups.update(id, { tabs: group.tabs })
      }
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
      const remainingTabs = sourceGroup.tabs.filter(
        (tab) => !selectedTabIds.has(tab.id),
      )

      if (remainingTabs.length === 0) {
        await db.tabGroups.delete(groupId)
      } else {
        await db.tabGroups.update(groupId, { tabs: remainingTabs })
      }
    }
  })
}

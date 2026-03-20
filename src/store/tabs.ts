import { clampIndex } from '~/utils/helpers'

import { db } from './base'
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

function getTabsByIdsInSourceOrder<
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

    const movedTabs = getTabsByIdsInSourceOrder(sourceGroup.tabs, tabIds)

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

export async function moveTabToNewGroupInUserGroup(
  sourceGroupId: string,
  userGroupId: string,
  tabId: string,
) {
  await moveTabsToNewGroupInUserGroup(sourceGroupId, userGroupId, [tabId])
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

    const movedTabs = getTabsByIdsInSourceOrder(sourceGroup.tabs, tabIds)

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

export async function moveTabsToUserGroup(
  sourceGroupId: string,
  userGroupId: string,
  tabIds: string[],
) {
  if (tabIds.length === 0) {
    return
  }

  const targetGroups = await db.tabGroups
    .where('userGroupId')
    .equals(userGroupId)
    .toArray()

  targetGroups.sort((a, b) => b.createdAt - a.createdAt)

  const firstGroup = targetGroups[0]

  if (firstGroup) {
    await moveTabsBetweenGroups(sourceGroupId, firstGroup.id, tabIds, 0)
    return
  }

  await moveTabsToNewGroupInUserGroup(sourceGroupId, userGroupId, tabIds)
}

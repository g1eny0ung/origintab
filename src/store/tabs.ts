import { clampIndex } from '@/utils/helpers'

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
  await db.transaction('rw', db.tabGroups, async () => {
    const sourceGroup = await db.tabGroups.get(sourceGroupId)
    const targetGroup = await db.tabGroups.get(targetGroupId)

    if (!sourceGroup || !targetGroup) {
      return
    }

    const sourceTabIndex = sourceGroup.tabs.findIndex((tab) => tab.id === tabId)

    if (sourceTabIndex === -1) {
      return
    }

    const movedTab = sourceGroup.tabs[sourceTabIndex]

    if (sourceGroupId === targetGroupId) {
      const nextTabs = [...sourceGroup.tabs]
      nextTabs.splice(sourceTabIndex, 1)

      const nextIndex = clampIndex(targetIndex, nextTabs.length)
      nextTabs.splice(nextIndex, 0, movedTab)

      await db.tabGroups.update(sourceGroupId, { tabs: nextTabs })
      return
    }

    const nextSourceTabs = sourceGroup.tabs.filter((tab) => tab.id !== tabId)
    const nextTargetTabs = [...targetGroup.tabs]
    const nextIndex = clampIndex(targetIndex, nextTargetTabs.length)

    nextTargetTabs.splice(nextIndex, 0, movedTab)

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
  await db.transaction('rw', db.tabGroups, async () => {
    const sourceGroup = await db.tabGroups.get(sourceGroupId)

    if (!sourceGroup) {
      return
    }

    const movedTab = sourceGroup.tabs.find((tab) => tab.id === tabId)

    if (!movedTab) {
      return
    }

    const remainingTabs = sourceGroup.tabs.filter((tab) => tab.id !== tabId)

    if (remainingTabs.length === 0) {
      await db.tabGroups.delete(sourceGroupId)
    } else {
      await db.tabGroups.update(sourceGroupId, { tabs: remainingTabs })
    }

    await createTabGroupWithExistingTabs([movedTab], userGroupId)
  })
}

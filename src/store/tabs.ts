import { db } from './base'
import { deleteTabGroup } from './tabGroups'

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

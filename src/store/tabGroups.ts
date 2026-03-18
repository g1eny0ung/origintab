import { db, DEFAULT_GROUP_ID, generateId } from './base'
import type { TabItem, TabGroup } from '../utils/types'

export async function getTabGroups() {
  return db.tabGroups.toArray()
}

export async function createTabGroup(
  tabs: TabItem[],
  userGroupId: string = DEFAULT_GROUP_ID,
) {
  if (tabs.length === 0) {
    throw new Error('No tabs to save')
  }

  const newGroup: TabGroup = {
    id: generateId(),
    tabs: tabs.map((tab) => ({ ...tab, id: generateId() })),
    createdAt: Date.now(),
    userGroupId,
  }

  await db.tabGroups.add(newGroup)

  return newGroup
}

export async function deleteTabGroup(groupId: string) {
  await db.tabGroups.delete(groupId)
}

export async function updateTabGroup(
  groupId: string,
  updates: Partial<TabGroup>,
) {
  await db.tabGroups.update(groupId, updates)
}

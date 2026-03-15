import { tabGroups, DEFAULT_GROUP_ID, generateId } from './base'
import type { TabItem, TabGroup } from '../utils/types'

export async function getTabGroups() {
  return tabGroups.getValue()
}

export async function createTabGroup(
  tabs: TabItem[],
  userGroupId: string = DEFAULT_GROUP_ID,
) {
  if (tabs.length === 0) {
    throw new Error('No tabs to save')
  }

  const data = await getTabGroups()

  const newGroup: TabGroup = {
    id: generateId(),
    tabs: tabs.map((tab) => ({ ...tab, id: generateId() })),
    createdAt: Date.now(),
    userGroupId,
  }

  data.unshift(newGroup)

  await tabGroups.setValue(data)

  return newGroup
}

export async function deleteTabGroup(groupId: string) {
  let data = await getTabGroups()

  data = data.filter((g) => g.id !== groupId)

  await tabGroups.setValue(data)
}

export async function updateTabGroup(
  groupId: string,
  updates: Partial<TabGroup>,
) {
  const data = await getTabGroups()
  const index = data.findIndex((g) => g.id === groupId)

  if (index !== -1) {
    data[index] = { ...data[index], ...updates }
    await tabGroups.setValue(data)
  }
}

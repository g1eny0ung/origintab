import type { TabGroup, UserGroup, StorageData } from '../utils/types'

const USER_GROUPS_KEY = 'local:userGroups'
const TAB_GROUPS_KEY = 'local:tabGroups'
export const DEFAULT_GROUP_ID = 'default'

export const defaultData: StorageData = {
  userGroups: [
    { id: DEFAULT_GROUP_ID, name: 'Default', createdAt: Date.now() },
  ],
  tabGroups: [],
}

export const userGroups = storage.defineItem<UserGroup[]>(USER_GROUPS_KEY, {
  fallback: defaultData.userGroups,
})

export const tabGroups = storage.defineItem<TabGroup[]>(TAB_GROUPS_KEY, {
  fallback: defaultData.tabGroups,
})

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

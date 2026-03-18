import Dexie, { type EntityTable } from 'dexie'

import type { TabGroup, UserGroup } from '../utils/types'

export const DEFAULT_GROUP_ID = 'default'

class OriginTabDB extends Dexie {
  userGroups!: EntityTable<UserGroup, 'id'>
  tabGroups!: EntityTable<TabGroup, 'id'>

  constructor() {
    super('OriginTabDB')
    this.version(1).stores({
      userGroups: 'id, name, createdAt',
      tabGroups: 'id, userGroupId, createdAt',
    })
  }
}

export const db = new OriginTabDB()

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// Initialize default group
export async function initDefaultGroup() {
  const count = await db.userGroups.count()
  if (count === 0) {
    await db.userGroups.add({
      id: DEFAULT_GROUP_ID,
      name: 'Default',
      createdAt: Date.now(),
    })
  }
}

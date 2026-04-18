import { notifyContextMenusRefresh } from '@/utils/background/contextMenus'

import type { UserGroup } from '../utils/types'
import { DEFAULT_GROUP_ID, db, generateId } from './base'

export async function getUserGroups() {
  return db.userGroups.orderBy('createdAt').reverse().toArray()
}

export async function getUserGroup(id: string) {
  return db.userGroups.get(id)
}

export async function getLastUserGroup() {
  return db.userGroups.orderBy('createdAt').last()
}

export async function createUserGroup(name: string) {
  const newGroup: UserGroup = {
    id: generateId(),
    name: name.trim(),
    createdAt: Date.now(),
  }

  await db.userGroups.add(newGroup)
  await notifyContextMenusRefresh()

  return newGroup
}

export async function updateUserGroup(groupId: string, name: string) {
  await db.userGroups.update(groupId, { name: name.trim() })
  await notifyContextMenusRefresh()
}

export async function deleteUserGroup(groupId: string) {
  if (groupId === DEFAULT_GROUP_ID) {
    throw new Error('Cannot delete default group')
  }

  await db.transaction('rw', db.userGroups, db.tabGroups, async () => {
    await db.userGroups.delete(groupId)
    // Cascade update: move tabs to default group
    await db.tabGroups
      .where('userGroupId')
      .equals(groupId)
      .modify({ userGroupId: DEFAULT_GROUP_ID })
  })

  await notifyContextMenusRefresh()
}

import { db, DEFAULT_GROUP_ID, generateId } from './base'
import type { UserGroup } from '../utils/types'

export async function getUserGroups() {
  return db.userGroups.toArray()
}

export async function createUserGroup(name: string) {
  const newGroup: UserGroup = {
    id: generateId(),
    name: name.trim(),
    createdAt: Date.now(),
  }

  await db.userGroups.add(newGroup)

  return newGroup
}

export async function updateUserGroup(
  groupId: string,
  name: string,
) {
  await db.userGroups.update(groupId, { name: name.trim() })
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
}

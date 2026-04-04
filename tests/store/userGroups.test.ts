import { notifyContextMenusRefresh } from '@/utils/background/contextMenus'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_GROUP_ID, db, initDefaultGroup } from '../../src/store/base'
import {
  createUserGroup,
  deleteUserGroup,
  getLastUserGroup,
  getUserGroups,
  updateUserGroup,
} from '../../src/store/userGroups'

vi.mock('@/utils/background/contextMenus')

describe('userGroups module', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    vi.clearAllMocks()
  })

  describe('createUserGroup', () => {
    it('should create a new user group', async () => {
      const group = await createUserGroup('My Group')
      expect(group).toBeDefined()
      expect(group.id).toBeDefined()
      expect(group.name).toBe('My Group')

      const savedGroup = await db.userGroups.get(group.id)
      expect(savedGroup).toEqual(group)
    })

    it('should trim group name', async () => {
      const group = await createUserGroup('  Trimmed Name  ')
      expect(group.name).toBe('Trimmed Name')
    })

    it('should notify context menus refresh', async () => {
      await createUserGroup('Test Group')
      expect(notifyContextMenusRefresh).toHaveBeenCalled()
    })
  })

  describe('getUserGroups', () => {
    it('should return all user groups ordered by createdAt descending', async () => {
      const group1 = await createUserGroup('Group 1')
      await new Promise((resolve) => setTimeout(resolve, 2))
      const group2 = await createUserGroup('Group 2')
      await new Promise((resolve) => setTimeout(resolve, 2))
      const group3 = await createUserGroup('Group 3')

      const groups = await getUserGroups()
      expect(groups.length).toBe(3)
      expect(groups[0].id).toBe(group3.id)
      expect(groups[1].id).toBe(group2.id)
      expect(groups[2].id).toBe(group1.id)
    })

    it('should return empty array when no groups exist', async () => {
      const groups = await getUserGroups()
      expect(groups).toEqual([])
    })
  })

  describe('getLastUserGroup', () => {
    it('should return the most recently created user group', async () => {
      await createUserGroup('Group 1')
      await new Promise((resolve) => setTimeout(resolve, 2))
      const lastGroup = await createUserGroup('Last Group')

      const result = await getLastUserGroup()
      expect(result?.id).toBe(lastGroup.id)
    })

    it('should return undefined when no groups exist', async () => {
      const result = await getLastUserGroup()
      expect(result).toBeUndefined()
    })
  })

  describe('updateUserGroup', () => {
    it('should update user group name', async () => {
      const group = await createUserGroup('Old Name')
      await updateUserGroup(group.id, 'New Name')

      const updatedGroup = await db.userGroups.get(group.id)
      expect(updatedGroup?.name).toBe('New Name')
    })

    it('should trim new name', async () => {
      const group = await createUserGroup('Old Name')
      await updateUserGroup(group.id, '  New Trimmed Name  ')

      const updatedGroup = await db.userGroups.get(group.id)
      expect(updatedGroup?.name).toBe('New Trimmed Name')
    })

    it('should notify context menus refresh', async () => {
      const group = await createUserGroup('Test Group')
      vi.clearAllMocks()

      await updateUserGroup(group.id, 'Updated Name')
      expect(notifyContextMenusRefresh).toHaveBeenCalled()
    })
  })

  describe('deleteUserGroup', () => {
    it('should delete a user group', async () => {
      const group = await createUserGroup('To Delete')
      await deleteUserGroup(group.id)

      const deletedGroup = await db.userGroups.get(group.id)
      expect(deletedGroup).toBeUndefined()
    })

    it('should not delete default group', async () => {
      await initDefaultGroup()
      await expect(deleteUserGroup(DEFAULT_GROUP_ID)).rejects.toThrow(
        'Cannot delete default group',
      )
    })

    it('should move tab groups to default group when user group is deleted', async () => {
      await initDefaultGroup()
      const userGroup = await createUserGroup('Test User Group')

      await db.tabGroups.add({
        id: 'tab-group-1',
        userGroupId: userGroup.id,
        createdAt: Date.now(),
        tabs: [],
      })

      await deleteUserGroup(userGroup.id)

      const tabGroup = await db.tabGroups.get('tab-group-1')
      expect(tabGroup?.userGroupId).toBe(DEFAULT_GROUP_ID)
    })

    it('should notify context menus refresh', async () => {
      const group = await createUserGroup('Test Group')
      vi.clearAllMocks()

      await deleteUserGroup(group.id)
      expect(notifyContextMenusRefresh).toHaveBeenCalled()
    })
  })
})

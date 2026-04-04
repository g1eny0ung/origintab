import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_GROUP_ID, db } from '../../src/store/base'
import {
  createTabGroup,
  createTabGroupWithExistingTabs,
  deleteTabGroup,
  getTabGroups,
  updateTabGroup,
} from '../../src/store/tabGroups'
import type { TabItem } from '../../src/utils/types'

describe('tabGroups module', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  const sampleTabs: TabItem[] = [
    {
      id: 'tab-1',
      title: 'Example',
      url: 'https://example.com',
      createdAt: Date.now(),
    },
    {
      id: 'tab-2',
      title: 'Google',
      url: 'https://google.com',
      createdAt: Date.now(),
    },
  ]

  describe('createTabGroup', () => {
    it('should create a new tab group with tabs', async () => {
      const group = await createTabGroup(sampleTabs)
      expect(group).toBeDefined()
      expect(group.id).toBeDefined()
      expect(group.tabs.length).toBe(2)
      expect(group.userGroupId).toBe(DEFAULT_GROUP_ID)

      const savedGroup = await db.tabGroups.get(group.id)
      expect(savedGroup).toEqual(group)
    })

    it('should generate new IDs for tabs', async () => {
      const group = await createTabGroup(sampleTabs)
      const tabIds = group.tabs.map((t) => t.id)
      expect(tabIds).not.toContain('tab-1')
      expect(tabIds).not.toContain('tab-2')
    })

    it('should throw error when no tabs provided', async () => {
      await expect(createTabGroup([])).rejects.toThrow('No tabs to save')
    })

    it('should create tab group in specified user group', async () => {
      const customUserGroupId = 'custom-group'
      const group = await createTabGroup(sampleTabs, customUserGroupId)
      expect(group.userGroupId).toBe(customUserGroupId)
    })
  })

  describe('createTabGroupWithExistingTabs', () => {
    it('should create tab group without modifying tab IDs', async () => {
      const group = await createTabGroupWithExistingTabs(sampleTabs)
      expect(group.tabs[0].id).toBe('tab-1')
      expect(group.tabs[1].id).toBe('tab-2')
    })

    it('should throw error when no tabs provided', async () => {
      await expect(createTabGroupWithExistingTabs([])).rejects.toThrow(
        'No tabs to save',
      )
    })
  })

  describe('getTabGroups', () => {
    it('should return all tab groups', async () => {
      await createTabGroup(sampleTabs)
      await createTabGroup(sampleTabs)

      const groups = await getTabGroups()
      expect(groups.length).toBe(2)
    })

    it('should return empty array when no groups exist', async () => {
      const groups = await getTabGroups()
      expect(groups).toEqual([])
    })
  })

  describe('deleteTabGroup', () => {
    it('should delete a tab group', async () => {
      const group = await createTabGroup(sampleTabs)
      await deleteTabGroup(group.id)

      const deletedGroup = await db.tabGroups.get(group.id)
      expect(deletedGroup).toBeUndefined()
    })

    it('should not throw error when deleting non-existent group', async () => {
      await expect(deleteTabGroup('non-existent-id')).resolves.not.toThrow()
    })
  })

  describe('updateTabGroup', () => {
    it('should update tab group properties', async () => {
      const group = await createTabGroup(sampleTabs)
      const newTabs = [
        {
          id: 'new-tab',
          title: 'Updated',
          url: 'https://updated.com',
          createdAt: Date.now(),
        },
      ]

      await updateTabGroup(group.id, { tabs: newTabs })

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs).toEqual(newTabs)
    })

    it('should not throw error when updating non-existent group', async () => {
      await expect(
        updateTabGroup('non-existent-id', { tabs: [] }),
      ).resolves.not.toThrow()
    })
  })
})

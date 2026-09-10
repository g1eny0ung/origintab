import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_GROUP_ID, db } from '../../src/store/base'
import { createTabGroup, deleteTabGroup } from '../../src/store/tabGroups'
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

    it('should generate IDs for tabs that do not have one', async () => {
      const group = await createTabGroup(
        sampleTabs.map((tab) => ({ ...tab, id: '' })),
      )
      const tabIds = group.tabs.map((t) => t.id)
      expect(tabIds.every(Boolean)).toBe(true)
      expect(new Set(tabIds).size).toBe(2)
    })

    it('should throw error when no tabs provided', async () => {
      await expect(createTabGroup([])).rejects.toThrow('No tabs to save')
    })

    it('should create tab group in specified user group', async () => {
      const customUserGroupId = 'custom-group'
      const group = await createTabGroup(sampleTabs, customUserGroupId)
      expect(group.userGroupId).toBe(customUserGroupId)
    })

    it('should save referenced browser tab group metadata', async () => {
      const groupedTabs = sampleTabs.map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))

      const group = await createTabGroup(groupedTabs, 'default', [
        {
          id: 'browser-group-1',
          title: 'Research',
          color: 'cyan',
          collapsed: true,
        },
      ])

      expect(group.browserTabGroups).toEqual([
        {
          id: 'browser-group-1',
          title: 'Research',
          color: 'cyan',
          collapsed: true,
        },
      ])
      expect(group.tabs.every((tab) => tab.browserTabGroupId)).toBe(true)
    })

    it('should create tab group without modifying tab IDs', async () => {
      const group = await createTabGroup(sampleTabs)
      expect(group.tabs[0]!.id).toBe('tab-1')
      expect(group.tabs[1]!.id).toBe('tab-2')
    })

    it('should keep tabs from the same browser group contiguous', async () => {
      const tabs = [
        { ...sampleTabs[0]!, browserTabGroupId: 'browser-group-1' },
        sampleTabs[1]!,
        {
          id: 'tab-3',
          title: 'Third',
          url: 'https://third.example',
          createdAt: Date.now(),
          browserTabGroupId: 'browser-group-1',
        },
      ]

      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'blue',
          collapsed: false,
        },
      ])

      expect(group.tabs.map((tab) => tab.id)).toEqual([
        'tab-1',
        'tab-3',
        'tab-2',
      ])
    })

    it('should clear a browser group reference without matching metadata', async () => {
      const group = await createTabGroup([
        { ...sampleTabs[0]!, browserTabGroupId: 'missing' },
      ])

      expect(group.tabs[0]?.browserTabGroupId).toBeUndefined()
      expect(group.browserTabGroups).toBeUndefined()
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
})

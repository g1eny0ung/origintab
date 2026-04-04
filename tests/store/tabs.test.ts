import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../../src/store/base'
import { createTabGroupWithExistingTabs } from '../../src/store/tabGroups'
import {
  moveSelectedTabsToUserGroup,
  moveTabBetweenGroups,
  moveTabsBetweenGroups,
  moveTabsToNewGroupInUserGroup,
  removeSelectedTabs,
  removeTabFromGroup,
} from '../../src/store/tabs'
import type { TabItem } from '../../src/utils/types'

describe('tabs module', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  const createSampleTabs = (): TabItem[] => [
    {
      id: 'tab-1',
      title: 'Tab 1',
      url: 'https://tab1.com',
      createdAt: Date.now(),
    },
    {
      id: 'tab-2',
      title: 'Tab 2',
      url: 'https://tab2.com',
      createdAt: Date.now(),
    },
    {
      id: 'tab-3',
      title: 'Tab 3',
      url: 'https://tab3.com',
      createdAt: Date.now(),
    },
  ]

  describe('removeTabFromGroup', () => {
    it('should remove tab from group', async () => {
      const tabs = createSampleTabs()
      const group = await createTabGroupWithExistingTabs(tabs)

      await removeTabFromGroup(group.id, 'tab-2')

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.length).toBe(2)
      expect(updatedGroup?.tabs.find((t) => t.id === 'tab-2')).toBeUndefined()
    })

    it('should delete group when last tab is removed', async () => {
      const tabs = [createSampleTabs()[0]]
      const group = await createTabGroupWithExistingTabs(tabs)

      await removeTabFromGroup(group.id, 'tab-1')

      const deletedGroup = await db.tabGroups.get(group.id)
      expect(deletedGroup).toBeUndefined()
    })

    it('should do nothing when group does not exist', async () => {
      await expect(
        removeTabFromGroup('non-existent', 'tab-1'),
      ).resolves.not.toThrow()
    })
  })

  describe('moveTabBetweenGroups', () => {
    it('should move single tab between groups', async () => {
      const tabs1 = createSampleTabs()
      const group1 = await createTabGroupWithExistingTabs(tabs1)

      const tabs2 = [
        {
          id: 'tab-a',
          title: 'Tab A',
          url: 'https://taba.com',
          createdAt: Date.now(),
        },
      ]
      const group2 = await createTabGroupWithExistingTabs(tabs2)

      await moveTabBetweenGroups(group1.id, group2.id, 'tab-2', 1)

      const updatedGroup1 = await db.tabGroups.get(group1.id)
      const updatedGroup2 = await db.tabGroups.get(group2.id)

      expect(updatedGroup1?.tabs.length).toBe(2)
      expect(updatedGroup2?.tabs.length).toBe(2)
      expect(updatedGroup2?.tabs[1].id).toBe('tab-2')
    })
  })

  describe('moveTabsBetweenGroups', () => {
    it('should move multiple tabs between groups', async () => {
      const tabs1 = createSampleTabs()
      const group1 = await createTabGroupWithExistingTabs(tabs1)

      const tabs2 = [
        {
          id: 'tab-a',
          title: 'Tab A',
          url: 'https://taba.com',
          createdAt: Date.now(),
        },
      ]
      const group2 = await createTabGroupWithExistingTabs(tabs2)

      await moveTabsBetweenGroups(group1.id, group2.id, ['tab-1', 'tab-3'], 1)

      const updatedGroup1 = await db.tabGroups.get(group1.id)
      const updatedGroup2 = await db.tabGroups.get(group2.id)

      expect(updatedGroup1?.tabs.length).toBe(1)
      expect(updatedGroup2?.tabs.length).toBe(3)
    })

    it('should reorder tabs within same group', async () => {
      const tabs = createSampleTabs()
      const group = await createTabGroupWithExistingTabs(tabs)

      await moveTabsBetweenGroups(group.id, group.id, ['tab-1', 'tab-3'], 0)

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs[0].id).toBe('tab-1')
      expect(updatedGroup?.tabs[1].id).toBe('tab-3')
      expect(updatedGroup?.tabs[2].id).toBe('tab-2')
    })

    it('should delete source group if all tabs are moved', async () => {
      const tabs = createSampleTabs()
      const group1 = await createTabGroupWithExistingTabs(tabs)
      const group2 = await createTabGroupWithExistingTabs([
        {
          id: 'tab-a',
          title: 'Tab A',
          url: 'https://taba.com',
          createdAt: Date.now(),
        },
      ])

      await moveTabsBetweenGroups(
        group1.id,
        group2.id,
        ['tab-1', 'tab-2', 'tab-3'],
        0,
      )

      const deletedGroup = await db.tabGroups.get(group1.id)
      expect(deletedGroup).toBeUndefined()
    })

    it('should do nothing when no tabs to move', async () => {
      const group = await createTabGroupWithExistingTabs(createSampleTabs())
      await expect(
        moveTabsBetweenGroups(group.id, group.id, [], 0),
      ).resolves.not.toThrow()
    })
  })

  describe('moveTabsToNewGroupInUserGroup', () => {
    it('should move tabs to new group in user group', async () => {
      const tabs = createSampleTabs()
      const group = await createTabGroupWithExistingTabs(tabs)

      await moveTabsToNewGroupInUserGroup(group.id, 'new-user-group', [
        'tab-1',
        'tab-2',
      ])

      const updatedGroup = await db.tabGroups.get(group.id)
      const allGroups = await db.tabGroups.toArray()

      expect(updatedGroup?.tabs.length).toBe(1)
      expect(allGroups.length).toBe(2)
    })

    it('should delete source group if all tabs are moved', async () => {
      const tabs = createSampleTabs()
      const group = await createTabGroupWithExistingTabs(tabs)

      await moveTabsToNewGroupInUserGroup(group.id, 'new-user-group', [
        'tab-1',
        'tab-2',
        'tab-3',
      ])

      const deletedGroup = await db.tabGroups.get(group.id)
      expect(deletedGroup).toBeUndefined()
    })
  })

  describe('moveSelectedTabsToUserGroup', () => {
    it('should move selected tabs to new group in user group', async () => {
      const group = await createTabGroupWithExistingTabs(createSampleTabs())

      await moveSelectedTabsToUserGroup(
        [
          { tabGroupId: group.id, tabId: 'tab-1' },
          { tabGroupId: group.id, tabId: 'tab-3' },
        ],
        'target-user-group',
      )

      const allGroups = await db.tabGroups.toArray()
      expect(allGroups.length).toBe(2)
    })
  })

  describe('removeSelectedTabs', () => {
    it('should remove selected tabs from groups', async () => {
      const group = await createTabGroupWithExistingTabs(createSampleTabs())

      await removeSelectedTabs([
        { tabGroupId: group.id, tabId: 'tab-1' },
        { tabGroupId: group.id, tabId: 'tab-3' },
      ])

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.length).toBe(1)
      expect(updatedGroup?.tabs[0].id).toBe('tab-2')
    })

    it('should delete group when all selected tabs are removed', async () => {
      const group = await createTabGroupWithExistingTabs(createSampleTabs())

      await removeSelectedTabs([
        { tabGroupId: group.id, tabId: 'tab-1' },
        { tabGroupId: group.id, tabId: 'tab-2' },
        { tabGroupId: group.id, tabId: 'tab-3' },
      ])

      const deletedGroup = await db.tabGroups.get(group.id)
      expect(deletedGroup).toBeUndefined()
    })
  })
})

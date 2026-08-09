import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../../src/store/base'
import { createTabGroup } from '../../src/store/tabGroups'
import {
  moveSelectedTabsToUserGroup,
  moveTabBetweenGroups,
  moveTabsBetweenGroups,
  moveTabsToNewGroupInUserGroup,
  removeBrowserTabGroup,
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
      const group = await createTabGroup(tabs)

      await removeTabFromGroup(group.id, 'tab-2')

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.length).toBe(2)
      expect(updatedGroup?.tabs.find((t) => t.id === 'tab-2')).toBeUndefined()
    })

    it('should delete group when last tab is removed', async () => {
      const tabs = [createSampleTabs()[0]!]
      const group = await createTabGroup(tabs)

      await removeTabFromGroup(group.id, 'tab-1')

      const deletedGroup = await db.tabGroups.get(group.id)
      expect(deletedGroup).toBeUndefined()
    })

    it('should do nothing when group does not exist', async () => {
      await expect(
        removeTabFromGroup('non-existent', 'tab-1'),
      ).resolves.not.toThrow()
    })

    it('should remove browser group metadata with its last saved tab', async () => {
      const tabs = createSampleTabs()
      tabs[0]!.browserTabGroupId = 'browser-group-1'
      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          title: 'Research',
          color: 'blue',
          collapsed: false,
        },
      ])

      await removeTabFromGroup(group.id, 'tab-1')

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.browserTabGroups).toBeUndefined()
    })
  })

  describe('removeBrowserTabGroup', () => {
    it('should remove every tab in the browser group', async () => {
      const tabs = createSampleTabs()
      tabs[0]!.browserTabGroupId = 'browser-group-1'
      tabs[1]!.browserTabGroupId = 'browser-group-1'
      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          title: 'Research',
          color: 'blue',
          collapsed: false,
        },
      ])

      await removeBrowserTabGroup(group.id, 'browser-group-1')

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.map((tab) => tab.id)).toEqual(['tab-3'])
      expect(updatedGroup?.browserTabGroups).toBeUndefined()
    })

    it('should delete the OriginTab collection when no tabs remain', async () => {
      const tabs = createSampleTabs().map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))
      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'green',
          collapsed: false,
        },
      ])

      await removeBrowserTabGroup(group.id, 'browser-group-1')

      expect(await db.tabGroups.get(group.id)).toBeUndefined()
    })
  })

  describe('moveTabBetweenGroups', () => {
    it('should move single tab between groups', async () => {
      const tabs1 = createSampleTabs()
      const group1 = await createTabGroup(tabs1)

      const tabs2 = [
        {
          id: 'tab-a',
          title: 'Tab A',
          url: 'https://taba.com',
          createdAt: Date.now(),
        },
      ]
      const group2 = await createTabGroup(tabs2)

      await moveTabBetweenGroups(group1.id, group2.id, 'tab-2', 1)

      const updatedGroup1 = await db.tabGroups.get(group1.id)
      const updatedGroup2 = await db.tabGroups.get(group2.id)

      expect(updatedGroup1?.tabs.length).toBe(2)
      expect(updatedGroup2?.tabs.length).toBe(2)
      expect(updatedGroup2?.tabs[1]?.id).toBe('tab-2')
    })

    it('should move browser group metadata with a grouped tab', async () => {
      const tabs = createSampleTabs()
      tabs[1]!.browserTabGroupId = 'browser-group-1'
      const group1 = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          title: 'Research',
          color: 'orange',
          collapsed: false,
        },
      ])
      const group2 = await createTabGroup([
        {
          id: 'tab-a',
          title: 'Tab A',
          url: 'https://taba.com',
          createdAt: Date.now(),
        },
      ])

      await moveTabBetweenGroups(group1.id, group2.id, 'tab-2', 1)

      const updatedGroup1 = await db.tabGroups.get(group1.id)
      const updatedGroup2 = await db.tabGroups.get(group2.id)
      expect(updatedGroup1?.browserTabGroups).toBeUndefined()
      expect(updatedGroup2?.browserTabGroups?.[0]).toMatchObject({
        id: 'browser-group-1',
        title: 'Research',
      })
    })

    it('should ungroup a tab when it is dragged outside its browser group', async () => {
      const tabs = createSampleTabs()
      tabs[0]!.browserTabGroupId = 'browser-group-1'
      tabs[1]!.browserTabGroupId = 'browser-group-1'
      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'blue',
          collapsed: false,
        },
      ])

      await moveTabBetweenGroups(group.id, group.id, 'tab-1', 2, null)

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.map((tab) => tab.id)).toEqual([
        'tab-2',
        'tab-3',
        'tab-1',
      ])
      expect(updatedGroup?.tabs[2]?.browserTabGroupId).toBeUndefined()
      expect(updatedGroup?.browserTabGroups).toHaveLength(1)
    })

    it('should remove browser group metadata when its only tab is moved out', async () => {
      const tabs = createSampleTabs()
      tabs[1]!.browserTabGroupId = 'browser-group-1'
      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'blue',
          collapsed: false,
        },
      ])

      await moveTabBetweenGroups(group.id, group.id, 'tab-2', 1, null)

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.map((tab) => tab.id)).toEqual([
        'tab-1',
        'tab-2',
        'tab-3',
      ])
      expect(updatedGroup?.tabs[1]?.browserTabGroupId).toBeUndefined()
      expect(updatedGroup?.browserTabGroups).toBeUndefined()
    })

    it('should keep metadata consistent across consecutive membership moves', async () => {
      const tabs = createSampleTabs()
      tabs[0]!.browserTabGroupId = 'browser-group-1'
      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'green',
          collapsed: false,
        },
      ])

      await moveTabBetweenGroups(
        group.id,
        group.id,
        'tab-2',
        1,
        'browser-group-1',
      )
      await moveTabBetweenGroups(group.id, group.id, 'tab-1', 0, null)

      const withOneGroupedTab = await db.tabGroups.get(group.id)
      expect(withOneGroupedTab?.tabs[0]?.browserTabGroupId).toBeUndefined()
      expect(withOneGroupedTab?.tabs[1]?.browserTabGroupId).toBe(
        'browser-group-1',
      )
      expect(withOneGroupedTab?.browserTabGroups).toHaveLength(1)

      await moveTabBetweenGroups(group.id, group.id, 'tab-2', 1, null)

      const withoutGroupedTabs = await db.tabGroups.get(group.id)
      expect(withoutGroupedTabs?.tabs[1]?.browserTabGroupId).toBeUndefined()
      expect(withoutGroupedTabs?.browserTabGroups).toBeUndefined()
    })

    it('should add a tab to the browser group it is dragged into', async () => {
      const tabs = createSampleTabs()
      tabs[0]!.browserTabGroupId = 'browser-group-1'
      tabs[1]!.browserTabGroupId = 'browser-group-1'
      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'purple',
          collapsed: false,
        },
      ])

      await moveTabBetweenGroups(
        group.id,
        group.id,
        'tab-3',
        1,
        'browser-group-1',
      )

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.map((tab) => tab.id)).toEqual([
        'tab-1',
        'tab-3',
        'tab-2',
      ])
      expect(updatedGroup?.tabs[1]?.browserTabGroupId).toBe('browser-group-1')
    })

    it('should place a tab outside and before a browser group', async () => {
      const tabs = createSampleTabs()
      tabs[0]!.browserTabGroupId = 'browser-group-1'
      tabs[1]!.browserTabGroupId = 'browser-group-1'
      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'purple',
          collapsed: false,
        },
      ])

      await moveTabBetweenGroups(group.id, group.id, 'tab-3', 0, null)

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.map((tab) => tab.id)).toEqual([
        'tab-3',
        'tab-1',
        'tab-2',
      ])
      expect(updatedGroup?.tabs[0]?.browserTabGroupId).toBeUndefined()
      expect(updatedGroup?.tabs[1]?.browserTabGroupId).toBe('browser-group-1')
    })

    it('should adopt a browser group when dragged between OriginTab collections', async () => {
      const sourceGroup = await createTabGroup(createSampleTabs())
      const targetTabs = [
        {
          id: 'target-tab',
          title: 'Target',
          url: 'https://target.example',
          createdAt: Date.now(),
          browserTabGroupId: 'browser-group-2',
        },
      ]
      const targetGroup = await createTabGroup(targetTabs, 'default', [
        {
          id: 'browser-group-2',
          color: 'green',
          collapsed: false,
        },
      ])

      await moveTabBetweenGroups(
        sourceGroup.id,
        targetGroup.id,
        'tab-1',
        1,
        'browser-group-2',
      )

      const updatedTargetGroup = await db.tabGroups.get(targetGroup.id)
      expect(updatedTargetGroup?.tabs[1]?.browserTabGroupId).toBe(
        'browser-group-2',
      )
      expect(updatedTargetGroup?.browserTabGroups).toEqual(
        targetGroup.browserTabGroups,
      )
    })

    it('should reject a drop into a browser group that no longer exists', async () => {
      const group = await createTabGroup(createSampleTabs())

      await expect(
        moveTabBetweenGroups(
          group.id,
          group.id,
          'tab-1',
          1,
          'missing-browser-group',
        ),
      ).rejects.toThrow('Target browser tab group not found')

      const unchangedGroup = await db.tabGroups.get(group.id)
      expect(unchangedGroup?.tabs.map((tab) => tab.id)).toEqual([
        'tab-1',
        'tab-2',
        'tab-3',
      ])
    })
  })

  describe('moveTabsBetweenGroups', () => {
    it('should move multiple tabs between groups', async () => {
      const tabs1 = createSampleTabs()
      const group1 = await createTabGroup(tabs1)

      const tabs2 = [
        {
          id: 'tab-a',
          title: 'Tab A',
          url: 'https://taba.com',
          createdAt: Date.now(),
        },
      ]
      const group2 = await createTabGroup(tabs2)

      await moveTabsBetweenGroups(group1.id, group2.id, ['tab-1', 'tab-3'], 1)

      const updatedGroup1 = await db.tabGroups.get(group1.id)
      const updatedGroup2 = await db.tabGroups.get(group2.id)

      expect(updatedGroup1?.tabs.length).toBe(1)
      expect(updatedGroup2?.tabs.length).toBe(3)
    })

    it('should reorder tabs within same group', async () => {
      const tabs = createSampleTabs()
      const group = await createTabGroup(tabs)

      await moveTabsBetweenGroups(group.id, group.id, ['tab-1', 'tab-3'], 0)

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs[0]?.id).toBe('tab-1')
      expect(updatedGroup?.tabs[1]?.id).toBe('tab-3')
      expect(updatedGroup?.tabs[2]?.id).toBe('tab-2')
    })

    it('should delete source group if all tabs are moved', async () => {
      const tabs = createSampleTabs()
      const group1 = await createTabGroup(tabs)
      const group2 = await createTabGroup([
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
      const group = await createTabGroup(createSampleTabs())
      await expect(
        moveTabsBetweenGroups(group.id, group.id, [], 0),
      ).resolves.not.toThrow()
    })
  })

  describe('moveTabsToNewGroupInUserGroup', () => {
    it('should move tabs to new group in user group', async () => {
      const tabs = createSampleTabs()
      const group = await createTabGroup(tabs)

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
      const group = await createTabGroup(tabs)

      await moveTabsToNewGroupInUserGroup(group.id, 'new-user-group', [
        'tab-1',
        'tab-2',
        'tab-3',
      ])

      const deletedGroup = await db.tabGroups.get(group.id)
      expect(deletedGroup).toBeUndefined()
    })

    it('should ungroup tabs dropped onto a user group', async () => {
      const tabs = createSampleTabs()
      tabs[0]!.browserTabGroupId = 'browser-group-1'
      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'cyan',
          collapsed: false,
        },
      ])

      await moveTabsToNewGroupInUserGroup(
        group.id,
        'new-user-group',
        ['tab-1'],
        null,
      )

      const movedGroup = (await db.tabGroups.toArray()).find(
        (tabGroup) => tabGroup.userGroupId === 'new-user-group',
      )
      expect(movedGroup?.tabs[0]?.browserTabGroupId).toBeUndefined()
      expect(movedGroup?.browserTabGroups).toBeUndefined()
    })
  })

  describe('moveSelectedTabsToUserGroup', () => {
    it('should move selected tabs to new group in user group', async () => {
      const group = await createTabGroup(createSampleTabs())

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

    it('should merge preserved browser group members into one contiguous block', async () => {
      const browserTabGroup = {
        id: 'browser-group-1',
        title: 'Research',
        color: 'orange' as const,
        collapsed: false,
      }
      const firstGroup = await createTabGroup(
        [
          {
            id: 'grouped-1',
            title: 'Grouped 1',
            url: 'https://grouped-1.example',
            createdAt: Date.now(),
            browserTabGroupId: browserTabGroup.id,
          },
        ],
        'default',
        [browserTabGroup],
      )
      const secondGroup = await createTabGroup(
        [
          {
            id: 'standalone',
            title: 'Standalone',
            url: 'https://standalone.example',
            createdAt: Date.now(),
          },
          {
            id: 'grouped-2',
            title: 'Grouped 2',
            url: 'https://grouped-2.example',
            createdAt: Date.now(),
            browserTabGroupId: browserTabGroup.id,
          },
        ],
        'default',
        [browserTabGroup],
      )

      await moveSelectedTabsToUserGroup(
        [
          { tabGroupId: firstGroup.id, tabId: 'grouped-1' },
          { tabGroupId: secondGroup.id, tabId: 'standalone' },
          { tabGroupId: secondGroup.id, tabId: 'grouped-2' },
        ],
        'target-user-group',
      )

      const movedGroup = (await db.tabGroups.toArray()).find(
        (tabGroup) => tabGroup.userGroupId === 'target-user-group',
      )
      expect(movedGroup?.tabs.map((tab) => tab.id)).toEqual([
        'grouped-1',
        'grouped-2',
        'standalone',
      ])
      expect(movedGroup?.browserTabGroups).toEqual([browserTabGroup])
    })
  })

  describe('removeSelectedTabs', () => {
    it('should remove selected tabs from groups', async () => {
      const group = await createTabGroup(createSampleTabs())

      await removeSelectedTabs([
        { tabGroupId: group.id, tabId: 'tab-1' },
        { tabGroupId: group.id, tabId: 'tab-3' },
      ])

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.length).toBe(1)
      expect(updatedGroup?.tabs[0]?.id).toBe('tab-2')
    })

    it('should delete group when all selected tabs are removed', async () => {
      const group = await createTabGroup(createSampleTabs())

      await removeSelectedTabs([
        { tabGroupId: group.id, tabId: 'tab-1' },
        { tabGroupId: group.id, tabId: 'tab-2' },
        { tabGroupId: group.id, tabId: 'tab-3' },
      ])

      const deletedGroup = await db.tabGroups.get(group.id)
      expect(deletedGroup).toBeUndefined()
    })

    it('should remove browser group metadata with its last selected member', async () => {
      const tabs = createSampleTabs()
      tabs[0]!.browserTabGroupId = 'browser-group-1'
      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'cyan',
          collapsed: false,
        },
      ])

      await removeSelectedTabs([{ tabGroupId: group.id, tabId: 'tab-1' }])

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.browserTabGroups).toBeUndefined()
    })
  })
})

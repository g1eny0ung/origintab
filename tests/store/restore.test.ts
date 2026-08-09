import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { db } from '../../src/store/base'
import {
  restoreAndDeleteBrowserTabGroup,
  restoreAndDeleteGroup,
  restoreAndDeleteTab,
  restoreGroup,
  restoreSelectedTabs,
  restoreTab,
} from '../../src/store/restore'
import { createTabGroup } from '../../src/store/tabGroups'
import type { TabItem } from '../../src/utils/types'

describe('restore module', () => {
  beforeEach(async () => {
    fakeBrowser.reset()
    await db.delete()
    await db.open()
    vi.clearAllMocks()
    // Spy on the methods we need to check
    vi.spyOn(fakeBrowser.tabs, 'create')
    vi.spyOn(fakeBrowser.tabs, 'group')
    vi.spyOn(fakeBrowser.tabGroups, 'update')
    vi.spyOn(fakeBrowser.windows, 'create')
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

  describe('restoreGroup', () => {
    it('should throw error when group not found', async () => {
      await expect(restoreGroup('non-existent')).rejects.toThrow(
        'Group not found or empty',
      )
    })

    it('should throw error when group is empty', async () => {
      await db.tabGroups.add({
        id: 'empty-group',
        userGroupId: 'default',
        createdAt: Date.now(),
        tabs: [],
      })

      await expect(restoreGroup('empty-group')).rejects.toThrow(
        'Group not found or empty',
      )
    })

    it('should restore tabs in current window', async () => {
      const group = await createTabGroup(sampleTabs)
      await restoreGroup(group.id, { newWindow: false })
      expect(fakeBrowser.tabs.create).toHaveBeenCalledTimes(2)
    })

    it('should restore tabs in new window', async () => {
      const group = await createTabGroup(sampleTabs)
      await restoreGroup(group.id, { newWindow: true })
      expect(fakeBrowser.windows.create).toHaveBeenCalled()
    })

    it('should recreate saved browser tab groups', async () => {
      vi.mocked(fakeBrowser.tabs.group).mockResolvedValue(99 as never)
      vi.mocked(fakeBrowser.tabGroups.update).mockResolvedValue(undefined)
      const groupedTabs = sampleTabs.map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))
      const group = await createTabGroup(groupedTabs, 'default', [
        {
          id: 'browser-group-1',
          title: 'Research',
          color: 'purple',
          collapsed: true,
        },
      ])

      await restoreGroup(group.id)

      expect(fakeBrowser.tabs.group).toHaveBeenCalledWith({
        tabIds: expect.arrayContaining([expect.any(Number)]),
      })
      expect(fakeBrowser.tabGroups.update).toHaveBeenCalledWith(99, {
        title: 'Research',
        color: 'purple',
        collapsed: true,
      })
    })

    it('should keep the group containing the requested active tab expanded', async () => {
      vi.mocked(fakeBrowser.tabs.create).mockResolvedValueOnce({
        id: 10,
        active: true,
      } as never)
      vi.mocked(fakeBrowser.tabs.group).mockResolvedValue(99 as never)
      const groupedTabs = sampleTabs.map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))
      const group = await createTabGroup(groupedTabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'purple',
          collapsed: true,
        },
      ])

      await restoreGroup(group.id, { active: true })

      expect(fakeBrowser.tabGroups.update).toHaveBeenCalledWith(99, {
        title: undefined,
        color: 'purple',
        collapsed: false,
      })
    })

    it('should recreate multiple saved browser groups independently', async () => {
      let nextTabId = 10
      vi.mocked(fakeBrowser.tabs.create).mockImplementation(
        async (properties) =>
          ({
            id: nextTabId++,
            active: properties.active ?? false,
          }) as never,
      )
      vi.mocked(fakeBrowser.tabs.group)
        .mockResolvedValueOnce(100 as never)
        .mockResolvedValueOnce(101 as never)
      const tabs: TabItem[] = [
        {
          ...sampleTabs[0]!,
          browserTabGroupId: 'browser-group-1',
        },
        {
          id: 'tab-1b',
          title: 'Example two',
          url: 'https://example-two.com',
          createdAt: Date.now(),
          browserTabGroupId: 'browser-group-1',
        },
        sampleTabs[1]!,
        {
          id: 'tab-3',
          title: 'Third group',
          url: 'https://third-group.example',
          createdAt: Date.now(),
          browserTabGroupId: 'browser-group-2',
        },
      ]
      const group = await createTabGroup(tabs, 'default', [
        {
          id: 'browser-group-1',
          title: 'First',
          color: 'blue',
          collapsed: false,
        },
        {
          id: 'browser-group-2',
          title: 'Second',
          color: 'orange',
          collapsed: true,
        },
      ])

      await restoreGroup(group.id)

      expect(fakeBrowser.tabs.group).toHaveBeenNthCalledWith(1, {
        tabIds: [10, 11],
      })
      expect(fakeBrowser.tabs.group).toHaveBeenNthCalledWith(2, {
        tabIds: [13],
      })
      expect(fakeBrowser.tabGroups.update).toHaveBeenNthCalledWith(1, 100, {
        title: 'First',
        color: 'blue',
        collapsed: false,
      })
      expect(fakeBrowser.tabGroups.update).toHaveBeenNthCalledWith(2, 101, {
        title: 'Second',
        color: 'orange',
        collapsed: true,
      })
    })

    it('should create restored groups in the new window', async () => {
      vi.mocked(fakeBrowser.windows.create).mockResolvedValue({
        id: 55,
        tabs: [
          { id: 201, index: 0, active: true },
          { id: 202, index: 1, active: false },
        ],
      } as never)
      vi.mocked(fakeBrowser.tabs.group).mockResolvedValue(100 as never)
      const groupedTabs = sampleTabs.map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))
      const group = await createTabGroup(groupedTabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'cyan',
          collapsed: true,
        },
      ])

      await restoreGroup(group.id, { newWindow: true })

      expect(fakeBrowser.tabs.group).toHaveBeenCalledWith({
        tabIds: [201, 202],
        createProperties: { windowId: 55 },
      })
      expect(fakeBrowser.tabGroups.update).toHaveBeenCalledWith(100, {
        title: undefined,
        color: 'cyan',
        collapsed: false,
      })
    })

    it('should keep saved data when new-window tabs cannot be mapped exactly', async () => {
      vi.mocked(fakeBrowser.windows.create).mockResolvedValue({
        id: 55,
        tabs: [
          { id: 201, index: 0, active: true },
          { id: 202, index: 1, active: false },
          { id: 203, index: 2, active: false },
        ],
      } as never)
      const groupedTabs = sampleTabs.map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))
      const group = await createTabGroup(groupedTabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'cyan',
          collapsed: false,
        },
      ])

      await expect(
        restoreAndDeleteGroup(group.id, { newWindow: true }),
      ).rejects.toThrow('Unable to identify restored tabs for grouping')

      expect(fakeBrowser.tabs.group).not.toHaveBeenCalled()
      expect(await db.tabGroups.get(group.id)).toEqual(group)
    })

    it('should restore grouped tabs as plain tabs in a new window when the API is unavailable', async () => {
      vi.mocked(fakeBrowser.windows.create).mockResolvedValue({
        id: 55,
      } as never)
      const groupedTabs = sampleTabs.map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))
      const group = await createTabGroup(groupedTabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'cyan',
          collapsed: false,
        },
      ])
      const originalGroup = fakeBrowser.tabs.group
      Object.defineProperty(fakeBrowser.tabs, 'group', {
        configurable: true,
        value: undefined,
      })

      try {
        await restoreGroup(group.id, { newWindow: true })

        expect(fakeBrowser.windows.create).toHaveBeenCalledWith({
          url: groupedTabs.map((tab) => tab.url),
          focused: true,
        })
        expect(originalGroup).not.toHaveBeenCalled()
      } finally {
        Object.defineProperty(fakeBrowser.tabs, 'group', {
          configurable: true,
          value: originalGroup,
        })
      }
    })
  })

  describe('restoreAndDeleteGroup', () => {
    it('should restore and delete group', async () => {
      const group = await createTabGroup(sampleTabs)
      await restoreAndDeleteGroup(group.id)
      const deletedGroup = await db.tabGroups.get(group.id)
      expect(deletedGroup).toBeUndefined()
    })

    it('should keep tabs added while the saved snapshot is being restored', async () => {
      const group = await createTabGroup(sampleTabs)
      let finishFirstRestore: ((tab: Browser.tabs.Tab) => void) | undefined
      vi.mocked(fakeBrowser.tabs.create).mockImplementationOnce(
        () =>
          new Promise<Browser.tabs.Tab>((resolve) => {
            finishFirstRestore = resolve
          }) as never,
      )

      const restoring = restoreAndDeleteGroup(group.id)
      await vi.waitFor(() => expect(finishFirstRestore).toBeDefined())
      const currentGroup = await db.tabGroups.get(group.id)
      const addedTab: TabItem = {
        id: 'tab-added-during-restore',
        title: 'Added later',
        url: 'https://added-later.example',
        createdAt: Date.now(),
      }
      await db.tabGroups.update(group.id, {
        tabs: [...currentGroup!.tabs, addedTab],
      })
      finishFirstRestore?.({ id: 101 } as Browser.tabs.Tab)

      await restoring

      const remainingGroup = await db.tabGroups.get(group.id)
      expect(remainingGroup?.tabs).toEqual([addedTab])
    })

    it('should preserve saved data when native group creation fails', async () => {
      vi.mocked(fakeBrowser.tabs.group).mockRejectedValueOnce(
        new Error('group creation failed'),
      )
      const groupedTabs = sampleTabs.map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))
      const group = await createTabGroup(groupedTabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'blue',
          collapsed: false,
        },
      ])

      await expect(restoreAndDeleteGroup(group.id)).rejects.toThrow(
        'group creation failed',
      )

      expect(await db.tabGroups.get(group.id)).toEqual(group)
    })
  })

  describe('restoreTab', () => {
    it('should throw error when group not found', async () => {
      await expect(restoreTab('non-existent', 'tab-1')).rejects.toThrow(
        'Group not found',
      )
    })

    it('should throw error when tab not found', async () => {
      const group = await createTabGroup(sampleTabs)
      await expect(restoreTab(group.id, 'non-existent-tab')).rejects.toThrow(
        'Tab not found',
      )
    })

    it('should restore single tab', async () => {
      const group = await createTabGroup(sampleTabs)
      await restoreTab(group.id, 'tab-1')
      expect(fakeBrowser.tabs.create).toHaveBeenCalledWith({
        url: 'https://example.com',
        active: false,
      })
    })

    it('should restore tab with active option', async () => {
      const group = await createTabGroup(sampleTabs)
      await restoreTab(group.id, 'tab-1', { active: true })
      expect(fakeBrowser.tabs.create).toHaveBeenCalledWith({
        url: 'https://example.com',
        active: true,
      })
    })
  })

  describe('restoreAndDeleteTab', () => {
    it('should restore and delete tab', async () => {
      const group = await createTabGroup(sampleTabs)
      await restoreAndDeleteTab(group.id, 'tab-1')

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.length).toBe(1)
      expect(updatedGroup?.tabs.find((t) => t.id === 'tab-1')).toBeUndefined()
    })
  })

  describe('restoreAndDeleteBrowserTabGroup', () => {
    it('should restore the native group and only remove its saved tabs', async () => {
      vi.mocked(fakeBrowser.tabs.group).mockResolvedValue(100 as never)
      vi.mocked(fakeBrowser.tabGroups.update).mockResolvedValue(undefined)
      const groupedTabs: TabItem[] = sampleTabs.map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))
      const standaloneTab: TabItem = {
        id: 'tab-3',
        title: 'Standalone',
        url: 'https://standalone.example',
        createdAt: Date.now(),
      }
      const group = await createTabGroup(
        [...groupedTabs, standaloneTab],
        'default',
        [
          {
            id: 'browser-group-1',
            title: 'Research',
            color: 'green',
            collapsed: false,
          },
        ],
      )

      await restoreAndDeleteBrowserTabGroup(group.id, 'browser-group-1')

      expect(fakeBrowser.tabs.create).toHaveBeenCalledTimes(2)
      expect(fakeBrowser.tabs.group).toHaveBeenCalledOnce()
      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs).toEqual([standaloneTab])
      expect(updatedGroup?.browserTabGroups).toBeUndefined()
    })

    it('should not delete a new member added while the snapshot is restoring', async () => {
      vi.mocked(fakeBrowser.tabs.group).mockResolvedValue(100 as never)
      const groupedTabs: TabItem[] = sampleTabs.map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))
      const group = await createTabGroup(groupedTabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'green',
          collapsed: false,
        },
      ])
      let finishFirstRestore: ((tab: Browser.tabs.Tab) => void) | undefined
      vi.mocked(fakeBrowser.tabs.create).mockImplementationOnce(
        () =>
          new Promise<Browser.tabs.Tab>((resolve) => {
            finishFirstRestore = resolve
          }) as never,
      )

      const restoring = restoreAndDeleteBrowserTabGroup(
        group.id,
        'browser-group-1',
      )
      await vi.waitFor(() => expect(finishFirstRestore).toBeDefined())
      const currentGroup = await db.tabGroups.get(group.id)
      const addedTab: TabItem = {
        id: 'new-group-member',
        title: 'New group member',
        url: 'https://new-group-member.example',
        createdAt: Date.now(),
        browserTabGroupId: 'browser-group-1',
      }
      await db.tabGroups.update(group.id, {
        tabs: [...currentGroup!.tabs, addedTab],
      })
      finishFirstRestore?.({ id: 102 } as Browser.tabs.Tab)

      await restoring

      const remainingGroup = await db.tabGroups.get(group.id)
      expect(remainingGroup?.tabs).toEqual([addedTab])
      expect(remainingGroup?.browserTabGroups).toHaveLength(1)
    })

    it('should restore as plain tabs when the browser group API is unavailable', async () => {
      const groupedTabs: TabItem[] = sampleTabs.map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))
      const group = await createTabGroup(groupedTabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'blue',
          collapsed: false,
        },
      ])
      const originalGroup = fakeBrowser.tabs.group
      Object.defineProperty(fakeBrowser.tabs, 'group', {
        configurable: true,
        value: undefined,
      })

      try {
        await restoreAndDeleteBrowserTabGroup(group.id, 'browser-group-1')

        expect(fakeBrowser.tabs.create).toHaveBeenCalledTimes(2)
        expect(originalGroup).not.toHaveBeenCalled()
        expect(await db.tabGroups.get(group.id)).toBeUndefined()
      } finally {
        Object.defineProperty(fakeBrowser.tabs, 'group', {
          configurable: true,
          value: originalGroup,
        })
      }
    })

    it('should preserve saved data when native group metadata cannot be restored', async () => {
      vi.mocked(fakeBrowser.tabs.group).mockResolvedValue(100 as never)
      vi.mocked(fakeBrowser.tabGroups.update).mockRejectedValueOnce(
        new Error('group update failed'),
      )
      const groupedTabs = sampleTabs.map((tab) => ({
        ...tab,
        browserTabGroupId: 'browser-group-1',
      }))
      const group = await createTabGroup(groupedTabs, 'default', [
        {
          id: 'browser-group-1',
          color: 'green',
          collapsed: false,
        },
      ])

      await expect(
        restoreAndDeleteBrowserTabGroup(group.id, 'browser-group-1'),
      ).rejects.toThrow('group update failed')

      expect(await db.tabGroups.get(group.id)).toEqual(group)
    })
  })

  describe('restoreSelectedTabs', () => {
    it('should do nothing when no tabs selected', async () => {
      await expect(restoreSelectedTabs([])).resolves.not.toThrow()
    })

    it('should restore selected tabs', async () => {
      const group = await createTabGroup(sampleTabs)

      await restoreSelectedTabs([
        { tabGroupId: group.id, tabId: 'tab-1' },
        { tabGroupId: group.id, tabId: 'tab-2' },
      ])

      expect(fakeBrowser.tabs.create).toHaveBeenCalledTimes(2)
    })

    it('should restore and remove tabs when remove option is true', async () => {
      const group = await createTabGroup(sampleTabs)

      await restoreSelectedTabs([{ tabGroupId: group.id, tabId: 'tab-1' }], {
        remove: true,
      })

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.length).toBe(1)
    })

    it('should delete group when all selected tabs are removed', async () => {
      const group = await createTabGroup(sampleTabs)

      await restoreSelectedTabs(
        [
          { tabGroupId: group.id, tabId: 'tab-1' },
          { tabGroupId: group.id, tabId: 'tab-2' },
        ],
        { remove: true },
      )

      const deletedGroup = await db.tabGroups.get(group.id)
      expect(deletedGroup).toBeUndefined()
    })

    it('should remove from the latest group state after restore completes', async () => {
      const group = await createTabGroup(sampleTabs)
      let finishRestore: ((tab: Browser.tabs.Tab) => void) | undefined
      vi.mocked(fakeBrowser.tabs.create).mockImplementationOnce(
        () =>
          new Promise<Browser.tabs.Tab>((resolve) => {
            finishRestore = resolve
          }) as never,
      )

      const restoring = restoreSelectedTabs(
        [{ tabGroupId: group.id, tabId: 'tab-1' }],
        { remove: true },
      )
      await vi.waitFor(() => expect(finishRestore).toBeDefined())
      const currentGroup = await db.tabGroups.get(group.id)
      const addedTab: TabItem = {
        id: 'tab-added-during-selection-restore',
        title: 'Added later',
        url: 'https://added-selection.example',
        createdAt: Date.now(),
      }
      await db.tabGroups.update(group.id, {
        tabs: [...currentGroup!.tabs, addedTab],
      })
      finishRestore?.({ id: 103 } as Browser.tabs.Tab)

      await restoring

      const remainingGroup = await db.tabGroups.get(group.id)
      expect(remainingGroup?.tabs.map((tab) => tab.id)).toEqual([
        'tab-2',
        addedTab.id,
      ])
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '../../src/store/base'
import {
  restoreAndDeleteGroup,
  restoreAndDeleteTab,
  restoreGroup,
  restoreSelectedTabs,
  restoreTab,
} from '../../src/store/restore'
import { createTabGroupWithExistingTabs } from '../../src/store/tabGroups'
import type { TabItem } from '../../src/utils/types'

describe('restore module', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    vi.clearAllMocks()
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
      const group = await createTabGroupWithExistingTabs(sampleTabs)
      await restoreGroup(group.id, { newWindow: false })
      expect(browser.tabs.create).toHaveBeenCalledTimes(2)
    })

    it('should restore tabs in new window', async () => {
      const group = await createTabGroupWithExistingTabs(sampleTabs)
      await restoreGroup(group.id, { newWindow: true })
      expect(browser.windows.create).toHaveBeenCalled()
    })
  })

  describe('restoreAndDeleteGroup', () => {
    it('should restore and delete group', async () => {
      const group = await createTabGroupWithExistingTabs(sampleTabs)
      await restoreAndDeleteGroup(group.id)
      const deletedGroup = await db.tabGroups.get(group.id)
      expect(deletedGroup).toBeUndefined()
    })
  })

  describe('restoreTab', () => {
    it('should throw error when group not found', async () => {
      await expect(restoreTab('non-existent', 'tab-1')).rejects.toThrow(
        'Group not found',
      )
    })

    it('should throw error when tab not found', async () => {
      const group = await createTabGroupWithExistingTabs(sampleTabs)
      await expect(restoreTab(group.id, 'non-existent-tab')).rejects.toThrow(
        'Tab not found',
      )
    })

    it('should restore single tab', async () => {
      const group = await createTabGroupWithExistingTabs(sampleTabs)
      await restoreTab(group.id, 'tab-1')
      expect(browser.tabs.create).toHaveBeenCalledWith({
        url: 'https://example.com',
        active: false,
      })
    })

    it('should restore tab with active option', async () => {
      const group = await createTabGroupWithExistingTabs(sampleTabs)
      await restoreTab(group.id, 'tab-1', { active: true })
      expect(browser.tabs.create).toHaveBeenCalledWith({
        url: 'https://example.com',
        active: true,
      })
    })
  })

  describe('restoreAndDeleteTab', () => {
    it('should restore and delete tab', async () => {
      const group = await createTabGroupWithExistingTabs(sampleTabs)
      await restoreAndDeleteTab(group.id, 'tab-1')

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.length).toBe(1)
      expect(updatedGroup?.tabs.find((t) => t.id === 'tab-1')).toBeUndefined()
    })
  })

  describe('restoreSelectedTabs', () => {
    it('should do nothing when no tabs selected', async () => {
      await expect(restoreSelectedTabs([])).resolves.not.toThrow()
    })

    it('should restore selected tabs', async () => {
      const group = await createTabGroupWithExistingTabs(sampleTabs)

      await restoreSelectedTabs([
        { tabGroupId: group.id, tabId: 'tab-1' },
        { tabGroupId: group.id, tabId: 'tab-2' },
      ])

      expect(browser.tabs.create).toHaveBeenCalledTimes(2)
    })

    it('should restore and remove tabs when remove option is true', async () => {
      const group = await createTabGroupWithExistingTabs(sampleTabs)

      await restoreSelectedTabs([{ tabGroupId: group.id, tabId: 'tab-1' }], {
        remove: true,
      })

      const updatedGroup = await db.tabGroups.get(group.id)
      expect(updatedGroup?.tabs.length).toBe(1)
    })

    it('should delete group when all selected tabs are removed', async () => {
      const group = await createTabGroupWithExistingTabs(sampleTabs)

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
  })
})

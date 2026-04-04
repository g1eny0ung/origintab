import { notifyContextMenusRefresh } from '@/utils/background/contextMenus'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_GROUP_ID, db, initDefaultGroup } from '../../src/store/base'
import {
  clearAllData,
  exportToText,
  importFromText,
} from '../../src/store/dataManagement'
import { createTabGroupWithExistingTabs } from '../../src/store/tabGroups'
import type { TabItem } from '../../src/utils/types'

vi.mock('@/utils/background/contextMenus')

describe('dataManagement module', () => {
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

  describe('clearAllData', () => {
    it('should clear all user groups and tab groups', async () => {
      await initDefaultGroup()
      await createTabGroupWithExistingTabs(sampleTabs)

      await clearAllData()

      const userGroups = await db.userGroups.toArray()
      const tabGroups = await db.tabGroups.toArray()

      expect(userGroups.length).toBe(1)
      expect(userGroups[0].id).toBe(DEFAULT_GROUP_ID)
      expect(tabGroups.length).toBe(0)
    })

    it('should notify context menus refresh', async () => {
      await initDefaultGroup()
      await clearAllData()
      expect(notifyContextMenusRefresh).toHaveBeenCalled()
    })
  })

  describe('exportToText', () => {
    it('should export all tabs to text format', async () => {
      await createTabGroupWithExistingTabs(sampleTabs)

      const result = await exportToText()
      expect(result).toContain('https://example.com | Example')
      expect(result).toContain('https://google.com | Google')
    })

    it('should export only tabs from specified user group', async () => {
      const customGroupId = 'custom-group'
      await createTabGroupWithExistingTabs(sampleTabs, customGroupId)
      await createTabGroupWithExistingTabs(
        [
          {
            id: 'tab-3',
            title: 'Another',
            url: 'https://another.com',
            createdAt: Date.now(),
          },
        ],
        DEFAULT_GROUP_ID,
      )

      const result = await exportToText(customGroupId)
      expect(result).toContain('https://example.com | Example')
      expect(result).not.toContain('https://another.com | Another')
    })

    it('should return empty string when no tabs exist', async () => {
      const result = await exportToText()
      expect(result).toBe('')
    })
  })

  describe('importFromText', () => {
    it('should import tabs from valid text format', async () => {
      const importText = `
https://example.com | Example Site
https://google.com | Google Search
`

      const result = await importFromText(importText)

      expect(result.imported).toBe(2)
      expect(result.errors.length).toBe(0)

      const tabGroups = await db.tabGroups.toArray()
      expect(tabGroups.length).toBe(1)
      expect(tabGroups[0].tabs.length).toBe(2)
    })

    it('should collect errors for invalid lines', async () => {
      const importText = `
https://example.com | Example Site
invalid line without separator
| Missing URL and title
missing-title | 
`

      const result = await importFromText(importText)

      expect(result.imported).toBe(1)
      expect(result.errors.length).toBe(3)
    })

    it('should import to specified user group', async () => {
      const customGroupId = 'custom-group'
      const importText = 'https://example.com | Example'

      await importFromText(importText, customGroupId)

      const tabGroups = await db.tabGroups.toArray()
      expect(tabGroups[0].userGroupId).toBe(customGroupId)
    })

    it('should handle empty input', async () => {
      const result = await importFromText('')
      expect(result.imported).toBe(0)
      expect(result.errors.length).toBe(0)
    })
  })
})

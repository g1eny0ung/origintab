import { notifyContextMenusRefresh } from '@/utils/background/contextMenus'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_GROUP_ID, db, initDefaultGroup } from '../../src/store/base'
import {
  clearAllData,
  exportToText,
  importFromText,
  isISOTimeString,
} from '../../src/store/dataManagement'
import { createTabGroup } from '../../src/store/tabGroups'
import { createUserGroup } from '../../src/store/userGroups'
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
      await createTabGroup(sampleTabs)

      await clearAllData()

      const userGroups = await db.userGroups.toArray()
      const tabGroups = await db.tabGroups.toArray()

      expect(userGroups.length).toBe(1)
      expect(userGroups[0]!.id).toBe(DEFAULT_GROUP_ID)
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
      await createTabGroup(sampleTabs)

      const result = await exportToText()
      expect(result).toContain('https://example.com | Example')
      expect(result).toContain('https://google.com | Google')
    })

    it('should export only tabs from specified user group', async () => {
      const customGroupId = 'custom-group'
      await createTabGroup(sampleTabs, customGroupId)
      await createTabGroup(
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

    it('should preserve browser tab groups in an OriginTab format round trip', async () => {
      const tabs = sampleTabs.map((tab, index) => ({
        ...tab,
        browserTabGroupId: index === 0 ? 'browser-group-1' : undefined,
      }))
      await createTabGroup(tabs, DEFAULT_GROUP_ID, [
        {
          id: 'browser-group-1',
          title: 'Research',
          color: 'purple',
          collapsed: true,
        },
      ])

      const exported = await exportToText(undefined, { originTabFormat: true })
      await db.tabGroups.clear()
      const result = await importFromText(exported, { format: 'originTab' })

      const [importedGroup] = await db.tabGroups.toArray()
      expect(result.errors).toEqual([])
      expect(importedGroup?.browserTabGroups?.[0]).toMatchObject({
        title: 'Research',
        color: 'purple',
        collapsed: true,
      })
      expect(importedGroup?.browserTabGroups?.[0]?.id).not.toBe(
        'browser-group-1',
      )
      expect(importedGroup?.tabs[0]?.browserTabGroupId).toBe(
        importedGroup?.browserTabGroups?.[0]?.id,
      )
      expect(importedGroup?.tabs[1]?.browserTabGroupId).toBeUndefined()
    })

    it('should assign independent browser group IDs to repeated imports', async () => {
      await createTabGroup(
        [{ ...sampleTabs[0]!, browserTabGroupId: 'browser-group-1' }],
        DEFAULT_GROUP_ID,
        [
          {
            id: 'browser-group-1',
            color: 'blue',
            collapsed: false,
          },
        ],
      )
      const exported = await exportToText(undefined, { originTabFormat: true })

      await importFromText(exported, { format: 'originTab' })
      await importFromText(exported, { format: 'originTab' })

      const browserGroupIds = (await db.tabGroups.toArray()).flatMap(
        (group) =>
          group.browserTabGroups?.map((browserGroup) => browserGroup.id) ?? [],
      )
      expect(new Set(browserGroupIds).size).toBe(3)
    })

    it.each([
      '@origintab:tab-browser-group "work"',
      '@origintab:browser-tab-group {"id":"work","color":"blue","collapsed":false}',
      '2023-10-01T12:00:00.000Z',
      'https://example.com | Looks like a tab',
    ])('should round-trip an unambiguous user group name: %s', async (name) => {
      const userGroup = await createUserGroup(name)
      await createTabGroup([sampleTabs[0]!], userGroup.id)
      const exported = await exportToText(userGroup.id, {
        originTabFormat: true,
      })

      await db.tabGroups.clear()
      await db.userGroups.clear()
      const result = await importFromText(exported, { format: 'originTab' })

      const [importedGroup] = await db.tabGroups.toArray()
      const importedUserGroup = importedGroup
        ? await db.userGroups.get(importedGroup.userGroupId)
        : undefined
      expect(result.errors).toEqual([])
      expect(importedUserGroup?.name).toBe(name)
    })
  })

  describe('importFromText', () => {
    it('should import tabs from valid text format', async () => {
      const importText = `
https://example.com | Example Site
https://google.com | Google Search
`

      const result = await importFromText(importText, { format: 'general' })

      expect(result.imported).toBe(2)
      expect(result.errors.length).toBe(0)

      const tabGroups = await db.tabGroups.toArray()
      expect(tabGroups.length).toBe(1)
      expect(tabGroups[0]!.tabs.length).toBe(2)
    })

    it('should collect errors for invalid lines', async () => {
      const importText = `
https://example.com | Example Site
invalid line without separator
| Missing URL and title
missing-title |
`

      const result = await importFromText(importText, { format: 'general' })

      expect(result.imported).toBe(0)
      expect(result.errors.length).toBe(3)
    })

    it('should import to specified user group from text header', async () => {
      const importText =
        'Custom Group\n2023-10-01T12:00:00.000Z\nhttps://example.com | Example'

      await importFromText(importText, { format: 'originTab' })

      const tabGroups = await db.tabGroups.toArray()
      expect(tabGroups[0]!.userGroupId).not.toBe('default')
    })

    it('should handle empty input', async () => {
      const result = await importFromText('', { format: 'general' })
      expect(result.imported).toBe(0)
      expect(result.errors.length).toBe(0)
    })

    it('should import old format to specified fallback user group', async () => {
      await initDefaultGroup()
      const customGroup = await createUserGroup('Custom Group')
      const importText = 'https://example.com | Example'

      await importFromText(importText, {
        format: 'general',
        userGroupId: customGroup.id,
      })

      const tabGroups = await db.tabGroups.toArray()
      expect(tabGroups.length).toBe(1)
      expect(tabGroups[0]!.userGroupId).toBe(customGroup.id)
    })

    it('should import old format to default group when no fallback specified', async () => {
      await initDefaultGroup()
      const importText = 'https://example.com | Example'

      await importFromText(importText, { format: 'general' })

      const tabGroups = await db.tabGroups.toArray()
      expect(tabGroups.length).toBe(1)
      expect(tabGroups[0]!.userGroupId).toBe(DEFAULT_GROUP_ID)
    })

    it('should import originTab format creating new user group from text', async () => {
      await initDefaultGroup()
      const importText =
        'New Group\n2023-10-01T12:00:00.000Z\nhttps://example.com | Example'

      await importFromText(importText, { format: 'originTab' })

      const tabGroups = await db.tabGroups.toArray()
      const userGroups = await db.userGroups.toArray()

      expect(tabGroups.length).toBe(1)
      expect(userGroups.length).toBe(2)
      expect(tabGroups[0]!.userGroupId).not.toBe('default')
    })

    it.each([
      '@origintab:user-group legacy-name',
      '@origintab:user-group "quoted-name"',
      '@origintab:tab-browser-group "work"',
      '@origintab:browser-tab-group legacy-name',
      '2023-09-30T12:00:00.000Z',
      'https://example.com | Looks like a tab',
    ])('should preserve a legacy user group name: %s', async (name) => {
      const importText = [
        name,
        '2023-10-01T12:00:00.000Z',
        'https://example.com | Example',
      ].join('\n')

      const result = await importFromText(importText, { format: 'originTab' })
      const [tabGroup] = await db.tabGroups.toArray()
      const userGroup = tabGroup
        ? await db.userGroups.get(tabGroup.userGroupId)
        : undefined

      expect(result.errors).toEqual([])
      expect(userGroup?.name).toBe(name)
    })

    it('should import originTab format ignoring invalid lines as user group names', async () => {
      await initDefaultGroup()
      const importText = `
Custom Group
2023-10-01T12:00:00.000Z
https://example.com | Example
invalid line without separator or pipe
`

      const result = await importFromText(importText, { format: 'originTab' })

      expect(result.imported).toBe(1)
      expect(result.errors.length).toBe(0)

      const tabGroups = await db.tabGroups.toArray()
      expect(tabGroups.length).toBe(1)
      expect(tabGroups[0]!.tabs.length).toBe(1)
    })

    it('should handle empty input for originTab format', async () => {
      const result = await importFromText('', { format: 'originTab' })
      expect(result.imported).toBe(0)
      expect(result.errors.length).toBe(0)
    })

    it.each([
      '2023-99-99T99:99:99.000Z',
      '2023-02-29T12:00:00.000Z',
      '2023-01-01T24:00:00.000Z',
    ])('should reject an invalid ISO timestamp: %s', (timestamp) => {
      expect(isISOTimeString(timestamp)).toBe(false)
    })

    it('should not create a collection with an invalid timestamp', async () => {
      const importText = [
        'Default',
        '2023-99-99T99:99:99.000Z',
        'https://example.com | Example',
      ].join('\n')

      const result = await importFromText(importText, { format: 'originTab' })

      expect(result.imported).toBe(0)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(await db.tabGroups.count()).toBe(0)
    })

    it('should reject an empty collection', async () => {
      const importText = ['Default', '2023-10-01T12:00:00.000Z'].join('\n')

      const result = await importFromText(importText, { format: 'originTab' })

      expect(result.imported).toBe(0)
      expect(result.errors).toContain(
        'Collection must contain at least one tab',
      )
      expect(await db.tabGroups.count()).toBe(0)
    })

    it('should reject a browser group reference without metadata', async () => {
      const importText = [
        'Default',
        '2023-10-01T12:00:00.000Z',
        '@origintab:tab-browser-group "missing"',
        'https://example.com | Example',
      ].join('\n')

      const result = await importFromText(importText, { format: 'originTab' })

      expect(result.imported).toBe(0)
      expect(result.errors).toContain(
        'Browser tab group reference has no matching metadata',
      )
      expect(await db.tabGroups.count()).toBe(0)
    })

    it('should reject a browser group reference not followed by a tab', async () => {
      const importText = [
        'Default',
        '2023-10-01T12:00:00.000Z',
        '@origintab:browser-tab-group {"id":"work","color":"blue","collapsed":false}',
        '@origintab:tab-browser-group "work"',
        '@origintab:tab-browser-group "work"',
        'https://example.com | Example',
      ].join('\n')

      const result = await importFromText(importText, { format: 'originTab' })

      expect(result.imported).toBe(0)
      expect(result.errors).toContain(
        'Browser tab group reference must be followed by a tab',
      )
      expect(await db.tabGroups.count()).toBe(0)
    })

    it('should reject a dangling browser group reference before the next collection', async () => {
      const importText = [
        'Default',
        '2023-10-01T12:00:00.000Z',
        '@origintab:browser-tab-group {"id":"work","color":"blue","collapsed":false}',
        'https://first.example | First',
        '@origintab:tab-browser-group "work"',
        '2023-10-02T12:00:00.000Z',
        'https://second.example | Second',
      ].join('\n')

      const result = await importFromText(importText, { format: 'originTab' })

      expect(result.imported).toBe(0)
      expect(result.errors).toContain(
        'Browser tab group reference must be followed by a tab',
      )
      expect(await db.tabGroups.count()).toBe(0)
    })

    it('should reject duplicate browser group metadata IDs', async () => {
      const metadata =
        '@origintab:browser-tab-group {"id":"work","color":"blue","collapsed":false}'
      const importText = [
        'Default',
        '2023-10-01T12:00:00.000Z',
        metadata,
        metadata,
        '@origintab:tab-browser-group "work"',
        'https://example.com | Example',
      ].join('\n')

      const result = await importFromText(importText, { format: 'originTab' })

      expect(result.imported).toBe(0)
      expect(result.errors).toContain(
        'Duplicate browser tab group metadata: work',
      )
      expect(await db.tabGroups.count()).toBe(0)
    })
  })
})

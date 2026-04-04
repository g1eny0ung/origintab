import { beforeEach, describe, expect, it } from 'vitest'

import {
  DEFAULT_GROUP_ID,
  db,
  generateId,
  initDefaultGroup,
} from '../../src/store/base'

describe('base module', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
    })

    it('should generate ID with timestamp prefix', () => {
      const id = generateId()
      const parts = id.split('-')
      expect(parts.length).toBeGreaterThan(1)
      expect(parts[0].length).toBeGreaterThan(10)
    })
  })

  describe('initDefaultGroup', () => {
    it('should create default group when no groups exist', async () => {
      await initDefaultGroup()
      const count = await db.userGroups.count()
      expect(count).toBe(1)

      const defaultGroup = await db.userGroups.get(DEFAULT_GROUP_ID)
      expect(defaultGroup).toBeDefined()
      expect(defaultGroup?.name).toBe('Default')
    })

    it('should not create default group when groups already exist', async () => {
      await db.userGroups.add({
        id: 'test-group',
        name: 'Test Group',
        createdAt: Date.now(),
      })

      await initDefaultGroup()
      const count = await db.userGroups.count()
      expect(count).toBe(1)

      const defaultGroup = await db.userGroups.get(DEFAULT_GROUP_ID)
      expect(defaultGroup).toBeUndefined()
    })
  })

  describe('db instance', () => {
    it('should have userGroups table', async () => {
      expect(db.userGroups).toBeDefined()
    })

    it('should have tabGroups table', async () => {
      expect(db.tabGroups).toBeDefined()
    })

    it('should allow adding and retrieving user groups', async () => {
      const userGroup = {
        id: 'test-123',
        name: 'Test User Group',
        createdAt: Date.now(),
      }

      await db.userGroups.add(userGroup)
      const result = await db.userGroups.get('test-123')
      expect(result).toEqual(userGroup)
    })

    it('should allow adding and retrieving tab groups', async () => {
      const tabGroup = {
        id: 'tab-group-123',
        userGroupId: DEFAULT_GROUP_ID,
        createdAt: Date.now(),
        tabs: [
          {
            id: 'tab-1',
            title: 'Test Tab',
            url: 'https://example.com',
            createdAt: Date.now(),
          },
        ],
      }

      await db.tabGroups.add(tabGroup)
      const result = await db.tabGroups.get('tab-group-123')
      expect(result).toEqual(tabGroup)
    })
  })
})

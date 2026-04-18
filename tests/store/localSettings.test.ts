import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import {
  getLocalSettings,
  resetLocalSettings,
  updateLocalSettings,
} from '../../src/store/localSettings'

describe('localSettings module', () => {
  beforeEach(() => {
    fakeBrowser.reset()
  })

  describe('getLocalSettings', () => {
    it('should return empty object by default', async () => {
      const settings = await getLocalSettings()
      expect(settings).toEqual({})
    })

    it('should return stored settings', async () => {
      await updateLocalSettings({ defaultUserGroupId: 'test-group-123' })
      const settings = await getLocalSettings()
      expect(settings).toEqual({ defaultUserGroupId: 'test-group-123' })
    })
  })

  describe('updateLocalSettings', () => {
    it('should update specified local settings', async () => {
      const updates = { defaultUserGroupId: 'test-group-123' }

      await updateLocalSettings(updates)
      const settings = await getLocalSettings()

      expect(settings.defaultUserGroupId).toBe('test-group-123')
    })

    it('should update only provided settings', async () => {
      await updateLocalSettings({ defaultUserGroupId: 'test-group-456' })
      const settings = await getLocalSettings()

      expect(settings.defaultUserGroupId).toBe('test-group-456')
    })
  })

  describe('resetLocalSettings', () => {
    it('should reset local settings to default (empty object)', async () => {
      await updateLocalSettings({ defaultUserGroupId: 'test-group-to-reset' })
      await resetLocalSettings()
      const settings = await getLocalSettings()

      expect(settings).toEqual({})
    })
  })
})

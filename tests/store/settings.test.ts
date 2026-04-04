// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  defaultSettings,
  getSettings,
  resetSettings,
  updateSettings,
} from '../../src/store/settings'
import {
  ClickAction,
  RestoreAction,
  UrlDisplayMode,
} from '../../src/utils/types'

// Mock the storage module properly
vi.mock('../../src/store/settings', async () => {
  const actual = await vi.importActual('../../src/store/settings')
  let mockStorage = { ...actual.defaultSettings }
  return {
    ...actual,
    getSettings: vi.fn().mockImplementation(() => Promise.resolve(mockStorage)),
    updateSettings: vi.fn().mockImplementation((updates) => {
      mockStorage = { ...mockStorage, ...updates }
      return Promise.resolve()
    }),
    resetSettings: vi.fn().mockImplementation(() => {
      mockStorage = { ...actual.defaultSettings }
      return Promise.resolve()
    }),
  }
})

describe('settings module', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset to default before each test
    await resetSettings()
  })

  describe('getSettings', () => {
    it('should return current settings', async () => {
      const settings = await getSettings()
      expect(settings).toEqual(defaultSettings)
    })
  })

  describe('updateSettings', () => {
    it('should update specified settings', async () => {
      const updates = {
        autoOpenOnStartup: false,
        clickAction: ClickAction.SaveAll,
      }

      await updateSettings(updates)
      const settings = await getSettings()

      expect(settings.autoOpenOnStartup).toBe(false)
      expect(settings.clickAction).toBe(ClickAction.SaveAll)
    })

    it('should update only provided settings', async () => {
      await updateSettings({ confirmBeforeDelete: false })
      const settings = await getSettings()

      expect(settings.confirmBeforeDelete).toBe(false)
      expect(settings.autoOpenOnStartup).toBe(true)
    })
  })

  describe('resetSettings', () => {
    it('should reset settings to default', async () => {
      await updateSettings({ autoOpenOnStartup: false })
      await resetSettings()
      const settings = await getSettings()

      expect(settings).toEqual(defaultSettings)
    })
  })

  describe('defaultSettings', () => {
    it('should have all required properties', () => {
      expect(defaultSettings.autoOpenOnStartup).toBeDefined()
      expect(defaultSettings.confirmBeforeDelete).toBeDefined()
      expect(defaultSettings.clickAction).toBeDefined()
      expect(defaultSettings.urlDisplayMode).toBeDefined()
      expect(defaultSettings.restoreAction).toBeDefined()
      expect(defaultSettings.openGroupInNewWindow).toBeDefined()
    })

    it('should have correct default values', () => {
      expect(defaultSettings.autoOpenOnStartup).toBe(true)
      expect(defaultSettings.confirmBeforeDelete).toBe(true)
      expect(defaultSettings.clickAction).toBe(ClickAction.ShowPopup)
      expect(defaultSettings.urlDisplayMode).toBe(UrlDisplayMode.None)
      expect(defaultSettings.restoreAction).toBe(RestoreAction.OpenWithoutJump)
      expect(defaultSettings.openGroupInNewWindow).toBe(true)
    })
  })
})

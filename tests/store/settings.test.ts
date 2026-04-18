import { beforeEach, describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

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

describe('settings module', () => {
  beforeEach(async () => {
    fakeBrowser.reset()
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

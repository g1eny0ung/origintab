import {
  ClickAction,
  RestoreAction,
  TimeDisplayMode,
  UrlDisplayMode,
} from '~/utils/types'

export interface Settings {
  autoOpenOnStartup: boolean
  confirmBeforeDelete: boolean
  clickAction: ClickAction
  urlDisplayMode: UrlDisplayMode
  restoreAction: RestoreAction
  openGroupInNewWindow: boolean
  timeDisplayMode: TimeDisplayMode
}

const SETTINGS_KEY = 'sync:settings'

export const defaultSettings: Settings = {
  autoOpenOnStartup: true,
  confirmBeforeDelete: true,
  clickAction: ClickAction.ShowPopup,
  urlDisplayMode: UrlDisplayMode.None,
  restoreAction: RestoreAction.OpenWithoutJump,
  openGroupInNewWindow: true,
  timeDisplayMode: TimeDisplayMode.Relative,
}

const settings = storage.defineItem<Settings>(SETTINGS_KEY, {
  fallback: defaultSettings,
})

export async function getSettings() {
  return settings.getValue()
}

export async function updateSettings(updates: Partial<Settings>) {
  const currentSettings = await getSettings()
  const newSettings = { ...currentSettings, ...updates }
  await settings.setValue(newSettings)
}

export async function resetSettings() {
  await settings.setValue(defaultSettings)
}

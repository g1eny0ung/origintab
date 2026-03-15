import { ClickAction, UrlDisplayMode, RestoreAction } from '~/utils/types'

export interface Settings {
  autoOpenOnStartup: boolean
  confirmBeforeDelete: boolean
  clickAction: ClickAction
  urlDisplayMode: UrlDisplayMode
  restoreAction: RestoreAction
}

const SETTINGS_KEY = 'local:settings'

export const defaultSettings: Settings = {
  autoOpenOnStartup: true,
  confirmBeforeDelete: true,
  clickAction: ClickAction.SaveAll,
  urlDisplayMode: UrlDisplayMode.None,
  restoreAction: RestoreAction.OpenWithoutJump,
};

const settings = storage.defineItem<Settings>(SETTINGS_KEY, {
  fallback: defaultSettings,
})

export async function getSettings(): Promise<Settings> {
  return settings.getValue()
}

export async function updateSettings(
  updates: Partial<Settings>,
): Promise<void> {
  const currentSettings = await getSettings()
  const newSettings = { ...currentSettings, ...updates }
  await settings.setValue(newSettings)
}

export async function resetSettings(): Promise<void> {
  await settings.setValue(defaultSettings)
}

import { ClickAction } from '~/utils/types'

export interface Settings {
  autoOpenOnStartup: boolean
  confirmBeforeDelete: boolean
  clickAction: ClickAction
}

const SETTINGS_KEY = 'local:settings'

const defaultSettings: Settings = {
  autoOpenOnStartup: true,
  confirmBeforeDelete: true,
  clickAction: ClickAction.SaveAll,
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

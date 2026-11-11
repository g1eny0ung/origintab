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
  preserveTabOnSearchRestore: boolean
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
  preserveTabOnSearchRestore: false,
  openGroupInNewWindow: true,
  timeDisplayMode: TimeDisplayMode.Relative,
}

const settings = storage.defineItem<Partial<Settings>>(SETTINGS_KEY, {
  fallback: defaultSettings,
})

export async function getSettings() {
  return withDefaults(await settings.getValue())
}

export function watchSettings(onChange: (settings: Settings) => void) {
  return settings.watch((value) => onChange(withDefaults(value)))
}

function withDefaults(value: Partial<Settings>) {
  return { ...defaultSettings, ...value }
}

export async function updateSettings(updates: Partial<Settings>) {
  const currentSettings = await getSettings()
  const newSettings = { ...currentSettings, ...updates }
  await settings.setValue(newSettings)
}

export async function resetSettings() {
  await settings.setValue(defaultSettings)
}

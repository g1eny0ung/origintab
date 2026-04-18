interface LocalSettings {
  defaultUserGroupId?: string
}

const LOCAL_SETTINGS_KEY = 'local:settings'

const defaultLocalSettings: LocalSettings = {}

export const localSettings = storage.defineItem<LocalSettings>(
  LOCAL_SETTINGS_KEY,
  {
    fallback: defaultLocalSettings,
  },
)

export async function getLocalSettings() {
  return localSettings.getValue()
}

export async function updateLocalSettings(updates: Partial<LocalSettings>) {
  const currentSettings = await getLocalSettings()
  const newSettings = { ...currentSettings, ...updates }
  await localSettings.setValue(newSettings)
}

export async function resetLocalSettings() {
  await localSettings.setValue(defaultLocalSettings)
}

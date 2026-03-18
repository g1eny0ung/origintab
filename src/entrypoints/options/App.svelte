<script lang="ts">
  import SettingItemCheckboxCard from '@/components/ui/SettingItemCheckboxCard.svelte'
  import SettingItemRadio from '@/components/ui/SettingItemRadio.svelte'
  import SettingItemRadioCard from '@/components/ui/SettingItemRadioCard.svelte'
  import {
    Info,
    Link,
    MousePointerClick,
    RotateCcw,
    Settings,
  } from '@lucide/svelte'
  import { onMount } from 'svelte'
  import {
    defaultSettings,
    getSettings,
    resetSettings as resetAllSettings,
    updateSettings,
  } from '~/store'
  import { ClickAction, RestoreAction, UrlDisplayMode } from '~/utils/types'

  // Settings state
  let settings = $state(defaultSettings)

  // Load settings on mount
  onMount(() => {
    loadSettings()
  })

  async function loadSettings() {
    try {
      const _settings = await getSettings()

      settings = {
        ...settings,
        ..._settings,
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  function handleAutoOpenChange(e: Event) {
    const target = e.target as HTMLInputElement
    settings.autoOpenOnStartup = target.checked
    updateSettings({ autoOpenOnStartup: settings.autoOpenOnStartup })
  }

  function handleConfirmDeleteChange(e: Event) {
    const target = e.target as HTMLInputElement
    settings.confirmBeforeDelete = target.checked
    updateSettings({ confirmBeforeDelete: settings.confirmBeforeDelete })
  }

  function onClickActionChange(action: ClickAction) {
    settings.clickAction = action
    updateSettings({ clickAction: action })
  }

  function onUrlDisplayModeChange(mode: UrlDisplayMode) {
    settings.urlDisplayMode = mode
    updateSettings({ urlDisplayMode: mode })
  }

  function onRestoreActionChange(action: RestoreAction) {
    settings.restoreAction = action
    updateSettings({ restoreAction: action })
  }

  function onOpenGroupInNewWindowChange(value: string) {
    const boolValue = value === 'true'
    settings.openGroupInNewWindow = boolValue
    updateSettings({ openGroupInNewWindow: boolValue })
  }

  async function resetSettings() {
    if (confirm(browser.i18n.getMessage('resetAllSettings'))) {
      await resetAllSettings()
      await loadSettings()
    }
  }
</script>

<div class="min-h-screen">
  <div class="max-w-2xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <Settings size={26} aria-hidden="true" />
        <div>
          <h1 class="text-xl font-bold">
            {browser.i18n.getMessage('settings')}
          </h1>
          <p class="text-sm text-base-content/60">
            {browser.i18n.getMessage('customizeOriginTab')}
          </p>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm gap-2" onclick={resetSettings}>
        <RotateCcw size={16} aria-hidden="true" />
        {browser.i18n.getMessage('reset')}
      </button>
    </div>

    <!-- Settings List -->
    <div class="space-y-4">
      <!-- Auto-open on startup -->
      <SettingItemCheckboxCard
        title={browser.i18n.getMessage('autoOpenOnStartup')}
        description={browser.i18n.getMessage('autoOpenDescription')}
      >
        <input
          type="checkbox"
          class="toggle toggle-primary"
          checked={settings.autoOpenOnStartup}
          onchange={handleAutoOpenChange}
          aria-label={browser.i18n.getMessage('autoOpenOnStartup')}
        />
      </SettingItemCheckboxCard>

      <!-- Confirm before delete -->
      <SettingItemCheckboxCard
        title={browser.i18n.getMessage('confirmBeforeDelete')}
        description={browser.i18n.getMessage('confirmDeleteDescription')}
      >
        <input
          type="checkbox"
          class="toggle toggle-primary"
          checked={settings.confirmBeforeDelete}
          onchange={handleConfirmDeleteChange}
          aria-label={browser.i18n.getMessage('confirmBeforeDelete')}
        />
      </SettingItemCheckboxCard>

      <!-- Icon Click Action -->
      <SettingItemRadioCard
        Icon={MousePointerClick}
        title={browser.i18n.getMessage('iconClickAction')}
        description={browser.i18n.getMessage('clickActionDescription')}
      >
        <SettingItemRadio
          id="clickAction-saveAll"
          name="clickAction"
          title={browser.i18n.getMessage('saveAll')}
          description={browser.i18n.getMessage('saveAllDescription')}
          value={settings.clickAction}
          checkedValue={ClickAction.SaveAll}
          onChange={onClickActionChange}
        />

        <SettingItemRadio
          id="clickAction-saveCurrent"
          name="clickAction"
          title={browser.i18n.getMessage('saveCurrent')}
          description={browser.i18n.getMessage('saveCurrentDescription')}
          value={settings.clickAction}
          checkedValue={ClickAction.SaveCurrent}
          onChange={onClickActionChange}
        />

        <SettingItemRadio
          id="clickAction-showPopup"
          name="clickAction"
          title={browser.i18n.getMessage('showPopup')}
          description={browser.i18n.getMessage('showPopupDescription')}
          value={settings.clickAction}
          checkedValue={ClickAction.ShowPopup}
          onChange={onClickActionChange}
        />
      </SettingItemRadioCard>

      <!-- URL Display Mode -->
      <SettingItemRadioCard
        Icon={Link}
        title={browser.i18n.getMessage('urlDisplayMode')}
        description={browser.i18n.getMessage('urlDisplayDescription')}
      >
        <SettingItemRadio
          id="urlDisplayMode-none"
          name="urlDisplayMode"
          title={browser.i18n.getMessage('urlDisplayNone')}
          description={browser.i18n.getMessage('urlDisplayNoneDescription')}
          value={settings.urlDisplayMode}
          checkedValue={UrlDisplayMode.None}
          onChange={onUrlDisplayModeChange}
        />

        <SettingItemRadio
          id="urlDisplayMode-hostname"
          name="urlDisplayMode"
          title={browser.i18n.getMessage('urlDisplayHostname')}
          description={browser.i18n.getMessage('urlDisplayHostnameDescription')}
          value={settings.urlDisplayMode}
          checkedValue={UrlDisplayMode.Hostname}
          onChange={onUrlDisplayModeChange}
        />

        <SettingItemRadio
          id="urlDisplayMode-full"
          name="urlDisplayMode"
          title={browser.i18n.getMessage('urlDisplayFull')}
          description={browser.i18n.getMessage('urlDisplayFullDescription')}
          value={settings.urlDisplayMode}
          checkedValue={UrlDisplayMode.Full}
          onChange={onUrlDisplayModeChange}
        />
      </SettingItemRadioCard>

      <!-- Restore Tab Action -->
      <SettingItemRadioCard
        Icon={RotateCcw}
        title={browser.i18n.getMessage('restoreTabAction')}
        description={browser.i18n.getMessage('restoreActionDescription')}
      >
        <SettingItemRadio
          id="restoreAction-openWithoutJump"
          name="restoreAction"
          title={browser.i18n.getMessage('openWithoutJump')}
          description={browser.i18n.getMessage('openWithoutJumpDescription')}
          value={settings.restoreAction}
          checkedValue={RestoreAction.OpenWithoutJump}
          onChange={onRestoreActionChange}
        />

        <SettingItemRadio
          id="restoreAction-openAndJump"
          name="restoreAction"
          title={browser.i18n.getMessage('openAndJump')}
          description={browser.i18n.getMessage('openAndJumpDescription')}
          value={settings.restoreAction}
          checkedValue={RestoreAction.OpenAndJump}
          onChange={onRestoreActionChange}
        />
      </SettingItemRadioCard>

      <!-- Open in new window -->
      <SettingItemRadioCard
        Icon={Link}
        title={browser.i18n.getMessage('openGroupInNewWindow')}
        description={browser.i18n.getMessage('openGroupInNewWindowDescription')}
      >
        <SettingItemRadio
          id="openGroupInNewWindow-true"
          name="openGroupInNewWindow"
          title={browser.i18n.getMessage('openInNewWindow')}
          description={browser.i18n.getMessage('openInNewWindowDescription')}
          value={settings.openGroupInNewWindow.toString()}
          checkedValue="true"
          onChange={onOpenGroupInNewWindowChange}
        />

        <SettingItemRadio
          id="openGroupInNewWindow-false"
          name="openGroupInNewWindow"
          title={browser.i18n.getMessage('openInCurrentWindow')}
          description={browser.i18n.getMessage(
            'openInCurrentWindowDescription',
          )}
          value={settings.openGroupInNewWindow.toString()}
          checkedValue="false"
          onChange={onOpenGroupInNewWindowChange}
        />
      </SettingItemRadioCard>

      <!-- About Section -->
      <div class="card bg-base-100 shadow-sm border border-base-300 mt-8">
        <div class="card-body">
          <div class="flex items-center gap-2 mb-4">
            <Info size={16} aria-hidden="true" />
            <h3 class="font-medium">
              {browser.i18n.getMessage('aboutOriginTab')}
            </h3>
          </div>
          <p>{browser.i18n.getMessage('extDescription')}</p>
        </div>
      </div>
    </div>
  </div>
</div>

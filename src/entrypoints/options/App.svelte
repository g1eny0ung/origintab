<script lang="ts">
  import { onMount } from 'svelte'
  import {
    Settings,
    Info,
    RotateCcw,
    MousePointerClick,
    Link,
  } from '@lucide/svelte'
  import { ClickAction, UrlDisplayMode, RestoreAction } from '~/utils/types'
  import {
    getSettings,
    updateSettings,
    resetSettings as resetAllSettings,
    defaultSettings,
  } from '~/store'

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

  function handleClickActionChange(action: ClickAction) {
    settings.clickAction = action
    updateSettings({ clickAction: action })
  }

  function handleUrlDisplayModeChange(mode: UrlDisplayMode) {
    settings.urlDisplayMode = mode
    updateSettings({ urlDisplayMode: mode })
  }

  function handleRestoreActionChange(action: RestoreAction) {
    settings.restoreAction = action
    updateSettings({ restoreAction: action })
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
      <div class="card bg-base-100 shadow-sm border border-base-300">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium">
                {browser.i18n.getMessage('autoOpenOnStartup')}
              </h3>
              <p class="text-sm text-base-content/60">
                {browser.i18n.getMessage('autoOpenDescription')}
              </p>
            </div>
            <input
              type="checkbox"
              class="toggle toggle-primary"
              checked={settings.autoOpenOnStartup}
              onchange={handleAutoOpenChange}
              aria-label={browser.i18n.getMessage('autoOpenOnStartup')}
            />
          </div>
        </div>
      </div>

      <!-- Confirm before delete -->
      <div class="card bg-base-100 shadow-sm border border-base-300">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium">
                {browser.i18n.getMessage('confirmBeforeDelete')}
              </h3>
              <p class="text-sm text-base-content/60">
                {browser.i18n.getMessage('confirmDeleteDescription')}
              </p>
            </div>
            <input
              type="checkbox"
              class="toggle toggle-primary"
              checked={settings.confirmBeforeDelete}
              onchange={handleConfirmDeleteChange}
              aria-label={browser.i18n.getMessage('confirmBeforeDelete')}
            />
          </div>
        </div>
      </div>

      <!-- Icon Click Action -->
      <div class="card bg-base-100 shadow-sm border border-base-300">
        <div class="card-body">
          <div class="flex items-center gap-2">
            <MousePointerClick size={18} aria-hidden="true" />
            <h3 class="font-medium">
              {browser.i18n.getMessage('iconClickAction')}
            </h3>
          </div>
          <p class="text-sm text-base-content/60 mb-4">
            {browser.i18n.getMessage('clickActionDescription')}
          </p>
          <div class="space-y-2">
            <label
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
              for="clickAction-saveAll"
            >
              <input
                type="radio"
                name="clickAction"
                id="clickAction-saveAll"
                class="radio radio-sm radio-primary"
                value="saveAll"
                checked={settings.clickAction === ClickAction.SaveAll}
                onchange={() => handleClickActionChange(ClickAction.SaveAll)}
              />
              <div>
                <div class="font-medium">
                  {browser.i18n.getMessage('saveAll')}
                </div>
                <div class="text-sm text-base-content/60">
                  {browser.i18n.getMessage('saveAllDescription')}
                </div>
              </div>
            </label>
            <label
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
              for="clickAction-saveCurrent"
            >
              <input
                type="radio"
                name="clickAction"
                id="clickAction-saveCurrent"
                class="radio radio-sm radio-primary"
                value="saveCurrent"
                checked={settings.clickAction === ClickAction.SaveCurrent}
                onchange={() =>
                  handleClickActionChange(ClickAction.SaveCurrent)}
              />
              <div>
                <div class="font-medium">
                  {browser.i18n.getMessage('saveCurrent')}
                </div>
                <div class="text-sm text-base-content/60">
                  {browser.i18n.getMessage('saveCurrentDescription')}
                </div>
              </div>
            </label>
            <label
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
              for="clickAction-showPopup"
            >
              <input
                type="radio"
                name="clickAction"
                id="clickAction-showPopup"
                class="radio radio-sm radio-primary"
                value="showPopup"
                checked={settings.clickAction === ClickAction.ShowPopup}
                onchange={() => handleClickActionChange(ClickAction.ShowPopup)}
              />
              <div>
                <div class="font-medium">
                  {browser.i18n.getMessage('showPopup')}
                </div>
                <div class="text-sm text-base-content/60">
                  {browser.i18n.getMessage('showPopupDescription')}
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- URL Display Mode -->
      <div class="card bg-base-100 shadow-sm border border-base-300">
        <div class="card-body">
          <div class="flex items-center gap-2">
            <Link size={18} aria-hidden="true" />
            <h3 class="font-medium">
              {browser.i18n.getMessage('urlDisplayMode')}
            </h3>
          </div>
          <p class="text-sm text-base-content/60 mb-4">
            {browser.i18n.getMessage('urlDisplayDescription')}
          </p>
          <div class="space-y-2">
            <label
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
              for="urlDisplayMode-none"
            >
              <input
                type="radio"
                name="urlDisplayMode"
                id="urlDisplayMode-none"
                class="radio radio-sm radio-primary"
                value="none"
                checked={settings.urlDisplayMode === UrlDisplayMode.None}
                onchange={() => handleUrlDisplayModeChange(UrlDisplayMode.None)}
              />
              <div>
                <div class="font-medium">
                  {browser.i18n.getMessage('urlDisplayNone')}
                </div>
                <div class="text-sm text-base-content/60">
                  {browser.i18n.getMessage('urlDisplayNoneDescription')}
                </div>
              </div>
            </label>
            <label
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
              for="urlDisplayMode-hostname"
            >
              <input
                type="radio"
                name="urlDisplayMode"
                id="urlDisplayMode-hostname"
                class="radio radio-sm radio-primary"
                value="hostname"
                checked={settings.urlDisplayMode === UrlDisplayMode.Hostname}
                onchange={() =>
                  handleUrlDisplayModeChange(UrlDisplayMode.Hostname)}
              />
              <div>
                <div class="font-medium">
                  {browser.i18n.getMessage('urlDisplayHostname')}
                </div>
                <div class="text-sm text-base-content/60">
                  {browser.i18n.getMessage('urlDisplayHostnameDescription')}
                </div>
              </div>
            </label>
            <label
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
              for="urlDisplayMode-full"
            >
              <input
                type="radio"
                name="urlDisplayMode"
                id="urlDisplayMode-full"
                class="radio radio-sm radio-primary"
                value="full"
                checked={settings.urlDisplayMode === UrlDisplayMode.Full}
                onchange={() => handleUrlDisplayModeChange(UrlDisplayMode.Full)}
              />
              <div>
                <div class="font-medium">
                  {browser.i18n.getMessage('urlDisplayFull')}
                </div>
                <div class="text-sm text-base-content/60">
                  {browser.i18n.getMessage('urlDisplayFullDescription')}
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Restore Tab Action -->
      <div class="card bg-base-100 shadow-sm border border-base-300">
        <div class="card-body">
          <div class="flex items-center gap-2">
            <RotateCcw size={18} aria-hidden="true" />
            <h3 class="font-medium">
              {browser.i18n.getMessage('restoreTabAction')}
            </h3>
          </div>
          <p class="text-sm text-base-content/60 mb-4">
            {browser.i18n.getMessage('restoreActionDescription')}
          </p>
          <div class="space-y-2">
            <label
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
              for="restoreAction-openWithoutJump"
            >
              <input
                type="radio"
                name="restoreAction"
                id="restoreAction-openWithoutJump"
                class="radio radio-sm radio-primary"
                value="openWithoutJump"
                checked={settings.restoreAction ===
                  RestoreAction.OpenWithoutJump}
                onchange={() =>
                  handleRestoreActionChange(RestoreAction.OpenWithoutJump)}
              />
              <div>
                <div class="font-medium">
                  {browser.i18n.getMessage('openWithoutJump')}
                </div>
                <div class="text-sm text-base-content/60">
                  {browser.i18n.getMessage('openWithoutJumpDescription')}
                </div>
              </div>
            </label>
            <label
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
              for="restoreAction-openAndJump"
            >
              <input
                type="radio"
                name="restoreAction"
                id="restoreAction-openAndJump"
                class="radio radio-sm radio-primary"
                value="openAndJump"
                checked={settings.restoreAction === RestoreAction.OpenAndJump}
                onchange={() =>
                  handleRestoreActionChange(RestoreAction.OpenAndJump)}
              />
              <div>
                <div class="font-medium">
                  {browser.i18n.getMessage('openAndJump')}
                </div>
                <div class="text-sm text-base-content/60">
                  {browser.i18n.getMessage('openAndJumpDescription')}
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

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

<script lang="ts">
  import Shortcuts from '@/components/ui/Shortcuts.svelte'
  import { returnOriginTab } from '@/utils/helpers'
  import {
    Clock,
    Folder,
    Link,
    MousePointerClick,
    RotateCcw,
    Settings,
  } from '@lucide/svelte'
  import { onMount } from 'svelte'
  import SettingItemCheckboxCard from '~/components/ui/SettingItemCheckboxCard.svelte'
  import SettingItemRadio from '~/components/ui/SettingItemRadio.svelte'
  import SettingItemRadioCard from '~/components/ui/SettingItemRadioCard.svelte'
  import {
    defaultSettings,
    getSettings,
    resetSettings as resetAllSettings,
    updateSettings,
  } from '~/store'
  import {
    ClickAction,
    RestoreAction,
    TimeDisplayMode,
    UrlDisplayMode,
  } from '~/utils/types'

  let commands = $state<Browser.commands.Command[]>([])

  // Settings state
  let settings = $state(defaultSettings)

  // Load settings on mount
  onMount(() => {
    loadSettings()
    loadCommands()
  })

  async function loadSettings() {
    try {
      settings = {
        ...settings,
        ...(await getSettings()),
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  async function loadCommands() {
    commands = (await browser.commands.getAll()).filter(
      (command) =>
        command.name !== '_execute_action' && !command.name?.startsWith('wxt'),
    )
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

  function onTimeDisplayModeChange(mode: TimeDisplayMode) {
    settings.timeDisplayMode = mode
    updateSettings({ timeDisplayMode: mode })
  }

  async function resetSettings() {
    if (confirm(browser.i18n.getMessage('resetAllSettings'))) {
      await resetAllSettings()
      await loadSettings()
    }
  }
</script>

<div class="min-h-screen">
  <div class="max-w-3xl mx-auto px-4 py-8">
    <!-- Header -->
    <section class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <Settings size={26} aria-hidden="true" />
        <header>
          <h1 class="text-xl font-bold">
            {browser.i18n.getMessage('settings')}
          </h1>
          <p class="text-sm text-base-content/60">
            {browser.i18n.getMessage('customizeOriginTab')}
          </p>
        </header>
      </div>
      <div class="flex gap-2">
        <button
          class="btn btn-ghost btn-sm hover:btn-warning"
          onclick={resetSettings}
        >
          <RotateCcw size={16} aria-hidden="true" />
          {browser.i18n.getMessage('reset')}
        </button>

        <Shortcuts {commands} />

        <button class="btn btn-ghost btn-sm" onclick={returnOriginTab}>
          {browser.i18n.getMessage('returnOriginTab')}
        </button>
      </div>
    </section>

    <!-- Settings List -->
    <section class="space-y-4">
      <!-- Auto-open on startup -->
      <SettingItemCheckboxCard
        title={browser.i18n.getMessage('autoOpenOnStartup')}
        description={browser.i18n.getMessage('autoOpenDescription')}
      >
        <input
          type="checkbox"
          class="toggle toggle-sm toggle-primary"
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
          class="toggle toggle-sm toggle-primary"
          checked={settings.confirmBeforeDelete}
          onchange={handleConfirmDeleteChange}
          aria-label={browser.i18n.getMessage('confirmBeforeDelete')}
        />
      </SettingItemCheckboxCard>

      <!-- Time Display Mode -->
      <SettingItemRadioCard
        Icon={Clock}
        title={browser.i18n.getMessage('timeDisplayMode')}
        description={browser.i18n.getMessage('timeDisplayDescription')}
      >
        <SettingItemRadio
          id="timeDisplayMode-relative"
          name="timeDisplayMode"
          title={browser.i18n.getMessage('timeDisplayRelative')}
          description={browser.i18n.getMessage(
            'timeDisplayRelativeDescription',
          )}
          value={settings.timeDisplayMode}
          checkedValue={TimeDisplayMode.Relative}
          onChange={onTimeDisplayModeChange}
        />

        <SettingItemRadio
          id="timeDisplayMode-absolute"
          name="timeDisplayMode"
          title={browser.i18n.getMessage('timeDisplayAbsolute')}
          description={browser.i18n.getMessage(
            'timeDisplayAbsoluteDescription',
          )}
          value={settings.timeDisplayMode}
          checkedValue={TimeDisplayMode.Absolute}
          onChange={onTimeDisplayModeChange}
        />
      </SettingItemRadioCard>

      <!-- Icon Click Action -->
      <SettingItemRadioCard
        Icon={MousePointerClick}
        title={browser.i18n.getMessage('iconClickAction')}
        description={browser.i18n.getMessage('clickActionDescription')}
      >
        <SettingItemRadio
          id="clickAction-showPopup"
          name="clickAction"
          title={browser.i18n.getMessage('showPopup')}
          description={browser.i18n.getMessage('showPopupDescription')}
          value={settings.clickAction}
          checkedValue={ClickAction.ShowPopup}
          onChange={onClickActionChange}
        />

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
        Icon={Folder}
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
    </section>

    <!-- About Section -->
    <section class="card bg-base-100 shadow-sm border border-base-200 mt-8">
      <div class="card-body">
        <div class="flex items-center gap-2 mb-4">
          <img src="/origintab.svg" alt="OriginTab" class="w-6 h-6" />
          <h3 class="font-medium">
            {browser.i18n.getMessage('aboutOriginTab')}
          </h3>
        </div>
        <p>{browser.i18n.getMessage('extDescription')}</p>
        <p>
          {browser.i18n.getMessage('aboutDescription1')}
          <a
            href={browser.i18n.getUILanguage().startsWith('zh')
              ? 'https://products.g1en.site/zh/origintab/'
              : 'https://products.g1en.site/origintab/'}
            class="underline"
            target="_blank"
          >
            {browser.i18n.getMessage('productPage')}
          </a>
          {browser.i18n.getMessage('aboutDescription2')}
        </p>
      </div>
    </section>
  </div>
</div>

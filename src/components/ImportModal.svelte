<script lang="ts">
  import { Upload } from '@lucide/svelte'
  import { importFromText, isISOTimeString } from '~/store/dataManagement'
  import type { UserGroup } from '~/utils/types'

  import Dialog from './ui/Dialog.svelte'
  import Fieldset from './ui/Fieldset.svelte'

  interface Props {
    id: string
    userGroups: UserGroup[]
    importText: string
    targetGroupId: string
    onCancel: () => void
  }

  let {
    id,
    userGroups,
    importText = $bindable(),
    targetGroupId = $bindable(),
    onCancel,
  }: Props = $props()

  let fileInputRef: HTMLInputElement | null = $state(null)
  let fileReadError = $state('')

  function isOriginTabFormat(text: string): boolean {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    for (const line of lines) {
      if (isISOTimeString(line)) {
        return true
      }
    }
    return false
  }

  let isDetectedOriginTabFormat = $derived(isOriginTabFormat(importText))

  async function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]

    if (!file) {
      return
    }

    try {
      importText = await file.text()
      fileReadError = ''
    } catch {
      fileReadError = browser.i18n.getMessage('failedToReadImportFile')
      input.value = ''
    }
  }

  async function handleImport() {
    if (!importText.trim()) {
      showToast(browser.i18n.getMessage('pleaseEnterDataToImport'), 'error')
      return
    }

    try {
      const { imported, errors } = await importFromText(importText, {
        format: isDetectedOriginTabFormat ? 'originTab' : 'general',
        userGroupId: targetGroupId,
      })

      if (errors.length > 0) {
        showToast(browser.i18n.getMessage('importedTabsWithErrors'), 'error')
        errors.forEach((error) => {
          showToast(error, 'error')
        })
      } else {
        showToast(
          browser.i18n.getMessage('importedTabs', [imported.toString()]),
        )
      }
    } catch (error) {
      showToast(browser.i18n.getMessage('importFailed'), 'error')
    }
  }

  function handleClose() {
    fileReadError = ''

    if (fileInputRef) {
      fileInputRef.value = ''
    }

    onCancel()
  }
</script>

<Dialog
  {id}
  disableConfirm={!importText.trim()}
  onConfirm={handleImport}
  onClose={handleClose}
>
  <h3 class="font-bold text-lg flex items-center gap-2">
    <Upload size={18} aria-hidden="true" />
    {browser.i18n.getMessage('importTabs')}
  </h3>

  <div class="my-4 space-y-3">
    <Fieldset
      legend={browser.i18n.getMessage('importTargetGroup')}
      hint={isDetectedOriginTabFormat
        ? browser.i18n.getMessage('importTargetGroupNotRequiredHint')
        : browser.i18n.getMessage('importTargetGroupHint')}
    >
      <select
        id="import-target-group"
        class="select"
        bind:value={targetGroupId}
        disabled={isDetectedOriginTabFormat}
      >
        {#each userGroups as group (group.id)}
          <option value={group.id}>{group.name}</option>
        {/each}
      </select>
    </Fieldset>

    <Fieldset
      legend={browser.i18n.getMessage('importFile')}
      hint={browser.i18n.getMessage('importFileHint')}
      error={fileReadError}
    >
      <input
        bind:this={fileInputRef}
        type="file"
        class="file-input"
        accept=".csv,text/plain"
        onchange={handleFileChange}
      />
    </Fieldset>

    <textarea
      class="textarea w-full h-64 font-mono text-sm"
      placeholder={browser.i18n.getMessage('importPlaceholder')}
      bind:value={importText}
    ></textarea>
  </div>
</Dialog>

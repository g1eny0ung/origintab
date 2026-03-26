<script lang="ts">
  import { Upload } from '@lucide/svelte'
  import type { UserGroup } from '~/utils/types'

  import Dialog from './ui/Dialog.svelte'
  import Fieldset from './ui/Fieldset.svelte'

  interface Props {
    id: string
    userGroups: UserGroup[]
    importText: string
    targetGroupId: string
    onImport: () => void
    onCancel: () => void
  }

  let {
    id,
    userGroups,
    importText = $bindable(),
    targetGroupId = $bindable(),
    onImport,
    onCancel,
  }: Props = $props()

  let fileInputRef: HTMLInputElement | null = $state(null)
  let fileReadError = $state('')

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
  onConfirm={onImport}
  onClose={handleClose}
>
  <h3 class="font-bold text-lg flex items-center gap-2">
    <Upload size={18} aria-hidden="true" />
    {browser.i18n.getMessage('importTabs')}
  </h3>

  <div class="my-4 space-y-3">
    <Fieldset legend={browser.i18n.getMessage('targetGroup')}>
      <select
        id="import-target-group"
        class="select"
        bind:value={targetGroupId}
      >
        {#each userGroups as group}
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

<script lang="ts">
  import { Copy, Download } from '@lucide/svelte'
  import { exportToText } from '~/store/dataManagement'
  import type { UserGroup } from '~/utils/types'

  import Dialog from './ui/Dialog.svelte'
  import Fieldset from './ui/Fieldset.svelte'

  interface Props {
    id: string
    userGroups: UserGroup[]
    selectedUserGroupId: string
    onCancel: () => void
  }

  let {
    id,
    userGroups,
    selectedUserGroupId = $bindable(),
    onCancel,
  }: Props = $props()

  let exportPreview = $state('')
  let hasCopiedToClipboard = $state(false)
  let hasMultipleGroups = $derived(userGroups.length > 1)
  let exportFormat = $state<'unique' | 'general'>('unique')

  async function loadExportPreview(
    userGroupId: string,
    isOriginTabFormat: boolean,
  ) {
    exportPreview = await exportToText(
      userGroupId === 'all' ? undefined : userGroupId,
      { originTabFormat: isOriginTabFormat },
    )
  }

  $effect(() => {
    if (selectedUserGroupId) {
      loadExportPreview(selectedUserGroupId, exportFormat === 'unique')
    }
  })

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(exportPreview)
      hasCopiedToClipboard = true
      setTimeout(() => {
        hasCopiedToClipboard = false
      }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Export tabs - download
  async function handleExport() {
    try {
      const text = exportPreview
      if (!text.trim()) {
        showToast(browser.i18n.getMessage('noDataToExport'), 'warning')
        return
      }
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `origintab-export-${new Date().toISOString().slice(0, 10)}.txt`
      a.click()
      URL.revokeObjectURL(url)

      showToast(browser.i18n.getMessage('exportedSuccessfully'))
    } catch (error) {
      showToast(browser.i18n.getMessage('exportFailed'), 'error')
    }
  }

  function handleClose() {
    hasCopiedToClipboard = false
    onCancel()
  }
</script>

<Dialog
  {id}
  disableConfirm={!exportPreview.trim()}
  onConfirm={handleExport}
  onClose={handleClose}
>
  <h3 class="font-bold text-lg flex items-center gap-2">
    <Download size={18} aria-hidden="true" />
    {browser.i18n.getMessage('export')}
  </h3>

  <div class="my-4 space-y-3">
    {#if hasMultipleGroups}
      <Fieldset legend={browser.i18n.getMessage('selectUserGroup')}>
        <select
          id="export-user-group"
          class="select"
          bind:value={selectedUserGroupId}
        >
          <option value="all">
            {browser.i18n.getMessage('allUserGroups')}
          </option>
          {#each userGroups as group (group.id)}
            <option value={group.id}>{group.name}</option>
          {/each}
        </select>
      </Fieldset>
    {:else}
      <p class="text-sm text-base-content/60">
        {browser.i18n.getMessage('allUserGroups')}
      </p>
    {/if}

    <Fieldset legend={browser.i18n.getMessage('exportFormat')}>
      <select
        id="export-format"
        class="select"
        bind:value={exportFormat}
        onchange={() =>
          loadExportPreview(selectedUserGroupId, exportFormat === 'unique')}
      >
        <option value="unique">
          {browser.i18n.getMessage('exportFormatOriginTab')}
        </option>
        <option value="general">
          {browser.i18n.getMessage('exportFormatGeneral')}
        </option>
      </select>
    </Fieldset>

    <Fieldset legend={browser.i18n.getMessage('preview')}>
      <textarea
        id="export-preview-textarea"
        class="textarea textarea-bordered w-full h-64 font-mono text-sm"
        readonly
        value={exportPreview}
      ></textarea>
      {#if exportPreview.trim() === ''}
        <p class="label-text-alt text-error">
          {browser.i18n.getMessage('noDataToExport')}
        </p>
      {/if}
    </Fieldset>
  </div>

  <div class="modal-action">
    <button
      class="btn btn-sm btn-outline"
      onclick={handleCopy}
      disabled={!exportPreview.trim()}
    >
      {#if hasCopiedToClipboard}
        <Copy size={16} />
        {browser.i18n.getMessage('copied')}
      {:else}
        <Copy size={16} />
        {browser.i18n.getMessage('copyToClipboard')}
      {/if}
    </button>
  </div>
</Dialog>

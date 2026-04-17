<script lang="ts">
  import {
    Archive,
    Check,
    CircleAlert,
    CircleCheck,
    CircleX,
    Download,
    ExternalLink,
    FolderOutput,
    Plus,
    RotateCcw,
    SettingsIcon,
    Trash2,
    Upload,
    X,
  } from '@lucide/svelte'
  import { liveQuery } from 'dexie'
  import { onDestroy, onMount } from 'svelte'
  import ExportModal from '~/components/ExportModal.svelte'
  import ImportModal from '~/components/ImportModal.svelte'
  import UserGroupList from '~/components/UserGroupList.svelte'
  import Dialog from '~/components/ui/Dialog.svelte'
  import {
    createTabSelectionController,
    setTabSelectionContext,
  } from '~/entrypoints/origintab/selection.svelte'
  import {
    DEFAULT_GROUP_ID,
    clearAllData,
    createUserGroup,
    defaultSettings,
    exportToText,
    getSettings,
    importFromText,
    moveSelectedTabsToUserGroup,
    removeSelectedTabs,
    restoreSelectedTabs,
  } from '~/store'
  import { db } from '~/store/base'
  import { RestoreAction } from '~/utils/types'

  // Use liveQuery for reactive data fetching
  let userGroups = liveQuery(() =>
    db.userGroups.orderBy('createdAt').reverse().toArray(),
  )
  let tabGroups = liveQuery(() =>
    db.tabGroups.orderBy('createdAt').reverse().toArray(),
  )

  let settings = $state(defaultSettings)

  // Import modal
  let importModalId = 'import-modal'
  let importText = $state('')
  let importTargetGroupId = $state(DEFAULT_GROUP_ID)

  // Export modal
  let exportModalId = 'export-modal'
  let selectedUserGroupId = $state('all')

  let selectModalId = 'select-tabs-modal'

  // Toasts
  let toasts: {
    id: number
    message: string
    type: ToastType
  }[] = $state([])

  // New group input
  let showNewGroupInput = $state(false)
  let newGroupName = $state('')
  let newGroupInputRef: HTMLInputElement | null = $state(null)
  const selection = setTabSelectionContext(createTabSelectionController())
  let orderedTabGroupsByPage = $derived.by(() => {
    // Keep a single flattened view so batch actions can run in visual page order.
    const nextUserGroups = $userGroups || []
    const nextTabGroups = $tabGroups || []

    return nextUserGroups.flatMap((userGroup) =>
      nextTabGroups.filter((tabGroup) => tabGroup.userGroupId === userGroup.id),
    )
  })

  // Load settings only
  async function loadSettings() {
    try {
      settings = await getSettings()
    } catch (error) {
      showToast(browser.i18n.getMessage('failedToLoadSettings'), 'error')
    }
  }

  // Show toast notification
  function showToast(message: string, type: ToastType = 'success') {
    const id = Date.now()
    toasts = [...toasts, { id, message, type }]
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id)
    }, 3000)
  }

  // Create new group - liveQuery will auto-refresh
  async function handleCreateGroup() {
    const name = newGroupName.trim()
    if (!name) {
      return
    }

    try {
      await createUserGroup(name)

      showToast(browser.i18n.getMessage('groupCreated'))

      clearNewGroup()
    } catch (error) {
      showToast(browser.i18n.getMessage('failedToCreateGroup'), 'error')
    }
  }

  function clearNewGroup() {
    showNewGroupInput = false
    newGroupName = ''
  }

  function handleNewGroupKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleCreateGroup()
    } else if (e.key === 'Escape') {
      clearNewGroup()
    }
  }

  $effect(() => {
    if (showNewGroupInput && newGroupInputRef) {
      newGroupInputRef.focus()
    }
  })

  $effect(() => {
    // Trim stale selections whenever liveQuery data changes underneath the page.
    selection.reconcile(orderedTabGroupsByPage)
  })

  // Clear all data - liveQuery will auto-refresh
  async function handleClearAll() {
    if (confirm(browser.i18n.getMessage('clearAllConfirm'))) {
      try {
        await clearAllData()

        showToast(browser.i18n.getMessage('allTabsCleared'))
      } catch (error) {
        showToast(browser.i18n.getMessage('failedToClearAllTabs'), 'error')
      }
    }
  }

  // Export tabs - open modal
  function handleOpenExportModal() {
    selectedUserGroupId = 'all'
    const dialog = document.getElementById(exportModalId) as HTMLDialogElement
    dialog.showModal()
  }

  // Export tabs - download
  async function handleExport() {
    try {
      const text = await exportToText(
        selectedUserGroupId === 'all' ? undefined : selectedUserGroupId,
      )
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

  function clearExport() {
    selectedUserGroupId = 'all'
  }

  function openSelectModal() {
    if (
      !selection.moveTargetUserGroupId &&
      $userGroups &&
      $userGroups.length > 0
    ) {
      selection.setMoveTargetUserGroupId($userGroups[0].id)
    }

    const dialog = document.getElementById(selectModalId) as HTMLDialogElement
    dialog.showModal()
  }

  async function handleMoveSelectedTabs() {
    const orderedSelection = selection.getOrderedSelection(
      orderedTabGroupsByPage,
    )

    if (orderedSelection.length === 0) {
      return null
    }

    try {
      await moveSelectedTabsToUserGroup(
        orderedSelection,
        selection.moveTargetUserGroupId,
      )
      selection.clear()
      showToast(browser.i18n.getMessage('tabsMoved'))
    } catch {
      showToast(browser.i18n.getMessage('moveTabsFailed'), 'error')
      return null
    }
  }

  async function handleRestoreSelectedTabs(remove: boolean) {
    const orderedSelection = selection.getOrderedSelection(
      orderedTabGroupsByPage,
    )

    try {
      await restoreSelectedTabs(orderedSelection, {
        remove,
        active: settings.restoreAction === RestoreAction.OpenAndJump,
      })
      selection.clear()
      showToast(browser.i18n.getMessage('tabsRestored'))
    } catch {
      showToast(browser.i18n.getMessage('restoreFailed'), 'error')
    }
  }

  async function handleDeleteSelectedTabs() {
    if (
      settings.confirmBeforeDelete &&
      !confirm(browser.i18n.getMessage('deleteSelectedTabsConfirm'))
    ) {
      return
    }

    try {
      await removeSelectedTabs(selection.selectedTabs)
      selection.clear()
      showToast(browser.i18n.getMessage('tabDeleted'))
    } catch {
      showToast(browser.i18n.getMessage('deleteFailed'), 'error')
    }
  }

  // Import tabs - liveQuery will auto-refresh
  async function handleImport() {
    if (!importText.trim()) {
      showToast(browser.i18n.getMessage('pleaseEnterDataToImport'), 'error')
      return
    }

    try {
      const result = await importFromText(importText, importTargetGroupId)

      if (result.errors.length > 0) {
        showToast(
          browser.i18n.getMessage('importedTabsWithErrors', [
            result.imported.toString(),
            result.errors.length.toString(),
          ]),
          'error',
        )
      } else {
        showToast(
          browser.i18n.getMessage('importedTabs', [result.imported.toString()]),
        )
      }
    } catch (error) {
      showToast(browser.i18n.getMessage('importFailed'), 'error')
    }
  }

  function clearImport() {
    importText = ''
  }

  // Listen for messages from background (settings changes)
  function handleMessage(message: any) {
    if (message.action === 'dataUpdated') {
      loadSettings()
    }
  }

  onMount(() => {
    loadSettings()
    browser.runtime.onMessage.addListener(handleMessage)
  })

  onDestroy(() => {
    browser.runtime.onMessage.removeListener(handleMessage)
  })
</script>

<div class="min-h-screen">
  <!-- Header -->
  <header
    class="sticky top-0 z-40 bg-base-100/80 backdrop-blur border-b border-base-200"
  >
    <div class="max-w-5xl mx-auto p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <img src="/origintab.svg" alt="OriginTab" class="w-12 h-12" />
          <div>
            <h1 class="text-xl font-bold">OriginTab</h1>
            <p class="text-sm text-base-content/60 hidden sm:block">
              {browser.i18n.getMessage('extDescription')}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="btn btn-ghost btn-sm"
            onclick={() => {
              const dialog = document.getElementById(
                importModalId,
              ) as HTMLDialogElement
              dialog.showModal()
            }}
          >
            <Upload size={16} />
            <span class="hidden sm:inline">
              {browser.i18n.getMessage('import')}
            </span>
          </button>
          {#if $tabGroups && $tabGroups.length > 0}
            <button
              class="btn btn-ghost btn-sm"
              onclick={handleOpenExportModal}
            >
              <Download size={16} />
              <span class="hidden sm:inline">
                {browser.i18n.getMessage('export')}
              </span>
            </button>
            <button
              class="btn btn-ghost btn-sm hover:btn-warning"
              onclick={handleClearAll}
            >
              <Trash2 size={16} />
              <span class="hidden sm:inline">
                {browser.i18n.getMessage('clear')}
              </span>
            </button>
          {/if}
          <button
            class="btn btn-ghost btn-sm"
            onclick={() => {
              browser.runtime.openOptionsPage()
            }}
          >
            <SettingsIcon size={16} />
            <span class="hidden sm:inline">
              {browser.i18n.getMessage('settings')}
            </span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <main
    class={[
      'max-w-5xl mx-auto px-4 py-6',
      selection.selectedCount > 0 && 'pb-32',
    ]}
  >
    {#if !$userGroups || ($userGroups.length === 1 && (!$tabGroups || $tabGroups.length === 0))}
      <!-- Empty state -->
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="p-6 rounded-full mb-4">
          <Archive size={48} class="text-base-content/80" />
        </div>
        <h2 class="text-xl font-semibold mb-2">
          {browser.i18n.getMessage('noSavedTabs')}
        </h2>
        <p class="text-sm text-base-content/60 max-w-md">
          {browser.i18n.getMessage('emptyStateMessage')}
        </p>
      </div>
    {:else}
      <!-- New Group Input -->
      <div class="mb-4">
        {#if showNewGroupInput}
          <div class="flex items-center gap-2">
            <input
              type="text"
              class="input input-sm flex-1 max-w-xs"
              placeholder={browser.i18n.getMessage('groupNamePlaceholder')}
              bind:value={newGroupName}
              bind:this={newGroupInputRef}
              onkeydown={handleNewGroupKeydown}
            />
            <button class="btn btn-primary btn-sm" onclick={handleCreateGroup}>
              <Check size={16} />
            </button>
            <button class="btn btn-ghost btn-sm" onclick={clearNewGroup}>
              <X size={16} />
            </button>
          </div>
        {:else}
          <button
            class="btn btn-ghost btn-sm"
            onclick={() => (showNewGroupInput = true)}
          >
            <Plus size={16} />
            {browser.i18n.getMessage('newGroup')}
          </button>
        {/if}
      </div>

      <UserGroupList
        userGroups={$userGroups || []}
        tabGroups={$tabGroups || []}
        {settings}
        onToast={showToast}
      />
    {/if}
  </main>
</div>

<ImportModal
  id={importModalId}
  userGroups={$userGroups || []}
  bind:importText
  bind:targetGroupId={importTargetGroupId}
  onImport={handleImport}
  onCancel={clearImport}
/>

<ExportModal
  id={exportModalId}
  userGroups={$userGroups || []}
  bind:selectedUserGroupId
  onExport={handleExport}
  onCancel={clearExport}
/>

<Dialog
  id={selectModalId}
  disableConfirm={!selection.moveTargetUserGroupId ||
    selection.selectedCount === 0}
  onConfirm={handleMoveSelectedTabs}
>
  <h3 class="font-bold text-lg">{browser.i18n.getMessage('moveTabs')}</h3>

  <div class="my-4 space-y-3">
    <p class="text-sm text-base-content/70">
      {browser.i18n.getMessage('moveSelectedTabsTo', [
        selection.selectedCount.toString(),
        browser.i18n.getMessage(
          selection.selectedCount === 1 ? 'tabSingular' : 'tabPlural',
        ),
      ])}
    </p>

    <select
      class="select"
      value={selection.moveTargetUserGroupId}
      onchange={(e) =>
        selection.setMoveTargetUserGroupId(
          (e.currentTarget as HTMLSelectElement).value,
        )}
    >
      {#each $userGroups as group (group.id)}
        <option value={group.id}>{group.name}</option>
      {/each}
    </select>
  </div>
</Dialog>

<!-- Toasts -->
<div class="toast toast-center toast-top z-50">
  {#each toasts as toast (toast.id)}
    <div
      role="alert"
      class="alert alert-soft shadow-lg"
      class:alert-success={toast.type === 'success'}
      class:alert-warning={toast.type === 'warning'}
      class:alert-error={toast.type === 'error'}
    >
      {#if toast.type === 'success'}
        <CircleCheck size={16} />
      {:else if toast.type === 'warning'}
        <CircleAlert size={16} />
      {:else}
        <CircleX size={16} />
      {/if}
      <span>{toast.message}</span>
    </div>
  {/each}
</div>

{#if selection.selectedCount > 0}
  <div
    class="fixed bottom-8 left-1/2 z-40 px-4 space-y-2 -translate-x-1/2 transition-transform enter-screen"
  >
    <div
      class="flex flex-wrap gap-1 bg-base-100 rounded-box border border-base-200 p-2 shadow-xl"
    >
      <button class="btn btn-sm btn-ghost" onclick={openSelectModal}>
        <FolderOutput size={14} />
        {browser.i18n.getMessage('moveTo')}
      </button>

      <button
        class="btn btn-sm btn-ghost"
        onclick={() => handleRestoreSelectedTabs(true)}
      >
        <RotateCcw size={14} />
        {browser.i18n.getMessage('restore')}
      </button>

      <button
        class="btn btn-sm btn-ghost"
        onclick={() => handleRestoreSelectedTabs(false)}
      >
        <ExternalLink size={14} />
        {browser.i18n.getMessage('restoreAndPreserve')}
      </button>

      <button
        class="btn btn-sm btn-ghost hover:btn-error hover:text-white"
        onclick={handleDeleteSelectedTabs}
      >
        <Trash2 size={14} />
        {browser.i18n.getMessage('delete')}
      </button>

      <div class="tooltip" data-tip={browser.i18n.getMessage('cancel')}>
        <button
          class="btn btn-sm btn-ghost btn-square"
          onclick={selection.clear}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes enter {
    0% {
      transform: translateY(10vh);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
    }
  }

  .enter-screen {
    animation: enter 0.3s ease-in-out;
  }
</style>

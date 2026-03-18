<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { liveQuery } from 'dexie'
  import { db, initDefaultGroup } from '~/store/base'
  import {
    createUserGroup,
    clearAllData,
    exportToText,
    importFromText,
    DEFAULT_GROUP_ID,
    getSettings,
  } from '~/store'
  import type { Settings } from '~/store/settings'

  import UserGroupList from '@/components/UserGroupList.svelte'
  import ImportModal from '@/components/ImportModal.svelte'
  import {
    Trash2,
    Upload,
    Download,
    CircleCheck,
    Plus,
    Check,
    X,
    CircleX,
    SettingsIcon,
    Archive,
  } from '@lucide/svelte'

  // Use liveQuery for reactive data fetching
  let userGroups = liveQuery(() =>
    db.userGroups.orderBy('createdAt').reverse().toArray(),
  )
  let tabGroups = liveQuery(() =>
    db.tabGroups.orderBy('createdAt').reverse().toArray(),
  )

  let settings: Settings = $state({
    autoOpenOnStartup: true,
    confirmBeforeDelete: true,
    clickAction: undefined,
    urlDisplayMode: undefined,
  } as unknown as Settings)

  // Import modal
  let importModalId = 'import-modal'
  let importText = $state('')
  let importTargetGroupId = $state(DEFAULT_GROUP_ID)

  // Toasts
  let toasts: { id: number; message: string; type: 'success' | 'error' }[] =
    $state([])

  // New group input
  let showNewGroupInput = $state(false)
  let newGroupName = $state('')
  let newGroupInputRef: HTMLInputElement | null = $state(null)

  // Load settings only
  async function loadSettings() {
    try {
      settings = await getSettings()
    } catch (error) {
      showToast('Failed to load settings', 'error')
    }
  }

  // Show toast notification
  function showToast(message: string, type: 'success' | 'error' = 'success') {
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

  // Export tabs
  async function handleExport() {
    try {
      const text = await exportToText()
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
    initDefaultGroup()
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
    class="sticky top-0 z-40 bg-base-100/80 backdrop-blur border-b border-base-300"
  >
    <div class="max-w-5xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold">OriginTab</h1>
          <p class="text-sm text-base-content/60">
            {browser.i18n.getMessage('extDescription')}
          </p>
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
            <button class="btn btn-ghost btn-sm" onclick={handleExport}>
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

  <main class="max-w-5xl mx-auto px-4 py-6">
    {#if !$userGroups || ($userGroups.length === 1 && (!$tabGroups || $tabGroups.length === 0))}
      <!-- Empty state -->
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="p-6 rounded-full mb-4">
          <Archive size={48} class="text-base-content/80" />
        </div>
        <h2 class="text-xl font-semibold mb-2">
          {browser.i18n.getMessage('noSavedTabs')}
        </h2>
        <p class="text-base-content/60 max-w-md">
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

<!-- Toasts -->
<div class="toast toast-center toast-top z-50">
  {#each toasts as toast (toast.id)}
    <div
      role="alert"
      class="alert alert-soft shadow-lg"
      class:alert-success={toast.type === 'success'}
      class:alert-error={toast.type === 'error'}
    >
      {#if toast.type === 'success'}
        <CircleCheck size={16} />
      {:else}
        <CircleX size={16} />
      {/if}
      <span>{toast.message}</span>
    </div>
  {/each}
</div>

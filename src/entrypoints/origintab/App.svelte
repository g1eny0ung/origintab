<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import {
    getUserGroups,
    getTabGroups,
    createUserGroup,
    clearAllData,
    exportToText,
    importFromText,
    DEFAULT_GROUP_ID,
  } from '~/store'
  import type { TabGroup, UserGroup } from '~/utils/types'
  import UserGroupList from '../../components/UserGroupList.svelte'
  import ImportModal from '../../components/ImportModal.svelte'
  import {
    Trash2,
    Upload,
    Download,
    CircleCheck,
    Plus,
    Check,
    X,
    CircleX,
  } from '@lucide/svelte'
  import { Archive } from '@lucide/svelte'

  // Data state
  let userGroups: UserGroup[] = $state([])
  let tabGroups: TabGroup[] = $state([])
  let expandedGroups: Set<string> = $state(new Set([DEFAULT_GROUP_ID]))

  // Import modal
  let showImportModal = $state(false)
  let importText = $state('')
  let importTargetGroupId = $state(DEFAULT_GROUP_ID)

  // Toasts
  let toasts: { id: number; message: string; type: 'success' | 'error' }[] =
    $state([])

  // New group input
  let showNewGroupInput = $state(false)
  let newGroupName = $state('')
  let newGroupInputRef: HTMLInputElement | null = $state(null)

  // Load data
  async function loadData() {
    try {
      ;[userGroups, tabGroups] = await Promise.all([
        getUserGroups(),
        getTabGroups(),
      ])
    } catch (error) {
      showToast('Failed to load data', 'error')
    }
  }

  // Listen for messages from background
  function handleMessage(message: any) {
    if (message.action === 'dataUpdated') loadData()
  }

  // Show toast notification
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = Date.now()
    toasts = [...toasts, { id, message, type }]
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id)
    }, 3000)
  }

  // Toggle group expansion
  function toggleGroup(groupId: string) {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) newExpanded.delete(groupId)
    else newExpanded.add(groupId)
    expandedGroups = newExpanded
  }

  // Create new group
  async function handleCreateGroup() {
    const name = newGroupName.trim()
    if (!name) return
    try {
      await createUserGroup(name)
      showToast(browser.i18n.getMessage('groupCreated'))
      await loadData()
      newGroupName = ''
      showNewGroupInput = false
    } catch (error) {
      showToast(browser.i18n.getMessage('failedToCreateGroup'), 'error')
    }
  }

  function cancelNewGroup() {
    showNewGroupInput = false
    newGroupName = ''
  }

  function handleNewGroupKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleCreateGroup()
    else if (e.key === 'Escape') cancelNewGroup()
  }

  $effect(() => {
    if (showNewGroupInput && newGroupInputRef) newGroupInputRef.focus()
  })

  // Clear all data
  async function handleClearAll() {
    if (!confirm(browser.i18n.getMessage('clearAllConfirm'))) return
    try {
      await clearAllData()
      userGroups = [
        { id: DEFAULT_GROUP_ID, name: 'Default', createdAt: Date.now() },
      ]
      tabGroups = []
      showToast(browser.i18n.getMessage('allTabsCleared'))
    } catch (error) {
      showToast(browser.i18n.getMessage('failedToClearAllTabs'), 'error')
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

  // Import tabs
  async function handleImport() {
    if (!importText.trim()) {
      showToast(browser.i18n.getMessage('pleaseEnterDataToImport'), 'error')
      return
    }

    try {
      const result = await importFromText(importText, importTargetGroupId)
      await loadData()
      showImportModal = false
      importText = ''
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

  function cancelImport() {
    showImportModal = false
    importText = ''
  }

  onMount(() => {
    loadData()
    browser.runtime.onMessage.addListener(handleMessage)
  })

  onDestroy(() => {
    browser.runtime.onMessage.removeListener(handleMessage)
  })
</script>

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

<ImportModal
  show={showImportModal}
  {userGroups}
  bind:importText
  bind:targetGroupId={importTargetGroupId}
  onImport={handleImport}
  onCancel={cancelImport}
/>

<div class="min-h-screen">
  <!-- Header -->
  <header
    class="sticky top-0 z-40 bg-base-100/80 backdrop-blur border-b border-base-300"
  >
    <div class="max-w-5xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold">
            {browser.i18n.getMessage('appTitle')}
          </h1>
          <p class="text-sm text-base-content/60">
            {browser.i18n.getMessage('appDescription')}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="btn btn-ghost btn-sm"
            onclick={() => (showImportModal = true)}
          >
            <Upload size={16} />
            <span class="hidden sm:inline">
              {browser.i18n.getMessage('import')}
            </span>
          </button>
          {#if tabGroups.length > 0}
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
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-5xl mx-auto px-4 py-6">
    {#if userGroups.length === 1 && tabGroups.length === 0}
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
            <button class="btn btn-ghost btn-sm" onclick={cancelNewGroup}>
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
        {userGroups}
        {tabGroups}
        {expandedGroups}
        onReload={loadData}
        onToast={showToast}
        onToggleGroup={toggleGroup}
      />
    {/if}
  </main>
</div>

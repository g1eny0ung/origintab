<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import {
    getAllUserGroups,
    getAllTabGroups,
    createUserGroup,
    clearAllData,
    getDefaultGroupId,
    exportToText,
    importFromText,
  } from '~/utils/storage'
  import type { TabGroup, UserGroup } from '~/utils/types'
  import UserGroupList from './components/UserGroupList.svelte'
  import ImportModal from './components/ImportModal.svelte'
  import { Trash2, Upload, Download, CheckCircle2, AlertCircle, Plus, Check, X } from '@lucide/svelte'
  import { Archive } from '@lucide/svelte'

  // Data state
  let userGroups: UserGroup[] = $state([])
  let tabGroups: TabGroup[] = $state([])
  let loading = $state(true)
  let expandedGroups: Set<string> = $state(new Set([getDefaultGroupId()]))

  // Import modal
  let showImportModal = $state(false)
  let importText = $state('')
  let importTargetGroupId = $state(getDefaultGroupId())
  let importLoading = $state(false)

  // Toasts
  let toasts: { id: number; message: string; type: 'success' | 'error' }[] = $state([])

  // New group input
  let showNewGroupInput = $state(false)
  let newGroupName = $state('')
  let newGroupInputRef: HTMLInputElement | null = $state(null)

  // Load data
  async function loadData() {
    try {
      ;[userGroups, tabGroups] = await Promise.all([
        getAllUserGroups(),
        getAllTabGroups(),
      ])
    } catch (error) {
      showToast('Failed to load data', 'error')
    } finally {
      loading = false
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
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id) }, 3000)
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
      showToast('Group created')
      await loadData()
      newGroupName = ''
      showNewGroupInput = false
    } catch (error) {
      showToast('Failed to create group', 'error')
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
    if (!confirm('Are you sure you want to clear all saved tabs? This cannot be undone.')) return
    try {
      await clearAllData()
      userGroups = [{ id: getDefaultGroupId(), name: 'Default', createdAt: Date.now() }]
      tabGroups = []
      showToast('All tabs cleared')
    } catch (error) {
      showToast('Failed to clear', 'error')
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
      showToast('Exported successfully')
    } catch (error) {
      showToast('Export failed', 'error')
    }
  }

  // Import tabs
  async function handleImport() {
    if (!importText.trim()) {
      showToast('Please enter data to import', 'error')
      return
    }
    importLoading = true
    try {
      const result = await importFromText(importText, importTargetGroupId)
      await loadData()
      showImportModal = false
      importText = ''
      if (result.errors.length > 0) {
        showToast(`Imported ${result.imported} tabs, ${result.errors.length} errors`, 'error')
      } else {
        showToast(`Imported ${result.imported} tabs`)
      }
    } catch (error) {
      showToast('Import failed', 'error')
    } finally {
      importLoading = false
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
<div class="toast toast-end toast-top z-50">
  {#each toasts as toast (toast.id)}
    <div class="alert alert-{toast.type === 'success' ? 'success' : 'error'} shadow-lg">
      {#if toast.type === 'success'}<CheckCircle2 size={20} />{:else}<AlertCircle size={20} />{/if}
      <span>{toast.message}</span>
    </div>
  {/each}
</div>

<ImportModal
  show={showImportModal}
  {userGroups}
  bind:importText
  bind:targetGroupId={importTargetGroupId}
  loading={importLoading}
  onImport={handleImport}
  onCancel={cancelImport}
/>

<div class="min-h-screen">
  <!-- Header -->
  <header class="sticky top-0 z-40 bg-base-100/80 backdrop-blur border-b border-base-300">
    <div class="max-w-5xl mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold">OriginTab</h1>
          <p class="text-sm text-base-content/60">Save tabs with one click and restore them at any time.</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost btn-sm gap-2" onclick={() => showImportModal = true}>
            <Upload size={18} />
            <span class="hidden sm:inline">Import</span>
          </button>
          {#if tabGroups.length > 0}
            <button class="btn btn-ghost btn-sm gap-2" onclick={handleExport}>
              <Download size={18} />
              <span class="hidden sm:inline">Export</span>
            </button>
            <button class="btn btn-ghost btn-sm gap-2" onclick={handleClearAll}>
              <Trash2 size={18} />
              <span class="hidden sm:inline">Clear</span>
            </button>
          {/if}
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-5xl mx-auto px-4 py-6">
    {#if loading}
      <div class="flex justify-center py-20">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>
    {:else if userGroups.length === 1 && tabGroups.length === 0}
      <!-- Empty state -->
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="bg-base-100 p-6 rounded-full mb-4">
          <Archive size={48} class="text-base-content/40" />
        </div>
        <h2 class="text-xl font-semibold mb-2">No saved tabs</h2>
        <p class="text-base-content/60 max-w-md">
          Click the OriginTab icon in the browser toolbar to collect tabs in the current window
        </p>
      </div>
    {:else}
      <!-- New Group Input -->
      <div class="mb-4">
        {#if showNewGroupInput}
          <div class="flex items-center gap-2">
            <input
              type="text"
              class="input input-bordered input-sm flex-1 max-w-xs"
              placeholder="Group name"
              bind:value={newGroupName}
              bind:this={newGroupInputRef}
              onkeydown={handleNewGroupKeydown}
            />
            <button class="btn btn-primary btn-sm" onclick={handleCreateGroup}><Check size={16} /></button>
            <button class="btn btn-ghost btn-sm" onclick={cancelNewGroup}><X size={16} /></button>
          </div>
        {:else}
          <button class="btn btn-ghost btn-sm gap-2" onclick={() => showNewGroupInput = true}>
            <Plus size={16} /> New Group
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

  <footer class="text-center py-6 text-sm text-base-content/40">
    <p>OriginTab - Save Your Tabs</p>
  </footer>
</div>

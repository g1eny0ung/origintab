<script lang="ts">
  import { Folder, ChevronDown, ChevronRight, Edit2, X } from '@lucide/svelte'
  import { updateUserGroup, deleteUserGroup, getDefaultGroupId } from '~/utils/storage'
  import type { UserGroup, TabGroup } from '~/utils/types'
  import TabGroupItem from './TabGroupItem.svelte'

  interface Props {
    userGroup: UserGroup
    tabGroups: TabGroup[]
    isExpanded: boolean
    onToggle: () => void
    onReload: () => void
    onToast: (message: string, type?: 'success' | 'error') => void
  }

  let { userGroup, tabGroups, isExpanded, onToggle, onReload, onToast }: Props = $props()

  let isEditing = $state(false)
  let editName = $state('')

  let tabCount = $derived(tabGroups.reduce((sum, tg) => sum + tg.tabs.length, 0))
  let isDefault = $derived(userGroup.id === getDefaultGroupId())

  async function saveEdit() {
    const name = editName.trim()
    if (!name) { isEditing = false; return }
    try {
      await updateUserGroup(userGroup.id, name)
      onToast('Group renamed')
      onReload()
    } catch { onToast('Rename failed', 'error') }
    isEditing = false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') saveEdit()
    else if (e.key === 'Escape') isEditing = false
  }

  async function handleDelete() {
    if (!confirm('Delete this group? Tabs will move to Default.')) return
    try {
      await deleteUserGroup(userGroup.id)
      onToast('Group deleted, tabs moved to Default')
      onReload()
    } catch { onToast('Delete failed', 'error') }
  }
</script>

<div class="card bg-base-100 shadow-sm border border-base-300">
  <!-- Header -->
  <div
    class="card-body p-4 hover:bg-base-200/50 transition-colors cursor-pointer"
    onclick={onToggle}
    role="button"
    tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() }}}
    aria-expanded={isExpanded}
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        {#if isExpanded}<ChevronDown size={20} class="text-base-content/50" />{:else}<ChevronRight size={20} class="text-base-content/50" />{/if}
        <Folder size={20} class="text-primary" />
        {#if isEditing}
          <input type="text" class="input input-bordered input-sm" bind:value={editName} onkeydown={handleKeydown} onblur={saveEdit} />
        {:else}
          <span class="font-medium">{userGroup.name}</span>
        {/if}
        <span class="text-sm text-base-content/50">({tabCount} tabs)</span>
      </div>
      {#if !isDefault}
        <div class="flex items-center gap-1">
          <button class="btn btn-ghost btn-xs p-1" onclick={(e) => { e.stopPropagation(); isEditing = true; editName = userGroup.name; }} title="Rename">
            <Edit2 size={14} />
          </button>
          <button class="btn btn-ghost btn-xs p-1 text-error" onclick={(e) => { e.stopPropagation(); handleDelete(); }} title="Delete">
            <X size={16} />
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Tab groups -->
  {#if isExpanded}
    <div class="border-t border-base-200">
      {#if tabGroups.length === 0}
        <div class="p-4 text-sm text-base-content/50 text-center">No tabs in this group</div>
      {:else}
        {#each tabGroups as tabGroup (tabGroup.id)}
          <TabGroupItem {tabGroup} onReload={onReload} {onToast} />
        {/each}
      {/if}
    </div>
  {/if}
</div>

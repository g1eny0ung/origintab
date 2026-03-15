<script lang="ts">
  import { Folder, ChevronDown, ChevronRight, X } from '@lucide/svelte'
  import { deleteUserGroup, DEFAULT_GROUP_ID } from '~/store'
  import type { UserGroup, TabGroup } from '~/utils/types'
  import type { Settings } from '~/store/settings'
  import TabGroupItem from './TabGroupItem.svelte'

  interface Props {
    userGroup: UserGroup
    tabGroups: TabGroup[]
    settings: Settings
    onReload: () => void
    onToast: (message: string, type?: 'success' | 'error') => void
  }

  let { userGroup, tabGroups, settings, onReload, onToast }: Props = $props()

  let isExpanded = $state(true)

  let tabCount = $derived(
    tabGroups.reduce((sum, tg) => sum + tg.tabs.length, 0),
  )
  let isDefault = $derived(userGroup.id === DEFAULT_GROUP_ID)

  async function handleDelete() {
    if (
      settings.confirmBeforeDelete &&
      !confirm(browser.i18n.getMessage('deleteGroupConfirm'))
    ) {
      return
    }

    try {
      await deleteUserGroup(userGroup.id)
      onToast(browser.i18n.getMessage('groupDeleted'))
      onReload()
    } catch {
      onToast(browser.i18n.getMessage('deleteFailed'), 'error')
    }
  }

  const handleExpand = () => (isExpanded = !isExpanded)
</script>

<div class="card border border-base-200 shadow-sm overflow-hidden">
  <!-- Header -->
  <div
    class="card-body p-4 hover:bg-base-200/30 transition-colors cursor-pointer focus-visible:outline-none"
    onclick={handleExpand}
    role="button"
    tabindex="0"
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleExpand()
      }
    }}
    aria-expanded={isExpanded}
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        {#if isExpanded}
          <ChevronDown size={20} class="text-base-content/60" />
        {:else}
          <ChevronRight size={20} class="text-base-content/60" />
        {/if}
        <Folder size={20} />
        <span class="font-medium">{userGroup.name}</span>
        <span class="text-sm text-base-content/60">({tabCount} tabs)</span>
      </div>
      {#if !isDefault}
        <div class="flex items-center gap-1">
          <button
            class="btn btn-ghost btn-xs p-1 text-error"
            onclick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            title={browser.i18n.getMessage('delete')}
          >
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
        <div class="p-4 text-sm text-base-content/60 text-center">
          {browser.i18n.getMessage('noTabsInGroup')}
        </div>
      {:else}
        {#each tabGroups as tabGroup (tabGroup.id)}
          <TabGroupItem {tabGroup} {settings} {onReload} {onToast} />
        {/each}
      {/if}
    </div>
  {/if}
</div>

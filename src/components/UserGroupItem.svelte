<script lang="ts">
  import { ChevronDown, ChevronRight, Folder, X } from '@lucide/svelte'
  import {
    DEFAULT_GROUP_ID,
    deleteUserGroup,
    moveTabsBetweenGroups,
    moveTabsToNewGroupInUserGroup,
  } from '~/store'
  import type { Settings } from '~/store/settings'
  import { clearDraggedTabState, getDraggedTabState } from '~/utils/tabDrag'
  import type { TabGroup, UserGroup } from '~/utils/types'

  import TabGroupItem from './TabGroupItem.svelte'

  interface Props {
    userGroup: UserGroup
    tabGroups: TabGroup[]
    settings: Settings
    onToast: (message: string, type?: ToastType) => void
  }

  let { userGroup, tabGroups, settings, onToast }: Props = $props()

  let isExpanded = $state(true)
  let activeDropTarget: 'header' | 'empty' | null = $state(null)

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
    } catch {
      onToast(browser.i18n.getMessage('deleteFailed'), 'error')
    }
  }

  const handleExpand = () => (isExpanded = !isExpanded)

  function expandForDrag() {
    if (!isExpanded) {
      isExpanded = true
    }
  }

  async function handleDropToUserGroup(
    sourceGroupId: string,
    tabIds: string[],
  ) {
    const firstTabGroup = tabGroups[0]

    if (firstTabGroup) {
      await moveTabsBetweenGroups(sourceGroupId, firstTabGroup.id, tabIds, 0)
      return
    }

    await moveTabsToNewGroupInUserGroup(sourceGroupId, userGroup.id, tabIds)
  }

  function resolveDropTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return null
    }

    if (tabGroups.length === 0) {
      return 'empty'
    }

    if (target.closest('[data-empty-drop-zone]')) {
      return 'empty'
    }

    if (target.closest('[data-header-drop-zone]')) {
      return 'header'
    }

    return null
  }

  function handleDragOver(event: DragEvent) {
    const draggedTab = getDraggedTabState()

    if (!draggedTab || draggedTab.tabIds.length !== 1) {
      return
    }

    activeDropTarget = resolveDropTarget(event.target)
    if (!activeDropTarget) {
      return
    }

    event.preventDefault()
    expandForDrag()
  }

  function handleDragLeave(event: DragEvent) {
    const currentTarget = event.currentTarget

    if (!(currentTarget instanceof HTMLElement)) {
      activeDropTarget = null
      return
    }

    const nextTarget = event.relatedTarget

    if (!(nextTarget instanceof Node) || !currentTarget.contains(nextTarget)) {
      activeDropTarget = null
    }
  }

  async function handleDrop(event: DragEvent) {
    const draggedTab = getDraggedTabState()
    if (!draggedTab || draggedTab.tabIds.length !== 1) {
      return
    }

    activeDropTarget = resolveDropTarget(event.target)
    if (!activeDropTarget) {
      return
    }

    event.preventDefault()
    await handleDropToUserGroup(draggedTab.sourceGroupId, draggedTab.tabIds)
    clearDraggedTabState()
    activeDropTarget = null
  }
</script>

<div
  class="card border border-base-200 shadow-sm overflow-hidden"
  ondragenter={expandForDrag}
  ondragleave={handleDragLeave}
  ondragover={handleDragOver}
  ondrop={handleDrop}
  role="group"
  aria-label={userGroup.name}
>
  <div
    class={[
      'card-body p-4 hover:bg-base-200/30 cursor-pointer focus-visible:outline-none',
      activeDropTarget === 'header' && 'bg-primary/10',
    ]}
    data-header-drop-zone
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

  {#if isExpanded}
    <div class="border-t border-base-200">
      {#if tabGroups.length === 0}
        <div
          class={[
            'p-4 text-sm text-base-content/60 text-center rounded-box border-2 border-dashed border-base-200 m-4',
            activeDropTarget === 'empty' && 'border-primary bg-primary/10',
          ]}
          data-empty-drop-zone
        >
          {browser.i18n.getMessage('noTabsInGroup')}
        </div>
      {:else}
        {#each tabGroups as tabGroup (tabGroup.id)}
          <TabGroupItem {tabGroup} {settings} {onToast} />
        {/each}
      {/if}
    </div>
  {/if}
</div>

<script lang="ts">
  import { ChevronDown, ChevronRight, Folder, X } from '@lucide/svelte'
  import {
    DEFAULT_GROUP_ID,
    deleteUserGroup,
    moveTabsBetweenGroups,
    moveTabsToNewGroupInUserGroup,
    updateLocalSettings,
  } from '~/store'
  import type { Settings } from '~/store/settings'
  import { openConfirm } from '~/utils/confirm.svelte'
  import {
    clearDraggedTabState,
    getDraggedTabState,
    markDraggedTabDropHandledExternally,
    runWithTabMovePending,
  } from '~/utils/tabDrag'
  import { showToast } from '~/utils/toast.svelte'
  import type { TabGroup, UserGroup } from '~/utils/types'

  import TabGroupItem from './TabGroupItem.svelte'

  interface Props {
    userGroup: UserGroup
    tabGroups: TabGroup[]
    isDefaultUserGroup: boolean
    settings: Settings
  }

  let { userGroup, tabGroups, isDefaultUserGroup, settings }: Props = $props()

  let isExpanded = $state(true)
  let activeDropTarget: 'header' | 'empty' | null = $state(null)

  let tabCount = $derived(
    tabGroups.reduce((sum, tg) => sum + tg.tabs.length, 0),
  )
  let isDefault = $derived(userGroup.id === DEFAULT_GROUP_ID)

  async function handleSetDefault() {
    try {
      await updateLocalSettings({ defaultUserGroupId: userGroup.id })
      showToast(browser.i18n.getMessage('defaultGroupSetTo', userGroup.name))
    } catch {
      showToast(browser.i18n.getMessage('setDefaultFailed'), 'error')
    }
  }

  async function handleDelete() {
    const doDelete = async () => {
      try {
        await deleteUserGroup(userGroup.id)
        if (isDefaultUserGroup) {
          await updateLocalSettings({ defaultUserGroupId: undefined })
        }
        showToast(browser.i18n.getMessage('groupDeleted'))
      } catch {
        showToast(browser.i18n.getMessage('deleteFailed'), 'error')
      }
    }

    if (settings.confirmBeforeDelete) {
      openConfirm({
        title: browser.i18n.getMessage('deleteGroupTitle'),
        message: browser.i18n.getMessage('deleteGroupConfirm'),
        onConfirm: doDelete,
      })
      return
    }

    await doDelete()
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
    preserveBrowserTabGroup: boolean,
    targetTabGroupId?: string,
  ) {
    await runWithTabMovePending(async () => {
      const targetTabGroup =
        tabGroups.find((group) => group.id === targetTabGroupId) ?? tabGroups[0]
      const targetBrowserTabGroupId = preserveBrowserTabGroup ? undefined : null

      if (targetTabGroup) {
        await moveTabsBetweenGroups(
          sourceGroupId,
          targetTabGroup.id,
          tabIds,
          0,
          targetBrowserTabGroupId,
        )
        return
      }

      await moveTabsToNewGroupInUserGroup(
        sourceGroupId,
        userGroup.id,
        tabIds,
        targetBrowserTabGroupId,
      )
    })
  }

  function resolveDropTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) {
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

    const draggedTab = getDraggedTabState()
    const targetTabGroupId = target.closest<HTMLElement>('[data-tab-group-id]')
      ?.dataset.tabGroupId

    // All list drops belong to Sortable, including whole browser groups.
    // Intercepting them here would replace the insertion preview with a
    // user-group highlight and discard the position chosen by the user.
    if (targetTabGroupId) {
      return null
    }

    // Dropping on another user group's padding uses its first collection.
    if (
      draggedTab?.browserTabGroupId &&
      !tabGroups.some((group) => group.id === draggedTab.sourceGroupId)
    ) {
      return 'header'
    }

    return null
  }

  function handleDragOver(event: DragEvent) {
    const draggedTab = getDraggedTabState()

    if (!draggedTab || draggedTab.tabIds.length === 0) {
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
    if (!draggedTab || draggedTab.tabIds.length === 0) {
      return
    }

    activeDropTarget = resolveDropTarget(event.target)
    if (!activeDropTarget) {
      return
    }

    event.preventDefault()
    // The same drop can also reach Sortable's callbacks. Claim it synchronously
    // so only this outer user-group operation is persisted.
    markDraggedTabDropHandledExternally()

    try {
      const targetTabGroupId =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-tab-group-id]')?.dataset
              .tabGroupId
          : undefined

      await handleDropToUserGroup(
        draggedTab.sourceGroupId,
        draggedTab.tabIds,
        draggedTab.browserTabGroupId !== undefined,
        targetTabGroupId,
      )
    } catch {
      showToast(browser.i18n.getMessage('moveTabsFailed'), 'error')
    } finally {
      clearDraggedTabState()
      activeDropTarget = null
    }
  }
</script>

<div
  class="card border border-base-200 shadow-sm overflow-hidden"
  ondragleave={handleDragLeave}
  ondragover={handleDragOver}
  ondrop={handleDrop}
  role="group"
  aria-label={userGroup.name}
>
  <div
    class={[
      'group card-body p-4 hover:bg-base-200/40',
      activeDropTarget === 'header' && 'bg-primary/10',
    ]}
    data-header-drop-zone
  >
    <div class="flex items-center justify-between gap-2">
      <button
        type="button"
        class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-field text-start focus-visible:ring-2 focus-visible:ring-primary"
        onclick={handleExpand}
        aria-expanded={isExpanded}
      >
        {#if isExpanded}
          <ChevronDown
            size={20}
            class="shrink-0 text-base-content/60"
            aria-hidden="true"
          />
        {:else}
          <ChevronRight
            size={20}
            class="shrink-0 text-base-content/60"
            aria-hidden="true"
          />
        {/if}
        <Folder size={20} class="shrink-0" aria-hidden="true" />
        <span class="truncate font-medium">{userGroup.name}</span>
        <span class="shrink-0 text-sm text-base-content/80">
          {tabCount}
          {browser.i18n.getMessage(
            tabCount === 1 ? 'tabSingular' : 'tabPlural',
          )}
        </span>
      </button>
      {#if !isDefault}
        <div class="flex shrink-0 items-center gap-1">
          {#if isDefaultUserGroup}
            <span class="badge badge-primary badge-sm badge-soft">
              {browser.i18n.getMessage('defaultGroup')}
            </span>
          {:else}
            <button
              type="button"
              class="btn btn-ghost btn-xs hidden group-hover:inline-flex group-focus-within:inline-flex"
              onclick={handleSetDefault}
            >
              {browser.i18n.getMessage('setAsDefaultGroup')}
            </button>
          {/if}
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-square hover:btn-error hover:text-error-content"
            onclick={handleDelete}
            title={browser.i18n.getMessage('delete')}
            aria-label={browser.i18n.getMessage('delete')}
          >
            <X size={16} aria-hidden="true" />
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
          <TabGroupItem {tabGroup} {settings} />
        {/each}
      {/if}
    </div>
  {/if}
</div>

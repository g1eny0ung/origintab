<script lang="ts">
  import {
    ExternalLink,
    FolderOutput,
    ListTodo,
    RotateCcw,
    X,
  } from '@lucide/svelte'
  import { DateTime } from 'luxon'
  import Sortable from 'sortablejs'
  import { onMount } from 'svelte'
  import {
    deleteTabGroup,
    moveTabBetweenGroups,
    moveTabsToUserGroup,
    removeTabFromGroup,
    restoreAndDeleteGroup,
    restoreAndDeleteTab,
    restoreGroup,
    restoreTab,
  } from '~/store'
  import type { Settings } from '~/store/settings'
  import { clearDraggedTabState, setDraggedTabState } from '~/utils/tabDrag'
  import type { TabGroup, UserGroup } from '~/utils/types'
  import { RestoreAction, UrlDisplayMode } from '~/utils/types'

  import Dialog from './ui/Dialog.svelte'

  interface Props {
    tabGroup: TabGroup
    userGroups: UserGroup[]
    settings: Settings
    onToast: (message: string, type?: ToastType) => void
  }

  let { tabGroup, userGroups, settings, onToast }: Props = $props()

  let tabsContainer: HTMLDivElement
  let sortable: Sortable | null = null
  let isSelectionMode = $state(false)
  let selectedTabIds: string[] = $state([])
  let lastSelectedTabIndex = $state<number | null>(null)
  let shiftKeyPressed = $state(false)
  let moveTargetUserGroupId = $state('')
  let moveModalId = $derived(`move-tabs-${tabGroup.id}`)

  function formatTime(ts: number) {
    if (DateTime.fromMillis(ts).diffNow().as('seconds') > -10) {
      return browser.i18n.getMessage('justNow')
    }

    return DateTime.fromMillis(ts).toRelative()
  }

  function urlHostname(url: string) {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  async function handleRestoreGroup(remove: boolean) {
    try {
      const active = settings.restoreAction === RestoreAction.OpenAndJump
      const newWindow = settings.openGroupInNewWindow

      if (remove) {
        await restoreAndDeleteGroup(tabGroup.id, { active, newWindow })
      } else {
        await restoreGroup(tabGroup.id, { active, newWindow })
      }

      onToast(browser.i18n.getMessage('tabsRestored'))
    } catch {
      onToast(browser.i18n.getMessage('restoreFailed'), 'error')
    }
  }

  async function handleDeleteGroup() {
    if (
      settings.confirmBeforeDelete &&
      !confirm(browser.i18n.getMessage('deleteCollection'))
    ) {
      return
    }

    try {
      await deleteTabGroup(tabGroup.id)
      onToast(browser.i18n.getMessage('collectionDeleted'))
    } catch {
      onToast(browser.i18n.getMessage('deleteFailed'), 'error')
    }
  }

  function handleTabClick(e: MouseEvent, tabId: string) {
    const asDefault = e.ctrlKey || e.metaKey || e.shiftKey
    if (!asDefault) {
      e.preventDefault()
    }

    handleRestoreTab(tabId, {
      remove: true,
      asDefault,
    })
  }

  async function handleRestoreTab(
    tabId: string,
    options?: { remove: boolean; asDefault?: boolean },
  ) {
    try {
      if (!options?.asDefault) {
        const active = settings.restoreAction === RestoreAction.OpenAndJump

        if (options?.remove) {
          await restoreAndDeleteTab(tabGroup.id, tabId, { active })
        } else {
          await restoreTab(tabGroup.id, tabId, { active })
        }
      }

      onToast(browser.i18n.getMessage('tabRestored'))
    } catch {
      onToast(browser.i18n.getMessage('restoreFailed'), 'error')
    }
  }

  async function handleDeleteTab(tabId: string) {
    if (
      settings.confirmBeforeDelete &&
      !confirm(browser.i18n.getMessage('deleteTabConfirm'))
    ) {
      return
    }

    try {
      await removeTabFromGroup(tabGroup.id, tabId)
      onToast(browser.i18n.getMessage('tabDeleted'))
    } catch {
      onToast(browser.i18n.getMessage('deleteFailed'), 'error')
    }
  }

  function enterSelectionMode() {
    isSelectionMode = true
    moveTargetUserGroupId = userGroups[0]?.id || ''
  }

  function resetSelectionMode() {
    isSelectionMode = false
    selectedTabIds = []
    lastSelectedTabIndex = null
    moveTargetUserGroupId = ''
  }

  function handleSelectionChange(
    tabId: string,
    checked: boolean,
    isShiftClick: boolean = false,
  ) {
    const currentIndex = tabGroup.tabs.findIndex((t) => t.id === tabId)

    if (checked) {
      if (
        isShiftClick &&
        lastSelectedTabIndex !== null &&
        currentIndex !== -1
      ) {
        const start = Math.min(lastSelectedTabIndex, currentIndex)
        const end = Math.max(lastSelectedTabIndex, currentIndex)
        const rangeIds = tabGroup.tabs.slice(start, end + 1).map((t) => t.id)
        selectedTabIds = [...new Set([...selectedTabIds, ...rangeIds])]
      } else {
        selectedTabIds = [...selectedTabIds, tabId]
      }
      lastSelectedTabIndex = currentIndex
    } else {
      selectedTabIds = selectedTabIds.filter((id) => id !== tabId)
    }
  }

  function openMoveModal() {
    if (selectedTabIds.length === 0) {
      onToast(browser.i18n.getMessage('selectTabsFirst'), 'warning')
      return
    }

    if (!moveTargetUserGroupId) {
      moveTargetUserGroupId = userGroups[0]?.id || ''
    }

    const dialog = document.getElementById(
      moveModalId,
    ) as HTMLDialogElement | null
    dialog?.showModal()
  }

  async function handleMoveTabs() {
    if (!moveTargetUserGroupId || selectedTabIds.length === 0) {
      return null
    }

    try {
      await moveTabsToUserGroup(
        tabGroup.id,
        moveTargetUserGroupId,
        selectedTabIds,
      )
      resetSelectionMode()
      onToast(browser.i18n.getMessage('tabsMoved'))
    } catch {
      onToast(browser.i18n.getMessage('moveTabsFailed'), 'error')
      return null
    }
  }

  async function handleTabMove(
    sourceGroupId: string,
    targetGroupId: string,
    tabId: string,
    newIndex: number,
  ) {
    await moveTabBetweenGroups(sourceGroupId, targetGroupId, tabId, newIndex)
  }

  $effect(() => {
    const availableTabIdSet = new Set(tabGroup.tabs.map((tab) => tab.id))
    const nextSelectedTabIds = selectedTabIds.filter((tabId) =>
      availableTabIdSet.has(tabId),
    )

    if (
      nextSelectedTabIds.length !== selectedTabIds.length ||
      nextSelectedTabIds.some((tabId, index) => tabId !== selectedTabIds[index])
    ) {
      selectedTabIds = nextSelectedTabIds
    }
  })

  $effect(() => {
    sortable?.option('disabled', isSelectionMode)
  })

  onMount(() => {
    sortable = Sortable.create(tabsContainer, {
      animation: 150,
      group: 'tab-items',
      handle: '.drag-handle',
      onStart: (e) => {
        const tabId = e.item.dataset.tabId

        if (tabId) {
          setDraggedTabState({
            sourceGroupId: tabGroup.id,
            tabIds: [tabId],
          })
        }
      },
      onAdd: (e) => {
        const sourceGroupId = e.from.dataset.tabGroupId
        const targetGroupId = e.to.dataset.tabGroupId
        const tabId = e.item.dataset.tabId

        if (
          sourceGroupId &&
          targetGroupId &&
          tabId &&
          e.newIndex !== undefined
        ) {
          // Sortable temporarily inserts the dragged DOM node into the target list.
          // Remove that node and let Svelte re-render from store data.
          e.item.remove()
          handleTabMove(sourceGroupId, targetGroupId, tabId, e.newIndex)
        }
      },
      onUpdate: (e) => {
        const targetGroupId = e.from.dataset.tabGroupId
        const tabId = e.item.dataset.tabId

        if (targetGroupId && tabId && e.newIndex !== undefined) {
          handleTabMove(targetGroupId, targetGroupId, tabId, e.newIndex)
        }
      },
      onEnd: () => {
        clearDraggedTabState()
      },
    })

    return () => {
      sortable?.destroy()
    }
  })
</script>

<div class="p-4 border-b border-base-200 last:border-b-0">
  <div class="flex items-center justify-between mb-4 px-2">
    <div class="text-sm text-base-content/60">
      {formatTime(tabGroup.createdAt)}
    </div>
    <div class="flex items-center gap-1">
      {#if isSelectionMode}
        <div class="join">
          <button class="btn btn-xs join-item" onclick={openMoveModal}>
            <FolderOutput size={14} />
            <span class="hidden sm:inline">
              {browser.i18n.getMessage('moveTo')}
            </span>
          </button>
          <button class="btn btn-xs join-item" onclick={resetSelectionMode}>
            <X size={14} />
            <span class="hidden sm:inline">
              {browser.i18n.getMessage('cancel')}
            </span>
          </button>
        </div>
      {:else}
        <button class="btn btn-ghost btn-xs" onclick={enterSelectionMode}>
          <ListTodo size={14} />
          <span class="hidden sm:inline">
            {browser.i18n.getMessage('select')}
          </span>
        </button>
      {/if}
      <button
        class="btn btn-ghost btn-xs"
        onclick={() => handleRestoreGroup(true)}
      >
        <RotateCcw size={14} />
        <span class="hidden sm:inline">
          {browser.i18n.getMessage('restore')}
        </span>
      </button>
      <button
        class="btn btn-ghost btn-xs"
        onclick={() => handleRestoreGroup(false)}
      >
        <ExternalLink size={14} />
        <span class="hidden sm:inline">
          {browser.i18n.getMessage('restoreAndPreserve')}
        </span>
      </button>
      <button
        class="btn btn-ghost btn-xs text-error hover:btn-error hover:text-white"
        onclick={handleDeleteGroup}
      >
        <X size={14} />
        <span class="hidden sm:inline">
          {browser.i18n.getMessage('delete')}
        </span>
      </button>
    </div>
  </div>

  <div
    bind:this={tabsContainer}
    class="divide-y divide-base-200"
    data-tab-group-id={tabGroup.id}
  >
    {#each tabGroup.tabs as tab (tab.id)}
      <div
        class={[
          'group flex items-center gap-3 py-2.5 px-2 bg-base-100',
          isSelectionMode && 'select-none',
          !isSelectionMode && 'drag-handle active:cursor-grabbing',
        ]}
        data-tab-id={tab.id}
      >
        {#if isSelectionMode}
          <input
            type="checkbox"
            class="checkbox checkbox-xs rounded"
            class:checkbox-primary={selectedTabIds.includes(tab.id)}
            checked={selectedTabIds.includes(tab.id)}
            aria-label={`Select ${tab.title || browser.i18n.getMessage('untitled')}`}
            onclick={(e) => {
              e.stopPropagation()
              shiftKeyPressed = e.shiftKey
            }}
            onchange={(e) => {
              handleSelectionChange(
                tab.id,
                (e.currentTarget as HTMLInputElement).checked,
                shiftKeyPressed,
              )
            }}
          />
        {/if}
        <div class="favicon-container">
          {#if tab.favicon}
            <img
              src={tab.favicon}
              alt=""
              onerror={(e) =>
                ((e.target as HTMLImageElement).style.display = 'none')}
            />
          {:else}
            <div class="w-4 h-4 rounded bg-base-300"></div>
          {/if}
        </div>
        <a
          href={tab.url}
          class="flex-1 inline-flex flex-col min-w-0 cursor-pointer"
          onclick={(e) => handleTabClick(e, tab.id)}
        >
          <span class="font-medium text-sm truncate">
            {tab.title || browser.i18n.getMessage('untitled')}
          </span>
          {#if settings.urlDisplayMode === UrlDisplayMode.Full}
            <span class="text-xs text-base-content/60 truncate">
              {tab.url}
            </span>
          {:else if settings.urlDisplayMode === UrlDisplayMode.Hostname}
            <span class="text-xs text-base-content/60">
              {urlHostname(tab.url)}
            </span>
          {/if}
        </a>
        <div
          class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            class="btn btn-ghost btn-xs p-1"
            onclick={() => handleRestoreTab(tab.id, { remove: false })}
            title={browser.i18n.getMessage('restoreAndPreserve')}
          >
            <ExternalLink size={14} />
          </button>
          <button
            class="btn btn-ghost btn-xs p-1 text-error hover:btn-error hover:text-white"
            onclick={() => handleDeleteTab(tab.id)}
            title={browser.i18n.getMessage('delete')}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>

<Dialog
  id={moveModalId}
  disableConfirm={!moveTargetUserGroupId || selectedTabIds.length === 0}
  onConfirm={handleMoveTabs}
>
  <h3 class="font-bold text-lg">{browser.i18n.getMessage('moveTabs')}</h3>

  <div class="my-4 space-y-3">
    <p class="text-sm text-base-content/70">
      {browser.i18n.getMessage('moveSelectedTabsTo', [
        selectedTabIds.length.toString(),
        browser.i18n.getMessage(
          selectedTabIds.length === 1 ? 'tabSingular' : 'tabPlural',
        ),
      ])}
    </p>

    <select
      id={`move-target-group-${tabGroup.id}`}
      class="select"
      bind:value={moveTargetUserGroupId}
    >
      {#each userGroups as group}
        <option value={group.id}>{group.name}</option>
      {/each}
    </select>
  </div>
</Dialog>

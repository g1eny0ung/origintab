<script lang="ts">
  import { ExternalLink, RotateCcw, Trash2, X } from '@lucide/svelte'
  import { DateTime } from 'luxon'
  import Sortable from 'sortablejs'
  import { onMount } from 'svelte'
  import { getTabSelectionContext } from '~/entrypoints/origintab/selection.svelte'
  import {
    deleteTabGroup,
    moveTabBetweenGroups,
    removeTabFromGroup,
    restoreAndDeleteGroup,
    restoreAndDeleteTab,
    restoreGroup,
    restoreTab,
  } from '~/store'
  import type { Settings } from '~/store/settings'
  import { clearDraggedTabState, setDraggedTabState } from '~/utils/tabDrag'
  import type { TabGroup } from '~/utils/types'
  import { RestoreAction, UrlDisplayMode } from '~/utils/types'

  interface Props {
    tabGroup: TabGroup
    settings: Settings
    onToast: (message: string, type?: ToastType) => void
  }

  let { tabGroup, settings, onToast }: Props = $props()

  let tabsContainer: HTMLDivElement
  let sortable: Sortable | null = null
  let shiftKeyPressed = $state(false)
  const selection = getTabSelectionContext()

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

      handleRestoreTab(tabId, {
        remove: true,
      })
    }
  }

  async function handleRestoreTab(
    tabId: string,
    options?: { remove: boolean },
  ) {
    try {
      const active = settings.restoreAction === RestoreAction.OpenAndJump

      if (options?.remove) {
        await restoreAndDeleteTab(tabGroup.id, tabId, { active })
      } else {
        await restoreTab(tabGroup.id, tabId, { active })
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

  async function handleTabMove(
    sourceGroupId: string,
    targetGroupId: string,
    tabId: string,
    newIndex: number,
  ) {
    await moveTabBetweenGroups(sourceGroupId, targetGroupId, tabId, newIndex)
  }

  $effect(() => {
    sortable?.option('disabled', selection.selectedCount > 0)
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
        class="btn btn-ghost btn-xs hover:btn-error hover:text-white"
        onclick={handleDeleteGroup}
      >
        <Trash2 size={14} />
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
          selection.selectedCount === 0 && 'drag-handle active:cursor-grabbing',
        ]}
        data-tab-id={tab.id}
      >
        <input
          type="checkbox"
          class="checkbox checkbox-xs rounded"
          class:checkbox-primary={selection.isSelected(tabGroup.id, tab.id)}
          checked={selection.isSelected(tabGroup.id, tab.id)}
          aria-label={`Select ${tab.title || browser.i18n.getMessage('untitled')}`}
          onclick={(e) => {
            e.stopPropagation()
            shiftKeyPressed = e.shiftKey
          }}
          onchange={(e) => {
            selection.toggle(
              tabGroup,
              tab.id,
              (e.currentTarget as HTMLInputElement).checked,
              shiftKeyPressed,
            )
          }}
        />
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
            class="btn btn-ghost btn-xs btn-square"
            onclick={() => handleRestoreTab(tab.id, { remove: false })}
            title={browser.i18n.getMessage('restoreAndPreserve')}
          >
            <ExternalLink size={14} />
          </button>
          <button
            class="btn btn-ghost btn-xs btn-square hover:btn-error hover:text-white"
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

<script lang="ts">
  import { ExternalLink, RotateCcw, X } from '@lucide/svelte'
  import { DateTime } from 'luxon'
  import Sortable from 'sortablejs'
  import { onMount } from 'svelte'
  import {
    restoreGroup,
    restoreAndDeleteGroup,
    deleteTabGroup,
    restoreTab,
    removeTabFromGroup,
    updateTabGroup,
    restoreAndDeleteTab,
  } from '~/store'
  import type { TabGroup } from '~/utils/types'
  import type { Settings } from '~/store/settings'
  import { UrlDisplayMode, RestoreAction } from '~/utils/types'

  interface Props {
    tabGroup: TabGroup
    settings: Settings
    onReload: () => void
    onToast: (message: string, type?: 'success' | 'error') => void
  }

  let { tabGroup, settings, onReload, onToast }: Props = $props()
  let tabsContainer: HTMLDivElement

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
      onReload()
    } catch {
      onToast(browser.i18n.getMessage('restoreFailed'), 'error')
    }
  }

  async function handleDeleteGroup() {
    if (
      settings.confirmBeforeDelete &&
      !confirm(browser.i18n.getMessage('deleteCollection'))
    )
      return
    try {
      await deleteTabGroup(tabGroup.id)

      onToast(browser.i18n.getMessage('collectionDeleted'))
      onReload()
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
      onReload()
    } catch {
      onToast(browser.i18n.getMessage('restoreFailed'), 'error')
    }
  }

  async function handleDeleteTab(tabId: string) {
    if (
      settings.confirmBeforeDelete &&
      !confirm(browser.i18n.getMessage('deleteTabConfirm'))
    )
      return
    try {
      await removeTabFromGroup(tabGroup.id, tabId)

      onToast(browser.i18n.getMessage('tabDeleted'))
      onReload()
    } catch {
      onToast(browser.i18n.getMessage('deleteFailed'), 'error')
    }
  }

  async function handleTabReorder(newIndex: number, oldIndex: number) {
    const newTabs = [...tabGroup.tabs]
    const [movedTab] = newTabs.splice(oldIndex, 1)
    newTabs.splice(newIndex, 0, movedTab)

    await updateTabGroup(tabGroup.id, { tabs: newTabs })

    onReload()
  }

  onMount(() => {
    Sortable.create(tabsContainer, {
      animation: 150,
      handle: '.drag-handle',
      onEnd: (e) => {
        if (e.oldIndex !== undefined && e.newIndex !== undefined) {
          handleTabReorder(e.newIndex, e.oldIndex)
        }
      },
    })
  })
</script>

<div class="p-4 border-b border-base-200 last:border-b-0">
  <!-- Header -->
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

  <!-- Tabs -->
  <div bind:this={tabsContainer} class="divide-y divide-base-200">
    {#each tabGroup.tabs as tab (tab.id)}
      <div
        class="drag-handle active:cursor-grabbing flex items-center gap-4 py-2.5 px-2 bg-base-100 group"
      >
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

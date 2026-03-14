<script lang="ts">
  import { ExternalLink, RotateCcw, X } from '@lucide/svelte'
  import { DateTime } from 'luxon'
  import {
    restoreGroup,
    restoreAndDeleteGroup,
    deleteTabGroup,
    restoreTab,
    removeTabFromGroup,
  } from '~/store'
  import type { TabGroup } from '~/utils/types'

  interface Props {
    tabGroup: TabGroup
    onReload: () => void
    onToast: (message: string, type?: 'success' | 'error') => void
  }

  let { tabGroup, onReload, onToast }: Props = $props()

  function formatTime(ts: number) {
    return DateTime.fromMillis(ts).toRelative()
  }

  function formatUrl(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  async function handleRestoreGroup(remove: boolean) {
    try {
      if (remove) {
        await restoreAndDeleteGroup(tabGroup.id)
        onToast(browser.i18n.getMessage('tabsRestoredAndRemoved'))
      } else {
        await restoreGroup(tabGroup.id)
        onToast(browser.i18n.getMessage('tabsRestored'))
      }
      onReload()
    } catch {
      onToast(browser.i18n.getMessage('restoreFailed'), 'error')
    }
  }

  async function handleDeleteGroup() {
    if (!confirm(browser.i18n.getMessage('deleteCollection'))) return
    try {
      await deleteTabGroup(tabGroup.id)
      onToast(browser.i18n.getMessage('collectionDeleted'))
      onReload()
    } catch {
      onToast(browser.i18n.getMessage('deleteFailed'), 'error')
    }
  }

  async function handleRestoreTab(tabId: string) {
    try {
      await restoreTab(tabGroup.id, tabId)
      onToast(browser.i18n.getMessage('tabRestored'))
    } catch {
      onToast(browser.i18n.getMessage('restoreFailed'), 'error')
    }
  }

  async function handleDeleteTab(tabId: string) {
    try {
      await removeTabFromGroup(tabGroup.id, tabId)
      onToast(browser.i18n.getMessage('tabDeleted'))
      onReload()
    } catch {
      onToast(browser.i18n.getMessage('deleteFailed'), 'error')
    }
  }
</script>

<div class="p-4 border-b border-base-200 last:border-b-0">
  <!-- Header -->
  <div class="flex items-center justify-between mb-3">
    <div class="text-sm text-base-content/70">
      <span class="font-medium">{tabGroup.tabs.length} tabs</span>
      <span class="mx-2">·</span>
      <span>{formatTime(tabGroup.createdAt)}</span>
    </div>
    <div class="flex items-center gap-1">
      <button
        class="btn btn-ghost btn-xs"
        onclick={() => handleRestoreGroup(false)}
      >
        <RotateCcw size={14} />
        <span class="hidden sm:inline">
          {browser.i18n.getMessage('restore')}
        </span>
      </button>
      <button
        class="btn btn-ghost btn-xs hover:btn-warning"
        onclick={() => handleRestoreGroup(true)}
      >
        <ExternalLink size={14} />
        <span class="hidden sm:inline">
          {browser.i18n.getMessage('restoreAndDelete')}
        </span>
      </button>
      <button
        class="btn btn-ghost btn-xs text-error hover:btn-error hover:text-base-content/80"
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
  <div class="divide-y divide-base-200">
    {#each tabGroup.tabs as tab (tab.id)}
      <div
        class="tab-item flex items-center gap-3 py-2.5 px-2 rounded-lg group"
      >
        <div class="favicon-container">
          {#if tab.favicon}
            <img
              src={tab.favicon}
              alt=""
              width="16"
              height="16"
              onerror={(e) =>
                ((e.target as HTMLImageElement).style.display = 'none')}
            />
          {:else}
            <div class="w-4 h-4 rounded bg-base-300"></div>
          {/if}
        </div>
        <button
          class="flex-1 min-w-0 text-left cursor-pointer"
          onclick={() => handleRestoreTab(tab.id)}
        >
          <div class="font-medium text-sm truncate">
            {tab.title || browser.i18n.getMessage('untitled')}
          </div>
          <div class="text-xs text-base-content/50 truncate">
            {formatUrl(tab.url)}
          </div>
        </button>
        <div
          class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <button
            class="btn btn-ghost btn-xs p-1"
            onclick={() => handleRestoreTab(tab.id)}
            title={browser.i18n.getMessage('open')}
          >
            <ExternalLink size={14} />
          </button>
          <button
            class="btn btn-ghost btn-xs p-1 text-error hover:btn-error hover:text-base-content/80"
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

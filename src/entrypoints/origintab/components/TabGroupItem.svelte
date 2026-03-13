<script lang="ts">
  import { ExternalLink, RotateCcw, X } from '@lucide/svelte'
  import { DateTime } from 'luxon'
  import { restoreGroup, restoreAndDeleteGroup, deleteTabGroup, restoreTab, removeTabFromGroup } from '~/utils/storage'
  import type { TabGroup } from '~/utils/types'

  interface Props {
    tabGroup: TabGroup
    onReload: () => void
    onToast: (message: string, type?: 'success' | 'error') => void
  }

  let { tabGroup, onReload, onToast }: Props = $props()

  function formatTime(ts: number): string {
    const dt = DateTime.fromMillis(ts)
    const now = DateTime.now()
    const diff = now.diff(dt, ['years', 'months', 'days', 'hours', 'minutes'])
    if (diff.years) return dt.toFormat('yyyy-MM-dd')
    if (diff.months) return dt.toFormat('MMM dd')
    if (diff.days) return diff.days === 1 ? 'Yesterday' : `${Math.floor(diff.days)}d ago`
    if (diff.hours) return `${Math.floor(diff.hours)}h ago`
    if (diff.minutes) return `${Math.floor(diff.minutes)}m ago`
    return 'Just now'
  }

  function formatUrl(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
  }

  async function handleRestoreGroup(remove: boolean) {
    try {
      if (remove) {
        await restoreAndDeleteGroup(tabGroup.id)
        onToast('Tabs restored and removed')
      } else {
        await restoreGroup(tabGroup.id)
        onToast('Tabs restored')
      }
      onReload()
    } catch { onToast('Restore failed', 'error') }
  }

  async function handleDeleteGroup() {
    if (!confirm('Delete this collection?')) return
    try {
      await deleteTabGroup(tabGroup.id)
      onToast('Collection deleted')
      onReload()
    } catch { onToast('Delete failed', 'error') }
  }

  async function handleRestoreTab(tabId: string) {
    try {
      await restoreTab(tabGroup.id, tabId)
      onToast('Tab restored')
    } catch { onToast('Restore failed', 'error') }
  }

  async function handleDeleteTab(tabId: string) {
    try {
      await removeTabFromGroup(tabGroup.id, tabId)
      onToast('Tab deleted')
      onReload()
    } catch { onToast('Delete failed', 'error') }
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
      <button class="btn btn-ghost btn-xs gap-1" onclick={() => handleRestoreGroup(false)}>
        <RotateCcw size={14} />
        <span class="hidden sm:inline">Restore</span>
      </button>
      <button class="btn btn-ghost btn-xs gap-1 text-primary" onclick={() => handleRestoreGroup(true)}>
        <ExternalLink size={14} />
        <span class="hidden sm:inline">Restore & Delete</span>
      </button>
      <button class="btn btn-ghost btn-xs text-error" onclick={handleDeleteGroup}>
        <X size={16} />
      </button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="divide-y divide-base-200">
    {#each tabGroup.tabs as tab (tab.id)}
      <div class="tab-item flex items-center gap-3 py-2.5 px-2 rounded-lg group">
        <div class="favicon-container">
          {#if tab.favicon}
            <img src={tab.favicon} alt="" width="16" height="16" onerror={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
          {:else}
            <div class="w-4 h-4 rounded bg-base-300"></div>
          {/if}
        </div>
        <button class="flex-1 min-w-0 text-left" onclick={() => handleRestoreTab(tab.id)}>
          <div class="font-medium text-sm truncate">{tab.title || 'Untitled'}</div>
          <div class="text-xs text-base-content/50 truncate">{formatUrl(tab.url)}</div>
        </button>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="btn btn-ghost btn-xs p-1" onclick={() => handleRestoreTab(tab.id)} title="Open">
            <ExternalLink size={14} />
          </button>
          <button class="btn btn-ghost btn-xs p-1 text-error" onclick={() => handleDeleteTab(tab.id)} title="Delete">
            <X size={14} />
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>

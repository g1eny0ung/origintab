<script lang="ts">
  import { ExternalLink, RotateCcw, Trash2 } from '@lucide/svelte'
  import type { BrowserTabGroup } from '~/utils/types'

  interface Props {
    browserTabGroup: BrowserTabGroup
    tabCount: number
    disabled?: boolean
    draggable?: boolean
    onRestoreAndRemove: () => void
    onRestoreAndPreserve: () => void
    onDelete: () => void
  }

  let {
    browserTabGroup,
    tabCount,
    disabled = false,
    draggable = false,
    onRestoreAndRemove,
    onRestoreAndPreserve,
    onDelete,
  }: Props = $props()

  // These classes intentionally mirror the colors exposed by the tabGroups API.
  const colorClasses: Record<BrowserTabGroup['color'], string> = {
    grey: 'bg-base-content/40',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-400',
    green: 'bg-green-500',
    pink: 'bg-pink-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
  }
</script>

<div
  class={[
    'flex items-center gap-3 p-2',
    draggable && 'drag-handle cursor-grab active:cursor-grabbing',
  ]}
  title={draggable ? browser.i18n.getMessage('dragBrowserTabGroup') : undefined}
>
  <div class="flex min-w-0 flex-1 items-center gap-2">
    <span
      class={[
        'size-2.5 shrink-0 rounded-full',
        colorClasses[browserTabGroup.color],
      ]}
      aria-hidden="true"
    ></span>
    <span class="truncate text-sm font-semibold">
      {browserTabGroup.title || browser.i18n.getMessage('browserTabGroup')}
    </span>
    <span class="badge badge-ghost badge-sm shrink-0">
      {tabCount}
      {browser.i18n.getMessage(tabCount === 1 ? 'tabSingular' : 'tabPlural')}
    </span>
  </div>
  <div
    class="flex items-center gap-1 opacity-0 transition-opacity motion-reduce:transition-none group-hover:opacity-100 group-focus-within:opacity-100"
  >
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-square"
      {disabled}
      onclick={onRestoreAndRemove}
      title={browser.i18n.getMessage('restoreBrowserTabGroup')}
      aria-label={browser.i18n.getMessage('restoreBrowserTabGroup')}
    >
      <RotateCcw size={14} aria-hidden="true" />
    </button>
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-square"
      {disabled}
      onclick={onRestoreAndPreserve}
      title={browser.i18n.getMessage('restoreBrowserTabGroupAndPreserve')}
      aria-label={browser.i18n.getMessage('restoreBrowserTabGroupAndPreserve')}
    >
      <ExternalLink size={14} aria-hidden="true" />
    </button>
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-square hover:btn-error hover:text-error-content"
      {disabled}
      onclick={onDelete}
      title={browser.i18n.getMessage('deleteBrowserTabGroupTitle')}
      aria-label={browser.i18n.getMessage('deleteBrowserTabGroupTitle')}
    >
      <Trash2 size={14} aria-hidden="true" />
    </button>
  </div>
</div>

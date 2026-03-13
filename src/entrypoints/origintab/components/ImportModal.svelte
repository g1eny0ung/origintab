<script lang="ts">
  import { Upload } from '@lucide/svelte'
  import type { UserGroup } from '~/utils/types'

  interface Props {
    show: boolean
    userGroups: UserGroup[]
    importText: string
    targetGroupId: string
    loading: boolean
    onImport: () => void
    onCancel: () => void
  }

  let {
    show,
    userGroups,
    importText = $bindable(),
    targetGroupId = $bindable(),
    loading,
    onImport,
    onCancel,
  }: Props = $props()
</script>

{#if show}
  <div class="modal modal-open">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg flex items-center gap-2">
        <Upload size={20} class="text-primary" aria-hidden="true" />
        Import Tabs
      </h3>
      <p class="text-sm text-base-content/60 mt-1">
        Format: <code class="bg-base-200 px-1 rounded">url | title</code>
        (one per line)
      </p>

      <div class="py-4 space-y-3">
        <div>
          <label class="label label-text text-sm" for="import-target-group">
            Target Group
          </label>
          <select
            id="import-target-group"
            class="select select-bordered select-sm w-full max-w-xs"
            bind:value={targetGroupId}
          >
            {#each userGroups as group}
              <option value={group.id}>{group.name}</option>
            {/each}
          </select>
        </div>

        <textarea
          class="textarea textarea-bordered w-full h-64 font-mono text-sm"
          placeholder="https://example.com | Example Title&#10;https://another.com | Another Title"
          bind:value={importText}
        ></textarea>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" onclick={onCancel}>Cancel</button>
        <button
          class="btn btn-primary"
          onclick={onImport}
          disabled={loading || !importText.trim()}
        >
          {#if loading}
            <span class="loading loading-spinner loading-sm"></span>
          {/if}
          Import
        </button>
      </div>
    </div>
    <div
      class="modal-backdrop"
      onclick={onCancel}
      role="button"
      tabindex="-1"
      aria-label="Close dialog"
      onkeydown={(e) => e.key === 'Escape' && onCancel()}
    ></div>
  </div>
{/if}

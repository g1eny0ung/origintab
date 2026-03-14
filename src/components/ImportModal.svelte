<script lang="ts">
  import { Upload } from '@lucide/svelte'
  import type { UserGroup } from '~/utils/types'
  import Fieldset from './ui/Fieldset.svelte'

  interface Props {
    show: boolean
    userGroups: UserGroup[]
    importText: string
    targetGroupId: string
    onImport: () => void
    onCancel: () => void
  }

  let {
    show,
    userGroups,
    importText = $bindable(),
    targetGroupId = $bindable(),
    onImport,
    onCancel,
  }: Props = $props()
</script>

{#if show}
  <div class="modal modal-open">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg flex items-center gap-2">
        <Upload size={18} aria-hidden="true" />
        {browser.i18n.getMessage('importTabs')}
      </h3>

      <div class="my-4 space-y-3">
        <Fieldset legend={browser.i18n.getMessage('targetGroup')}>
          <select
            id="import-target-group"
            class="select"
            bind:value={targetGroupId}
          >
            {#each userGroups as group}
              <option value={group.id}>{group.name}</option>
            {/each}
          </select>
        </Fieldset>

        <textarea
          class="textarea w-full h-64 font-mono text-sm"
          placeholder={browser.i18n.getMessage('importPlaceholder')}
          bind:value={importText}
        ></textarea>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" onclick={onCancel}>{browser.i18n.getMessage('cancel')}</button>
        <button
          class="btn btn-primary"
          onclick={onImport}
          disabled={!importText.trim()}
        >
          {browser.i18n.getMessage('import')}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </div>
{/if}

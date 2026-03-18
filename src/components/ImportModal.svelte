<script lang="ts">
  import { Upload } from '@lucide/svelte'
  import type { UserGroup } from '~/utils/types'

  import Dialog from './ui/Dialog.svelte'
  import Fieldset from './ui/Fieldset.svelte'

  interface Props {
    id: string
    userGroups: UserGroup[]
    importText: string
    targetGroupId: string
    onImport: () => void
    onCancel: () => void
  }

  let {
    id,
    userGroups,
    importText = $bindable(),
    targetGroupId = $bindable(),
    onImport,
    onCancel,
  }: Props = $props()
</script>

<Dialog
  {id}
  disableConfirm={!importText.trim()}
  onConfirm={onImport}
  onClose={onCancel}
>
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
</Dialog>

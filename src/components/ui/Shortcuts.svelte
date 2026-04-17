<script lang="ts">
  interface Props {
    commands: Browser.commands.Command[]
  }

  let { commands }: Props = $props()
</script>

<div class="dropdown dropdown-hover dropdown-bottom dropdown-center">
  <button class="btn btn-ghost btn-sm">
    {browser.i18n.getMessage('shortcuts')}
  </button>
  <div
    tabindex="-1"
    class="dropdown-content w-80 p-4 card bg-base-100 shadow-sm border border-base-200 z-10"
  >
    <div class="space-y-4">
      {#each commands as command}
        <div class="flex justify-between items-center">
          <span class="text-sm">
            {command.description}
          </span>
          <kbd class="kbd kbd-sm">
            {command.shortcut
              ?.replace('⌃', 'Ctrl+')
              .replace('⇧', 'Shift+')
              .replace('⌥', 'Alt+')
              .replace('Mac', '') || browser.i18n.getMessage('unset')}
          </kbd>
        </div>
      {/each}
    </div>
    {#if import.meta.env.BROWSER === 'firefox'}
      <p class="mt-4 text-sm text-base-content/60">
        {browser.i18n.getMessage('setShortcutsFirefox')}
      </p>
    {:else}
      <button
        class="btn btn-sm btn-block mt-4"
        onclick={() => {
          browser.tabs.create({
            url: 'chrome://extensions/shortcuts',
          })
        }}
      >
        {browser.i18n.getMessage('setShortcuts')}
      </button>
    {/if}
  </div>
</div>

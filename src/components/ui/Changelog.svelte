<script lang="ts">
  import { X } from '@lucide/svelte'
  import { onMount } from 'svelte'
  import { CHANGELOG_VERSION, changelogVersion } from '~/store/changelog'
  import { showToast } from '~/utils/toast.svelte'

  const [feedbackBefore, feedbackAfter] = browser.i18n
    .getMessage('feedbackDescription')
    .split('_a_')

  let visible = $state(false)

  onMount(async () => {
    try {
      const version = await changelogVersion.getValue()
      visible = version < CHANGELOG_VERSION
    } catch (error) {
      console.error(error)
    }
  })

  async function dismiss() {
    try {
      await changelogVersion.setValue(CHANGELOG_VERSION)
      visible = false
    } catch {
      showToast(browser.i18n.getMessage('failedToDismissChangelog'), 'error')
    }
  }
</script>

{#if visible}
  <div
    class="group dropdown dropdown-hover dropdown-bottom dropdown-end sm:dropdown-center"
  >
    <button
      class="btn btn-ghost btn-sm gap-1.5"
      aria-controls="changelog-content"
      title={browser.i18n.getMessage('dismissChangelog')}
      onclick={dismiss}
    >
      <span class="status status-success status-sm" aria-hidden="true"></span>
      {browser.i18n.getMessage('changelog')}
      <X
        size={14}
        class="-ms-1.5 h-3.5 w-0 shrink-0 opacity-0 transition-all duration-300 ease-in-out group-hover:ms-0 group-hover:w-3.5 group-hover:opacity-100 group-focus-within:ms-0 group-focus-within:w-3.5 group-focus-within:opacity-100"
        aria-hidden="true"
      />
    </button>
    <div
      id="changelog-content"
      tabindex="-1"
      class="dropdown-content w-90 max-w-[calc(100vw-4.5rem)] p-4 card bg-base-100 shadow-sm border border-base-200 z-10"
    >
      <p class="mb-3 text-sm text-base-content/60">
        {browser.i18n.getMessage('recentChanges')}
      </p>
      <ul class="list-disc pl-4 space-y-3 text-sm">
        {#each browser.i18n.getMessage('changelogContent').split('\n') as entry}
          <li>{entry}</li>
        {/each}
      </ul>
      <p class="mt-4 text-sm text-base-content/60">
        {feedbackBefore}
        <a
          href="https://j9ir8awapn.feishu.cn/share/base/form/shrcnNojJKGEEBowpvoFzuQFedb"
          class="link link-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          {browser.i18n.getMessage('feedbackForm')}
        </a>
        {feedbackAfter}
      </p>
    </div>
  </div>
{/if}

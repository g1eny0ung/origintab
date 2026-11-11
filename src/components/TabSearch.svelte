<script lang="ts">
  import { ExternalLink, Search, Trash2, X } from '@lucide/svelte'
  import SvelteFuse, { type ResultType } from 'svelte-fuse'
  import { removeTabFromGroup, restoreAndDeleteTab, restoreTab } from '~/store'
  import type { Settings } from '~/store/settings'
  import { openConfirm } from '~/utils/confirm.svelte'
  import { showToast } from '~/utils/toast.svelte'
  import {
    RestoreAction,
    type SelectedTabRef,
    type TabGroup,
    type TabItem,
  } from '~/utils/types'

  import TabFavicon from './TabFavicon.svelte'

  type SearchTab = SelectedTabRef & Pick<TabItem, 'title' | 'url' | 'favicon'>

  let { tabGroups, settings }: { tabGroups: TabGroup[]; settings: Settings } =
    $props()
  let input: HTMLInputElement
  let query = $state('')
  let searchQuery = $derived(query.trim())
  let dismissed = $state(false)
  let results = $state<ResultType<SearchTab>>([])
  let actionPending = false

  let tabs = $derived(
    tabGroups.flatMap(({ id: tabGroupId, tabs }) =>
      tabs.map(({ id: tabId, title, url, favicon }): SearchTab => ({
        tabGroupId,
        tabId,
        title,
        url,
        favicon,
      })),
    ),
  )
  const searchOptions = {
    keys: ['title', 'url'],
    ignoreLocation: true,
  }

  async function runAction(
    operation: () => Promise<void>,
    successMessage: string,
    errorMessage: string,
  ) {
    if (actionPending) {
      return
    }

    actionPending = true
    try {
      await operation()
      showToast(successMessage)
    } catch {
      showToast(errorMessage, 'error')
    } finally {
      actionPending = false
    }
  }

  function restore({ tabGroupId, tabId }: SelectedTabRef, preserve: boolean) {
    const operation = preserve ? restoreTab : restoreAndDeleteTab
    const active = settings.restoreAction === RestoreAction.OpenAndJump
    return runAction(
      () => operation(tabGroupId, tabId, { active }),
      browser.i18n.getMessage('tabRestored'),
      browser.i18n.getMessage('restoreFailed'),
    )
  }

  function deleteTab({ tabGroupId, tabId }: SelectedTabRef) {
    const onConfirm = () =>
      runAction(
        () => removeTabFromGroup(tabGroupId, tabId),
        browser.i18n.getMessage('tabDeleted'),
        browser.i18n.getMessage('deleteFailed'),
      )

    if (settings.confirmBeforeDelete) {
      openConfirm({
        title: browser.i18n.getMessage('deleteTabTitle'),
        message: browser.i18n.getMessage('deleteTabConfirm'),
        onConfirm,
      })
    } else {
      return onConfirm()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (
      event.key === 'Escape' &&
      !event.isComposing &&
      searchQuery &&
      !dismissed
    ) {
      event.preventDefault()
      input.focus()
      dismissed = true
    }
  }
</script>

<SvelteFuse
  list={tabs}
  options={searchOptions}
  query={searchQuery}
  bind:result={results}
/>

<div
  role="search"
  class="dropdown dropdown-end dropdown-bottom z-30 ml-auto w-56 min-w-0"
>
  <input
    bind:this={input}
    bind:value={query}
    type="search"
    class="input input-sm w-full pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
    autocomplete="off"
    aria-label={browser.i18n.getMessage('searchSavedTabs')}
    placeholder={browser.i18n.getMessage('searchSavedTabs')}
    onfocus={() => (dismissed = false)}
    onclick={() => (dismissed = false)}
    oninput={() => (dismissed = false)}
    onkeydown={handleKeydown}
  />
  <Search
    size={16}
    aria-hidden="true"
    class="pointer-events-none absolute top-2 left-2.5 text-base-content/60"
  />
  {#if query}
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-square absolute top-1 right-1"
      aria-label={browser.i18n.getMessage('clear')}
      title={browser.i18n.getMessage('clear')}
      onclick={() => {
        query = ''
        input.focus()
      }}
      onkeydown={handleKeydown}
    >
      <X size={14} aria-hidden="true" class="text-black" />
    </button>
  {/if}

  {#if searchQuery && !dismissed}
    <div
      class="dropdown-content mt-2 max-h-[min(24rem,60vh)] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-box border border-base-200 bg-base-100 p-1 shadow-lg"
    >
      {#if results.length > 0}
        <ul class="space-y-1">
          {#each results as { item } (JSON.stringify( [item.tabGroupId, item.tabId] ))}
            {@const title = item.title || browser.i18n.getMessage('untitled')}
            <li class="flex min-w-0 items-center gap-1">
              <button
                type="button"
                class="btn btn-ghost btn-sm min-w-0 flex-1 justify-start px-2"
                {title}
                onmousedown={(event) => event.preventDefault()}
                onkeydown={handleKeydown}
                onclick={() =>
                  restore(item, settings.preserveTabOnSearchRestore)}
              >
                <TabFavicon tab={item} />
                <span class="truncate">{title}</span>
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square shrink-0"
                title={browser.i18n.getMessage('restoreAndPreserve')}
                aria-label={browser.i18n.getMessage('restoreAndPreserve')}
                onmousedown={(event) => event.preventDefault()}
                onkeydown={handleKeydown}
                onclick={() => restore(item, true)}
              >
                <ExternalLink size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square shrink-0 hover:btn-error hover:text-error-content"
                title={browser.i18n.getMessage('delete')}
                aria-label={browser.i18n.getMessage('delete')}
                onmousedown={(event) => event.preventDefault()}
                onkeydown={handleKeydown}
                onclick={() => deleteTab(item)}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="px-2 py-2 text-sm text-base-content/60" role="status">
          {browser.i18n.getMessage('noTabSearchResults')}
        </p>
      {/if}
    </div>
  {/if}
</div>

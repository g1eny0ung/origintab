<script lang="ts">
  import { onMount } from 'svelte'
  import { Plus, Archive, Folder, ChevronDown, Check } from '@lucide/svelte'
  import { getUserGroups, DEFAULT_GROUP_ID } from '~/store'
  import type { UserGroup } from '~/utils/types'

  let userGroups: UserGroup[] = $state([])
  let selectedGroupId: string = $state(DEFAULT_GROUP_ID)
  let showGroupDropdown = $state(false)
  let loading = $state(true)

  // Load user groups
  async function loadGroups() {
    try {
      userGroups = await getUserGroups()
    } catch (error) {
      console.error('Failed to load groups:', error)
    } finally {
      loading = false
    }
  }

  // Save all tabs
  async function collectTabs() {
    await browser.runtime.sendMessage({
      action: 'collectTabs',
      userGroupId: selectedGroupId,
    })
    window.close()
  }

  // Open manager page
  async function openManager() {
    const url = browser.runtime.getURL('/origintab.html')
    const tabs = await browser.tabs.query({})
    const existingTab = tabs.find((tab) => tab.url?.startsWith(url))

    if (existingTab?.id) {
      await browser.tabs.update(existingTab.id, { active: true })
    } else {
      await browser.tabs.create({ url })
    }
    window.close()
  }

  // Get selected group name
  function getSelectedGroupName(): string {
    const group = userGroups.find((g) => g.id === selectedGroupId)
    return group?.name || 'Default'
  }

  // Close dropdown when clicking outside
  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (!target.closest('.group-dropdown')) {
      showGroupDropdown = false
    }
  }

  onMount(() => {
    loadGroups()
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  })
</script>

<div class="p-4 w-[300px]">
  <!-- Action buttons -->
  <div class="space-y-2">
    <!-- Group selector -->
    <div class="group-dropdown relative">
      <button
        class="btn btn-ghost btn-sm btn-block justify-between"
        onclick={() => (showGroupDropdown = !showGroupDropdown)}
        disabled={loading}
      >
        <span class="flex items-center gap-2">
          <Folder size={16} />
          {#if loading}
            <span class="loading loading-spinner loading-xs"></span>
          {:else}
            {browser.i18n.getMessage('saveTo')} {getSelectedGroupName()}
          {/if}
        </span>
        <ChevronDown
          size={16}
          class="transition-transform {showGroupDropdown ? 'rotate-180' : ''}"
        />
      </button>

      <!-- Dropdown menu -->
      {#if showGroupDropdown && !loading}
        <div
          class="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {#each userGroups as group (group.id)}
            <button
              class="btn btn-ghost btn-sm btn-block justify-start rounded-none border-b border-base-200 last:border-b-0 {selectedGroupId ===
              group.id
                ? 'text-primary'
                : ''}"
              onclick={() => {
                selectedGroupId = group.id
                showGroupDropdown = false
              }}
            >
              <span class="flex-1 text-left">{group.name}</span>
              {#if selectedGroupId === group.id}
                <Check size={14} />
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Save tabs button -->
    <button
      class="btn btn-primary btn-block justify-start"
      onclick={collectTabs}
      disabled={loading}
    >
      <Plus size={18} aria-hidden="true" />
      {browser.i18n.getMessage('saveAllTabs')}
    </button>

    <!-- Open manager button -->
    <button class="btn btn-ghost btn-block justify-start" onclick={openManager}>
      <Archive size={18} aria-hidden="true" />
      {browser.i18n.getMessage('openTabManager')}
    </button>
  </div>
</div>

<script lang="ts">
  import {
    AppWindow,
    ArrowUpDown,
    Bookmark,
    ListPlus,
    SettingsIcon,
  } from '@lucide/svelte'
  import { onMount } from 'svelte'
  import { getUserGroups } from '~/store'
  import type { UserGroup } from '~/utils/types'

  let userGroups: UserGroup[] = $state([])
  let switchSaveTo = $state<'all' | 'current'>('all')
  let selectedUserGroupId = $state('')

  async function loadGroups() {
    try {
      userGroups = await getUserGroups()
      selectedUserGroupId = userGroups[0].id
    } catch (error) {
      console.error('Failed to load groups:', error)
    }
  }

  async function collectCurrentTab(userGroupId?: string) {
    await browser.runtime.sendMessage({
      action: 'collectCurrentTab',
      userGroupId,
    })
  }

  async function collectTabs(userGroupId?: string) {
    await browser.runtime.sendMessage({
      action: 'collectTabs',
      userGroupId,
    })
  }

  async function openManager() {
    await browser.runtime.sendMessage({ action: 'openOriginTab' })
  }

  onMount(() => {
    loadGroups()
  })
</script>

<div class="w-[300px] divide-y divide-base-200">
  <div class="flex justify-between items-center p-2">
    <button class="btn btn-ghost btn-sm" onclick={openManager}>
      {browser.i18n.getMessage('openOriginTab')}
    </button>
    <button
      class="btn btn-ghost btn-sm btn-square"
      onclick={() => {
        browser.runtime.openOptionsPage()
      }}
      title={browser.i18n.getMessage('settings')}
    >
      <SettingsIcon size={16} />
    </button>
  </div>
  <ul class="menu w-full bg-base-100">
    <li>
      <button onclick={() => collectTabs()}>
        <AppWindow size={16} />
        {browser.i18n.getMessage('saveAllTabs')}
      </button>
    </li>
    <li>
      <button onclick={() => collectCurrentTab()}>
        <Bookmark size={16} />
        {browser.i18n.getMessage('saveCurrentTab')}
      </button>
    </li>
  </ul>
  <ul class="menu w-full bg-base-100">
    <li>
      <button
        onclick={() => {
          switchSaveTo = switchSaveTo === 'all' ? 'current' : 'all'
        }}
      >
        <ListPlus size={16} />
        <span class="inline-flex items-center gap-1">
          {browser.i18n.getMessage('save')}
          <span
            class="badge badge-sm tooltip"
            data-tip={browser.i18n.getMessage('saveToTip')}
          >
            <ArrowUpDown size={12} />
            {browser.i18n.getMessage(
              switchSaveTo === 'all' ? 'allTabs' : 'currentTab',
            )}
          </span>
          {browser.i18n.getMessage('to')}
        </span>
      </button>
      <ul>
        {#each userGroups as group (group.id)}
          <li>
            <label for={group.id}>
              <input
                type="radio"
                id={group.id}
                class="radio radio-xs"
                class:radio-primary={selectedUserGroupId === group.id}
                value={group.id}
                checked={selectedUserGroupId === group.id}
                onchange={() => (selectedUserGroupId = group.id)}
              />
              {group.name}
            </label>
          </li>
        {/each}
      </ul>
    </li>

    <button
      class="btn btn-sm btn-block mt-2 hover:btn-primary"
      onclick={() => {
        if (switchSaveTo === 'all') {
          collectTabs(selectedUserGroupId)
        } else {
          collectCurrentTab(selectedUserGroupId)
        }
      }}
    >
      {browser.i18n.getMessage('save')}
    </button>
  </ul>
</div>

<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { getLocalSettings, localSettings } from '~/store'
  import type { Settings } from '~/store/settings'
  import type { TabGroup, UserGroup } from '~/utils/types'

  import UserGroupItem from './UserGroupItem.svelte'

  interface Props {
    userGroups: UserGroup[]
    tabGroups: TabGroup[]
    settings: Settings
    onToast: (message: string, type?: ToastType) => void
  }

  let { userGroups, tabGroups, settings, onToast }: Props = $props()

  let defaultUserGroupId = $state<string | undefined>(undefined)
  let unwatchLocalSettings: (() => void) | null = null

  onMount(async () => {
    const initialSettings = await getLocalSettings()
    defaultUserGroupId = initialSettings.defaultUserGroupId

    unwatchLocalSettings = localSettings.watch((newSettings) => {
      defaultUserGroupId = newSettings?.defaultUserGroupId
    })
  })

  onDestroy(() => {
    if (unwatchLocalSettings) {
      unwatchLocalSettings()
    }
  })

  function getTabGroups(userGroupId: string) {
    return tabGroups.filter((tg) => tg.userGroupId === userGroupId)
  }
</script>

<div class="space-y-4">
  {#each userGroups as userGroup (userGroup.id)}
    <UserGroupItem
      {userGroup}
      tabGroups={getTabGroups(userGroup.id)}
      isDefaultUserGroup={defaultUserGroupId === userGroup.id}
      {settings}
      {onToast}
    />
  {/each}
</div>

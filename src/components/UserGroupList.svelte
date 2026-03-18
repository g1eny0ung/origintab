<script lang="ts">
  import type { Settings } from '~/store/settings'
  import type { TabGroup, UserGroup } from '~/utils/types'

  import UserGroupItem from './UserGroupItem.svelte'

  interface Props {
    userGroups: UserGroup[]
    tabGroups: TabGroup[]
    settings: Settings
    onToast: (message: string, type?: 'success' | 'error') => void
  }

  let { userGroups, tabGroups, settings, onToast }: Props = $props()

  function getTabGroups(userGroupId: string) {
    return tabGroups.filter((tg) => tg.userGroupId === userGroupId)
  }
</script>

<div class="space-y-4">
  {#each userGroups as userGroup (userGroup.id)}
    <UserGroupItem
      {userGroup}
      tabGroups={getTabGroups(userGroup.id)}
      {settings}
      {onToast}
    />
  {/each}
</div>

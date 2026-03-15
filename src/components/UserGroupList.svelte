<script lang="ts">
  import type { UserGroup, TabGroup } from '~/utils/types'
  import type { Settings } from '~/store/settings'
  import UserGroupItem from './UserGroupItem.svelte'

  interface Props {
    userGroups: UserGroup[]
    tabGroups: TabGroup[]
    settings: Settings
    onReload: () => void
    onToast: (message: string, type?: 'success' | 'error') => void
  }

  let { userGroups, tabGroups, settings, onReload, onToast }: Props = $props()

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
      {onReload}
      {onToast}
    />
  {/each}
</div>

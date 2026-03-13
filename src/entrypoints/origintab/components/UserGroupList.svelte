<script lang="ts">
  import type { UserGroup, TabGroup } from '~/utils/types'
  import UserGroupItem from './UserGroupItem.svelte'

  interface Props {
    userGroups: UserGroup[]
    tabGroups: TabGroup[]
    expandedGroups: Set<string>
    onReload: () => void
    onToast: (message: string, type?: 'success' | 'error') => void
    onToggleGroup: (groupId: string) => void
  }

  let { userGroups, tabGroups, expandedGroups, onReload, onToast, onToggleGroup }: Props = $props()

  function getTabGroups(userGroupId: string) {
    return tabGroups.filter(tg => tg.userGroupId === userGroupId)
  }
</script>

<div class="space-y-4">
  {#each userGroups as userGroup (userGroup.id)}
    <UserGroupItem
      {userGroup}
      tabGroups={getTabGroups(userGroup.id)}
      isExpanded={expandedGroups.has(userGroup.id)}
      onToggle={() => onToggleGroup(userGroup.id)}
      {onReload}
      {onToast}
    />
  {/each}
</div>

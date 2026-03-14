import { tabGroups, DEFAULT_GROUP_ID } from './base';
import type { TabItem, TabGroup } from '../utils/types';

export async function getTabGroups() {
  return tabGroups.getValue();
}

export async function createTabGroup(
  tabs: TabItem[],
  userGroupId: string = DEFAULT_GROUP_ID,
) {
  if (tabs.length === 0) {
    throw new Error('No tabs to save');
  }

  const data = await getTabGroups();

  const newGroup: TabGroup = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    tabs: tabs.map((tab) => ({ ...tab, id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}` })),
    createdAt: Date.now(),
    userGroupId,
  };

  data.unshift(newGroup);

  await tabGroups.setValue(data);

  return newGroup;
}

export async function deleteTabGroup(groupId: string) {
  let data = await getTabGroups();

  data = data.filter((g) => g.id !== groupId);

  await tabGroups.setValue(data);
}

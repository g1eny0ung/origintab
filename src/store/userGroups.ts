import { userGroups, tabGroups, DEFAULT_GROUP_ID } from './base';
import type { UserGroup } from '../utils/types';

export async function getUserGroups() {
  return userGroups.getValue();
}

export async function createUserGroup(name: string) {
  const data = await userGroups.getValue();

  const newGroup: UserGroup = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    name: name.trim(),
    createdAt: Date.now(),
  };

  data.unshift(newGroup);

  await userGroups.setValue(data);

  return newGroup;
}

export async function updateUserGroup(groupId: string, name: string) {
  const data = await userGroups.getValue();
  const group = data.find((g) => g.id === groupId);

  if (!group) {
    throw new Error('Group not found');
  }

  group.name = name.trim();

  await userGroups.setValue(data);
}

export async function deleteUserGroup(groupId: string) {
  if (groupId === DEFAULT_GROUP_ID) {
    throw new Error('Cannot delete default group');
  }

  let _userGroups = await userGroups.getValue();
  const _tabGroups = await tabGroups.getValue();

  _userGroups = _userGroups.filter((g) => g.id !== groupId);
  _tabGroups.forEach((tg) => {
    if (tg.userGroupId === groupId) {
      tg.userGroupId = DEFAULT_GROUP_ID;
    }
  });

  await userGroups.setValue(_userGroups);
  await tabGroups.setValue(_tabGroups);
}

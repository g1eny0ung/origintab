import { tabGroups } from './base';

export async function removeTabFromGroup(groupId: string, tabId: string) {
  let data = await tabGroups.getValue();
  const groupIndex = data.findIndex((g) => g.id === groupId);

  if (groupIndex === -1) {
    return;
  }

  const group = data[groupIndex];
  group.tabs = group.tabs.filter((t) => t.id !== tabId);

  if (group.tabs.length === 0) {
    data.splice(groupIndex, 1);
  }

  await tabGroups.setValue(data);
}

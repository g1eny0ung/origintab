import { tabGroups } from './base';

export async function restoreGroup(groupId: string) {
  const data = await tabGroups.getValue();
  const group = data.find((g) => g.id === groupId);

  if (!group || group.tabs.length === 0) {
    throw new Error('Group not found or empty');
  }

  await browser.windows.create({ url: group.tabs.map((t) => t.url) });
}

export async function restoreTab(groupId: string, tabId: string) {
  const data = await tabGroups.getValue();

  const group = data.find((g) => g.id === groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  const tab = group.tabs.find((t) => t.id === tabId);
  if (!tab) {
    throw new Error('Tab not found');
  }

  await browser.tabs.create({ url: tab.url, active: false });
}

export async function restoreAndDeleteGroup(groupId: string) {
  await restoreGroup(groupId);
  const data = await tabGroups.getValue();
  const updatedData = data.filter((g) => g.id !== groupId);
  await tabGroups.setValue(updatedData);
}

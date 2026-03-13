import { storage } from '@wxt-dev/storage';
import type { TabItem, TabGroup, UserGroup, StorageData } from './types';

const STORAGE_KEY = 'local:origintab_data';
const DEFAULT_GROUP_ID = 'default';

const defaultData: StorageData = {
  userGroups: [{ id: DEFAULT_GROUP_ID, name: 'Default', createdAt: Date.now() }],
  tabGroups: []
};

// Core
export async function getAllData(): Promise<StorageData> {
  const data = await storage.getItem<StorageData>(STORAGE_KEY);
  return data ?? defaultData;
}

export async function saveData(data: StorageData): Promise<void> {
  await storage.setItem(STORAGE_KEY, data);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getDefaultGroupId(): string {
  return DEFAULT_GROUP_ID;
}

// User Groups
export async function getAllUserGroups(): Promise<UserGroup[]> {
  const data = await getAllData();
  return data.userGroups;
}

export async function createUserGroup(name: string): Promise<UserGroup> {
  const data = await getAllData();
  const newGroup: UserGroup = {
    id: generateId(),
    name: name.trim(),
    createdAt: Date.now(),
  };
  data.userGroups.push(newGroup);
  await saveData(data);
  return newGroup;
}

export async function updateUserGroup(groupId: string, name: string): Promise<void> {
  const data = await getAllData();
  const group = data.userGroups.find(g => g.id === groupId);
  if (!group) throw new Error('Group not found');
  group.name = name.trim();
  await saveData(data);
}

export async function deleteUserGroup(groupId: string): Promise<void> {
  if (groupId === DEFAULT_GROUP_ID) throw new Error('Cannot delete default group');
  const data = await getAllData();
  data.tabGroups.forEach(tg => { if (tg.userGroupId === groupId) tg.userGroupId = DEFAULT_GROUP_ID; });
  data.userGroups = data.userGroups.filter(g => g.id !== groupId);
  await saveData(data);
}

// Tab Groups
export async function getAllTabGroups(): Promise<TabGroup[]> {
  const data = await getAllData();
  return data.tabGroups;
}

export async function createTabGroup(tabs: TabItem[], userGroupId: string = DEFAULT_GROUP_ID): Promise<TabGroup> {
  if (tabs.length === 0) throw new Error('No tabs to save');
  const data = await getAllData();
  const newGroup: TabGroup = {
    id: generateId(),
    tabs: tabs.map(tab => ({ ...tab, id: generateId() })),
    createdAt: Date.now(),
    userGroupId,
  };
  data.tabGroups.unshift(newGroup);
  await saveData(data);
  return newGroup;
}

export async function deleteTabGroup(groupId: string): Promise<void> {
  const data = await getAllData();
  data.tabGroups = data.tabGroups.filter(g => g.id !== groupId);
  await saveData(data);
}

// Tabs
export async function removeTabFromGroup(groupId: string, tabId: string): Promise<void> {
  const data = await getAllData();
  const groupIndex = data.tabGroups.findIndex(g => g.id === groupId);
  if (groupIndex === -1) return;
  const group = data.tabGroups[groupIndex];
  group.tabs = group.tabs.filter(t => t.id !== tabId);
  if (group.tabs.length === 0) data.tabGroups.splice(groupIndex, 1);
  await saveData(data);
}

// Restore
export async function restoreGroup(groupId: string): Promise<void> {
  const data = await getAllData();
  const group = data.tabGroups.find(g => g.id === groupId);
  if (!group || group.tabs.length === 0) throw new Error('Group not found or empty');
  const validUrls = group.tabs.map(t => t.url).filter(url => url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://'));
  if (validUrls.length === 0) throw new Error('No valid URLs');
  await browser.windows.create({ url: validUrls });
}

export async function restoreTab(groupId: string, tabId: string): Promise<void> {
  const data = await getAllData();
  const group = data.tabGroups.find(g => g.id === groupId);
  if (!group) throw new Error('Group not found');
  const tab = group.tabs.find(t => t.id === tabId);
  if (!tab) throw new Error('Tab not found');
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) throw new Error('Invalid URL');
  await browser.tabs.create({ url: tab.url });
}

export async function restoreAndDeleteGroup(groupId: string): Promise<void> {
  await restoreGroup(groupId);
  await deleteTabGroup(groupId);
}

// Data Management
export async function clearAllData(): Promise<void> {
  await storage.removeItem(STORAGE_KEY);
}

export async function exportToText(): Promise<string> {
  const data = await getAllData();
  return data.tabGroups
    .flatMap(tg => tg.tabs.map(t => `${t.url} | ${t.title}`))
    .join('\n');
}

export async function importFromText(text: string, userGroupId: string = DEFAULT_GROUP_ID): Promise<{ imported: number; errors: string[] }> {
  const lines = text.split('\n').filter(l => l.trim());
  const tabs: TabItem[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const sep = line.indexOf('|');
    if (sep === -1) { errors.push(`Invalid: ${line.slice(0, 50)}...`); continue; }
    const url = line.slice(0, sep).trim();
    const title = line.slice(sep + 1).trim();
    if (!url || !title) { errors.push(`Missing field: ${line.slice(0, 50)}...`); continue; }
    try { new URL(url); } catch { errors.push(`Invalid URL: ${url.slice(0, 50)}...`); continue; }
    tabs.push({ id: generateId(), url, title, createdAt: Date.now() });
  }

  if (tabs.length > 0) {
    const data = await getAllData();
    data.tabGroups.unshift({ id: generateId(), tabs, createdAt: Date.now(), userGroupId });
    await saveData(data);
  }
  return { imported: tabs.length, errors };
}

// Legacy alias
export async function saveTabs(tabs: TabItem[], userGroupId?: string): Promise<TabGroup> {
  return createTabGroup(tabs, userGroupId);
}

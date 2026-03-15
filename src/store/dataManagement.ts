import { userGroups, tabGroups, defaultData, generateId } from './base';
import type { TabItem } from '../utils/types';

export async function clearAllData() {
  await userGroups.setValue(defaultData.userGroups);
  await tabGroups.setValue(defaultData.tabGroups);
}

export async function exportToText(): Promise<string> {
  const data = await tabGroups.getValue();
  return data
    .flatMap((tg) => tg.tabs.map((t) => `${t.url} | ${t.title}`))
    .join('\n');
}

export async function importFromText(
  text: string,
  userGroupId: string = 'default',
): Promise<{ imported: number; errors: string[] }> {
  const lines = text.split('\n').filter((l) => l.trim());
  const tabs: TabItem[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    const sep = line.indexOf('|');
    if (sep === -1) {
      errors.push(`Invalid: ${line.slice(0, 50)}...`);
      continue;
    }

    const url = line.slice(0, sep).trim();
    const title = line.slice(sep + 1).trim();
    if (!url || !title) {
      errors.push(`Missing field: ${line.slice(0, 50)}...`);
      continue;
    }

    try {
      new URL(url);
    } catch {
      errors.push(`Invalid URL: ${url.slice(0, 50)}...`);
      continue;
    }

    tabs.push({ id: generateId(), url, title, createdAt: Date.now() });
  }

  if (tabs.length > 0) {
    const data = await tabGroups.getValue();
    data.unshift({
      id: generateId(),
      tabs,
      createdAt: Date.now(),
      userGroupId,
    });

    await tabGroups.setValue(data);
  }

  return { imported: tabs.length, errors };
}

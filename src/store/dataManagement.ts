import { notifyContextMenusRefresh } from '@/utils/background/contextMenus'

import type { TabItem } from '../utils/types'
import { db, generateId, initDefaultGroup } from './base'

export async function clearAllData() {
  await db.transaction('rw', db.userGroups, db.tabGroups, async () => {
    await db.userGroups.clear()
    await db.tabGroups.clear()
    await initDefaultGroup()
  })
  await notifyContextMenusRefresh()
}

export async function exportToText(userGroupId?: string) {
  let groups = await db.tabGroups.orderBy('createdAt').reverse().toArray()

  if (userGroupId) {
    groups = groups.filter((tg) => tg.userGroupId === userGroupId)
  }

  return groups
    .flatMap((tg) => tg.tabs.map((t) => `${t.url} | ${t.title}`))
    .join('\n')
}

export async function importFromText(
  text: string,
  userGroupId: string = 'default',
) {
  const lines = text.split('\n').filter((l) => l.trim())
  const tabs: TabItem[] = []
  const errors: string[] = []

  for (const line of lines) {
    const sep = line.indexOf('|')
    if (sep === -1) {
      errors.push(`Invalid: ${line.slice(0, 50)}...`)
      continue
    }

    const url = line.slice(0, sep).trim()
    const title = line.slice(sep + 1).trim()
    if (!url || !title) {
      errors.push(`Missing field: ${line.slice(0, 50)}...`)
      continue
    }

    try {
      new URL(url)
    } catch {
      errors.push(`Invalid URL: ${url.slice(0, 50)}...`)
      continue
    }

    tabs.push({ id: generateId(), url, title, createdAt: Date.now() })
  }

  if (tabs.length > 0) {
    await db.tabGroups.add({
      id: generateId(),
      tabs,
      createdAt: Date.now(),
      userGroupId,
    })
  }

  return { imported: tabs.length, errors }
}

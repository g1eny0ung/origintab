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

export async function exportToText(
  userGroupId?: string,
  options: {
    originTabFormat?: boolean
  } = {},
) {
  let groups = await db.tabGroups.orderBy('createdAt').reverse().toArray()

  if (userGroupId) {
    groups = groups.filter((tg) => tg.userGroupId === userGroupId)
  }

  if (!options.originTabFormat) {
    return groups
      .flatMap((tg) => tg.tabs.map((t) => `${t.url} | ${t.title}`))
      .join('\n')
  }

  const userGroupMap = new Map(
    (await db.userGroups.toArray()).map((ug) => [ug.id, ug.name]),
  )

  return groups
    .map((tg) => {
      const userGroupName = userGroupMap.get(tg.userGroupId) ?? 'Default'
      const timeLine = new Date(tg.createdAt).toISOString()
      const tabLines = tg.tabs.map((t) => `${t.url} | ${t.title}`)
      return [userGroupName, timeLine, ...tabLines].join('\n')
    })
    .join('\n\n')
}

const ISO_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/

export function isISOTimeString(line: string): boolean {
  if (!ISO_TIME_REGEX.test(line.trim())) {
    return false
  }

  return true
}

interface ParseResult {
  tabs: TabItem[]
  errors: string[]
}

function parseTabLine(line: string): { url: string; title: string } | null {
  const sep = line.indexOf('|')
  if (sep === -1) {
    return null
  }

  const url = line.slice(0, sep).trim()
  const title = line.slice(sep + 1).trim()
  if (!url || !title) {
    return null
  }

  try {
    new URL(url)
  } catch {
    return null
  }

  return { url, title }
}

function parseGeneralFormat(text: string): ParseResult {
  const errors: string[] = []
  const tabs: TabItem[] = []

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const parsed = parseTabLine(line)
    if (!parsed) {
      errors.push(`Invalid: ${line.slice(0, 50)}...`)
      continue
    }

    tabs.push({
      id: generateId(),
      url: parsed.url,
      title: parsed.title,
      createdAt: Date.now(),
    })
  }

  return { tabs, errors }
}

interface PendingGroup {
  userGroupName: string
  createdAt: number
  tabs: TabItem[]
}

function parseOriginTabFormat(text: string): {
  groups: PendingGroup[]
  errors: string[]
} {
  const errors: string[] = []
  const tabGroups: PendingGroup[] = []
  let currentGroup: PendingGroup | null = null
  let pendingUserGroupName = 'Default'

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    if (isISOTimeString(line)) {
      currentGroup = {
        userGroupName: pendingUserGroupName,
        createdAt: Date.parse(line),
        tabs: [],
      }
      tabGroups.push(currentGroup)
      continue
    }

    const parsed = parseTabLine(line)
    if (!parsed) {
      pendingUserGroupName = line
      continue
    }

    if (currentGroup) {
      currentGroup.tabs.push({
        id: generateId(),
        url: parsed.url,
        title: parsed.title,
        createdAt: Date.now(),
      })
    } else {
      errors.push(`Tab found before ISO time line: ${line.slice(0, 50)}...`)
    }
  }

  return { groups: tabGroups, errors }
}

export async function importFromText(
  text: string,
  options: {
    format: 'originTab' | 'general'
    userGroupId?: string
  },
) {
  if (options.format === 'general') {
    const { tabs, errors } = parseGeneralFormat(text)

    if (errors.length > 0) {
      return { imported: 0, errors }
    }

    if (tabs.length > 0) {
      await db.tabGroups.add({
        id: generateId(),
        tabs,
        createdAt: Date.now(),
        userGroupId: options.userGroupId ?? 'default',
      })
    }

    return { imported: tabs.length, errors }
  }

  const { groups, errors } = parseOriginTabFormat(text)
  let imported = 0

  if (errors.length > 0) {
    return { imported, errors }
  }

  if (groups.length > 0) {
    const existingUserGroups = await db.userGroups.toArray()
    const userGroupNameToId = new Map(
      existingUserGroups.map((ug) => [ug.name, ug.id]),
    )

    await db.transaction('rw', db.userGroups, db.tabGroups, async () => {
      for (const [i, group] of groups.entries()) {
        let targetUserGroupId = userGroupNameToId.get(group.userGroupName)

        // Create user group if not exists
        if (!targetUserGroupId) {
          targetUserGroupId = generateId()

          await db.userGroups.add({
            id: targetUserGroupId,
            name: group.userGroupName,
            // HACK: If the user group does not exist, it should be created in the order it was imported.
            createdAt: Date.now() - i * 100,
          })

          userGroupNameToId.set(group.userGroupName, targetUserGroupId)
        }

        await db.tabGroups.add({
          id: generateId(),
          tabs: group.tabs,
          createdAt: group.createdAt,
          userGroupId: targetUserGroupId,
        })

        imported += group.tabs.length
      }
    })
  }

  return { imported, errors }
}

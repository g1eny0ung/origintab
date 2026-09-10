import { notifyContextMenusRefresh } from '@/utils/background/contextMenus'

import type { BrowserTabGroup, TabItem } from '../utils/types'
import { db, generateId, initDefaultGroup } from './base'
import { normalizeBrowserTabGroupData } from './tabGroups'

const BROWSER_TAB_GROUP_PREFIX = '@origintab:browser-tab-group '
const TAB_BROWSER_GROUP_PREFIX = '@origintab:tab-browser-group '
const BROWSER_TAB_GROUP_COLORS = new Set<BrowserTabGroup['color']>([
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
])

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
      const knownBrowserGroupIds = new Set(
        (tg.browserTabGroups ?? []).map((group) => group.id),
      )
      const browserGroupLines = (tg.browserTabGroups ?? []).map(
        (group) => `${BROWSER_TAB_GROUP_PREFIX}${JSON.stringify(group)}`,
      )
      const tabLines = tg.tabs.flatMap((tab) => {
        const lines: string[] = []

        if (
          tab.browserTabGroupId &&
          knownBrowserGroupIds.has(tab.browserTabGroupId)
        ) {
          lines.push(
            `${TAB_BROWSER_GROUP_PREFIX}${JSON.stringify(tab.browserTabGroupId)}`,
          )
        }

        lines.push(`${tab.url} | ${tab.title}`)
        return lines
      })
      return [userGroupName, timeLine, ...browserGroupLines, ...tabLines].join(
        '\n',
      )
    })
    .join('\n\n')
}

const ISO_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/

export function isISOTimeString(line: string): boolean {
  const value = line.trim()
  if (!ISO_TIME_REGEX.test(value)) {
    return false
  }

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    return false
  }

  // Date.parse normalizes values such as February 29 in a non-leap year.
  // Comparing the canonical value prevents those invalid dates from entering
  // the createdAt index as a different instant.
  const canonicalValue = value.includes('.')
    ? value
    : value.replace('Z', '.000Z')
  return new Date(timestamp).toISOString() === canonicalValue
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
  browserTabGroups: BrowserTabGroup[]
}

function parseBrowserTabGroup(line: string) {
  try {
    const value: unknown = JSON.parse(
      line.slice(BROWSER_TAB_GROUP_PREFIX.length),
    )

    if (!value || typeof value !== 'object') {
      return null
    }

    const candidate = value as Record<string, unknown>
    if (
      typeof candidate.id !== 'string' ||
      candidate.id.length === 0 ||
      !BROWSER_TAB_GROUP_COLORS.has(
        candidate.color as BrowserTabGroup['color'],
      ) ||
      typeof candidate.collapsed !== 'boolean' ||
      (candidate.title !== undefined && typeof candidate.title !== 'string')
    ) {
      return null
    }

    return {
      id: candidate.id,
      ...(candidate.title === undefined ? {} : { title: candidate.title }),
      color: candidate.color as BrowserTabGroup['color'],
      collapsed: candidate.collapsed,
    }
  } catch {
    return null
  }
}

function parseTabBrowserGroupId(line: string) {
  try {
    const value: unknown = JSON.parse(
      line.slice(TAB_BROWSER_GROUP_PREFIX.length),
    )
    return typeof value === 'string' && value.length > 0 ? value : null
  } catch {
    return null
  }
}

function parseOriginTabFormat(text: string): {
  groups: PendingGroup[]
  errors: string[]
} {
  const errors: string[] = []
  const tabGroups: PendingGroup[] = []
  let currentGroup: PendingGroup | null = null
  let pendingUserGroupName = 'Default'
  let pendingBrowserTabGroupId: string | undefined
  const rejectPendingBrowserGroupReference = () => {
    if (!pendingBrowserTabGroupId) {
      return
    }

    errors.push('Browser tab group reference must be followed by a tab')
    pendingBrowserTabGroupId = undefined
  }

  const lines: { value: string; startsBlock: boolean }[] = []
  let startsBlock = true

  for (const rawLine of text.split('\n')) {
    const value = rawLine.trim()

    if (!value) {
      startsBlock = true
      continue
    }

    lines.push({ value, startsBlock })
    startsBlock = false
  }

  for (const [index, lineInfo] of lines.entries()) {
    const line = lineInfo.value
    const nextLine = lines[index + 1]?.value
    const nextLineIsISO = Boolean(nextLine && isISOTimeString(nextLine))
    const isBrowserGroupMetadata =
      line.startsWith(BROWSER_TAB_GROUP_PREFIX) ||
      line.startsWith(TAB_BROWSER_GROUP_PREFIX)
    const isUnmarkedLegacyGroupName =
      !isBrowserGroupMetadata &&
      !isISOTimeString(line) &&
      parseTabLine(line) === null

    // Legacy exports stored the group name as an unmarked line. Looking ahead
    // identifies ordinary names without requiring blank separators. Exported
    // blocks use a blank separator, which also preserves names that resemble
    // timestamps, tabs, or browser-group metadata.
    if (nextLineIsISO && (lineInfo.startsBlock || isUnmarkedLegacyGroupName)) {
      rejectPendingBrowserGroupReference()
      pendingUserGroupName = line
      continue
    }

    if (isISOTimeString(line)) {
      rejectPendingBrowserGroupReference()
      currentGroup = {
        userGroupName: pendingUserGroupName,
        createdAt: Date.parse(line),
        tabs: [],
        browserTabGroups: [],
      }
      tabGroups.push(currentGroup)
      continue
    }

    if (line.startsWith(BROWSER_TAB_GROUP_PREFIX)) {
      rejectPendingBrowserGroupReference()
      const browserTabGroup = parseBrowserTabGroup(line)

      if (!currentGroup || !browserTabGroup) {
        errors.push(
          `Invalid browser tab group metadata: ${line.slice(0, 80)}...`,
        )
      } else if (
        currentGroup.browserTabGroups.some(
          (existingGroup) => existingGroup.id === browserTabGroup.id,
        )
      ) {
        errors.push(
          `Duplicate browser tab group metadata: ${browserTabGroup.id}`,
        )
      } else {
        currentGroup.browserTabGroups.push(browserTabGroup)
      }
      continue
    }

    if (line.startsWith(TAB_BROWSER_GROUP_PREFIX)) {
      rejectPendingBrowserGroupReference()
      const browserTabGroupId = parseTabBrowserGroupId(line)

      if (!currentGroup || !browserTabGroupId) {
        errors.push(
          `Invalid browser tab group reference: ${line.slice(0, 80)}...`,
        )
      } else {
        pendingBrowserTabGroupId = browserTabGroupId
      }
      continue
    }

    const parsed = parseTabLine(line)
    if (!parsed) {
      rejectPendingBrowserGroupReference()
      pendingUserGroupName = line
      continue
    }

    if (currentGroup) {
      currentGroup.tabs.push({
        id: generateId(),
        url: parsed.url,
        title: parsed.title,
        createdAt: Date.now(),
        browserTabGroupId: pendingBrowserTabGroupId,
      })
      pendingBrowserTabGroupId = undefined
    } else {
      errors.push(`Tab found before ISO time line: ${line.slice(0, 50)}...`)
    }
  }

  rejectPendingBrowserGroupReference()

  for (const group of tabGroups) {
    if (group.tabs.length === 0) {
      errors.push('Collection must contain at least one tab')
    }

    const knownBrowserGroupIds = new Set(
      group.browserTabGroups.map((browserTabGroup) => browserTabGroup.id),
    )
    if (
      group.tabs.some(
        (tab) =>
          tab.browserTabGroupId &&
          !knownBrowserGroupIds.has(tab.browserTabGroupId),
      )
    ) {
      errors.push('Browser tab group reference has no matching metadata')
    }
  }

  return { groups: tabGroups, errors }
}

function assignFreshBrowserTabGroupIds(group: PendingGroup) {
  const importedIdByExportedId = new Map(
    group.browserTabGroups.map((browserTabGroup) => [
      browserTabGroup.id,
      generateId(),
    ]),
  )
  const getImportedId = (exportedId: string) => {
    const importedId = importedIdByExportedId.get(exportedId)

    if (!importedId) {
      throw new Error('Invalid browser tab group reference')
    }

    return importedId
  }

  return {
    tabs: group.tabs.map((tab) => ({
      ...tab,
      browserTabGroupId: tab.browserTabGroupId
        ? getImportedId(tab.browserTabGroupId)
        : undefined,
    })),
    browserTabGroups: group.browserTabGroups.map((browserTabGroup) => ({
      ...browserTabGroup,
      id: getImportedId(browserTabGroup.id),
    })),
  }
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
            // Keep newly created user groups in their first-seen import order.
            createdAt: Date.now() - i * 100,
          })

          userGroupNameToId.set(group.userGroupName, targetUserGroupId)
        }

        // Imported collections are independent copies. Fresh IDs prevent a
        // later bulk move from merging unrelated copies of the same backup.
        const importedBrowserGroupData = assignFreshBrowserTabGroupIds(group)
        const normalizedData = normalizeBrowserTabGroupData(
          importedBrowserGroupData.tabs,
          importedBrowserGroupData.browserTabGroups,
        )

        await db.tabGroups.add({
          id: generateId(),
          ...normalizedData,
          createdAt: group.createdAt,
          userGroupId: targetUserGroupId,
        })

        imported += group.tabs.length
      }
    })
  }

  return { imported, errors }
}

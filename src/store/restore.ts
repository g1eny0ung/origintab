import { tabGroups } from './base'
import { deleteTabGroup } from './tabGroups'
import { removeTabFromGroup } from './tabs'

interface RestoreOptions {
  active?: boolean
}

export async function restoreGroup(
  groupId: string,
  options: RestoreOptions = {},
) {
  const { active = false } = options
  const data = await tabGroups.getValue()
  const group = data.find((g) => g.id === groupId)

  if (!group || group.tabs.length === 0) {
    throw new Error('Group not found or empty')
  }

  await browser.windows.create({
    url: group.tabs.map((t) => t.url),
    focused: active,
  })
}

export async function restoreAndDeleteGroup(
  groupId: string,
  options: RestoreOptions = {},
) {
  await restoreGroup(groupId, options)
  await deleteTabGroup(groupId)
}

export async function restoreTab(
  groupId: string,
  tabId: string,
  options: RestoreOptions = {},
) {
  const { active = false } = options
  const data = await tabGroups.getValue()

  const group = data.find((g) => g.id === groupId)
  if (!group) {
    throw new Error('Group not found')
  }

  const tab = group.tabs.find((t) => t.id === tabId)
  if (!tab) {
    throw new Error('Tab not found')
  }

  await browser.tabs.create({ url: tab.url, active })
}

export async function restoreAndDeleteTab(
  groupId: string,
  tabId: string,
  options: RestoreOptions = {},
) {
  await restoreTab(groupId, tabId, options)
  await removeTabFromGroup(groupId, tabId)
}

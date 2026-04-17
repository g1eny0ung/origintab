import { Settings, getSettings, initDefaultGroup } from '~/store'
import {
  createContextMenus,
  handleContextMenuClick,
  refreshContextMenus,
} from '~/utils/background/contextMenus'
import {
  collectAllTabs,
  collectCurrentTab,
} from '~/utils/background/tabCollection'
import {
  createOriginTab,
  findOriginTab,
  initOriginTab,
  openOriginTabInSidePanel,
} from '~/utils/helpers'
import { ClickAction } from '~/utils/types'

interface BackgroundMessage {
  action: string
  userGroupId?: string
}

interface BackgroundResponse {
  ok: boolean
}

async function notifyOriginTabUpdate() {
  const originTabId = await findOriginTab()

  if (originTabId) {
    await browser.tabs.sendMessage(originTabId, { action: 'dataUpdated' })
  }
}

async function updateActionBehavior() {
  try {
    const clickAction = (await getSettings()).clickAction

    if (clickAction === 'showPopup') {
      await browser.action.setPopup({ popup: 'popup.html' })
    } else {
      await browser.action.setPopup({ popup: '' })
    }
  } catch (error) {
    console.error('Failed to update action behavior:', error)
  }
}

async function handleIconClick() {
  const originTab = await findOriginTab()
  if (!originTab) {
    await createOriginTab()
  }

  try {
    const clickAction = (await getSettings()).clickAction

    switch (clickAction) {
      case ClickAction.SaveCurrent:
        await collectCurrentTab()
        break
      case ClickAction.SaveAll:
      default:
        await collectAllTabs()
        break
    }
  } catch (error) {
    console.error('Failed to handle icon click:', error)
  }
}

async function initializeBackground() {
  try {
    await initDefaultGroup()
    await updateActionBehavior()
    await createContextMenus()
  } catch (error) {
    console.error('Failed to initialize background:', error)
  }
}

async function handleSettingsChange() {
  try {
    await updateActionBehavior()
    await notifyOriginTabUpdate()
  } catch (error) {
    console.error('Failed to handle settings change:', error)
  }
}

async function handleRuntimeMessage(
  message: BackgroundMessage,
): Promise<BackgroundResponse> {
  switch (message.action) {
    case 'collectTabs':
      await collectAllTabs(message.userGroupId)
      return { ok: true }
    case 'collectCurrentTab':
      await collectCurrentTab(message.userGroupId)
      return { ok: true }
    case 'refreshContextMenus':
      await refreshContextMenus()
      return { ok: true }
    default:
      return { ok: false }
  }
}

function handleCommand(command: string) {
  switch (command) {
    case 'open':
      returnOriginTab()
      break
    case 'openInSidePanel':
      openOriginTabInSidePanel()
      break
    case 'saveAllTabs':
      collectAllTabs()
      break
    case 'saveCurrentTab':
      collectCurrentTab()
      break
    default:
      break
  }
}

export default defineBackground(() => {
  initializeBackground()

  browser.action.onClicked.addListener(handleIconClick)
  browser.commands.onCommand.addListener(handleCommand)
  browser.contextMenus.onClicked.addListener(handleContextMenuClick)

  storage.watch<Settings>('sync:settings', handleSettingsChange)

  browser.runtime.onMessage.addListener(handleRuntimeMessage)

  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
      await initOriginTab()
    }
  })

  browser.runtime.onStartup.addListener(async () => {
    await initOriginTab()
  })
})

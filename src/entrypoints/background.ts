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
import { createOriginTab, findOriginTab, openOriginTab } from '~/utils/helpers'
import { ClickAction } from '~/utils/types'

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

export default defineBackground(() => {
  initDefaultGroup().then(() => {
    createContextMenus()
  })

  browser.contextMenus.onClicked.addListener(handleContextMenuClick)

  updateActionBehavior()

  storage.watch<Settings>('sync:settings', () => {
    updateActionBehavior()
    notifyOriginTabUpdate()
  })

  browser.action.onClicked.addListener(() => {
    handleIconClick()
  })

  browser.runtime.onMessage.addListener(
    async (message: { action: string; userGroupId?: string }) => {
      switch (message.action) {
        case 'collectTabs':
          await collectAllTabs(message.userGroupId)
          break
        case 'collectCurrentTab':
          await collectCurrentTab(message.userGroupId)
          break
        case 'openOriginTab':
          await openOriginTab()
          break
        case 'refreshContextMenus':
          await refreshContextMenus()
          break
        default:
          break
      }
    },
  )

  browser.runtime.onInstalled.addListener(async (details) => {
    await updateActionBehavior()

    if (details.reason === 'install') {
      await openOriginTab()
    }
  })

  browser.runtime.onStartup.addListener(() => {
    openOriginTab()
  })
})

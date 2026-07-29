import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { createTabGroup } from '../../src/store'
import {
  collectCurrentAndAdjacentTabs,
  collectCurrentTab,
} from '../../src/utils/background/tabCollection'
import { findOriginTab } from '../../src/utils/helpers'

vi.mock('../../src/store', () => ({
  createTabGroup: vi.fn(),
  getLastUserGroup: vi.fn(async () => ({ id: 'default' })),
  getUserGroup: vi.fn(),
}))

vi.mock('../../src/store/localSettings', () => ({
  getLocalSettings: vi.fn(async () => ({})),
}))

vi.mock('../../src/utils/helpers', () => ({
  findOriginTab: vi.fn(async () => 99),
}))

function createBrowserTab(
  overrides: Pick<Browser.tabs.Tab, 'id' | 'index' | 'title' | 'url'> &
    Partial<Browser.tabs.Tab>,
) {
  return {
    active: false,
    autoDiscardable: true,
    discarded: false,
    frozen: false,
    groupId: -1,
    highlighted: false,
    incognito: false,
    pinned: false,
    selected: false,
    windowId: 1,
    ...overrides,
  }
}

const windowTabs = [
  createBrowserTab({
    id: 1,
    index: 0,
    pinned: true,
    title: 'Pinned',
    url: 'https://pinned.example',
  }),
  createBrowserTab({
    id: 2,
    index: 1,
    title: 'Left',
    url: 'https://left.example',
  }),
  createBrowserTab({
    active: true,
    id: 3,
    index: 2,
    title: 'Current',
    url: 'https://current.example',
  }),
  createBrowserTab({
    id: 4,
    index: 3,
    title: 'Right',
    url: 'https://right.example',
  }),
  createBrowserTab({
    id: 5,
    index: 4,
    title: 'Blank',
    url: 'about:blank',
  }),
]

describe('tab collection ranges', () => {
  beforeEach(() => {
    fakeBrowser.reset()
    vi.clearAllMocks()
    vi.mocked(findOriginTab).mockResolvedValue(99)
    vi.spyOn(fakeBrowser.tabs, 'query').mockResolvedValue(windowTabs as never)
    vi.spyOn(fakeBrowser.tabs, 'remove').mockResolvedValue()
  })

  it('collects the active tab and valid tabs to its left', async () => {
    await collectCurrentAndAdjacentTabs('left')

    expect(createTabGroup).toHaveBeenCalledWith(
      [
        expect.objectContaining({ title: 'Left' }),
        expect.objectContaining({ title: 'Current' }),
      ],
      'default',
    )
    expect(fakeBrowser.tabs.remove).toHaveBeenCalledWith([2, 3])
  })

  it('collects the active tab and valid tabs to its right', async () => {
    await collectCurrentAndAdjacentTabs('right', 'work')

    expect(createTabGroup).toHaveBeenCalledWith(
      [
        expect.objectContaining({ title: 'Current' }),
        expect.objectContaining({ title: 'Right' }),
      ],
      'work',
    )
    expect(fakeBrowser.tabs.remove).toHaveBeenCalledWith([3, 4])
  })

  it('saves the group before closing collected tabs', async () => {
    await collectCurrentAndAdjacentTabs('right')

    const saveOrder = vi.mocked(createTabGroup).mock.invocationCallOrder[0]
    const closeOrder = vi.mocked(fakeBrowser.tabs.remove).mock
      .invocationCallOrder[0]

    expect(saveOrder!).toBeLessThan(closeOrder!)
  })

  it('does not collect the OriginTab page', async () => {
    vi.mocked(findOriginTab).mockResolvedValue(3)
    vi.mocked(fakeBrowser.tabs.query).mockResolvedValue([
      windowTabs.find((tab) => tab.id === 3)!,
    ] as never)

    await collectCurrentTab()

    expect(createTabGroup).not.toHaveBeenCalled()
    expect(fakeBrowser.tabs.remove).not.toHaveBeenCalled()
  })
})

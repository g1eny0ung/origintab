import { describe, expect, it } from 'vitest'
import {
  getBrowserTabGroupStatsById,
  getTabGroupListItems,
} from '~/utils/browserTabGroups'
import type { BrowserTabGroup, TabItem } from '~/utils/types'

function tab(id: string, browserTabGroupId?: string): TabItem {
  return {
    id,
    title: id,
    url: `https://${id}.example.com`,
    createdAt: 1,
    browserTabGroupId,
  }
}

describe('getBrowserTabGroupStatsById', () => {
  it('returns no stats for ungrouped tabs', () => {
    expect(getBrowserTabGroupStatsById([tab('one'), tab('two')]).size).toBe(0)
  })

  it('marks a single group member as both first and last', () => {
    expect(
      getBrowserTabGroupStatsById([tab('one'), tab('two', 'work')]).get('work'),
    ).toEqual({
      firstIndex: 1,
      lastIndex: 1,
      count: 1,
    })
  })

  it('calculates first index, last index, and count in one pass', () => {
    const statsById = getBrowserTabGroupStatsById([
      tab('one', 'work'),
      tab('four', 'work'),
      tab('two'),
      tab('three', 'personal'),
      tab('five', 'personal'),
    ])

    expect(statsById.get('work')).toEqual({
      firstIndex: 0,
      lastIndex: 1,
      count: 2,
    })
    expect(statsById.get('personal')).toEqual({
      firstIndex: 3,
      lastIndex: 4,
      count: 2,
    })
  })
})

describe('getTabGroupListItems', () => {
  it('renders the browser group header as its own item before the first tab', () => {
    const browserTabGroup: BrowserTabGroup = {
      id: 'work',
      title: 'Work',
      color: 'blue',
      collapsed: false,
    }
    const listItems = getTabGroupListItems(
      [tab('before'), tab('one', 'work'), tab('two', 'work'), tab('after')],
      [browserTabGroup],
    )

    expect(
      listItems.map((item) =>
        item.type === 'tab' ? item.tab.id : `header:${item.browserTabGroup.id}`,
      ),
    ).toEqual(['before', 'header:work', 'one', 'two', 'after'])
    expect(listItems[1]).toMatchObject({
      type: 'browserTabGroupHeader',
      firstTabIndex: 1,
    })
  })

  it('does not render a header without matching browser group metadata', () => {
    const listItems = getTabGroupListItems(
      [tab('one', 'missing'), tab('two')],
      undefined,
    )

    expect(listItems.map((item) => item.type)).toEqual(['tab', 'tab'])
  })
})

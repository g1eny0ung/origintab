import { describe, expect, it } from 'vitest'
import {
  clearDraggedTabState,
  getDraggedTabState,
  isDraggedTabDropHandledExternally,
  isDropInsideList,
  isInteractiveTabDragTarget,
  isTabMovePending,
  markDraggedTabDropHandledExternally,
  placeDraggedElementBeforeAnchor,
  resolveBrowserTabGroupDrop,
  restoreDraggedElement,
  runWithTabMovePending,
  setDraggedTabState,
} from '~/utils/tabDrag'

describe('browser tab group drop resolution', () => {
  it('places a tab outside and before the browser group over its header', () => {
    for (const willInsertAfter of [false, true]) {
      expect(
        resolveBrowserTabGroupDrop({
          browserTabGroupId: 'browser-group-1',
          isOverBrowserTabGroupHeader: true,
          isFirstTab: true,
          isLastTab: false,
          willInsertAfter,
        }),
      ).toEqual({ browserTabGroupId: null, forceInsertion: -1 })
    }
  })

  it('adds a tab to the browser group over its first tab row', () => {
    expect(
      resolveBrowserTabGroupDrop({
        browserTabGroupId: 'browser-group-1',
        isOverBrowserTabGroupHeader: false,
        isFirstTab: true,
        isLastTab: false,
        willInsertAfter: false,
      }),
    ).toEqual({ browserTabGroupId: 'browser-group-1' })
  })

  it('keeps all three drop zones for a one-tab browser group', () => {
    const target = {
      browserTabGroupId: 'browser-group-1',
      isOverBrowserTabGroupHeader: false,
      isFirstTab: true,
      isLastTab: true,
      willInsertAfter: true,
      tabRowTop: 40,
      tabRowBottom: 80,
    }

    expect(
      resolveBrowserTabGroupDrop({
        ...target,
        isOverBrowserTabGroupHeader: true,
        pointerY: 20,
      }),
    ).toEqual({
      browserTabGroupId: null,
      forceInsertion: -1,
    })
    expect(resolveBrowserTabGroupDrop({ ...target, pointerY: 50 })).toEqual({
      browserTabGroupId: 'browser-group-1',
    })
    expect(resolveBrowserTabGroupDrop({ ...target, pointerY: 70 })).toEqual({
      browserTabGroupId: null,
      forceInsertion: 1,
    })
  })

  it('places a tab outside and after the last browser group tab', () => {
    expect(
      resolveBrowserTabGroupDrop({
        browserTabGroupId: 'browser-group-1',
        isOverBrowserTabGroupHeader: false,
        isFirstTab: false,
        isLastTab: true,
        willInsertAfter: true,
      }),
    ).toEqual({ browserTabGroupId: null, forceInsertion: 1 })
  })
})

describe('drop completion', () => {
  it.each([
    ['drop', true, false, true],
    ['drop', false, true, false],
    ['pointerup', true, false, false],
    ['mouseup', false, true, true],
    ['touchend', false, true, true],
    ['dragend', true, true, false],
    ['pointercancel', true, true, false],
    ['unknown', true, true, false],
  ])(
    'resolves %s with targetInside=%s and pointerInside=%s',
    (eventType, targetInside, pointerInside, expected) => {
      expect(isDropInsideList({ eventType, targetInside, pointerInside })).toBe(
        expected,
      )
    },
  )
})

describe('interactive drag targets', () => {
  function makeTarget(tagName: string) {
    const target = {
      closest(selector: string) {
        return selector.split(',').some((part) => part.trim() === tagName)
          ? target
          : null
      },
    }
    return target as unknown as Element
  }

  it.each(['input', 'button', 'a'])('ignores %s controls', (tagName) => {
    expect(isInteractiveTabDragTarget(makeTarget(tagName))).toBe(true)
  })

  it('allows a regular row target', () => {
    expect(isInteractiveTabDragTarget(makeTarget('div'))).toBe(false)
  })
})

describe('tab move pending state', () => {
  it('stays active until the move finishes', async () => {
    let finishMove: (() => void) | undefined
    const move = runWithTabMovePending(
      () =>
        new Promise<void>((resolve) => {
          finishMove = resolve
        }),
    )

    expect(isTabMovePending()).toBe(true)

    finishMove?.()
    await move

    expect(isTabMovePending()).toBe(false)
  })

  it('is released when a move fails', async () => {
    await expect(
      runWithTabMovePending(async () => {
        throw new Error('move failed')
      }),
    ).rejects.toThrow('move failed')

    expect(isTabMovePending()).toBe(false)
  })
})

describe('external tab drops', () => {
  it('claims the current drag until its state is cleared', () => {
    setDraggedTabState({ sourceGroupId: 'source', tabIds: ['tab-1'] })

    expect(isDraggedTabDropHandledExternally()).toBe(false)
    markDraggedTabDropHandledExternally()
    expect(isDraggedTabDropHandledExternally()).toBe(true)
    expect(getDraggedTabState()?.tabIds).toEqual(['tab-1'])

    clearDraggedTabState()
    expect(isDraggedTabDropHandledExternally()).toBe(false)
  })
})

describe('drag rollback', () => {
  it('restores the full child position without moving a browser-group header', () => {
    interface FakeElement {
      id: string
      remove: () => void
    }

    let children: FakeElement[] = []
    const makeElement = (id: string): FakeElement => ({
      id,
      remove() {
        children = children.filter((child) => child !== this)
      },
    })
    const ungroupedTab = makeElement('ungrouped-tab')
    const browserGroupHeader = makeElement('browser-group-header')
    const groupedTab = makeElement('grouped-tab')
    children = [browserGroupHeader, groupedTab, ungroupedTab]
    const list = {
      get children() {
        return children
      },
      insertBefore(element: FakeElement, reference: FakeElement | null) {
        element.remove()
        const targetIndex = reference ? children.indexOf(reference) : -1
        children.splice(
          targetIndex < 0 ? children.length : targetIndex,
          0,
          element,
        )
        return element
      },
    }

    restoreDraggedElement(
      ungroupedTab as unknown as HTMLElement,
      list as unknown as HTMLElement,
      0,
    )

    expect(children.map((child) => child.id)).toEqual([
      'ungrouped-tab',
      'browser-group-header',
      'grouped-tab',
    ])
  })

  it('anchors an in-list preview before the browser group header', () => {
    interface FakeElement {
      id: string
      parentElement: FakeList | null
      remove: () => void
    }
    interface FakeList {
      children: FakeElement[]
      insertBefore: (
        element: FakeElement,
        reference: FakeElement | null,
      ) => FakeElement
    }

    const list: FakeList = {
      children: [],
      insertBefore(element, reference) {
        element.remove()
        const targetIndex = reference ? this.children.indexOf(reference) : -1
        this.children.splice(
          targetIndex < 0 ? this.children.length : targetIndex,
          0,
          element,
        )
        element.parentElement = this
        return element
      },
    }
    const makeElement = (id: string): FakeElement => ({
      id,
      parentElement: list,
      remove() {
        if (this.parentElement) {
          this.parentElement.children = this.parentElement.children.filter(
            (child) => child !== this,
          )
          this.parentElement = null
        }
      },
    })
    const header = makeElement('header')
    const dragged = makeElement('dragged')
    const firstTab = makeElement('first-tab')
    list.children = [header, dragged, firstTab]

    expect(
      placeDraggedElementBeforeAnchor(
        dragged as unknown as HTMLElement,
        list as unknown as HTMLElement,
        header as unknown as HTMLElement,
      ),
    ).toBe(true)
    expect(list.children.map((child) => child.id)).toEqual([
      'dragged',
      'header',
      'first-tab',
    ])
  })

  it('does not move a cross-list preview before Sortable accepts it', () => {
    const sourceList = { children: [] as unknown[] }
    const targetList = { children: [] as unknown[] }
    const dragged = { parentElement: sourceList }
    const header = { parentElement: targetList }

    expect(
      placeDraggedElementBeforeAnchor(
        dragged as unknown as HTMLElement,
        targetList as unknown as HTMLElement,
        header as unknown as HTMLElement,
      ),
    ).toBe(false)
  })
})

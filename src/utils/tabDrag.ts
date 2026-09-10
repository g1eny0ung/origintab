interface DraggedTabState {
  sourceGroupId: string
  tabIds: string[]
  browserTabGroupId?: string
  handledByExternalDrop: boolean
}

interface BrowserTabGroupDropTarget {
  browserTabGroupId?: string
  isOverBrowserTabGroupHeader: boolean
  isFirstTab: boolean
  isLastTab: boolean
  willInsertAfter: boolean
  pointerY?: number
  tabRowTop?: number
  tabRowBottom?: number
}

interface BrowserTabGroupDropResolution {
  browserTabGroupId: string | null
  forceInsertion?: -1 | 1
}

interface DropInsideListTarget {
  eventType: string
  targetInside: boolean
  pointerInside: boolean
}

let draggedTabState: DraggedTabState | null = null
let pendingTabMoveCount = 0

export function setDraggedTabState(
  state: Omit<DraggedTabState, 'handledByExternalDrop'>,
) {
  draggedTabState = { ...state, handledByExternalDrop: false }
}

export function getDraggedTabState() {
  return draggedTabState
}

export function clearDraggedTabState() {
  draggedTabState = null
}

export function markDraggedTabDropHandledExternally() {
  if (draggedTabState) {
    draggedTabState.handledByExternalDrop = true
  }
}

export function isDraggedTabDropHandledExternally() {
  return draggedTabState?.handledByExternalDrop === true
}

export function restoreDraggedElement(
  element: HTMLElement,
  list: HTMLElement,
  originalChildIndex: number | undefined,
) {
  if (originalChildIndex === undefined) {
    return
  }

  // Remove first so the saved index still points to the same slot when the
  // dragged element currently sits before it. Headers count as list children.
  element.remove()
  list.insertBefore(element, list.children[originalChildIndex] ?? null)
}

export function placeDraggedElementBeforeAnchor(
  element: HTMLElement,
  list: HTMLElement,
  anchor: HTMLElement,
) {
  if (element.parentElement !== list || anchor.parentElement !== list) {
    return false
  }

  list.insertBefore(element, anchor)
  return true
}

export function isInteractiveTabDragTarget(target: Element | null) {
  return Boolean(
    target?.closest(
      'input, button, a, select, textarea, [contenteditable="true"]',
    ),
  )
}

export function isDropInsideList({
  eventType,
  targetInside,
  pointerInside,
}: DropInsideListTarget) {
  if (eventType === 'drop') {
    return targetInside
  }

  if (
    eventType === 'mouseup' ||
    eventType === 'pointerup' ||
    eventType === 'touchend'
  ) {
    return pointerInside
  }

  // dragend and cancellation events report the dragged row as their target,
  // even when the gesture ended outside the list. Unknown events are treated
  // conservatively so a cancelled preview never mutates saved data.
  return false
}

export function resolveBrowserTabGroupDrop({
  browserTabGroupId,
  isOverBrowserTabGroupHeader,
  isFirstTab,
  isLastTab,
  willInsertAfter,
  pointerY,
  tabRowTop,
  tabRowBottom,
}: BrowserTabGroupDropTarget): BrowserTabGroupDropResolution {
  if (!browserTabGroupId) {
    return { browserTabGroupId: null }
  }

  if (isOverBrowserTabGroupHeader) {
    // The whole header is the outer "before group" drop zone. Sortable would
    // otherwise place its preview after the header when the pointer crosses
    // the header midpoint, making an outer tab look like the group's first tab.
    return { browserTabGroupId: null, forceInsertion: -1 }
  }

  const hasSingleTabRowPosition =
    isFirstTab &&
    isLastTab &&
    pointerY !== undefined &&
    tabRowTop !== undefined &&
    tabRowBottom !== undefined
  if (hasSingleTabRowPosition) {
    const tabRowMiddle = tabRowTop + (tabRowBottom - tabRowTop) / 2

    if (pointerY >= tabRowMiddle) {
      return { browserTabGroupId: null, forceInsertion: 1 }
    }

    return { browserTabGroupId }
  }

  if (isLastTab && willInsertAfter) {
    return { browserTabGroupId: null, forceInsertion: 1 }
  }

  return { browserTabGroupId }
}

export function isTabMovePending() {
  return pendingTabMoveCount > 0
}

export async function runWithTabMovePending<T>(operation: () => Promise<T>) {
  pendingTabMoveCount += 1

  try {
    return await operation()
  } finally {
    pendingTabMoveCount -= 1
  }
}

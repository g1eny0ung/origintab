interface DraggedTabState {
  sourceGroupId: string
  tabId: string
}

let draggedTabState: DraggedTabState | null = null

export function setDraggedTabState(state: DraggedTabState) {
  draggedTabState = state
}

export function getDraggedTabState() {
  return draggedTabState
}

export function clearDraggedTabState() {
  draggedTabState = null
}

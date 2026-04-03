import { getContext, setContext } from 'svelte'
import type { SelectedTabRef, TabGroup } from '~/utils/types'

const TAB_SELECTION_CONTEXT_KEY = Symbol('origintab-selection')

type LastSelectedRef = SelectedTabRef | null

export interface TabSelectionController {
  readonly selectedTabs: SelectedTabRef[]
  readonly selectedCount: number
  readonly moveTargetUserGroupId: string
  isSelected: (tabGroupId: string, tabId: string) => boolean
  toggle: (
    tabGroup: TabGroup,
    tabId: string,
    checked: boolean,
    isShiftClick?: boolean,
  ) => void
  clear: () => void
  setMoveTargetUserGroupId: (id: string) => void
  getOrderedSelection: (tabGroups: TabGroup[]) => SelectedTabRef[]
  reconcile: (tabGroups: TabGroup[]) => void
}

class TabSelectionControllerImpl implements TabSelectionController {
  private selectedTabsState = $state<SelectedTabRef[]>([])
  private lastSelectedRef = $state<LastSelectedRef>(null)
  private moveTargetUserGroupIdState = $state('')
  private selectedTabKeySet = $derived(
    new Set(
      this.selectedTabsState.map((tab) => `${tab.tabGroupId}:${tab.tabId}`),
    ),
  )

  get selectedTabs() {
    return this.selectedTabsState
  }

  get selectedCount() {
    return this.selectedTabsState.length
  }

  get moveTargetUserGroupId() {
    return this.moveTargetUserGroupIdState
  }

  isSelected(tabGroupId: string, tabId: string) {
    return this.selectedTabKeySet.has(`${tabGroupId}:${tabId}`)
  }

  private addSelection(selection: SelectedTabRef) {
    if (this.isSelected(selection.tabGroupId, selection.tabId)) {
      return
    }

    this.selectedTabsState = [...this.selectedTabsState, selection]
  }

  toggle(
    tabGroup: TabGroup,
    tabId: string,
    checked: boolean,
    isShiftClick: boolean = false,
  ) {
    const nextSelection = {
      tabGroupId: tabGroup.id,
      tabId,
    }

    if (checked) {
      // Shift range selection is intentionally limited to the current tab group.
      const currentIndex = tabGroup.tabs.findIndex((tab) => tab.id === tabId)
      const shouldSelectRange =
        isShiftClick &&
        this.lastSelectedRef !== null &&
        this.lastSelectedRef.tabGroupId === tabGroup.id &&
        currentIndex !== -1

      if (shouldSelectRange) {
        const lastIndex = tabGroup.tabs.findIndex(
          (tab) => tab.id === this.lastSelectedRef?.tabId,
        )

        if (lastIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex)
          const end = Math.max(lastIndex, currentIndex)
          const existingSelectedTabIds = new Set(
            this.selectedTabsState
              .filter((selectedTab) => selectedTab.tabGroupId === tabGroup.id)
              .map((selectedTab) => selectedTab.tabId),
          )
          const rangeSelections = tabGroup.tabs
            .slice(start, end + 1)
            .filter((tab) => !existingSelectedTabIds.has(tab.id))
            .map((tab) => ({
              tabGroupId: tabGroup.id,
              tabId: tab.id,
            }))

          this.selectedTabsState = [
            ...this.selectedTabsState,
            ...rangeSelections,
          ]
        } else {
          this.addSelection(nextSelection)
        }
      } else {
        this.addSelection(nextSelection)
      }

      this.lastSelectedRef = nextSelection
      return
    }

    this.selectedTabsState = this.selectedTabsState.filter(
      (selectedTab) =>
        !(
          selectedTab.tabGroupId === nextSelection.tabGroupId &&
          selectedTab.tabId === nextSelection.tabId
        ),
    )

    if (
      this.lastSelectedRef?.tabGroupId === nextSelection.tabGroupId &&
      this.lastSelectedRef.tabId === nextSelection.tabId
    ) {
      this.lastSelectedRef = null
    }
  }

  clear() {
    this.selectedTabsState = []
    this.lastSelectedRef = null
  }

  setMoveTargetUserGroupId(id: string) {
    this.moveTargetUserGroupIdState = id
  }

  getOrderedSelection(tabGroups: TabGroup[]) {
    // Batch actions follow the current page order instead of selection order.
    return tabGroups.flatMap((tabGroup) =>
      tabGroup.tabs
        .filter((tab) => this.selectedTabKeySet.has(`${tabGroup.id}:${tab.id}`))
        .map((tab) => ({
          tabGroupId: tabGroup.id,
          tabId: tab.id,
        })),
    )
  }

  reconcile(tabGroups: TabGroup[]) {
    // LiveQuery updates can remove/move tabs after they were selected.
    const validSelectionKeySet = new Set(
      tabGroups.flatMap((tabGroup) =>
        tabGroup.tabs.map((tab) => `${tabGroup.id}:${tab.id}`),
      ),
    )
    const nextSelectedTabs = this.selectedTabsState.filter((tab) =>
      validSelectionKeySet.has(`${tab.tabGroupId}:${tab.tabId}`),
    )

    if (nextSelectedTabs.length !== this.selectedTabsState.length) {
      this.selectedTabsState = nextSelectedTabs
    }

    if (
      this.lastSelectedRef &&
      !validSelectionKeySet.has(
        `${this.lastSelectedRef.tabGroupId}:${this.lastSelectedRef.tabId}`,
      )
    ) {
      this.lastSelectedRef = null
    }
  }
}

export function createTabSelectionController(): TabSelectionController {
  return new TabSelectionControllerImpl()
}

export function setTabSelectionContext(selection: TabSelectionController) {
  setContext(TAB_SELECTION_CONTEXT_KEY, selection)
  return selection
}

export function getTabSelectionContext() {
  return getContext<TabSelectionController>(TAB_SELECTION_CONTEXT_KEY)
}

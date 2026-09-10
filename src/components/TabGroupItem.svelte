<script lang="ts">
  import { ExternalLink, Pencil, RotateCcw, Trash2 } from '@lucide/svelte'
  import { DateTime } from 'luxon'
  import Sortable from 'sortablejs'
  import { onMount } from 'svelte'
  import { getTabSelectionContext } from '~/entrypoints/origintab/selection.svelte'
  import {
    deleteTabGroup,
    moveTabBetweenGroups,
    removeBrowserTabGroup,
    removeTabFromGroup,
    restoreAndDeleteBrowserTabGroup,
    restoreAndDeleteGroup,
    restoreAndDeleteTab,
    restoreBrowserTabGroup,
    restoreGroup,
    restoreTab,
    updateTabTitle,
  } from '~/store'
  import type { Settings } from '~/store/settings'
  import {
    getBrowserTabGroupStatsById,
    getTabGroupListItems,
  } from '~/utils/browserTabGroups'
  import { openConfirm } from '~/utils/confirm.svelte'
  import {
    clearDraggedTabState,
    getDraggedTabState,
    isDraggedTabDropHandledExternally,
    isDropInsideList,
    isInteractiveTabDragTarget,
    isTabMovePending,
    placeDraggedElementBeforeAnchor,
    resolveBrowserTabGroupDrop,
    restoreDraggedElement,
    runWithTabMovePending,
    setDraggedTabState,
  } from '~/utils/tabDrag'
  import { showToast } from '~/utils/toast.svelte'
  import type { BrowserTabGroup, TabGroup, TabItem } from '~/utils/types'
  import { RestoreAction, TimeDisplayMode, UrlDisplayMode } from '~/utils/types'

  import BrowserTabGroupHeader from './BrowserTabGroupHeader.svelte'

  interface Props {
    tabGroup: TabGroup
    settings: Settings
  }

  let { tabGroup, settings }: Props = $props()

  let tabsContainer: HTMLUListElement
  let sortable: Sortable | null = null
  let shiftKeyPressed = $state(false)
  let draggedTabId = $state<string | null>(null)
  let previewBrowserTabGroupId = $state<string | null>(null)
  let actionPending = $state(false)
  const selection = getTabSelectionContext()
  let tabGroupListItems = $derived(
    getTabGroupListItems(tabGroup.tabs, tabGroup.browserTabGroups),
  )
  let browserTabGroupStatsById = $derived(
    getBrowserTabGroupStatsById(tabGroup.tabs),
  )

  function formatTime(ts: number) {
    const time = DateTime.fromMillis(ts)

    if (settings.timeDisplayMode === TimeDisplayMode.Absolute) {
      return time.toLocaleString(DateTime.DATETIME_MED)
    }

    if (time.diffNow().as('seconds') > -10) {
      return browser.i18n.getMessage('justNow')
    }

    return time.toRelative()
  }

  function urlHostname(url: string) {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  function faviconUrl(tab: TabItem) {
    if (tab.favicon) {
      return tab.favicon
    }

    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(urlHostname(tab.url))}&sz=32`
  }

  async function runPendingAction(
    operation: () => Promise<void>,
    successMessage: string,
    errorMessage: string,
  ) {
    if (actionPending) {
      return
    }

    actionPending = true
    try {
      await operation()
      showToast(successMessage)
    } catch {
      showToast(errorMessage, 'error')
    } finally {
      actionPending = false
    }
  }

  function runRestore(
    operation: (options: {
      active: boolean
      newWindow: boolean
    }) => Promise<void>,
    successMessage: string,
  ) {
    return runPendingAction(
      () => {
        const active = settings.restoreAction === RestoreAction.OpenAndJump
        const newWindow = settings.openGroupInNewWindow

        return operation({ active, newWindow })
      },
      successMessage,
      browser.i18n.getMessage('restoreFailed'),
    )
  }

  function handleRestoreGroup(remove: boolean) {
    return runRestore(
      (options) =>
        remove
          ? restoreAndDeleteGroup(tabGroup.id, options)
          : restoreGroup(tabGroup.id, options),
      browser.i18n.getMessage('tabsRestored'),
    )
  }

  function handleRestoreBrowserTabGroup(
    browserTabGroupId: string,
    remove: boolean,
  ) {
    return runRestore(
      (options) =>
        remove
          ? restoreAndDeleteBrowserTabGroup(
              tabGroup.id,
              browserTabGroupId,
              options,
            )
          : restoreBrowserTabGroup(tabGroup.id, browserTabGroupId, options),
      browser.i18n.getMessage('tabsRestored'),
    )
  }

  async function runDelete({
    operation,
    title,
    message,
    successMessage,
  }: {
    operation: () => Promise<void>
    title: string
    message: string
    successMessage: string
  }) {
    const doDelete = () =>
      runPendingAction(
        operation,
        successMessage,
        browser.i18n.getMessage('deleteFailed'),
      )

    if (settings.confirmBeforeDelete) {
      openConfirm({
        title,
        message,
        onConfirm: doDelete,
      })
      return
    }

    await doDelete()
  }

  function handleDeleteBrowserTabGroup(browserTabGroupId: string) {
    return runDelete({
      operation: () => removeBrowserTabGroup(tabGroup.id, browserTabGroupId),
      title: browser.i18n.getMessage('deleteBrowserTabGroupTitle'),
      message: browser.i18n.getMessage('deleteBrowserTabGroupConfirm'),
      successMessage: browser.i18n.getMessage('browserTabGroupDeleted'),
    })
  }

  function isFirstTabInBrowserGroup(index: number, browserTabGroupId: string) {
    return browserTabGroupStatsById.get(browserTabGroupId)?.firstIndex === index
  }

  function browserTabGroupTabCount(browserTabGroupId: string) {
    return browserTabGroupStatsById.get(browserTabGroupId)?.count ?? 0
  }

  function isLastTabInBrowserGroup(index: number, browserTabGroupId: string) {
    return browserTabGroupStatsById.get(browserTabGroupId)?.lastIndex === index
  }

  function handleDeleteGroup() {
    return runDelete({
      operation: () => deleteTabGroup(tabGroup.id),
      title: browser.i18n.getMessage('deleteCollectionTitle'),
      message: browser.i18n.getMessage('deleteCollection'),
      successMessage: browser.i18n.getMessage('collectionDeleted'),
    })
  }

  function handleTabClick(e: MouseEvent, tabId: string) {
    const asDefault = e.ctrlKey || e.metaKey || e.shiftKey
    if (!asDefault) {
      e.preventDefault()

      handleRestoreTab(tabId, {
        remove: true,
      })
    }
  }

  function handleRestoreTab(tabId: string, options?: { remove: boolean }) {
    return runRestore(
      ({ active }) =>
        options?.remove
          ? restoreAndDeleteTab(tabGroup.id, tabId, { active })
          : restoreTab(tabGroup.id, tabId, { active }),
      browser.i18n.getMessage('tabRestored'),
    )
  }

  function handleDeleteTab(tabId: string) {
    return runDelete({
      operation: () => removeTabFromGroup(tabGroup.id, tabId),
      title: browser.i18n.getMessage('deleteTabTitle'),
      message: browser.i18n.getMessage('deleteTabConfirm'),
      successMessage: browser.i18n.getMessage('tabDeleted'),
    })
  }

  async function handleTabMove(
    sourceGroupId: string,
    targetGroupId: string,
    tabId: string,
    newIndex: number,
    browserTabGroupId: string | null,
    onError?: () => void,
  ) {
    try {
      await runWithTabMovePending(() =>
        moveTabBetweenGroups(
          sourceGroupId,
          targetGroupId,
          tabId,
          newIndex,
          browserTabGroupId,
        ),
      )
    } catch {
      onError?.()
      showToast(browser.i18n.getMessage('moveTabsFailed'), 'error')
    }
  }

  let editingTabId = $state<string | null>(null)
  let editValue = $state('')
  let originalTitle = $state('')

  function focusNode(node: HTMLInputElement) {
    node.focus()
  }

  function startEdit(tab: TabItem) {
    editingTabId = tab.id
    editValue = tab.title
    originalTitle = tab.title
  }

  function handleEditCancel() {
    editingTabId = null
  }

  async function handleEditSave(tabId: string) {
    if (editingTabId !== tabId) {
      return
    }

    const title = editValue.trim()

    if (!title) {
      return
    }

    if (title === originalTitle) {
      editingTabId = null
      return
    }

    try {
      await updateTabTitle(tabGroup.id, tabId, title)
      editingTabId = null
      showToast(browser.i18n.getMessage('tabTitleUpdated'))
    } catch {
      showToast(browser.i18n.getMessage('tabTitleUpdateFailed'), 'error')
    }
  }

  function handleEditKeydown(e: KeyboardEvent, tabId: string) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEditSave(tabId)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleEditCancel()
    }
  }

  function setDropBrowserTabGroup(
    draggedTab: HTMLElement,
    dropTarget: HTMLElement,
    targetList: HTMLElement,
    willInsertAfter: boolean,
    originalEvent: Event,
  ) {
    const pointer = getPointerCoordinates(originalEvent)
    const pointerX = pointer?.clientX
    const pointerY = pointer?.clientY
    const hitElements: Element[] = []

    if (originalEvent.target instanceof Element) {
      hitElements.push(originalEvent.target)
    }
    if (pointer) {
      // Sortable's dragged ghost can obscure originalEvent.target, so also
      // resolve the real element stack at the pointer coordinates.
      hitElements.push(
        ...document.elementsFromPoint(pointer.clientX, pointer.clientY),
      )
    }

    const hitHeader = hitElements
      .map((element) =>
        element.closest<HTMLElement>('[data-browser-tab-group-header-id]'),
      )
      .find((header) => header && targetList.contains(header))
    const isFirstTab = dropTarget.dataset.browserTabGroupFirst === 'true'
    const previousDropElement =
      dropTarget.previousElementSibling === draggedTab
        ? draggedTab.previousElementSibling
        : dropTarget.previousElementSibling
    const adjacentHeader =
      isFirstTab &&
      previousDropElement instanceof HTMLElement &&
      previousDropElement.dataset.browserTabGroupHeaderId !== undefined
        ? previousDropElement
        : null
    const adjacentHeaderRect = adjacentHeader?.getBoundingClientRect()
    const pointerIsOverAdjacentHeader =
      pointerX !== undefined &&
      pointerY !== undefined &&
      adjacentHeaderRect !== undefined &&
      pointerX >= adjacentHeaderRect.left &&
      pointerX <= adjacentHeaderRect.right &&
      pointerY >= adjacentHeaderRect.top &&
      pointerY <= adjacentHeaderRect.bottom
    const hoveredHeader =
      hitHeader ??
      (dropTarget.dataset.browserTabGroupHeaderId !== undefined
        ? dropTarget
        : pointerIsOverAdjacentHeader
          ? adjacentHeader
          : null)
    const hoveredBrowserTabGroupId =
      hoveredHeader?.dataset.browserTabGroupHeaderId
    const targetBrowserTabGroupId =
      hoveredBrowserTabGroupId ?? dropTarget.dataset.browserTabGroupId
    const isLastTab = dropTarget.dataset.browserTabGroupLast === 'true'
    const tabRow =
      isFirstTab && isLastTab
        ? dropTarget.querySelector<HTMLElement>(':scope > [data-tab-row]')
        : null
    const tabRowRect = tabRow?.getBoundingClientRect()
    const dropResolution = resolveBrowserTabGroupDrop({
      browserTabGroupId: targetBrowserTabGroupId,
      isOverBrowserTabGroupHeader: hoveredBrowserTabGroupId !== undefined,
      isFirstTab,
      isLastTab,
      willInsertAfter,
      pointerY,
      tabRowTop: tabRowRect?.top,
      tabRowBottom: tabRowRect?.bottom,
    })
    const nextDropBrowserTabGroupId = dropResolution.browserTabGroupId ?? ''

    if (
      draggedTab.dataset.dropBrowserTabGroupId !== nextDropBrowserTabGroupId
    ) {
      draggedTab.dataset.dropBrowserTabGroupId = nextDropBrowserTabGroupId
      previewBrowserTabGroupId = dropResolution.browserTabGroupId
    }

    if (hoveredHeader && hoveredHeader !== dropTarget) {
      // Returning -1 is relative to Sortable's dropTarget. If it still points
      // at the first tab, explicitly anchor the preview before the header.
      placeDraggedElementBeforeAnchor(draggedTab, targetList, hoveredHeader)
      return false
    }

    return dropResolution.forceInsertion
  }

  function getPointerCoordinates(event: Event) {
    const pointerEvent = event as Event & {
      clientX?: number
      clientY?: number
      touches?: ArrayLike<{ clientX: number; clientY: number }>
      changedTouches?: ArrayLike<{ clientX: number; clientY: number }>
    }
    const clientX =
      pointerEvent.clientX ??
      pointerEvent.touches?.[0]?.clientX ??
      pointerEvent.changedTouches?.[0]?.clientX
    const clientY =
      pointerEvent.clientY ??
      pointerEvent.touches?.[0]?.clientY ??
      pointerEvent.changedTouches?.[0]?.clientY

    return clientX === undefined || clientY === undefined
      ? null
      : { clientX, clientY }
  }

  function getDropBrowserTabGroupId(draggedTab: HTMLElement) {
    return draggedTab.dataset.dropBrowserTabGroupId || null
  }

  function wasDroppedInsideList(event: Event, list: HTMLElement) {
    const originalEvent = (event as Event & { originalEvent?: Event })
      .originalEvent
    if (!originalEvent) {
      return false
    }

    const pointer = getPointerCoordinates(originalEvent)
    const targetInside =
      originalEvent.target instanceof Node &&
      list.contains(originalEvent.target)
    const pointerInside = pointer
      ? document
          .elementsFromPoint(pointer.clientX, pointer.clientY)
          .some((element) => list.contains(element))
      : false

    return isDropInsideList({
      eventType: originalEvent.type,
      targetInside,
      pointerInside,
    })
  }

  function getTabElementIndex(list: HTMLElement, tabElement: HTMLElement) {
    return Array.from(list.children)
      .filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement && child.dataset.tabId !== undefined,
      )
      .indexOf(tabElement)
  }

  function getOriginalChildIndex(tabElement: HTMLElement) {
    const originalChildIndex = Number(tabElement.dataset.originalChildIndex)

    return Number.isInteger(originalChildIndex) && originalChildIndex >= 0
      ? originalChildIndex
      : undefined
  }

  function isTabDisplayedInBrowserTabGroup(
    tab: TabItem,
    browserTabGroup: BrowserTabGroup | undefined,
  ) {
    if (tab.id === draggedTabId) {
      return previewBrowserTabGroupId !== null
    }

    return browserTabGroup !== undefined
  }

  function destroySortableWhenIdle(instance: Sortable) {
    if (Sortable.active && Sortable.active !== instance) {
      // Sortable keeps every instance in an internal registry. Wait until the
      // unrelated gesture ends, then destroy this detached instance normally.
      window.requestAnimationFrame(() => destroySortableWhenIdle(instance))
      return
    }

    instance.destroy()
  }

  $effect(() => {
    sortable?.option('disabled', selection.selectedCount > 0)
  })

  onMount(() => {
    const sortableAnimation = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
      ? 0
      : 150

    sortable = Sortable.create(tabsContainer, {
      animation: sortableAnimation,
      group: 'tab-items',
      ghostClass: 'pointer-events-none',
      handle: '.drag-handle',
      draggable: '[data-sortable-item]',
      filter: (event) =>
        isTabMovePending() ||
        isInteractiveTabDragTarget(
          event.target instanceof Element ? event.target : null,
        ),
      preventOnFilter: false,
      onStart: (e) => {
        const tabId = e.item.dataset.tabId
        const browserTabGroupId = e.item.dataset.browserTabGroupId

        e.item.dataset.dropBrowserTabGroupId = browserTabGroupId ?? ''
        e.item.dataset.originalChildIndex = String(
          Array.from(e.from.children).indexOf(e.item),
        )
        delete e.item.dataset.tabMoveHandled
        draggedTabId = tabId ?? null
        previewBrowserTabGroupId = browserTabGroupId ?? null

        if (tabId) {
          setDraggedTabState({
            sourceGroupId: tabGroup.id,
            tabIds: [tabId],
          })
        }
      },
      onAdd: (e) => {
        const sourceGroupId = e.from.dataset.tabGroupId
        const targetGroupId = e.to.dataset.tabGroupId
        const tabId = e.item.dataset.tabId
        const targetTabIndex = getTabElementIndex(e.to, e.item)
        const originalChildIndex = getOriginalChildIndex(e.item)

        if (isDraggedTabDropHandledExternally()) {
          e.item.dataset.tabMoveHandled = 'true'
          restoreDraggedElement(e.item, e.from, originalChildIndex)
          return
        }

        if (sourceGroupId && targetGroupId && tabId && targetTabIndex >= 0) {
          const browserTabGroupId = getDropBrowserTabGroupId(e.item)

          e.item.dataset.tabMoveHandled = 'true'
          // Sortable temporarily inserts the dragged DOM node into the target list.
          // Remove that node and let Svelte re-render from store data.
          e.item.remove()
          handleTabMove(
            sourceGroupId,
            targetGroupId,
            tabId,
            targetTabIndex,
            browserTabGroupId,
            () => restoreDraggedElement(e.item, e.from, originalChildIndex),
          )
        }
      },
      onUpdate: (e) => {
        const targetGroupId = e.from.dataset.tabGroupId
        const tabId = e.item.dataset.tabId
        const targetTabIndex = getTabElementIndex(e.to, e.item)
        const originalChildIndex = getOriginalChildIndex(e.item)

        if (isDraggedTabDropHandledExternally()) {
          e.item.dataset.tabMoveHandled = 'true'
          restoreDraggedElement(e.item, e.from, originalChildIndex)
          return
        }

        if (targetGroupId && tabId && targetTabIndex >= 0) {
          e.item.dataset.tabMoveHandled = 'true'
          handleTabMove(
            targetGroupId,
            targetGroupId,
            tabId,
            targetTabIndex,
            getDropBrowserTabGroupId(e.item),
            () => restoreDraggedElement(e.item, e.from, originalChildIndex),
          )
        }
      },
      onMove: (e, originalEvent) => {
        return setDropBrowserTabGroup(
          e.dragged,
          e.related,
          e.to,
          e.willInsertAfter === true,
          originalEvent,
        )
      },
      onEnd: (e) => {
        const sourceGroupId = e.from.dataset.tabGroupId
        const targetGroupId = e.to.dataset.tabGroupId
        const tabId = e.item.dataset.tabId
        const originalBrowserTabGroupId =
          e.item.dataset.browserTabGroupId ?? null
        const targetBrowserTabGroupId = getDropBrowserTabGroupId(e.item)
        const targetTabIndex = getTabElementIndex(e.to, e.item)
        const membershipChanged =
          originalBrowserTabGroupId !== targetBrowserTabGroupId
        // Sortable omits onUpdate when the tab keeps the same list index, but
        // dropping across the indentation boundary still changes membership.
        const needsMembershipOnlyMove =
          !isDraggedTabDropHandledExternally() &&
          e.item.dataset.tabMoveHandled !== 'true' &&
          e.from === e.to &&
          membershipChanged &&
          wasDroppedInsideList(e, e.to)

        if (
          needsMembershipOnlyMove &&
          sourceGroupId &&
          targetGroupId &&
          tabId &&
          targetTabIndex >= 0
        ) {
          handleTabMove(
            sourceGroupId,
            targetGroupId,
            tabId,
            targetTabIndex,
            targetBrowserTabGroupId,
          )
        }

        delete e.item.dataset.dropBrowserTabGroupId
        delete e.item.dataset.originalChildIndex
        delete e.item.dataset.tabMoveHandled
        draggedTabId = null
        previewBrowserTabGroupId = null
        clearDraggedTabState()
      },
    })

    return () => {
      if (sortable) {
        destroySortableWhenIdle(sortable)
      }
      if (getDraggedTabState()?.sourceGroupId === tabGroup.id) {
        clearDraggedTabState()
      }
    }
  })
</script>

<div class="p-4 border-b border-base-200 last:border-b-0">
  <div class="flex items-center justify-between mb-4 px-2">
    <div class="text-sm text-base-content/80">
      {formatTime(tabGroup.createdAt)}
    </div>
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        disabled={actionPending}
        onclick={() => handleRestoreGroup(true)}
        title={browser.i18n.getMessage('restore')}
        aria-label={browser.i18n.getMessage('restore')}
      >
        <RotateCcw size={14} aria-hidden="true" />
        <span class="hidden sm:inline">
          {browser.i18n.getMessage('restore')}
        </span>
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        disabled={actionPending}
        onclick={() => handleRestoreGroup(false)}
        title={browser.i18n.getMessage('restoreAndPreserve')}
        aria-label={browser.i18n.getMessage('restoreAndPreserve')}
      >
        <ExternalLink size={14} aria-hidden="true" />
        <span class="hidden sm:inline">
          {browser.i18n.getMessage('restoreAndPreserve')}
        </span>
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-xs hover:btn-error hover:text-error-content"
        disabled={actionPending}
        onclick={handleDeleteGroup}
        title={browser.i18n.getMessage('delete')}
        aria-label={browser.i18n.getMessage('delete')}
      >
        <Trash2 size={14} aria-hidden="true" />
        <span class="hidden sm:inline">
          {browser.i18n.getMessage('delete')}
        </span>
      </button>
    </div>
  </div>

  <ul bind:this={tabsContainer} data-tab-group-id={tabGroup.id}>
    <!-- Keep one root element per keyed item so Sortable moves the entire
         Svelte node boundary, including any conditional content inside it. -->
    {#each tabGroupListItems as item (item.key)}
      {@const browserTabGroup = item.browserTabGroup}
      {@const index = item.type === 'tab' ? item.index : item.firstTabIndex}
      <li
        class={[
          'group rounded-none bg-base-100',
          index > 0 &&
            (item.type === 'browserTabGroupHeader' ||
              !browserTabGroup ||
              !isFirstTabInBrowserGroup(index, browserTabGroup.id)) &&
            'border-t border-base-200',
        ]}
        data-sortable-item
        data-browser-tab-group-header-id={item.type === 'browserTabGroupHeader'
          ? browserTabGroup?.id
          : undefined}
        data-tab-id={item.type === 'tab' ? item.tab.id : undefined}
        data-browser-tab-group-id={item.type === 'tab'
          ? browserTabGroup?.id
          : undefined}
        data-browser-tab-group-first={item.type === 'tab' &&
        browserTabGroup &&
        isFirstTabInBrowserGroup(index, browserTabGroup.id)
          ? 'true'
          : undefined}
        data-browser-tab-group-last={item.type === 'tab' &&
        browserTabGroup &&
        isLastTabInBrowserGroup(index, browserTabGroup.id)
          ? 'true'
          : undefined}
      >
        {#if item.type === 'browserTabGroupHeader'}
          <!-- Headers remain drop targets, but have no handle to drag them. -->
          <BrowserTabGroupHeader
            browserTabGroup={item.browserTabGroup}
            tabCount={browserTabGroupTabCount(item.browserTabGroup.id)}
            disabled={actionPending}
            onRestoreAndRemove={() =>
              handleRestoreBrowserTabGroup(item.browserTabGroup.id, true)}
            onRestoreAndPreserve={() =>
              handleRestoreBrowserTabGroup(item.browserTabGroup.id, false)}
            onDelete={() =>
              handleDeleteBrowserTabGroup(item.browserTabGroup.id)}
          />
        {:else}
          {@const tab = item.tab}
          <div
            class={[
              'grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 py-2.5 pe-2',
              isTabDisplayedInBrowserTabGroup(tab, browserTabGroup)
                ? 'ps-6'
                : 'ps-2',
              selection.selectedCount === 0 &&
                editingTabId !== tab.id &&
                'drag-handle active:cursor-grabbing',
            ]}
            data-tab-row
          >
            <input
              type="checkbox"
              class="checkbox checkbox-xs rounded"
              class:checkbox-primary={selection.isSelected(tabGroup.id, tab.id)}
              checked={selection.isSelected(tabGroup.id, tab.id)}
              aria-label={browser.i18n.getMessage(
                'selectTab',
                tab.title || browser.i18n.getMessage('untitled'),
              )}
              onclick={(e) => {
                e.stopPropagation()
                shiftKeyPressed = e.shiftKey
              }}
              onchange={(e) => {
                selection.toggle(
                  tabGroup,
                  tab.id,
                  (e.currentTarget as HTMLInputElement).checked,
                  shiftKeyPressed,
                )
              }}
            />
            <div class="favicon-container">
              <img
                src={faviconUrl(tab)}
                alt=""
                width="16"
                height="16"
                loading="lazy"
                onerror={(e) =>
                  ((e.target as HTMLImageElement).style.display = 'none')}
              />
            </div>
            {#if editingTabId === tab.id}
              <div class="min-w-0">
                <input
                  use:focusNode
                  bind:value={editValue}
                  class="input input-xs w-full"
                  name={`tab-title-${tab.id}`}
                  autocomplete="off"
                  aria-label={browser.i18n.getMessage('editTitle')}
                  onkeydown={(e) => handleEditKeydown(e, tab.id)}
                  onblur={() => handleEditSave(tab.id)}
                />
              </div>
            {:else}
              <a
                href={tab.url}
                class="inline-flex min-w-0 cursor-pointer flex-col"
                onclick={(e) => handleTabClick(e, tab.id)}
              >
                <span class="font-medium text-sm truncate">
                  {tab.title || browser.i18n.getMessage('untitled')}
                </span>
                {#if settings.urlDisplayMode === UrlDisplayMode.Full}
                  <span class="text-xs text-base-content/60 truncate">
                    {tab.url}
                  </span>
                {:else if settings.urlDisplayMode === UrlDisplayMode.Hostname}
                  <span class="text-xs text-base-content/60 truncate">
                    {urlHostname(tab.url)}
                  </span>
                {/if}
              </a>
            {/if}
            <div
              class="flex items-center gap-1 opacity-0 transition-opacity motion-reduce:transition-none group-hover:opacity-100 group-focus-within:opacity-100"
            >
              {#if editingTabId !== tab.id}
                <button
                  type="button"
                  class="btn btn-ghost btn-xs btn-square"
                  onclick={() => {
                    startEdit(tab)
                  }}
                  title={browser.i18n.getMessage('editTitle')}
                  aria-label={browser.i18n.getMessage('editTitle')}
                >
                  <Pencil size={14} aria-hidden="true" />
                </button>
              {/if}
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-square"
                disabled={actionPending}
                onclick={() => handleRestoreTab(tab.id, { remove: false })}
                title={browser.i18n.getMessage('restoreAndPreserve')}
                aria-label={browser.i18n.getMessage('restoreAndPreserve')}
              >
                <ExternalLink size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-square hover:btn-error hover:text-error-content"
                disabled={actionPending}
                onclick={() => handleDeleteTab(tab.id)}
                title={browser.i18n.getMessage('delete')}
                aria-label={browser.i18n.getMessage('delete')}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</div>

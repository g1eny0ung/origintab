// UI
export type ToastType = 'success' | 'error'

// Single tab item
export interface TabItem {
  id: string
  title: string
  url: string
  favicon?: string
  createdAt: number
  browserTabGroupId?: string
}

// Snapshot of a browser-native tab group saved inside an OriginTab collection.
export interface BrowserTabGroup {
  id: string
  title?: string
  color: Browser.tabGroups.TabGroup['color']
  collapsed: boolean
}

export interface SelectedTabRef {
  tabGroupId: string
  tabId: string
}

// User-defined group (category)
export interface UserGroup {
  id: string
  name: string
  createdAt: number
}

// Tab group (collection of tabs collected at once)
export interface TabGroup {
  id: string
  tabs: TabItem[]
  browserTabGroups?: BrowserTabGroup[]
  createdAt: number
  userGroupId: string // Which user group this belongs to
}

// Storage data structure
export interface StorageData {
  userGroups: UserGroup[]
  tabGroups: TabGroup[]
}

// Click action setting type
export enum ClickAction {
  SaveAll = 'saveAll',
  SaveCurrent = 'saveCurrent',
  ShowPopup = 'showPopup',
}

// URL display mode
export enum UrlDisplayMode {
  None = 'none',
  Full = 'full',
  Hostname = 'hostname',
}

// Restore tab action
export enum RestoreAction {
  OpenWithoutJump = 'openWithoutJump',
  OpenAndJump = 'openAndJump',
}

// Time display mode
export enum TimeDisplayMode {
  Relative = 'relative',
  Absolute = 'absolute',
}

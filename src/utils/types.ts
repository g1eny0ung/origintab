// Single tab item
export interface TabItem {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
}

// User-defined group (category)
export interface UserGroup {
  id: string;
  name: string;
  createdAt: number;
}

// Tab group (collection of tabs collected at once)
export interface TabGroup {
  id: string;
  tabs: TabItem[];
  createdAt: number;
  userGroupId: string; // Which user group this belongs to
}

// Storage data structure
export interface StorageData {
  userGroups: UserGroup[];
  tabGroups: TabGroup[];
}

// Click action setting type
export type ClickAction = 'saveAll' | 'saveCurrent' | 'showPopup';

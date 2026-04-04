import 'fake-indexeddb/auto'
import { vi } from 'vitest'

vi.mock('@/utils/background/contextMenus', () => ({
  notifyContextMenusRefresh: vi.fn(),
}))

vi.stubGlobal('storage', {
  defineItem: vi.fn(() => ({
    getValue: vi.fn(),
    setValue: vi.fn(),
  })),
})

vi.stubGlobal('browser', {
  tabs: {
    create: vi.fn().mockResolvedValue({ id: 1 }),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    discard: vi.fn(),
  },
  windows: {
    create: vi.fn().mockResolvedValue({ tabs: [{ id: 1 }] }),
  },
})

vi.stubGlobal('window', {
  setTimeout: vi.fn((fn) => fn()),
  clearTimeout: vi.fn(),
})

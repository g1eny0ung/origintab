import 'fake-indexeddb/auto'
import { vi } from 'vitest'

vi.stubGlobal('window', {
  setTimeout: vi.fn((fn) => fn()),
  clearTimeout: vi.fn(),
})

vi.mock('@/utils/background/contextMenus', () => ({
  notifyContextMenusRefresh: vi.fn(),
}))

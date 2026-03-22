# OriginTab - Agent Guide

## Project Overview

OriginTab is a browser extension for managing tabs. Users can save tabs into groups, organize them into custom categories, and restore them later.

## Tech Stack

- **Framework**: [WXT](https://wxt.dev/) - Browser extension framework
- **Frontend**: Svelte 5 + TypeScript
- **Styling**: TailwindCSS 4 + DaisyUI
- **Package Manager**: Bun
- **Date/Time**: Luxon

## Project Structure

```
src/
├── entrypoints/
│   ├── background.ts       # Service worker (tab collection, messaging)
│   ├── origintab/          # Main management page
│   │   ├── App.svelte
│   │   ├── main.ts
│   │   ├── app.css
│   │   └── index.html
│   ├── popup/              # Extension popup
│   │   └── ...
│   └── options/            # Settings page
│       └── ...
├── components/             # Shared Svelte components
│   ├── ExportModal.svelte
│   ├── ImportModal.svelte
│   ├── TabGroupItem.svelte
│   ├── UserGroupItem.svelte
│   ├── UserGroupList.svelte
│   └── ui/
│       ├── Dialog.svelte
│       ├── Fieldset.svelte
│       ├── SettingItemCheckboxCard.svelte
│       ├── SettingItemRadio.svelte
│       └── SettingItemRadioCard.svelte
├── store/                  # State management (Dexie + Svelte stores)
│   ├── base.ts             # DB setup, DEFAULT_GROUP_ID, generateId
│   ├── dataManagement.ts   # Import/export data
│   ├── index.ts            # Re-exports all store modules
│   ├── restore.ts          # Tab restoration logic
│   ├── settings.ts         # Settings management
│   ├── tabGroups.ts        # Tab group CRUD operations
│   ├── tabs.ts             # Tab operations
│   └── userGroups.ts       # User group CRUD operations
├── utils/
│   ├── helpers.ts          # Utility functions
│   ├── localize.ts         # i18n localization
│   ├── tabDrag.ts          # Drag and drop utilities
│   └── types.ts            # TypeScript interfaces
public/                     # Static assets
```

## Coding Guidelines

### Svelte 5

- Use `$state()` for reactive state
- Use `$effect()` carefully - prefer `onMount` for initialization
- Use standard event handlers (`onclick`) not `on:click` (Svelte 5 syntax)

### Storage

- **Dexie.js** for main data (userGroups, tabGroups) - configured in `src/store/base.ts`
- `storage` from `@wxt-dev/storage` for settings only
- Data structure: Dexie tables with `userGroups` and `tabGroups`
- Default group ID: `"default"` (defined in `src/store/base.ts`)

### Background Script

- Tab collection: save first, then notify UI via `browser.runtime.sendMessage`
- Do NOT open origintab.html after collecting tabs (silent update)
- Use `notifyOriginTabUpdate()` to trigger UI refresh

### CSS

- Use Tailwind utility classes
- DaisyUI theme: `emerald`
- Keep popup width at `300px`

## Commands

```bash
# Development
bun run dev
bun run dev:firefox

# Build
bun run build
bun run build:firefox

# Type check
bun run check
```

## Key Files

- `src/utils/types.ts` - Type definitions (TabItem, UserGroup, TabGroup, enums)
- `src/store/base.ts` - Dexie database setup, DEFAULT_GROUP_ID, generateId
- `src/store/settings.ts` - Settings management
- `src/store/tabGroups.ts` - Tab group CRUD operations
- `src/store/userGroups.ts` - User group CRUD operations
- `src/store/dataManagement.ts` - Import/export data operations
- `src/entrypoints/background.ts` - Background logic

## Notes

- Always run `bun run check` before committing
- Keep lang="en" in all HTML files
- Prefer simple, direct solutions over complex ones
- All `if` `else` statements should have curly braces

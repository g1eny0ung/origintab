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
├── utils/
│   ├── types.ts            # TypeScript interfaces
│   └── storage.ts          # Storage operations
public/                     # Static assets
```

## Coding Guidelines

### Svelte 5

- Use `$state()` for reactive state
- Use `$effect()` carefully - prefer `onMount` for initialization
- Use standard event handlers (`onclick`) not `on:click` (Svelte 5 syntax)

### Storage

- `storage` from `@wxt-dev/storage` is auto-imported by WXT, no need to manually import
- Data structure: `{ userGroups: UserGroup[], tabGroups: TabGroup[] }`
- Default group ID: `"default"`

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

- `src/utils/types.ts` - Type definitions
- `src/utils/storage.ts` - All storage operations
- `src/entrypoints/background.ts` - Background logic

## Notes

- Always run `bun run check` before committing
- Keep lang="en" in all HTML files
- Prefer simple, direct solutions over complex ones

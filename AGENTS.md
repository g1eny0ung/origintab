# Repository Guidelines

## Project Structure

OriginTab is a browser extension for saving and restoring tabs, built with WXT, Svelte 5, and TypeScript. `src/entrypoints/` contains the background worker, main tab manager, popup, and options page. Shared Svelte components live in `src/components/`. `src/store/` handles persistence and tab operations, and `src/utils/` contains browser helpers, including background tab collection and context menus. Tests live in `tests/store/` and `tests/utils/`. Extension icons and translations live in `public/` and `public/_locales/`, respectively. Store listing images live in `images/`.

## Build, Test, and Development

- `bun install` installs dependencies from `bun.lock` and prepares WXT. Reuse Bun’s shared download cache across worktrees.
- `bun run dev` starts Chromium development. Use `bun run dev:firefox` for Firefox.
- `bun run build` and `bun run build:firefox` write browser-specific builds to `dist/`. `bun run zip:all` packages both builds.
- `bun run check` runs Svelte and TypeScript checks. `bun run test` runs the unit suite once, and `bun run test:watch` reruns it during development.

## Coding Style and Architecture

Use two spaces, single quotes, and Prettier’s configured import ordering. Omit semicolons and use braces for `if` and `else` blocks. Name Svelte components in PascalCase and TypeScript helpers in camelCase. Use Svelte 5 runes and event attributes such as `onclick`, with Tailwind utilities and the daisyUI `emerald` theme.

Keep saved tabs and groups in Dexie and preferences in WXT storage. Use Dexie’s `liveQuery` for reactive tab and group lists and WXT storage watchers for preference changes. Treat `.wxt/` and `dist/` as generated output.

## Testing Guidelines

Place focused Vitest regressions in `tests/` as `<module>.test.ts`, following the source module layout. Use WXT’s `fakeBrowser` for extension APIs and the configured `fake-indexeddb` for Dexie. `bun run test:coverage` reports V8 coverage for `src/store/`. The configuration sets no coverage threshold.

## Commits and Pull Requests

Use short, imperative subjects with the prefixes used in Git history, such as `feat: support browser tab groups` or `fix: reset selectedUserGroupId`. Run `bun run check` before committing. The Husky hook runs tests and formats staged TypeScript, Svelte, HTML, and CSS with Prettier. In pull requests, explain the behavior change, summarize validation, link relevant issues, and include screenshots for visible UI changes.

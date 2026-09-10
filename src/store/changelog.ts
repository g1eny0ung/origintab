// Increment this number whenever the changelog content is updated.
export const CHANGELOG_VERSION = 1

export const changelogVersion = storage.defineItem<number>(
  'local:changelogVersion',
  { fallback: 0 },
)

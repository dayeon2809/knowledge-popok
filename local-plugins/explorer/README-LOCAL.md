# Local fork: why this exists

This is a vendored copy of `github:quartz-community/explorer`, pinned at the
commit that was installed in `.quartz/plugins/explorer` on 2026-07-22, with
one change: `src/components/scripts/explorer.inline.ts` reads the global
`treeData` instead of `fetchData`.

## Why not just use `source: github:quartz-community/explorer`?

Netlify's build command is `npx quartz plugin install && npx quartz build`,
which re-clones every `github:`-sourced plugin from scratch on every deploy
(`.quartz/plugins` is gitignored and never committed). Any edit made directly
inside `.quartz/plugins/explorer` is lost on the next deploy. Quartz's plugin
loader (`quartz/plugins/loader/gitLoader.ts`) supports local path sources
(`source: ./local-plugins/explorer`), which are symlinked instead of cloned,
so a customized copy living in the tracked repo survives every deploy without
needing a separate GitHub fork.

## What changed vs. upstream

Only the data source for the sidebar file tree:

- `explorer.inline.ts`: `await fetchData` -> `await treeData`. `fetchData`
  resolves `static/contentIndex.json` (full page text, used only by search).
  `treeData` resolves `static/explorerIndex.json` (slug + title only, emitted
  by the core `ExplorerIndex` emitter at `quartz/plugins/emitters/explorerIndex.ts`).
  Both globals are defined as lazy getters in `quartz/components/renderPage.tsx`.
- Everything else (Explorer.tsx, OverflowList.tsx, styles, options) is
  untouched upstream code.

## Maintenance cost of this approach

This plugin no longer receives upstream updates automatically. If
`quartz-community/explorer` ships a bugfix or feature, it has to be
manually re-applied here:

1. Diff `local-plugins/explorer/src` against the latest upstream
   `quartz-community/explorer` source.
2. Re-apply the `fetchData` -> `treeData` change from this file's history.
3. `cd local-plugins/explorer && npm install --ignore-scripts && npm run build`
   to regenerate `dist/` (local plugin sources are symlinked as-is and are
   **not** rebuilt automatically by `quartz plugin install`; `dist/` must be
   committed pre-built).

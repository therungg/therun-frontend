# speedrun.com import — console pane (frontend)

Backend contract: `docs/frontend-guide-src-import.md` (dry-run phase; nothing commits to the live board).

## Placement

A new console section `import` ("Import from speedrun.com") in the Board group of `/games-v2/[game]/manage`,
visible when `canModerate || canConfigure` (backend `import-board` = any game/series mod/admin).
Tile on the front door + sidebar item, same as `reassign`.

## Files

- `types/src-import.types.ts` — mirror of the guide's types.
- `src/lib/src-import.ts` — `'use server'` apiFetch wrappers (no `'use cache'`: authed, live job state).
- `app/(new-layout)/games-v2/[game]/manage/src-import/`
  - `src-import-actions.ts` — server actions (session → lib), throw on missing session.
  - `use-src-import-job.ts` — poll `getJob` every 5 s until `done|failed`.
  - `src-import-pane.tsx` — URL form + job status + review tabs.
  - `review-tabs.tsx` — Categories / Variables / Players / Runs (filters + paging).
  - `src-import.module.scss`, tests next to files.
- Console wiring: `nav-model.ts` (id `import`), `nav-icons.ts`, `src/lib/console/vocabulary.ts`
  (label, tile copy, BOARD_PANES), `content-router.tsx`.

## Behaviour

- Pane mounts → `getJobAction(gameId)`; if a job exists show it; if `queued|running`, poll.
- Form: URL input → `startImportAction(gameId, url)` → 202 `{jobId}` → poll. Errors from `ApiError.message` shown inline (403/404/409 texts from the guide).
- Job `done` → review tabs load lazily per tab: categories/variables (arrays), players (matchKind filter, paged 100),
  runs (category + status filter, paged 100).
- Banner: "Dry run — nothing here changes the live board."

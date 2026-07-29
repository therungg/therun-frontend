# Leaderboard variables redesign — follow-ups

Date: 2026-07-29
Branch: `feat/variables-redesign` (frontend), `feat/variables-preview` (backend, deployed)

Findings raised during implementation and triaged as ship-as-is by the final whole-branch
review. None blocks merge. Kept because a finding that lives only in a review transcript
is a finding nobody acts on.

## Frontend

- `combinations-section.tsx:15` — `interface Combo` is hand-copied from
  `CombinationsResult['combinations'][number]`. Use the indexed type so drift becomes a
  compile error rather than something to notice by eye.
- `variables-section.tsx` — `formError` is write-only: it is reset but never set, so
  `VariableForm`'s `error` slot can never render. Either delete the state or route write
  errors back into the form.
- `variables-section.tsx` — `highlightId` is never cleared, so the "jumped here" marker
  persists for the component's lifetime and reappears on return to that tab.
- `variables-section.tsx` — the dirty-form confirm uses `window.confirm` where the house
  primitive is `BoardDialog`/`ConfirmDialog`. It also fires for an *open* form rather than
  a *dirty* one; the spec says dirty.
- `effective.ts:36` sorts by `sortOrder` alone while `variables-section.tsx` sorts by
  `sortOrder || name.localeCompare`. Every row defaults to `sortOrder: 0`, so the in-effect
  panel and the table routinely disagree on order.
- `variables-section.tsx` — `categoryDisplay` is passed live rather than captured with the
  scope, so a game-wide form's consequence sentence names whichever category happens to be
  selected.
- `variables-section.tsx` — `commitWrite` dead-ends silently if the form closed while the
  dialog was open (category switch): no write, no error, dialog stays open.
- `variables-section.tsx` — `refreshAll` has no request-ordering guard; a fast A→B category
  switch can settle the panel on A's data. Inherited pattern, but `merged` makes a wrong
  result more consequential now.
- `consequence-dialog.tsx` — destructive button uses raw `btn btn-danger`; the sibling
  `ConfirmDialog` deliberately routes through the `board-dialog-btn-danger` mixin because
  Bootstrap's `$danger` differs from the design system's `$accent-red`.
- The four variable action files repeat a ~15-line cache-revalidation block. Extract a
  helper. (Unchanged by this branch — pre-existing.)
- No render test for `InEffectPanel`. Its whole value is faithfulness to `toEffective`'s
  output; a test asserting that would guard it.

## Spec promise not implemented

- Spec §4 says the delete dialog should state "what happens to any sub-board rows keyed on
  the deleted variable's name". Deleting a subcategory variable invalidates every stored
  valid-combination key for the category. The preview *number* is correct — the combination
  set is fed into `planMovement` — but the dialog never says the managed sub-board list is
  about to become meaningless. No task in the plan covered it.

## Backend (`feat/variables-preview`, deployed)

- Third near-duplicate username→Postgres-id resolver (`api/leaderboards/handler.ts`,
  `api/game-mgmt/handler.ts`, `api/game-mgmt/variables-handler.ts`). Two are
  case-insensitive, one is not. Consolidate into `src/services/`.
- `handleInvalidateCache`'s per-game fallback swallows all errors from
  `checkGameMgmtPermission`, turning an infra failure into a 403 rather than a 500.
  Mirrors the existing convention, so not a regression.
- `combinations-handler.ts` — `categoryId === null ? sql`true` : eq(...)` is unidiomatic
  next to `scopeWhere`'s `isNull()`/`eq()` pattern in `valid-combinations-service.ts`.
- The move-up/down arrows fire two sequential non-atomic upserts. If the second fails,
  two rows share a `sortOrder` and only a toast reports it. The plan's out-of-scope section
  promised "transactional with revert on failure"; that was not delivered. Also: since
  every row defaults to `sortOrder: 0`, swapping two rows that both hold 0 writes 0 to both
  and the arrow silently does nothing.

## Owner's repo, noticed in passing

- `content-router.tsx:25-26` imports `CombinationsSection`/`VariablesSection` and uses
  neither — dead imports left by the console IA pane removal.
- `npm run lint` at the repo root fails: a nested `biome.json` inside
  `.claude/worktrees/console-category-ia/` makes Biome reject the whole run with "Found a
  nested root configuration". Remove the worktree when done, or add `.claude/worktrees` to
  the root config's ignore list.

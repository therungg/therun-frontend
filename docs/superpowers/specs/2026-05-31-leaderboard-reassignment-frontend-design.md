# Leaderboard Reassignment — Frontend Design

**Date:** 2026-05-31
**Status:** Approved design, pending implementation plan
**Backend:** Complete and deployed. See `docs/frontend-guide-leaderboard-reassignment.md` for the full API contract.

## Overview

Mods can merge a duplicate/near-duplicate game (or single category) into another via a **hard, audited, reversible bulk move**. The backend (`/reassignments/*`) is done. This spec covers the frontend: typed API wrappers, RBAC, the two mod-facing wizards, the status view, the global audit log, and the tombstone 301 redirects.

This is purely additive frontend work plus two small edits to existing resolve plumbing. No further backend work is required — the backend already exposes the redirect fields on the by-slug resolver (`redirectedToGameId`, `redirectedToSlug`) and surfaces `gameId` on `/v1/runs/games` rows.

## Locked decisions

- **Scope:** full feature, all 7 steps below, executed task-by-task in one session.
- **Placement — wizards + status:** inside the game console (`app/(new-layout)/games-v2/[game]/manage/`), gated by the reassign ability. Board-moderators work here and must be able to watch their own jobs complete, so the **status detail view lives in the console, not under `/admin`.**
- **Placement — audit log:** global, at `/admin/reassignments`, **admin-role-only** (consistent with the rest of `/admin`). Board-moderators reassign from the console but do not get the cross-game audit view.
- **Tombstone 301s:** in scope. Driven off the by-slug resolver fields (the reliable surface; pageData is async-rebuilt and may lag).

## Architecture & conventions (mirrors existing code)

- **API client:** `apiFetch<T>(path, { method, sessionId, body })` from `src/lib/api-client.ts`. Returns `json.result`; throws `ApiError(status, message, errors)`. Reassignment routes are served from `/reassignments/*` (no `/v1` prefix).
- **Session:** `getSession()` (`src/actions/session.action.ts`) returns a `User` directly; `session.id` is the bearer token.
- **RBAC:** `src/rbac/ability.ts` is a hand-maintained CASL mirror. Server checks via `defineAbilityFor(session).can(...)`; client gating via `<Can I="..." a="...">`.
- **Admin feature template:** `app/(new-layout)/admin/role-assignments/` — `page.tsx` (server: `getSession`, role gate via `notFound()`, fetch via lib, render client) → `*-client.tsx` (`'use client'`, `useTransition`, `react-toastify`) → `actions/*.action.ts` (`'use server'`, `getSession`, ability/role check, lib call, `revalidatePath`). Styles from `admin.module.scss` (`styles.page`, `.panel`, `.table`, `.btnPrimary`, `.btnDanger`, `.formGroup`, `.formInput`).
- **Game console:** `manage/page.tsx` resolves the game, computes `canModerate` / `canConfigure` / `canEditStandards`, renders `ConsoleShell`. Sidebar IA is a pure function in `console/nav-model.ts` (`buildNav(flags)`, `NavItemId`, `NavGroup`, `NavFlags`); panes are dispatched by a switch in `console/content-router.tsx`.
- **Caching:** `'use cache'` + `cacheLife()`/`cacheTag()`; invalidate with `revalidateTag(tag, profile)` (two args).

## Two corrections to the original frontend guide (verified against code)

1. **`ResolvedGame` has no redirect fields and `resolveGame` doesn't return them.** The type (`types/leaderboards.types.ts`) is `{ id, name, display, image?, defaultVerified?, primaryTiming? }`; `resolveGame` (`src/lib/games-v1.ts`) returns `{ id, name, display, image }` from `/v1/games/by-slug/:slug`. The backend now includes `redirectedToGameId` + `redirectedToSlug` on that endpoint, so the fix is frontend-only: add the two fields to the type and thread them through `resolveGame`.
2. **The game typeahead drops the id.** `searchGames()` / `GameSearchResult` (`src/lib/game-search.ts`) return `{ game (slug), display, image }` with no numeric id, but the reassignment API is all `gameId`/`categoryId`. The underlying `/v1/runs/games` rows already carry `gameId`; the fix is to stop dropping it in the client mapping.

## Modules

### New files
- `types/reassignments.types.ts` — types from the guide's reference block (`CategoryDecision`, `CategoryMappingEntry`, `SettingsDiffField`, `SettingsDiff`, `CategorySettingsDiffs`, `ReassignmentStatus`, `GameReassignment`, `CategoryReassignment`, `PreviewResult`).
- `src/lib/reassignments.ts` — typed wrappers for all 7 endpoints: `previewGameReassignment`, `createGameReassignment`, `getGameReassignment`, `undoGameReassignment`, `createCategoryReassignment`, `getCategoryReassignment`, `undoCategoryReassignment`, `listReassignments`.
- `app/(new-layout)/admin/reassignments/page.tsx` + `reassignments-client.tsx` + `actions/undo-reassignment.action.ts` — admin-only audit log.
- Console reassignment UI under `manage/reassignments/`: game wizard, category wizard, status-detail pane, and a `use-reassignment-status.ts` polling hook.

### Edited files
- `src/rbac/ability.ts` — add `'reassign'` to `actions`, `'reassignment'` to `subjects`; grant `can('reassign', 'reassignment')` in `board-admin` and `board-moderator` (`admin` inherits via its all-actions×all-subjects loop).
- `src/lib/game-search.ts` — add `id: number` to `GameSearchResult` and populate it.
- `types/leaderboards.types.ts` — add `redirectedToGameId?: number | null` and `redirectedToSlug?: string | null` to `ResolvedGame`.
- `src/lib/games-v1.ts` — `resolveGame` returns the two new fields from `lookup.result`.
- `manage/console/nav-model.ts` — add a `reassign` nav item under the `game` group and a `canReassign` flag to `NavFlags`; gate visibility on it.
- `manage/console/content-router.tsx` + `console-shell.tsx` + `manage/page.tsx` — compute `canReassign` (ability `can('reassign','reassignment')`), pass through, and route the new nav item to the wizard pane.
- `app/(new-layout)/games-v2/[game]/page.tsx` (and/or `game-page.tsx`) — when the resolved game has `redirectedToGameId != null`, issue a 301 (`permanentRedirect`) to `/games-v2/<redirectedToSlug>`.

## Ordered work items

1. **Foundation (no UI):** RBAC (`reassign`/`reassignment` + grants), `types/reassignments.types.ts`, `src/lib/reassignments.ts`, and `searchGames` id fix. Verify with typecheck.
2. **Audit log page** (`/admin/reassignments`, admin-only, read-only): server page → client that fetches `listReassignments`, merges the `games` + `categories` arrays client-side, sorts by `performedAt desc`. Row expand shows `categoryMapping` / `settingsDiffsAcknowledged`. Undo button when eligible (`status === 'completed'`, and for category rows `parentGameReassignmentId === null` — otherwise disabled with an "undo via parent" tooltip).
3. **Status detail pane + polling hook** (console, read-only): `use-reassignment-status.ts` polls `getGameReassignment`/`getCategoryReassignment` every 1500ms until `completed`/`failed`/`undone`; tolerates `pending` for the first ~3s without erroring. Pane shows lifecycle, `statusMessage` on failure, `runsMovedCount` on success, "View target game" + "Undo" on success. Wizards transition here after submit.
4. **Category-reassignment wizard** (console): target-category typeahead scoped to the source game (via `getCategoriesForGame`) → settings-diff acknowledgement (single pair; client-derived since backend exposes no category preview) → confirm → `createCategoryReassignment` → status pane.
5. **Game-reassignment wizard** (console): 5 steps — (1) target via game typeahead + `previewGameReassignment`; (2) category-mapping table with per-row merge/create/drop override (local state wins over preview); (3) settings-diff acknowledgement (must ack all to proceed; re-preview when step 2 changes); (4) impact summary + final confirm; (5) `createGameReassignment` → status pane. Surface preview `valid:false` error codes clearly (esp. `source_has_incoming`).
6. **Console entry points:** `canReassign` flag + nav item; wire `content-router` to the wizards. Game wizard from the game scope; category wizard from a category context.
7. **Tombstone 301s:** thread redirect fields through `ResolvedGame`/`resolveGame`; 301 the public game route to `redirectedToSlug` when present.

## Edge cases (from the guide — surface in UI)

- `source_has_incoming` → "X already has other games merged into it. Undo those first."
- Executor race → status `failed` with `statusMessage` (`tombstone_race`); offer restart.
- Zero source categories / all-drop → allowed; show "0 runs will be moved".
- Child category undo → disabled, "undo via the parent game reassignment" + link to parent.
- `runsMovedCount` reads 0 until `completed`/`undone`; don't show it as final during `pending`/`running`.

## Out of scope (explicit non-goals, per backend spec)

Reassigned-run profile badges; "we redirected your input" upload message; auto-created-category review queue; retroactive WR-history/rating-log rewrites. The schema supports some of these; UI is deferred.

## Testing

Typecheck (`npm run typecheck`) and lint (`npm run lint`) on every change. Unit-test pure logic where it exists (the `nav-model` visibility function; the category-mapping reducer). Manual mod-flow walkthrough for each wizard. No UI test runner is configured in the repo; confirm during implementation before claiming coverage.

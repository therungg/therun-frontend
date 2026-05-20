# Frontend Integration Guide: Leaderboard Reassignment

## Overview

Mods can merge a duplicate or near-duplicate game (or single category) into another. This is a **hard merge**: all existing runs are physically moved, the source becomes a redirect tombstone, and future LiveSplit uploads of the old name resolve to the new game automatically. The action is fully reversible via an undo log.

This guide covers everything the frontend needs to wire up the mod-facing wizard, the audit log view, and the user-visible side effects (redirected URLs).

**Backend status:** complete and deployed. The endpoints below all exist on the backend (`therun/src/api/reassignments/handler.ts`). The wizard UI and audit log page are the remaining frontend work.

**Reference backend docs:**
- Spec: `../../therun/docs/superpowers/specs/2026-05-20-leaderboard-reassignment-design.md`
- Plan: `../../therun/docs/superpowers/plans/2026-05-20-leaderboard-reassignment.md`

---

## Concepts you need to know

### "Reassignment" not "alias"

Pre-existing `game_aliases` / `category_aliases` tables were a stalled first attempt. They've been removed entirely. Don't reach for them — they're gone. The replacement is **reassignment**: a one-shot, audited, reversible bulk move.

### Two kinds of reassignment

| Kind | What it does |
|---|---|
| **Game reassignment** | Source game's runs + all its categories move to a target game. Source becomes a redirect tombstone. Categories on source not on target get created on target (flagged `auto_created`). |
| **Category reassignment** | One source category's runs move to one target category, within the same game. Source category becomes a redirect tombstone. |

There is no concept of cross-game category reassignment as a first-class operation — that happens implicitly as part of a game reassignment.

### Redirect tombstones

When a game is reassigned:
- The source `games_pg` row is **kept** but flagged with `redirected_to_game_id` and `redirected_at`.
- Resolver (`resolveGame(name)`) automatically follows the redirect — future incoming runs with the old name land on the target.
- The source's URL/slug should 301 to the target (frontend has to wire this).
- The source must not appear in listings, search results, or be submittable.

Same model for tombstoned categories: `redirected_to_category_id`, `redirected_at`.

A category can also be tombstoned with `redirected_to_category_id = NULL` and `redirected_at` set — this is a "drop" tombstone (no leaderboard at the destination; the source still has its runs but is hidden).

### No chains

A row can only be the *source* of a reassignment if it has no active *incoming* reassignments. This is enforced server-side. The UI should expose the resulting error clearly: "This game has X other games merged into it; undo those first to chain."

### No user-initiated reassignments

Mods only. Users who want their runs in a different leaderboard either fix their LiveSplit game name or ask a mod. The wizard should be visible only to `board-admin` and `board-moderator` (see [Permissions](#permissions)).

---

## Permissions

CASL action `"reassign"` on subject `"reassignment"`. Granted to:
- `board-admin`
- `board-moderator`

Per-game mods (`game-admin`, `game-mod`, etc.) **cannot** reassign. The action is intentionally global.

UI gating:

```tsx
<Can I="reassign" a="reassignment">
  <button>Reassign this game…</button>
</Can>
```

Backend re-checks the ability on every endpoint — never rely on UI gating alone.

---

## API Contract

Base URL is `${process.env.NEXT_PUBLIC_DATA_URL}`. All routes require `Authorization: Bearer <sessionId>`. Success returns `{ result: <data> }`; errors return `{ error: "<message>" }`.

> **Note on URL prefix:** The reassignment endpoints are served from `/reassignments/*` rather than `/v1/reassignments/*` (the rest of the API uses `/v1/`). This is because AWS API Gateway REST API doesn't support multi-segment base path mappings on custom domains. The endpoints behave identically to v1 endpoints in every other respect (same auth, response shape, etc.).

### 1. Preview a game reassignment

`POST /reassignments/games/preview`

**Body:**
```ts
{ sourceGameId: number, targetGameId: number }
```

**Success (`200`):**
```ts
{
  result: {
    valid: true,
    mapping: CategoryMappingEntry[],
    diffs: CategorySettingsDiffs[],
  }
}
```

**Validation failure (`200` with `valid: false`):**
```ts
{
  result: {
    valid: false,
    errors: { code: string, message: string }[],
  }
}
```

Possible error codes: `source_equals_target`, `source_not_found`, `source_tombstoned`, `target_not_found`, `target_tombstoned`, `source_has_incoming`.

**Types:**
```ts
type CategoryMappingEntry = {
  sourceCategoryId: number;
  decision: "merge" | "create" | "drop";
  targetCategoryId: number | null; // non-null for merge; null for create (filled at execute time) and drop
  autoCreated: boolean;             // true when decision === "create"
};

type SettingsDiffField =
  | "primaryTiming" | "hideRealTime" | "hideGameTime"
  | "requireVideo" | "requireVideoTopN" | "isExtension"
  | "isMain" | "sortAscending" | "showMilliseconds" | "variables";

type SettingsDiff = {
  field: SettingsDiffField;
  source: unknown;
  target: unknown;
};

type CategorySettingsDiffs = {
  sourceCategoryId: number;
  targetCategoryId: number;
  diffs: SettingsDiff[];
};
```

**Frontend usage:** call this when the mod picks a target in step 1 of the wizard. Pre-fills the category-mapping screen.

### 2. Create a game reassignment

`POST /reassignments/games`

Inserts a pending reassignment row, enqueues SQS execution, returns immediately.

**Body:**
```ts
{
  sourceGameId: number,
  targetGameId: number,
  categoryMapping: CategoryMappingEntry[],          // the mod's final decisions (possibly edited from preview)
  settingsDiffsAcknowledged?: CategorySettingsDiffs[], // acknowledgements (echo of the diffs the mod confirmed)
}
```

**Success (`200`):**
```ts
{ result: { id: number, status: "pending" } }
```

**Errors:** validation errors return `400` with `error: "Invalid: <codes>"`. Forbidden returns `400` (the codebase uses 400 for auth failures; we don't return 403 here). User not found in DB returns `400`.

After this returns, the actual move runs asynchronously in the executor Lambda. Poll `GET /reassignments/games/:id` until `status` transitions to `completed` or `failed`.

### 3. Get game reassignment status

`GET /reassignments/games/:id`

**Success (`200`):**
```ts
{
  result: {
    id: number;
    sourceGameId: number;
    targetGameId: number;
    performedBy: number;
    performedAt: string;        // ISO timestamp
    undoneBy: number | null;
    undoneAt: string | null;
    categoryMapping: CategoryMappingEntry[];
    settingsDiffsAcknowledged: CategorySettingsDiffs[] | null;
    status: "pending" | "running" | "completed" | "failed" | "undoing" | "undone";
    statusMessage: string | null;
    runsMovedCount: number;
  }
}
```

**Not found:** `404` with `error: "Reassignment not found"`.

### 4. Undo a game reassignment

`POST /reassignments/games/:id/undo`

**Body:** none.

**Success:** `{ result: { id, undone: true } }`.

**Failure:** `400` with `error: "Undo failed: <reason>"`. Common reasons:
- `already_undone`
- `unexpected_status:<status>` (e.g., trying to undo something `failed` or `pending`)
- `not_found`

Note: standalone undo of a *child* category-reassignment (one that was created as part of a game reassignment) is refused with reason `undo_via_parent`. Use the parent game undo instead.

### 5. Create a category reassignment

`POST /reassignments/categories`

**Body:**
```ts
{
  sourceCategoryId: number,
  targetCategoryId: number,
  settingsDiffsAcknowledged?: CategorySettingsDiffs[],
}
```

`gameId` is derived server-side from the source category. Both source and target must be under the same game.

**Success:** `{ result: { id, status: "pending" } }`.

**Validation errors:** same shape as game reassignment, with codes including `different_games`.

### 6. Get / undo category reassignment

`GET /reassignments/categories/:id` and `POST /reassignments/categories/:id/undo` follow the same shape as game endpoints.

### 7. Audit log list

`GET /reassignments?limit=50`

Returns the most recent N game and category reassignments, sorted by `performed_at desc`. Limit defaults to 50, max 200.

**Success:**
```ts
{
  result: {
    games: GameReassignment[];      // (full row shape from endpoint 3)
    categories: CategoryReassignment[];
  }
}
```

Note: the two lists are returned separately, not merged into a single timeline. If the audit log UI wants a unified stream, merge and sort client-side.

---

## Status lifecycle

```
pending ──► running ──► completed ──► undoing ──► undone
                ╰─► failed
```

- **pending**: row inserted by API, SQS message en route.
- **running**: executor Lambda picked it up, transaction in progress.
- **completed**: transaction committed.
- **failed**: validation or transaction error. `statusMessage` has the reason.
- **undoing**/**undone**: undo lifecycle.

The wizard should poll the status endpoint every 1-2s after creation. Typical completion is sub-second for small games, but very large games may take several seconds. Failed state should surface the `statusMessage` so the mod knows what to fix (e.g., another mod raced them and tombstoned the source first).

---

## UI specification

### Where it lives

`app/(new-layout)/admin/reassignments/` — sibling to the existing `admin/role-assignments`, `admin/exclusions`, etc. Page should be hidden via the layout if the user lacks `reassign` on `reassignment`.

Suggested routes:
- `/admin/reassignments` — audit log (default landing)
- `/admin/reassignments/new/game?source=<id>` — game-reassignment wizard
- `/admin/reassignments/new/category?source=<id>` — category-reassignment wizard
- `/admin/reassignments/games/:id` — status detail page (also the page the wizard transitions to after submit)
- `/admin/reassignments/categories/:id`

Entry points to the wizards: a "Reassign…" action on the game-management page (next to "Archive game") and on the category-management page (next to "Archive category"), gated by the `Can` component.

### Game-reassignment wizard

Five steps in a single Server Components + Client Components hybrid page.

**Step 1 — Pick target.**
- Reuse the existing game typeahead component (look for one in `src/components/` — probably used in role-assignment UI).
- On selection, fire `POST /reassignments/games/preview`.
- If `valid: false`, render the errors and offer to cancel or pick a different target. Don't proceed.

**Step 2 — Category mapping.**
- Render the `mapping` array as a table with one row per source category:
  - Source category name (left).
  - Decision pill: `Merge into "<target name>"` / `Create on target as new` / `Drop (no leaderboard)`.
  - Per-row "Change" button. On click, open a popover with three radio options:
    - Merge into <typeahead of target's existing categories>
    - Create on target (uses source's settings; will appear as `auto_created`).
    - Drop.
  - Show `autoCreated` tag for create-decisions.
- Each change updates a local `mapping` state copy. Server preview is reference; user overrides win.

**Step 3 — Settings diffs.**
- Render `diffs` array. Group by source/target category pair.
- For each pair, show a side-by-side table: field name, source value, target value, with the differing fields highlighted.
- A single "I understand" checkbox per pair (or per field — your call; the backend just stores the raw acknowledgement object verbatim).
- The mod must acknowledge ALL diffs to proceed.
- If the mod changes a decision in Step 2 (e.g., merge → create), re-fetch preview or recompute diffs client-side. Simplest: refetch preview whenever the user navigates back to Step 2 and changes anything.

**Step 4 — Preview impact.**
- For each source category being touched, show:
  - Decision
  - Count of runs to move (frontend can compute this from `pageData` or query `/v1/games/:sourceId` for category run counts; backend doesn't precompute a count for preview — `runsMovedCount` only gets populated post-execution).
- Big "Confirm reassignment" button. Show a final "this cannot be undone except via the audit log" disclaimer.

**Step 5 — Execution.**
- Submit `POST /reassignments/games`.
- Transition to the status detail page (`/admin/reassignments/games/:id`).
- Poll every 1500ms via `GET /reassignments/games/:id` until status is `completed`, `failed`, or `undone`.
- On `completed`: show success banner with `runsMovedCount`. Offer "View target game" link. Offer "Undo" button (immediately available).
- On `failed`: show `statusMessage` in red. Offer "Try again" (which re-runs preview).

### Category-reassignment wizard

Same shape, simpler: just two categories within one game, no category-mapping step. Steps:
1. Pick target category (typeahead scoped to the source's game).
2. Settings diff acknowledgement (single pair).
3. Confirm.
4. Status poll.

### Audit log page

Two-column layout:
- Left: filter sidebar (kind: game/category, status, mod, date range — all optional).
- Right: timeline of entries.

Each entry: `<mod username>` `<merged/undid>` `<source>` → `<target>` `<run count>` `<relative time>`. Click to expand: shows the `categoryMapping` and `settingsDiffsAcknowledged` snapshots, plus an Undo button if eligible (status === "completed", not parent-bound for child category rows).

Merge the two response arrays into a single sorted list client-side.

### Tombstoned game page

If `pageData` ever exposes `redirected_to_game_id` (it should — confirm with backend), the game page route should:
- On `pageData.game.redirected_to_game_id !== null`: render a 301 (server-side) to the target game's URL.
- Fallback (if the redirect target itself can't be resolved): render a "this game was merged into <target>" notice with a manual link. Should never happen because backend forbids chains, but defensive UI is cheap.

If `pageData` does not currently surface `redirected_to_game_id`: open a small backend follow-up — `rebuildGamePageData` should include this field on the `game` block.

### Auto-created category review queue

A future enhancement (not v1): the target game's mod page could show a "Imported categories needing review" section listing categories with `auto_created: true`. Each row offers Rename / Delete / Mark as reviewed. Schema supports this today (`categories.auto_created`); UI is deferred.

---

## Implementation order (recommended)

If you're implementing this fresh:

1. **Endpoint wrappers in `src/lib/`** — write typed wrappers for all 7 endpoints. Pattern matches existing `lib/games.ts` / `lib/roles.ts`.
2. **CASL ability mirror** — make sure `src/rbac/ability.ts` on the frontend has `reassign` + `reassignment` registered, matching the backend.
3. **Audit log page** first — read-only, exercises the `GET /reassignments` endpoint, validates the data model. No mutation risk.
4. **Status detail page** — also read-only, polling. Used by both wizards as their landing.
5. **Category-reassignment wizard** — smaller scope, fewer steps. Good warm-up.
6. **Game-reassignment wizard** — the full five-step flow.
7. **Tombstone 301s** — small, late.

Each of 3-6 should be its own PR.

---

## Edge cases to handle in UI

| Case | UI behavior |
|---|---|
| Mod tries to reassign source A → B, but A has incoming reassignments | Backend returns `source_has_incoming`. Show: "X already has other games merged into it. Undo those first." |
| Two mods racing same source | First wins. Second sees executor return `tombstone_race` (status will be `failed`). Surface the `statusMessage`. |
| Preview shows zero source categories | Allowed — source game has no categories. The reassignment will only tombstone the game, no runs to move. UI can still complete; show "0 runs will be moved." |
| All decisions = "drop" | Allowed. Source becomes tombstoned, all source categories also tombstoned with NULL target. Runs stay attached to source rows (now hidden). |
| Polling shows `status: "failed"` | Show `statusMessage`. Offer "Restart wizard" button. Failed rows stay in the audit log; do not auto-delete. |
| Undo button on a child category-reassignment (`parentGameReassignmentId !== null`) | Disable it. Tooltip: "Undo via the parent game reassignment." Show a "Go to parent" link. |
| Auto-created category accumulated runs from another reassignment after the original | On undo of the original, that target category survives (won't be deleted). UI should reflect this in the undo preview: "the new category `<name>` will be kept because other reassignments now use it." (Backend handles the actual logic.) |
| Game with hundreds of thousands of runs | Backend executes synchronously in one transaction for v1. May take seconds. Status will stay `running` longer. No frontend change — just keep polling. (Chunked execution is a noted backend follow-up.) |

---

## What the backend does NOT do (your scope or future work)

These are explicit non-goals from the spec — surface them in the UI appropriately:

1. **No badge on the user's profile / leaderboard row saying "this run was reassigned."** Schema supports it (`run_reassignment_history` is populated), but the badge UI is deferred.
2. **No "we redirected your input X to Y" message on splits upload.** Resolver does the redirect silently; users find out only by clicking into their run.
3. **No frontend wizard for managing per-game moderators.** (Existing role-assignments flow handles that separately.)
4. **No retroactive WR-history rewrite.** If a merge changes who held a WR on a given date, `wr_history` rows are left as-is. The leaderboard reflects the post-merge state.
5. **No `rating_log` follow.** The `rating_log` table is keyed by text game/category names (not IDs), so it doesn't get updated by reassignments. A user's rating history will reference the pre-merge name string forever. If this becomes user-visible, file a follow-up.
6. **No undo-with-blockers UX.** Undo is structurally always permissible at v1 — the only "blocker" is the auto-created category preservation rule, which is invisible to the user (it just kept the cat). No "this can't be undone because…" cases exist yet.

---

## Quick reference — types you'll want in `types/`

```ts
// types/reassignments.types.ts

export type CategoryDecision = "merge" | "create" | "drop";

export type CategoryMappingEntry = {
  sourceCategoryId: number;
  decision: CategoryDecision;
  targetCategoryId: number | null;
  autoCreated: boolean;
};

export type SettingsDiffField =
  | "primaryTiming" | "hideRealTime" | "hideGameTime"
  | "requireVideo" | "requireVideoTopN" | "isExtension"
  | "isMain" | "sortAscending" | "showMilliseconds" | "variables";

export type SettingsDiff = {
  field: SettingsDiffField;
  source: unknown;
  target: unknown;
};

export type CategorySettingsDiffs = {
  sourceCategoryId: number;
  targetCategoryId: number;
  diffs: SettingsDiff[];
};

export type ReassignmentStatus =
  | "pending" | "running" | "completed"
  | "failed" | "undoing" | "undone";

export type GameReassignment = {
  id: number;
  sourceGameId: number;
  targetGameId: number;
  performedBy: number;
  performedAt: string;
  undoneBy: number | null;
  undoneAt: string | null;
  categoryMapping: CategoryMappingEntry[];
  settingsDiffsAcknowledged: CategorySettingsDiffs[] | null;
  status: ReassignmentStatus;
  statusMessage: string | null;
  runsMovedCount: number;
};

export type CategoryReassignment = {
  id: number;
  sourceCategoryId: number;
  targetCategoryId: number | null;
  gameId: number;
  parentGameReassignmentId: number | null;
  performedBy: number;
  performedAt: string;
  undoneBy: number | null;
  undoneAt: string | null;
  settingsDiffsAcknowledged: CategorySettingsDiffs[] | null;
  status: ReassignmentStatus;
  statusMessage: string | null;
  runsMovedCount: number;
};

export type PreviewResult =
  | { valid: true; mapping: CategoryMappingEntry[]; diffs: CategorySettingsDiffs[] }
  | { valid: false; errors: { code: string; message: string }[] };
```

---

## Quick reference — endpoint wrapper sketch

```ts
// src/lib/reassignments.ts
import { apiFetch } from "./api-client";
import type {
  GameReassignment, CategoryReassignment,
  CategoryMappingEntry, CategorySettingsDiffs, PreviewResult,
} from "../../types/reassignments.types";

export async function previewGameReassignment(
  sourceGameId: number,
  targetGameId: number,
  sessionId: string,
): Promise<PreviewResult> {
  return apiFetch("/reassignments/games/preview", {
    method: "POST",
    sessionId,
    body: { sourceGameId, targetGameId },
  });
}

export async function createGameReassignment(
  body: {
    sourceGameId: number;
    targetGameId: number;
    categoryMapping: CategoryMappingEntry[];
    settingsDiffsAcknowledged?: CategorySettingsDiffs[];
  },
  sessionId: string,
): Promise<{ id: number; status: string }> {
  return apiFetch("/reassignments/games", { method: "POST", sessionId, body });
}

export async function getGameReassignment(
  id: number,
  sessionId: string,
): Promise<GameReassignment> {
  return apiFetch(`/reassignments/games/${id}`, { method: "GET", sessionId });
}

export async function undoGameReassignment(
  id: number,
  sessionId: string,
): Promise<{ id: number; undone: true }> {
  return apiFetch(`/reassignments/games/${id}/undo`, { method: "POST", sessionId });
}

// Same shape for categories: previewCategory (not exposed by backend — derive on client),
// createCategoryReassignment, getCategoryReassignment, undoCategoryReassignment.

export async function listReassignments(
  limit = 50,
  sessionId: string,
): Promise<{ games: GameReassignment[]; categories: CategoryReassignment[] }> {
  return apiFetch(`/reassignments?limit=${limit}`, { method: "GET", sessionId });
}
```

Adapt the `apiFetch` signature to match your existing wrapper's argument shape.

---

## Common gotchas

- **`category_mapping` is jsonb** on the backend. The TS type tells you the structure but it arrives as a parsed JS object/array, not as a string. Don't double-parse.
- **`performedAt` is an ISO string** when serialized via JSON. Convert to Date with `new Date(performedAt)` if you need to format relative times.
- **Status polling can return `pending` for a beat** if the SQS message hasn't been picked up yet. Don't show errors for the first 2-3 seconds of `pending`.
- **`runsMovedCount` is 0 until execution completes.** During `pending`/`running` it reads as 0; only `completed`/`undone` rows have the real count.
- **Tombstoned games still appear in `games_pg`.** Any list endpoint that queries `games_pg` directly without filtering on `redirected_to_game_id IS NULL` will leak tombstones. Confirm with backend that all list endpoints filter (the search-Algolia path and `/v1/games` should — but verify before you ship).

---

## Open questions / contact points

- Should `pageData.game` include `redirectedToGameId` for the 301 redirect? Confirm with backend before implementing tombstone redirect.
- Frontend RBAC may need the `reassign` action added to its CASL `actions` const if your `src/rbac/ability.ts` is a hand-maintained mirror of the backend's. Check.
- The audit log endpoint returns games and categories as two separate arrays. If we want a unified timeline view, decide whether merging happens client-side (simplest) or via a future unified endpoint.

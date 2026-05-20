# Admin Exclusions — Frontend Integration Guide

Excludes runs from leaderboards and stats. Rules are managed at `/admin/exclusions` via the backend API. All endpoints require an authenticated session with the `admin` role (permission: `moderate admins`).

## Rule shapes

A rule has a `type` and a `targetId`. For `type='user'`, two optional scope fields narrow the rule to a specific game or category. Other types ignore the scope fields.

| `type` | `targetId` references | `gameId` | `categoryId` | Effect |
|---|---|---|---|---|
| `user` | `users.id` | `null` | `null` | Excludes the user **everywhere**. |
| `user` | `users.id` | `gameId` | `null` | Excludes the user **from that game only**. |
| `user` | `users.id` | `gameId` | `categoryId` | Excludes the user **from that one category**. `gameId` must be the category's game. |
| `game` | `games.id` | — | — | Excludes the entire game. |
| `category` | `categories.id` | — | — | Excludes the entire category. |
| `run` | `finished_runs.id` (PG) | — | — | Excludes one specific run. |

Excluded runs are hidden from leaderboards, user stats, and aggregate views. The backend materializes the decision onto each affected row (`speedrun_runs.excluded`, `finished_runs.excluded`, `activity_daily.excluded`) so reads stay fast.

## When to use each shape

- **Ban a cheater everywhere** → `type='user'` no scope.
- **Ban a runner from one game** (drama in that community, but their other-game runs are legit) → `type='user'` + `gameId`.
- **Ban a runner from a single category** (one disputed category only) → `type='user'` + `gameId` + `categoryId`.
- **Pull a whole game off the platform** → `type='game'`.
- **Mothball a deprecated category** → `type='category'`.
- **Nuke a single problematic run** without restricting the runner → `type='run'`.

Multiple rules can apply to the same row. If any one of them matches, the row stays excluded — deleting one rule won't un-exclude rows that another rule still covers.

## Endpoints

All paths are admin-only and require `Authorization: Bearer {sessionId}`.

### `GET /admin/exclusions[?type=user|game|category|run]`

List rules. Optional `type` filter.

```ts
// Response (array, NOT wrapped in result)
ExclusionRule[]

interface ExclusionRule {
  id: number;
  type: 'user' | 'game' | 'category' | 'run';
  targetId: number;
  gameId: number | null;       // only set for type='user' with scope
  categoryId: number | null;   // only set for type='user' with category scope
  reason: string | null;
  excludedBy: number;           // users.id of the admin who created the rule
  createdAt: string;            // ISO timestamp
}
```

### `POST /admin/exclusions`

Create a new rule. The backend `propagateExclusion` step sets `excluded=true` on every matching row in `speedrun_runs`, `finished_runs`, and `activity_daily` before returning.

```ts
// Request body
{
  type: 'user' | 'game' | 'category' | 'run';
  targetId: number;             // required
  gameId?: number;              // optional; only valid for type='user'
  categoryId?: number;          // optional; only valid for type='user'; requires gameId
  reason?: string;              // optional
}

// Response: the created rule (same shape as the list endpoint)
```

Validation rules — the backend rejects with 4xx if any of these fail. The frontend should mirror them in the form before submit:

| Condition | Failure message |
|---|---|
| `type` missing or not one of the four valid values | `"type must be one of: user, game, category, run"` |
| `targetId` missing or non-numeric | `"targetId must be a number"` |
| `gameId` or `categoryId` set when `type !== 'user'` | `"gameId/categoryId scope is only valid for type='user'"` |
| `gameId` set but not a number | `"gameId must be a number"` |
| `categoryId` set but not a number | `"categoryId must be a number"` |
| `categoryId` set without `gameId` | `"categoryId requires gameId"` |
| `targetId` doesn't exist (the user / game / category / run row is missing) | `"{type} with id {targetId} not found"` (404) |
| `categoryId` doesn't belong to `gameId` | `"category {C} belongs to game {G}, not {provided}"` |
| A rule with the same `(type, targetId, gameId, categoryId)` already exists | DB unique-constraint error (500) — UI should prevent this via the list |

Note on category resolution: if you pass `categoryId` *without* `gameId`, the backend currently rejects. Always send both — fetch the category's `gameId` from the categories API and include it.

### `DELETE /admin/exclusions/{ruleId}`

Delete a rule. The backend `unpropagateExclusion` step clears `excluded` on rows that aren't covered by any other rule.

```ts
// Response
{ deleted: true }
```

Returns 404 if the rule doesn't exist.

## UI flow

The form's "scope" section should be conditional on `type`:

```
Type: [ user | game | category | run ]   ← required

If type === 'user':
  Scope: ( ) Global  ( ) Per game  ( ) Per category
    if "Per game" or "Per category" → Game picker (searchable)
    if "Per category"               → Category picker (filtered by the chosen game)

If type === 'game'      → Game picker (single)
If type === 'category'  → Game picker + Category picker
If type === 'run'       → Run ID input

Reason: [text]                              ← optional, shown to mods, audit-logged
```

Pickers should use the existing game/category search components (`apiFetch('/games', ...)` and `apiFetch('/games/{game}/categories', ...)` or whatever the project conventions use).

The list view should show each rule's full scope clearly:

```
[user]  notallowed_user_123                                       (global ban)        — Delete
[user]  someone_else  in  Super Mario 64                          (per-game)          — Delete
[user]  third_person  in  Super Mario 64 / 70 Star                (per-category)      — Delete
[game]  Some Cheater Game                                                              — Delete
```

Group by `type` and within `type='user'` group by scope so admins can scan quickly.

## Side effects to know about

- Creating or deleting a rule fires `refreshGameStats()` asynchronously. Game-stats numbers shown elsewhere in the UI may lag a few seconds after a mutation.
- The Redis leaderboard cache is **not** invalidated by exclusion changes. If a board needs to reflect the change immediately, call `POST /v1/leaderboards/invalidate-cache/{gameId}` (board-admin or admin) after the exclusion mutation. Otherwise the cache TTL (1h) will refresh it on its own.
- New runs ingested after rule creation are checked against the rules at insert time (`sync-runs-to-postgres` → `isExcluded`). A runner banned from a game can keep submitting; their submissions will just land with `excluded=true` and never show on the board.
- Run-level exclusion (`type='run'`) is a hard delete from view but the row stays in the DB. Use it sparingly — bulk-rejecting via the leaderboard mod queue is usually the better tool for run-by-run cleanup.

## Audit trail

Every create and delete writes a row to `logs` with:

- `action`: `create_exclusion` / `delete_exclusion`
- `entity`: the rule's `type`
- `target`: the rule's `targetId` (as a string)
- `data`: `{ reason, gameId, categoryId }` — the full scope is recorded so deletions remain interpretable later.

Admins can review this via existing log-viewing UI if any.

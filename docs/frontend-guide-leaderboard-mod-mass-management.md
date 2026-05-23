# Leaderboard Mod Mass-Management — Frontend Integration Guide

Per-game moderators can now view eligible runs along two axes and bulk-exclude or bulk-include them. All endpoints live under `/leaderboards/games/{gameId}/...` and are gated by `verify-reject-run` permission on the game (the same RBAC check that already gates `POST /leaderboards/{verify,reject}/{runId}`).

Every endpoint requires `Authorization: Bearer {sessionId}`. The caller's Twitch username is resolved server-side to a numeric `users.id` for permission checks and audit logging — the frontend just sends the session.

## Mental model

There are two ways to act on runs:

- **Rule** (declarative, future-proof): a row in `exclusion_rules` that says "user X is excluded from game Y" or "user X is excluded from category Z of game Y". The backend cascades `excluded=true` to every matching `finished_runs` row now and to any matching run uploaded in the future. Deleting the rule un-excludes those rows (unless another rule still covers them).
- **Ad-hoc runs** (snapshot): flip `excluded=true` on a specific set of `finished_runs.id`s. Future runs are unaffected.

Prefer rules when the selection has a clean "shape" (all of user X in game Y, all of user X in category Z). Fall back to ad-hoc when the selection is arbitrary.

A blast-radius **preview** endpoint exists for both shapes — call it before committing to show the mod which leaderboards will shift and by how much.

## Eligibility predicate

Everywhere in this guide, "eligible" means: `leaderboard_eligible=true AND excluded=false AND verification_status<>'rejected'`. Already-excluded runs are not returned by query endpoints and are not counted by preview.

## Endpoints

### `GET /leaderboards/games/{gameId}/users/{userId}/eligible-runs`

All of one runner's eligible runs in one game. Flat list — group client-side by `categoryId` / `subcategoryKey` to render trees.

Includes live rank and total runners pulled from the Redis leaderboard cache (per the category's primary timing).

```ts
// Response: 200 OK
type Response = Array<{
  runId: number;
  categoryId: number;
  categoryName: string;
  subcategoryKey: string;            // "" when no subcategory
  time: number | null;               // ms
  gameTime: number | null;           // ms
  primaryTiming: "realtime" | "gametime";
  verificationStatus: "unverified" | "verified" | "rejected";
  vodUrl: string | null;
  endedAt: string;                   // ISO timestamp
  isLeaderboardEntry: boolean;       // best-per-user on RT
  isLeaderboardEntryGt: boolean;     // best-per-user on GT
  rank: number | null;               // 1-based; null if not on the live board
  totalRunners: number | null;
}>
```

### `GET /leaderboards/games/{gameId}/categories/{categoryId}/eligible-runs`

The leaderboard roster: all eligible runs in this `(game, category)`, ordered by `(subcategoryKey ASC, time ASC, id ASC)`. Pagination via `limit`/`offset`. Includes guest runners (rows where `userId` is null).

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `subcategoryKey` | string | Filter to one subcategory. Pass empty string for the no-variables subcategory. |
| `verificationStatus` | `"unverified" \| "verified" \| "rejected"` | Server rejects unknown values silently (treated as no filter). |
| `hasVod` | `"true" \| "false"` | Defensively parsed — anything other than these two strings is ignored. |
| `runnerName` | string | Case- and space-insensitive substring match via `convertToSearchable` (the same helper used for game lookups). |
| `endedAfter` | ISO timestamp | Inclusive. |
| `endedBefore` | ISO timestamp | Inclusive. |
| `limit` | number | Default 500, max 2000. |
| `offset` | number | Default 0. |

```ts
type Response = Array<{
  runId: number;
  userId: number | null;             // null for guest runners
  runnerName: string;
  subcategoryKey: string;
  time: number | null;
  gameTime: number | null;
  verificationStatus: string;
  vodUrl: string | null;
  endedAt: string;
  isLeaderboardEntry: boolean;
  isLeaderboardEntryGt: boolean;
}>
```

### `GET /leaderboards/games/{gameId}/exclusion-rules`

Lists active `exclusion_rules` rows that apply to this game. Only `type='user'` rules with `game_id = {gameId}` are surfaced — global rules (game-wide bans across the platform) are admin-managed and intentionally hidden here.

Newest first.

```ts
type Response = Array<{
  ruleId: number;
  type: "user";
  targetId: number;                  // users.id of the banned user
  targetDisplayName: string;         // falls back to "user#<id>" if user was deleted
  categoryId: number | null;         // null when the rule covers the whole game
  categoryName: string | null;
  reason: string | null;
  excludedBy: number;                // users.id of the mod who created it
  excludedByName: string;
  createdAt: string;                 // ISO
}>
```

Delete via the `DELETE` endpoint below — there is no PATCH; recreate with a new reason if you need to change one.

### `GET /leaderboards/games/{gameId}/mod-actions`

Audit log feed scoped to this game. Returns rows from the `logs` table whose target traces back to this `gameId` via:
- a `finished_runs.id` in this game (for `exclude_run` / `include_run`), OR
- an `exclusion_rules.id` whose `game_id = {gameId}` (for `exclude_via_rule`), OR
- a `delete_exclusion_rule` log whose snapshot `data.gameId` matches.

Newest first. Cascaded exclusions from rule writes (rows the backend auto-touches when a rule is created) do **not** appear here — only mod-initiated actions do. The rule that triggered the cascade does appear.

Query params:

| Param | Type | Default | Cap |
|---|---|---|---|
| `days` | number | 90 | 365 |
| `limit` | number | 100 | 500 |
| `offset` | number | 0 | — |

```ts
type Response = Array<{
  logId: number;
  userId: number;                    // the mod
  actorName: string;                 // falls back to "user#<id>"
  action: "exclude_run" | "include_run" | "exclude_via_rule" | "delete_exclusion_rule";
  entity: "finished_run" | "exclusion_rule";
  target: string | null;             // run id or rule id, stringified
  remark: string | null;             // the reason the mod gave
  data: Record<string, unknown>;     // shape varies by action — see below
  timestamp: string;                 // ISO
}>
```

`data` shapes:
- `exclude_run` / `include_run`: `{ gameId }`
- `exclude_via_rule`: `{ ruleId, type, targetId, gameId, categoryId }`
- `delete_exclusion_rule`: `{ type, targetId, gameId, categoryId }` (rule snapshot — the rule row is gone)

### `POST /leaderboards/games/{gameId}/exclude/preview`

**Read-only.** Same body shape as the exclude endpoint — returns the blast radius without writing.

This is the highest-value endpoint for the UX. Use it to render an "are you sure?" sheet that shows mods exactly which leaderboards shift before they commit.

```ts
// Request body — same as POST /exclude, except `reason` is NOT required
type RequestBody =
  | { runIds: number[] }
  | { rule: { type: "user"; targetId: number; categoryId: number | null } };
```

```ts
type Response = {
  affectedRunCount: number;
  affectedLeaderboards: Array<{
    categoryId: number;
    categoryName: string;
    subcategoryKey: string;
    affectedInThisLeaderboard: number;
    rankChanges: Array<{
      runnerName: string;
      userId: number | null;
      currentRank: number;           // 1-based
      newRank: number | null;        // null = falls off the board
      time: number | null;
      gameTime: number | null;
    }>;
  }>;
  sampleRuns: Array<{                // capped at 25
    runId: number;
    runnerName: string;
    categoryName: string;
    subcategoryKey: string;
    time: number | null;
  }>;
};
```

**Caveat:** `rankChanges` orders the board by realtime (`time ASC`) for all categories. For gametime-primary categories the displayed rank deltas reflect RT ranks, not GT ranks. Tracked as a follow-up; safe to ship the UI now and assume RT ranks are "close enough" for the preview.

### `POST /leaderboards/games/{gameId}/exclude`

The exclude action. Accepts either body shape. Always requires `reason` (min 10 chars after trim).

```ts
type RequestBody =
  | { runIds: number[]; reason: string }
  | { rule: { type: "user"; targetId: number; categoryId: number | null }; reason: string };
```

If you send both `runIds` and `rule`, `runIds` wins (the ad-hoc branch takes precedence — but don't rely on this; pick one).

**runIds form:** flips `excluded=true` and `ineligible_reason='mod_override'` on the matching runs. Writes one `logs` row per affected run. Cross-game guard: a runId from another game is silently ignored (not counted in `affectedRunCount`).

```ts
// Response (runIds form)
type Response = {
  affectedRunCount: number;
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
};
```

**Rule form:** creates an `exclusion_rules` row with `type='user'`, `target_id=targetId`, `game_id={gameId}` (always pinned from the URL — body cannot override), and optional `category_id`. The backend cascades `excluded=true` to every matching `finished_runs` row. Idempotent on the unique key — if a matching rule already exists, returns `{ ruleId, alreadyExists: true }` and writes no new log row.

```ts
// Response (rule form)
type Response = { ruleId: number; alreadyExists: boolean };
```

If `categoryId` doesn't belong to the game, returns 400 with an `ExclusionScopeError` message.

### `POST /leaderboards/games/{gameId}/include`

Inverse of the runIds form of exclude. **No rule form** — to delete a rule, use the DELETE endpoint.

```ts
// Request
type RequestBody = { runIds: number[]; reason: string };

// Response
type Response = {
  affectedRunCount: number;
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
};
```

Sets `excluded=false` and clears `ineligible_reason` only when it was `mod_override` (a `below_minimum` ineligibility is preserved). Same cross-game guard as exclude.

### `DELETE /leaderboards/games/{gameId}/exclusion-rules/{ruleId}`

Deletes a rule, un-propagating `excluded=true` from rows the rule covered (only where no other rule still covers them).

Body required (yes — DELETE with a body):

```ts
type RequestBody = { reason: string };  // min 10 chars
```

```ts
// Response
type Response = {
  deleted: true;
  reinstatedRunCount: number;        // runs flipped back from excluded to eligible
  affectedLeaderboards: Array<{ categoryId: number; subcategoryKey: string }>;
};
```

Status codes:
- 404 if the rule doesn't exist.
- 403 if the rule's `game_id` is `null` (global / admin-managed) or doesn't match the URL `gameId`. Mods cannot touch global rules.

## Reason validation

Every write endpoint requires `reason` as a string with **at least 10 characters after trim**. Server returns 400 with `"reason is required (min 10 characters)"` if missing or too short. Display this min-length hint in the textarea.

## Rule-shape detection (UI-side suggestion)

When the mod multi-selects N runs in the roster view, inspect the selection client-side to recommend the right action:

- All N runs share `userId` and `categoryId` → primary CTA: *"Create rule: exclude this user from this category (covers future runs)"*. Secondary CTA: *"Exclude only these N runs"*.
- All N runs share `userId` but span multiple categories → primary CTA: *"Create rule: exclude this user from this game"*. Secondary CTA: *"Exclude only these N runs"*.
- Mixed users → only *"Exclude these N runs"* is offered (no rule shape fits).

Always call `/exclude/preview` before committing either action and surface the rank deltas.

## Undo flow

The mod-actions feed gives you everything needed for client-side undo:

- A `logs` row with `action: 'exclude_via_rule'` → undo by calling `DELETE /exclusion-rules/{target}` (the `target` field is the rule id).
- A `logs` row with `action: 'exclude_run'` → undo by calling `POST /include` with `runIds: [parseInt(target)]`.
- Same for `include_run` → call `POST /exclude` with the same runId.
- `delete_exclusion_rule` → undo by re-creating the rule via `POST /exclude` with the snapshot in `data`.

The server has no time window on undo — it'll accept the inverse op forever. The UI should hide the undo button on log rows older than 24h.

## Error responses

Common status codes:

- **400** — invalid input (missing `reason`, `runIds` not an array, `rule.type !== 'user'`, malformed gameId in path, `categoryId` from a different game).
- **403** — not authenticated, or authenticated but lacking `verify-reject-run` on this game, or trying to delete a global rule.
- **404** — rule not found by id.
- **501** — path matched the mass-mgmt prefix but no method/route inside handles it (shouldn't happen with this guide — if it does, it's a routing bug).

Bodies on error responses are plain text (the helpers used internally return `{ statusCode, body: message }` without JSON-wrapping). Don't `JSON.parse` error bodies.

## Known follow-ups not implemented

- Gametime-primary categories' rank deltas in preview use RT ordering. Acceptable for the first cut.
- `subcategoryLabel` (human-readable subcategory name) is not joined into any response — only the raw `subcategoryKey` is returned. If you need the label, you can either render the key directly or join client-side against the existing variable-definitions endpoint per category.

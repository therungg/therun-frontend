# Frontend Integration Guide: Leaderboard Variables

## What changed

The variables system has been refactored. The frontend currently still talks to the **old** API contract (SHA-256 `subcategoryHash`, `var_*` query prefix, `type`/`values: string[]`/`defaultValue`/`required`, separate alias tables). The backend now uses a **plain-text `subcategoryKey`** with inline-aliased value buckets, `role`/`values: string[][]`/`defaultValueIndex`, and admin endpoints that upsert by name. This guide is the new contract.

Skim "Migration cheat sheet" at the bottom for the diff. The rest of the doc treats the new API as canonical.

## Overview

Leaderboard variables define how a category's runs are partitioned into separate boards (subcategory variables) and how runners can refine results within a board (filter variables). Two scopes:

- **Game-wide** (`categoryId = null`) — applies to every category in the game.
- **Category-specific** (`categoryId = <id>`) — applies only to that category.

When the two scopes collide on `nameNormalized`, the **category-specific definition overrides the game-wide one** wholesale.

Surfaces:

| Surface | Endpoint | Auth | Purpose |
|---|---|---|---|
| Public read (merged) | `GET /v1/leaderboards/{game}/{category}/variables` | none | Render the leaderboard filter UI. Returns the merged list + reserved-param list + valid-combinations status. |
| Admin CRUD | `GET|POST|PUT|DELETE /v1/games/:gameId/variables` | session | Manage definitions across all scopes for a game. POST and PUT both **upsert by `(gameId, categoryId, nameNormalized)`** — same handler. |
| Admin combinations | `GET|PUT /admin/combinations/:gameId[/:categoryId]` | session | List the Cartesian product of subcategory combos + valid flags; replace the valid set. |
| Run submit | `POST /leaderboards/submit` | session | Submit a guest run; response carries `warnings` for unmatched variable values. |

Admin responses use `{ result: ... }`. Errors return a string body with the matching HTTP status (400/403/404/500). Auth header: `Authorization: Bearer <sessionId>`.

---

## Data Model

### `VariableRow` (admin) / public read entry

The admin CRUD endpoint and the public `/variables` endpoint return rows with the same shape (the public surface excludes unpublished versions):

```typescript
interface VariableRow {
  id: number;
  gameId: number;
  categoryId: number | null;          // null = game-wide
  name: string;                        // display label, e.g. "Platform"
  nameNormalized: string;              // URL filter key — lowercase, whitespace + `=`/`|` stripped
  role: 'subcategory' | 'filter';
  values: string[][];                  // array of buckets; each bucket is a list of accepted aliases; first entry is canonical display
  defaultValueIndex: number | null;    // 0-based index into `values`. NOT NULL when role === 'subcategory'
  sortOrder: number;
  description: string | null;
  version: number;                     // monotonic per (gameId, categoryId, nameNormalized)
  published: boolean;                  // exactly one published row per name per scope
}
```

**There is no `type` field, no `defaultValue` (string), and no `required` flag in the new API.** If your code still references those, it's reading the old shape — see Migration cheat sheet.

### How values work

`values` is a list of buckets. A bucket is a list of accepted strings; the first one is the canonical display form.

```typescript
values: [
  ["Nintendo 64", "n64", "nin64"],   // canonical: "Nintendo 64"
  ["Virtual Console", "VC"],         // canonical: "Virtual Console"
  ["Emulator", "emu", "emulator"],   // canonical: "Emulator"
]
```

Any of `"N64"`, `"n64"`, `"nin64"`, `" N 64 "`, etc., resolve to the same bucket. The server's canonical-normalized value (lowercase, whitespace + `=`/`|` stripped on the first entry) is what's stored: `"nintendo64"`. This is also what shows up in `subcategoryKey` for subcategory variables and in `finished_runs.variables` JSONB for filter variables.

### Missing values

Subcategory variables are effectively always "required" — if a run is missing one, the def's `defaultValueIndex` bucket is substituted, and a `missing_default_used` warning is emitted on submit.

Filter variables are always optional — missing means "no filter applied" for that run.

The legacy `required: boolean` field is gone. There is no path where a missing variable rejects a run.

### Merge rule (public read)

For `(gameId, categoryId)`:

1. All `published=true` rows where `categoryId IS NULL` for the game.
2. All `published=true` rows where `categoryId = <id>`.
3. If `nameNormalized` collides between the two scopes, the category-specific row wins (every field, not just `values`).
4. Sort by `sortOrder`.

The public `/variables` endpoint already applies the merge. The admin endpoint does not — it returns rows scoped by whatever you pass.

---

## Public Endpoint

### `GET /v1/leaderboards/{game}/{category}/variables`

Returns the merged variable list, the reserved query-param names, and the valid-combinations status.

```typescript
// Response
{
  variables: VariableRow[];   // see shape above; sortOrder-sorted
  reservedParams: string[];   // names that cannot be used as variables: combined, verified, country, year, page, pagesize, timing, view
  validCombinations:
    | { mode: 'open' }                            // no rows in valid_subcategory_combinations for this scope — every Cartesian combo is valid
    | { mode: 'managed'; keys: string[] };        // only listed keys are valid leaderboards; each key is a sorted plain-text "name=value|name=value"
}
```

**Auth:** None.

**Caching:** `'use cache'` with tag `game-vars:{gameSlug}:{categorySlug}`. After any admin write call, revalidate the tag for the affected category (or every category of the game when the change was game-wide).

**Use it to build:**
- The board picker — render each `role: 'subcategory'` variable as a select/radio of its `values` buckets. Default-select the bucket at `defaultValueIndex`.
- The filter row — render each `role: 'filter'` variable as a multiselect or pill control.
- A "valid leaderboards" hint when `validCombinations.mode === 'managed'` — only the listed combos are real boards; disable or hide impossible combos in the UI.

---

## Leaderboard queries — the new query-param contract

`GET /v1/leaderboards/{game}/{category}?<varname>=<value>[&combined=1]&page=...&pageSize=...&timing=...&verified=...`

Key changes from the legacy contract:

| Old | New |
|---|---|
| `?subcategory={hash}` | Pass each subcategory variable as `?<name>=<value>` (omitted = use default) |
| `?subcategory=*` (combined) | `?combined=1` |
| `?var_platform=N64` (filter) | `?platform=N64` (no `var_` prefix) |
| Client computes SHA-256 of `name=value\|...` | **Don't.** The server builds `subcategoryKey` from the params. Delete `src/lib/leaderboard-hash.ts`. |

Subcategory variable values you don't pass fall back to the def's `defaultValueIndex` bucket. To get the default board, pass nothing. To target a non-default board, pass each subcategory variable's chosen value.

Values are case- and whitespace-insensitive — `?platform=N64`, `?platform=n64`, `?platform=%20N%2064%20` all hit the same board, and the cache key is the canonical normalized form so they all share one Redis entry.

### 404 on invalid combination

If `validCombinations.mode === 'managed'` and the computed `subcategoryKey` isn't in the valid set, the endpoint returns 404 with:

```json
{ "error": "leaderboard does not exist", "validCombinations": ["platform=n64|region=us", ...] }
```

The frontend should surface this — show a "this combination has no leaderboard" message and link to the suggestions in `validCombinations`. `?combined=1` bypasses the check.

### Run details

`GET /v1/leaderboards/runs/{runId}` now returns `subcategoryKey: string` (not `subcategoryHash`). The frontend `RunDetail` type needs to follow.

`GET /v1/leaderboards/user/{userId}/rankings` returns entries with `subcategoryKey: string` too.

---

## Admin Endpoints

All admin endpoints require:

- `Authorization: Bearer <sessionId>`
- The user must hold `edit-customizations` on the game (`game-mod`, `game-admin`, any `series-*`, or `global-admin`). Applies to both game-wide and category-specific changes — there is no separate per-category permission.

Audit log entries are written for every mutation under `entityType: "leaderboard_variable"` with actions `create | update | delete` (and `valid_combinations.replace` for the combinations endpoint).

### `GET /v1/games/:gameId/variables[?categoryId=N]`

List variable defs for one scope. `categoryId` omitted/empty = the game-wide (`categoryId IS NULL`) rows. A specific `categoryId` = that category's rows only. To get **both** scopes for a page, make two requests (or fetch the merged public list for the public surface).

```typescript
{ result: VariableRow[] }
```

Sorted by `(sortOrder ASC, name ASC)`.

**Errors:** 400 if `gameId` missing/invalid. 403 if the caller lacks permission.

### `POST /v1/games/:gameId/variables` (and `PUT` — identical)

Upsert a variable. POST and PUT both call the same handler, which looks up the existing row by `(gameId, categoryId, nameNormalized)` and bumps `version`. There is **no per-id `PUT /v1/games/:gameId/variables/:variableId`** in the new contract — upsert is by name.

```typescript
// Request body
{
  categoryId?: number | null;       // null/omitted = game-wide
  name: string;                     // display label; max 64 chars after trim
  role: 'subcategory' | 'filter';
  values: string[][];               // non-empty array of buckets; each bucket non-empty; first entry = canonical
  defaultValueIndex?: number | null; // required (0-based) when role === 'subcategory'
  sortOrder?: number;
  description?: string | null;
}

// Response
{ result: VariableRow }
```

**Validation errors (400):**

- `name is required` / `name max 64 chars` / `name must contain alphanumeric characters`
- `'<name>' is a reserved name` (collides with one of `reservedParams`)
- `role must be one of: subcategory, filter`
- `values must be a non-empty array of buckets`
- `values[i] must be a non-empty array of strings`
- `value '<x>' (normalized '<n>') collides with another value in this variable`
- `subcategory variable requires defaultValueIndex within values range`
- `A variable with this name already exists for this scope` (duplicate-after-normalization)

**Side effects:**

- Marks the prior `published=true` row for the same `(gameId, categoryId, nameNormalized)` as `published=false`, inserts new row with bumped `version`, `published=true`. Both writes happen in a transaction.
- `vdefs:{gameId}:{categoryId}` Redis cache cleared. `lb:{gameId}:*` leaderboard caches cleared.
- Audit log entry written.

**What does NOT happen:** existing finished runs are **not** re-resolved against the new defs. `rawVariables` is preserved on each run so a future migration can re-resolve, but there's no live worker. (The background-migration plan was reverted.) Mods should expect some entry-flag drift after a structural change until a re-resolve mechanism ships.

### `DELETE /v1/games/:gameId/variables`

Delete by name. Body:

```typescript
{
  categoryId?: number | null;
  name?: string;
  nameNormalized?: string;   // either name or nameNormalized is required
}
```

Returns `{ result: { deleted: true } }`. Same cache invalidation + audit logging as upsert. Same "no automatic re-resolution" caveat.

### `GET /admin/combinations/:gameId[/:categoryId]`

List the full Cartesian product of subcategory combinations for the scope, each tagged valid/invalid.

```typescript
{
  combinations: { subcategoryKey: string; valid: boolean }[];
  mode: 'open' | 'managed';
}
```

`mode: 'open'` — no rows in `valid_subcategory_combinations` for this scope, every combo is valid. `mode: 'managed'` — only the listed valid ones are real boards.

Use this to render a combination-management UI: a grid of all possible combos with toggles for which are real leaderboards. Pair it with the public `/variables` response (which includes `validCombinations` for the same scope) on read-side pages.

### `PUT /admin/combinations/:gameId[/:categoryId]`

Replace the valid-combination set.

```typescript
// Body
{ subcategoryKeys: string[] }   // each a sorted plain-text key, e.g. "platform=n64|region=us"
```

Invalidates `vcomb:*` cache; audit-logged. Migration of runs that fall into newly-invalid combos is explicitly deferred — they keep their old `subcategoryKey` until a re-resolve mechanism ships. New-ingest runs land in the default combo with a warning.

---

## Submit response — warnings

`POST /leaderboards/submit` returns the inserted run plus a `warnings` array populated from variable resolution:

```typescript
{
  id: number;
  runnerName: string;
  time: number;
  warnings: {
    nameNormalized: string;              // "" for combination-level warnings
    submitted: string;                   // user's raw value (or the computed key for combination warnings)
    resolved: string;                    // what got used
    reason:
      | 'no_match_default_used'            // subcategory; user's value didn't match any bucket — default substituted
      | 'missing_default_used'             // subcategory; user omitted the variable — default substituted (silent in UI typically)
      | 'no_match_filter_dropped'          // filter; user's value didn't match — variable absent from filter set
      | 'combination_invalid_default_used'; // computed subcategoryKey wasn't in the managed valid-combination set — substituted to default combo
  }[];
}
```

Render rules:

- `no_match_default_used` → show the runner what they submitted vs. what was used. e.g. *"`platform: BLABLABLA` isn't a recognized value. Your run was placed on the default board (Platform: **Nintendo 64**)."*
- `missing_default_used` → typically silent; this is the normal case for runners who don't set a variable.
- `no_match_filter_dropped` → informational. *"Filter `region: blablabla` was ignored."*
- `combination_invalid_default_used` → important. *"The combination you submitted isn't an active leaderboard for this game. Your run was placed on the default board."*

The run is always accepted and stored regardless of warnings.

---

## Caching

The frontend reads variables from the public `/variables` endpoint with `'use cache'` and tag `game-vars:{gameSlug}:{categorySlug}`. After any admin write:

- A variable mutation affects every category if the change was game-wide → revalidate `game-vars:{gameSlug}:*` for every category, or revalidate the tag pattern.
- A category-scoped change → revalidate `game-vars:{gameSlug}:{categorySlug}` only.
- A combinations mutation → revalidate the same tag for the affected scope.

Leaderboard query caching is the backend's concern (Redis sorted sets keyed by canonical params). Frontend cache tags for leaderboard pages should include the canonical normalized form of the variable values, not the raw URL form, to avoid double-caching `?platform=N64` and `?platform=n64`.

---

## Page Architecture (recommendation)

The existing `/games-v2/[game]/manage` page is the natural home. A "Leaderboard Variables" section with two sub-tabs:

1. **Game-wide** — rows where `categoryId === null`. Always visible.
2. **Category-specific** — rows for the currently selected category. When a name overlaps a game-wide row, indicate "Overrides game-wide" inline.

Fetch via two `GET /v1/games/:gameId/variables` calls (one with no `categoryId`, one with the active category). Alternatively, fetch each scope independently per tab.

After every write, refetch the list and revalidate `game-vars:...` tags for the affected scope.

For combinations management, add a sibling section that fetches `GET /admin/combinations/:gameId/:categoryId` and renders the Cartesian grid with valid/invalid toggles.

---

## Form Field Reference

| Field | Input | Notes |
|---|---|---|
| `name` | text | Display label. The URL filter key is derived as `nameNormalized` (lowercase, whitespace + `=`/`|` stripped). Cannot collide with reserved params (`reservedParams` from the public `/variables` response). |
| `role` | radio | `subcategory` (splits into separate boards via `subcategoryKey`) vs `filter` (refines a board view at read-time). Make the implication clear in copy — they're not interchangeable. |
| `values` | repeating bucket editor | Each bucket is a list of aliases (first is canonical display). Most variables only need one alias per bucket; add aliases when LiveSplit submissions vary. Bucket entries must be unique after normalization. |
| `defaultValueIndex` | dropdown over `values` | Required when `role === 'subcategory'`. Pick which bucket runs default into when the variable is missing or unrecognized. |
| `sortOrder` | number | Lower = earlier in the merged list and filter row. |
| `description` | text | Optional mod-facing note. Not user-visible. |
| `scope` | radio (create-only) | Game-wide vs Category. Disable on edit — to move scopes, delete + recreate. |

---

## Permission Checking on the Frontend

```typescript
canPerform(userRoleOnGame, 'edit-customizations');
```

Resolve the user's role from `pageData.roles` for the game (and any series-inherited roles). The role-mapping table in `frontend-guide-game-category-management.md` is canonical. Hide all create/edit/delete buttons when the check fails.

---

## Typical Flows

### Flow: add a game-wide platform filter

1. Open game manage → Leaderboard Variables → Game-wide tab.
2. Add a row: `role = filter`, `name = Platform`, `values = [["PC"],["PS5"],["Switch"]]`.
3. `POST /v1/games/:gameId/variables` with `{ categoryId: null, name: "Platform", role: "filter", values: [["PC"],["PS5"],["Switch"]] }`.
4. On 200, refetch the list. Revalidate `game-vars:<game>:<category>` for every category of the game.
5. Public leaderboard pages now show a Platform filter on every category. Existing runs that submitted `platform: ...` will start appearing under filters once they pass through any future re-resolve.

### Flow: category override with different values

1. Category-specific tab, select the category.
2. Add a row with the same `name = Platform` but a different `values` array.
3. `POST` with `categoryId = <id>`. Server enforces uniqueness within scope on `nameNormalized`.
4. On the public endpoint, that category's filter now shows the override. Other categories still get the game-wide row.

### Flow: enable combination management

1. Open the Combinations section for the category.
2. `GET /admin/combinations/:gameId/:categoryId` to fetch all possible combos with valid flags. First time around, `mode === 'open'` and every combo is marked valid.
3. Toggle off the combos that aren't real leaderboards.
4. `PUT /admin/combinations/:gameId/:categoryId` with `{ subcategoryKeys: [<the valid ones>] }`.
5. The public `/variables` response for the scope now returns `validCombinations.mode === 'managed'`. Frontend leaderboard pages should:
   - Hide / disable invalid combos in the board picker.
   - Catch 404 with `{ validCombinations }` from `GET /leaderboards/{game}/{category}?...` and offer the listed alternatives.

### Flow: remove a subcategory variable

1. Confirm with the user — existing runs **will not** be re-resolved. Their `subcategoryKey` will still contain the removed variable until a re-resolve mechanism is run.
2. `DELETE /v1/games/:gameId/variables` with `{ categoryId, name }`.
3. Backend invalidates caches. New runs ingest under the simplified key. Old runs keep their stale key — they're effectively on a board that no longer matches the def. Surface this as a known caveat in the admin UI.

---

## Audit Log Actions

| Action | Description |
|---|---|
| `leaderboard_variable.create` | Variable created |
| `leaderboard_variable.update` | Variable edited (any field — `upsertVariable` bumps `version` on every save) |
| `leaderboard_variable.delete` | Variable deleted |
| `valid_combinations.replace` | Combinations set replaced for a scope |

Diffs record old/new values across `name`, `role`, `values`, `defaultValueIndex`, `sortOrder`, `description`, `version`, `published`. On create the `old` side is empty; on delete the `new` side is empty.

---

## Migration cheat sheet (frontend code → new contract)

Frontend files currently on the old shape:

| File | What's wrong | What to change |
|---|---|---|
| `types/leaderboards.types.ts` — `VariableDef` | Has `type`, `kind?`, `values: string[]`, `defaultValue`, `required` | Replace with `role: 'subcategory' \| 'filter'`, `values: string[][]`, `defaultValueIndex: number \| null`, drop `required`, drop `type`. Add `nameNormalized`, `description`, `version`, `published`. |
| `types/leaderboards.types.ts` — `VariableRow` | Same drift as above | Same change. |
| `types/leaderboards.types.ts` — `RunDetail`, `UserRanking` | `subcategoryHash: string` | Rename to `subcategoryKey: string`. |
| `types/leaderboards.types.ts` — `VariablesResponse` | Only has `variables` | Add `reservedParams: string[]` and `validCombinations: { mode: 'open' } \| { mode: 'managed'; keys: string[] }`. |
| `types/leaderboards.types.ts` — `ResolvedCategory` | Has `defaultSubcategoryHash` | Legacy field; backend still has the column but it points to the new key value. Either rename to `defaultSubcategoryKey` or drop client-side — the server fills defaults itself when subcategory variables are omitted from the query. |
| `src/lib/leaderboards-v1.ts` — `LeaderboardQuery` | Has `subcategoryHash`; builds `?subcategory=<hash>` and `?var_<name>=...` | Drop `subcategoryHash`; build query string as `?<name>=<value>` for each chosen variable, optionally `&combined=1`. |
| `src/lib/leaderboards-v1.ts` — `getLeaderboard` | Doesn't handle 404 with `validCombinations` | Catch 404, parse body, surface `validCombinations` to the caller. |
| `src/lib/leaderboards-v1.ts` — `getWrHistory` | Takes `subcategoryHash` arg | Rename to `subcategoryKey` (string value); the query param name on the wire is still `subcategory` for backwards compatibility, the value is the plain-text key. |
| `src/lib/leaderboard-hash.ts` | Computes SHA-256 of `name=value\|...` client-side | **Delete the file.** No more client-side hashing. The server builds `subcategoryKey` from the variable params on the query string. |
| `src/lib/leaderboard-variables.ts` — `CreateVariableInput`/`UpdateVariableInput` | Has `type: VariableType`, `values: string[]`, `defaultValue`, `required` | Switch to `role`, `values: string[][]`, `defaultValueIndex`. Drop `required`. |
| `src/lib/leaderboard-variables.ts` — `updateGameVariable` | PUTs to `/v1/games/:gameId/variables/:variableId` | Backend has no per-id endpoint anymore. Upsert via POST or PUT to `/v1/games/:gameId/variables` — server keys by `(gameId, categoryId, nameNormalized)`. |
| `src/lib/leaderboard-variables.ts` — `deleteGameVariable` | DELETE to `/v1/games/:gameId/variables/:variableId` | DELETE to `/v1/games/:gameId/variables` with body `{ categoryId?, name }` or `{ categoryId?, nameNormalized }`. |
| `app/(new-layout)/games-v2/[game]/types.ts` — `activeFilters.subcategoryHash` | Old key name | Rename to `subcategoryKey`. |
| `app/(new-layout)/games-v2/[game]/data.ts` | Computes/passes `subcategoryHash` | Pass the user's chosen subcategory variable values directly through to the leaderboard fetch; the server handles `subcategoryKey` derivation. |

After the type and lib changes, the UI components consuming them (`games-v2/[game]/filters/*`, `manage/*`, `sidebar/*`, `drawers/wr-history-drawer.tsx`, etc.) will need follow-up — they all read these types and pass the legacy values through. None of them is wrong in shape, just in the field names they reach for.

---

## Known Limitations / Backend Follow-ups

1. **No background re-resolve worker.** Existing finished runs keep their old `variables`/`subcategoryKey` after a def change until something explicitly re-syncs them. `rawVariables` preserves the user input so a future job can fix it up. The originally-planned background-migration system (with `variable_migrations` table + worker + `activeMigration` field on `/variables`) was reverted before launch. Frontend should not poll for an `activeMigration` field — it isn't there.
2. **No `?subcategory=<key>` shortcut on leaderboards.** The legacy `subcategory` query param is **only** still accepted on `wr-history` (where it carries the plain-text key, not a hash). On the main leaderboard endpoint, pass each subcategory variable's value as its own param.
3. **No automatic migration when a combination becomes invalid.** Runs in newly-invalidated combos keep their old `subcategoryKey` until re-resolved. Surface this in the UI when toggling combos off.
4. **`NULLS NOT DISTINCT` is not set on the unique index.** Uniqueness for game-wide rows is enforced in app code. A racing concurrent write can still hit a transient duplicate — handle the 400 with `"A variable with this name already exists for this scope"` gracefully.
5. **No bulk import / reorder endpoints.** Reorder one row at a time by re-PUTting with a new `sortOrder`.

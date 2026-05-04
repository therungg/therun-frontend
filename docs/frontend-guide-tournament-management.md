# Tournament Management API — Frontend Integration Guide

This document describes how the frontend should consume the new `/v1/tournaments/...` endpoints. It covers data shapes, auth, permission checks, error handling, and per-feature flows.

## Base URL

Same host as the existing API. Replace `/tournaments/...` calls with `/v1/tournaments/...`. Legacy `/tournaments/...` routes still work but now return a `Deprecation: true` header and a `Link: </v1/tournaments>; rel="successor-version"` header. Treat the legacy routes as a fallback only.

## Auth

All mutating endpoints require:

```
Authorization: Bearer {sessionId}
```

GET endpoints for listing/reading are public unless otherwise noted. The session is the same one used everywhere else (Twitch OAuth → DynamoDB-backed session).

## Heats

A tournament has two heat dimensions:

- **`eligibleRuns`** — one or more `{ game, category }` combos. At least one is required.
- **`eligiblePeriods`** — one or more `{ startDate, endDate }` ranges. At least one is required, and **periods must not overlap globally** (no parallel/overlapping heats).

The tournament's overall window is **derived** from the periods:

- `startDate = min(eligiblePeriods.startDate)`
- `endDate = max(eligiblePeriods.endDate)`

These are computed by the server on create and on every update that includes `eligiblePeriods`. Clients should treat `startDate` / `endDate` on the `Tournament` shape as **read-only**; sending them in a request body has no effect.

In the UI, a "heats" editor should let admins manage `eligibleRuns` and `eligiblePeriods` as two distinct lists:

- Add/remove `(game, category)` rows.
- Add/remove `(startDate, endDate)` rows, with client-side overlap and ordering checks before submit (the server enforces this too — see error UX).

## Data shapes

### `Tournament`

```ts
interface Tournament {
  id: number;                       // present once stored in postgres
  name: string;                     // primary identifier (URL-encoded in paths)
  description: string;              // required
  rules?: string[];
  socials?: {
    twitch?: Social;
    twitter?: Social;
    youtube?: Social;
    discord?: Social;
    facebook?: Social;
    matcherino?: Social;
  };
  startDate: string;                // ISO 8601 — derived (server-computed; read-only)
  endDate: string;                  // ISO 8601 — derived (server-computed; read-only)

  admins: string[];                 // per-tournament admins (twitch usernames)
  staff: StaffEntry[];              // capability-scoped staff

  // Heats: a tournament has one or more (game, category) combos and one or more
  // date ranges. Together these form the heats. Both arrays are required and
  // editable.
  eligibleRuns: { game: string; category: string }[];   // ≥1; game/category combos
  eligiblePeriods: { startDate: string; endDate: string }[]; // ≥1; non-overlapping
  eligibleUsers: string[] | null;   // null = open to everyone (subject to ban list)
  ineligibleUsers: string[] | null; // banned users
  url?: string;
  pointDistribution?: number[] | null;
  customRuns?: { user: string; date: string; time: string }[] | null;
  excludedRuns: { user: string; startedAt: string }[];
  gameTime?: boolean;
  logoUrl?: string;
  minimumTimeSeconds?: number;
  shortName?: string;
  forceStream?: string;
  moderators?: string[];            // twitch usernames
  hide: boolean;                    // archived/hidden tournaments
  qualifier?: string;
  parentTournamentName?: string;
  parentTournamentSequence?: number;
  raceId?: string;
  gameImage?: string;
  organizer?: string;

  lockedAt?: string | null;         // if set, no new runs accepted
  finalizedAt?: string | null;      // if set, tournament is closed
  leaderboards?: any;               // computed on read by GET /v1/tournaments/{name}
}

interface Social {
  display: string;
  urlDisplay: string;
  url: string;
}

type Capability =
  | "manage_runs"
  | "manage_participants"
  | "edit_settings"
  | "manage_staff"
  | "lifecycle";

interface StaffEntry {
  user: string;                     // twitch username
  capabilities: Capability[];
}
```

### `Participant`

Synthesized from `eligibleUsers` and `ineligibleUsers`:

```ts
type ParticipantStatus = "eligible" | "banned";
```

## Permission model

Three permission sources, in order of precedence:

1. **Global `admin` role** — full power on all tournaments, only role allowed to:
   - `DELETE /v1/tournaments/{name}`
   - `POST/DELETE /v1/tournaments/{name}/admins[/{user}]` (manage per-tournament admins)

2. **Per-tournament admins** (`tournament.admins[]`) — implicit access to every capability except managing other admins. Can do everything else (settings, staff, participants, runs, lifecycle).

3. **Per-tournament staff** (`tournament.staff[]`) — only the listed capabilities.

Plus one global role for tournament creation:

4. **`tournament-creator`** — can `POST /v1/tournaments`; otherwise no implicit access.

### Frontend permission helpers

Implement these client-side to render or hide UI controls. Source-of-truth is server-side; the helpers are for UX only.

```ts
function isGlobalAdmin(user: User): boolean {
  return user.roles?.includes("admin") ?? false;
}

function isTournamentAdmin(user: User, t: Tournament): boolean {
  return isGlobalAdmin(user) || t.admins.includes(user.user);
}

function hasCapability(user: User, t: Tournament, cap: Capability): boolean {
  if (isTournamentAdmin(user, t)) return true;
  return t.staff.some(s => s.user === user.user && s.capabilities.includes(cap));
}

function canCreateTournament(user: User): boolean {
  return user.roles?.includes("admin") || user.roles?.includes("tournament-creator");
}

function canDeleteTournament(user: User): boolean {
  return isGlobalAdmin(user);
}

function canManageAdmins(user: User): boolean {
  return isGlobalAdmin(user);
}
```

Use these to render gates such as:

```tsx
{hasCapability(currentUser, tournament, "manage_runs") && (
  <AddCustomRunButton onClick={...} />
)}
```

When a server response is `403`, the body shape is:

```json
{ "error": "missing capability: manage_runs" }
```

Treat this as authoritative; show the user a generic "you don't have permission to do this" message.

## Endpoint reference

All mutating bodies are JSON. All responses are `{ result: ... }` for `200`s (this is what the existing `respond()` helper produces) or a `{ error: string }` / `{ errors: string[] }` shape for failures. **Note:** server responses are wrapped in `{ result }`. Existing fetch wrappers in the frontend that already unwrap `result` for legacy `/tournaments` should continue to work for `/v1/tournaments`.

### List & read

```
GET /v1/tournaments
→ 200 { result: Tournament[] }   // hidden tournaments excluded

GET /v1/tournaments/{name}
→ 200 { result: Tournament }     // includes computed leaderboards
→ 404 { error: "..." }
```

### Create

```
POST /v1/tournaments
Authorization: Bearer ...
Body: Partial<Tournament>        // name, eligibleRuns, eligiblePeriods, etc.
```

- Caller must have global `admin` role OR `tournament-creator` role.
- Caller's username is automatically added to `admins[]` if `admins` is omitted/empty in the body.
- **Tournament `startDate` / `endDate` are derived** — `startDate = min(periods.startDate)`, `endDate = max(periods.endDate)`. Anything sent in the body for these fields is ignored.
- Returns the created tournament with `id`, `startDate`, and `endDate` populated.

#### Create form fields

The create tournament form should expose the following fields:

**Mandatory**

| Field | Type | Notes |
|---|---|---|
| `name` | string | Primary identifier; URL-encoded in paths. Must be unique. |
| `description` | string | Free-form description of the tournament. |
| `eligiblePeriods` | `{ startDate, endDate }[]` | At least 1. Each period needs `startDate < endDate`. All periods must be globally non-overlapping. The tournament's overall window is derived from these. |
| `eligibleRuns` | `{ game, category }[]` | At least 1. Each combo must have a non-empty `game` and `category`. |

**Optional**

| Field | Type | Notes |
|---|---|---|
| `eligibleUsers` | `string[]` \| `null` | List of twitch usernames allowed to participate. **If omitted/empty/null, the tournament is open — anyone can join** (subject to the ban list in `ineligibleUsers`). Make this clear in the UI (e.g. "Leave empty for an open tournament — anyone can join"). |
| `forceStream` | string | Twitch username of the stream to show on the tournament page. |
| `gameTime` | boolean | If true, leaderboards use in-game time instead of real time. |
| `minimumTimeSeconds` | number | Runs faster than this are excluded from the leaderboard. |
| `moderators` | `string[]` | Twitch usernames of moderators. |

```
→ 200 { result: Tournament }
→ 400 { error: "tournament X already exists" } | { errors: [...] }
→ 403 { error: "missing capability: create tournament" }
```

### Update

```
PATCH /v1/tournaments/{name}
Authorization: Bearer ...
Body: Partial<Tournament>        // any subset of editable fields
```

- Requires `edit_settings` capability.
- The route silently strips `admins`, `staff`, `id`, and `name` from the body. Use the dedicated staff/admins endpoints to change those.
- **`startDate` and `endDate` are not editable.** They are recomputed automatically whenever `eligiblePeriods` is included in the patch.
- Editable heat fields: `eligibleRuns` (must be ≥1 if present) and `eligiblePeriods` (must be ≥1, non-overlapping if present). When `eligiblePeriods` is included, the new tournament `startDate`/`endDate` are derived from it as on create.
- Other editable fields: `description`, `rules`, `socials`, `logoUrl`, `gameImage`, `organizer`, `shortName`, `forceStream`, `hide`, `url`, `eligibleUsers`, `ineligibleUsers`, `moderators`, `gameTime`, `minimumTimeSeconds`.

```
→ 200 { result: Tournament }
→ 400 { errors: [...] } | { error: "Invalid JSON" }
→ 403 { error: "missing capability: edit_settings" }
→ 404 { error: "Tournament not found" }
```

### Delete

```
DELETE /v1/tournaments/{name}
Authorization: Bearer ...
```

- Global `admin` only.

```
→ 200 { result: { ok: true } }
→ 403 { error: "Only admins can delete tournaments" }
→ 404 { error: "Tournament not found" }
```

### Staff

```
GET    /v1/tournaments/{name}/staff             // → 200 { result: StaffEntry[] }
POST   /v1/tournaments/{name}/staff             // body: { user, capabilities }
PATCH  /v1/tournaments/{name}/staff/{user}      // body: { capabilities }
DELETE /v1/tournaments/{name}/staff/{user}
```

- Requires `manage_staff` capability for all four.
- `capabilities[]` must be a subset of the five capability strings.
- Cannot use these endpoints to modify `admins[]` (use the admins endpoints instead).

Errors:
- `400 { error: "user required" }`
- `400 { error: "already a staff member" }` (POST)
- `400 { error: "not a staff member" }` (PATCH/DELETE on missing user)
- `400 { errors: ["unknown capability: ..."] }`
- `403 { error: "missing capability: manage_staff" }`

### Admins

```
GET    /v1/tournaments/{name}/admins             // → 200 { result: string[] }
POST   /v1/tournaments/{name}/admins             // body: { user }
DELETE /v1/tournaments/{name}/admins/{user}
```

- Global `admin` only.
- Cannot remove the last admin (`400 { error: "cannot remove last admin" }`).

### Participants

```
GET    /v1/tournaments/{name}/participants
       → 200 { result: { eligibleUsers, ineligibleUsers } }
POST   /v1/tournaments/{name}/participants            // body: { user, status }
PATCH  /v1/tournaments/{name}/participants/{user}     // body: { status }
DELETE /v1/tournaments/{name}/participants/{user}     // removes user from both lists
```

- GET is public.
- Mutations require `manage_participants`.
- `status` is `"eligible"` or `"banned"`.

The mutation endpoints normalize behind the scenes: setting status flips the user between `eligibleUsers` and `ineligibleUsers`. Do not call PATCH/DELETE on `eligibleUsers`/`ineligibleUsers` directly via the update endpoint — use these dedicated routes so audit logging and edge-case handling work correctly.

### Runs

```
POST   /v1/tournaments/{name}/runs                 // body: { user, time, date }
DELETE /v1/tournaments/{name}/runs                 // body: { user, startedAt }
POST   /v1/tournaments/{name}/runs/end-time        // body: { date, heat? }
```

- Requires `manage_runs` capability.
- `POST /runs` adds a manually-entered custom run.
- `DELETE /runs` excludes a recorded run from the tournament's leaderboard.
- `POST /runs/end-time` is the legacy "set end time" action; `heat` is a 0-based index into `eligiblePeriods`. Pass it when the tournament has more than one period and you want to update a specific heat's end. Note: this endpoint mutates the period directly and does not currently re-derive the tournament-level `endDate` — prefer `PATCH /v1/tournaments/{name}` with a new `eligiblePeriods` array, which correctly recomputes derived dates.

### Lifecycle

```
POST /v1/tournaments/{name}/lifecycle
Body: { action: "lock" | "unlock" | "finalize" | "archive" | "recalculate" }
```

- Requires `lifecycle` capability.

Action semantics:
- `lock` — sets `lockedAt = now`. Run ingestion ignores the tournament while `lockedAt` is set.
- `unlock` — clears `lockedAt`.
- `finalize` — sets both `lockedAt` and `finalizedAt` to `now`.
- `archive` — toggles `hide` (does not delete).
- `recalculate` — currently a no-op (leaderboards are computed on read); kept for forward compatibility.

```
→ 200 { result: Tournament } | { result: { ok: true } }   // recalculate
→ 400 { error: "unknown action: ..." }
→ 403 { error: "missing capability: lifecycle" }
```

### Stats

```
GET /v1/tournaments/{name}/stats
→ 200 { result: <tournament stats payload> }
```

Behavior unchanged from the legacy endpoint.

## Suggested frontend structure

### API client

Add a `lib/api/tournaments.ts` (or equivalent) with one function per endpoint. Example skeleton:

```ts
const BASE = `${API_HOST}/v1/tournaments`;

export async function listTournaments(): Promise<Tournament[]> {
  return fetchJson(`${BASE}`);
}

export async function getTournament(name: string): Promise<Tournament> {
  return fetchJson(`${BASE}/${encodeURIComponent(name)}`);
}

export async function createTournament(body: Partial<Tournament>, sessionId: string): Promise<Tournament> {
  return fetchJson(`${BASE}`, { method: "POST", sessionId, body });
}

export async function updateTournament(name: string, patch: Partial<Tournament>, sessionId: string): Promise<Tournament> {
  return fetchJson(`${BASE}/${encodeURIComponent(name)}`, { method: "PATCH", sessionId, body: patch });
}

export async function deleteTournament(name: string, sessionId: string): Promise<void> {
  await fetchJson(`${BASE}/${encodeURIComponent(name)}`, { method: "DELETE", sessionId });
}

// Staff
export async function listStaff(name: string, sessionId: string): Promise<StaffEntry[]> { ... }
export async function addStaff(name: string, user: string, capabilities: Capability[], sessionId: string): Promise<Tournament> { ... }
export async function updateStaff(name: string, user: string, capabilities: Capability[], sessionId: string): Promise<Tournament> { ... }
export async function removeStaff(name: string, user: string, sessionId: string): Promise<Tournament> { ... }

// Admins (global admin only)
export async function listAdmins(name: string, sessionId: string): Promise<string[]> { ... }
export async function addAdmin(name: string, user: string, sessionId: string): Promise<Tournament> { ... }
export async function removeAdmin(name: string, user: string, sessionId: string): Promise<Tournament> { ... }

// Participants
export async function listParticipants(name: string): Promise<{ eligibleUsers: string[] | null; ineligibleUsers: string[] | null }> { ... }
export async function setParticipantStatus(name: string, user: string, status: "eligible" | "banned", sessionId: string): Promise<Tournament> { ... }
export async function removeParticipant(name: string, user: string, sessionId: string): Promise<Tournament> { ... }

// Runs
export async function addCustomRun(name: string, user: string, time: string, date: string, sessionId: string): Promise<{ ok: true }> { ... }
export async function excludeRun(name: string, user: string, startedAt: string, sessionId: string): Promise<{ ok: true }> { ... }
export async function setEndTime(name: string, date: string, heat: number | undefined, sessionId: string): Promise<{ ok: true }> { ... }

// Lifecycle
export async function lifecycleAction(
  name: string,
  action: "lock" | "unlock" | "finalize" | "archive" | "recalculate",
  sessionId: string,
): Promise<Tournament | { ok: true }> { ... }

// Stats
export async function getTournamentStats(name: string): Promise<unknown> { ... }
```

`fetchJson` should:
1. Set `Authorization: Bearer ${sessionId}` when provided.
2. Set `Content-Type: application/json` when there's a body.
3. URL-encode path segments (especially tournament `name` and twitch `user`).
4. Unwrap the `{ result }` envelope for 2xx responses.
5. Throw a typed `ApiError` with `status` and `message` for 4xx/5xx, propagating the `error` or `errors` field.

### Pages / components

Recommended UI surface for tournament admins:

| Surface | Permission gate | Endpoints |
|---|---|---|
| Tournaments list page | public | `GET /v1/tournaments` |
| "Create tournament" button | `canCreateTournament` | `POST /v1/tournaments` |
| Tournament detail page | public | `GET /v1/tournaments/{name}` |
| "Edit settings" panel | `hasCapability(t, "edit_settings")` | `PATCH /v1/tournaments/{name}` |
| "Delete tournament" button | `canDeleteTournament` | `DELETE /v1/tournaments/{name}` |
| Staff management panel | `hasCapability(t, "manage_staff")` | staff endpoints |
| Admins management panel | `canManageAdmins` | admins endpoints |
| Participants & bans panel | `hasCapability(t, "manage_participants")` | participants endpoints |
| Runs management panel (add custom, exclude, set end-time) | `hasCapability(t, "manage_runs")` | runs endpoints |
| Lifecycle controls (lock/unlock/finalize/archive) | `hasCapability(t, "lifecycle")` | lifecycle endpoint |

A capability matrix UI (rows = staff users, columns = capabilities, checkboxes) makes the staff panel self-explanatory. The five capability strings are stable and can be hardcoded.

Lifecycle controls should display current state derived from `lockedAt` and `finalizedAt`:
- `lockedAt` set, `finalizedAt` not → "Locked"
- `finalizedAt` set → "Finalized"
- `hide === true` → "Archived"
- otherwise → "Active"

### Optimistic updates

Most mutating endpoints return the updated tournament (or staff list). Replace local state with the response — do not optimistically update from request payloads alone, because the backend strips/normalizes some fields (e.g. PATCH ignores `admins`/`staff`).

### Error UX

| Status | Likely cause | Suggested toast |
|---|---|---|
| 400 with `{ errors: [...] }` | Validation failed (incl. heat overlap, missing `eligibleRuns`/`eligiblePeriods`) | List the errors |
| 400 with `{ error: "already exists" }` | Duplicate name on create | "A tournament with this name already exists" |
| 400 with `{ error: "cannot remove last admin" }` | Admins list | "You can't remove the last admin" |
| 401 / 400 with `User not authenticated` | Stale session | Prompt re-login |
| 403 | Missing capability | "You don't have permission to do this" |
| 404 | Wrong name | "Tournament not found" |
| 5xx | Server error | "Something went wrong, please try again" |

## Migration / coexistence with legacy routes

While the backend is being rolled out:

- The legacy `/tournaments`, `/tournaments/{name}`, `/tournaments/{name}/addTime`, `/removeTime`, `/setEndtime`, `/removeUser/{banned}` endpoints all keep working, share the same Postgres-backed data, and now correctly check the new `admins[]` / `staff[]` shape under the hood.
- Switch frontend pages to `/v1/tournaments/...` one at a time. Both surfaces operate on the same data; mixing them is safe.
- Legacy responses now include `Deprecation: true` and `Link: </v1/tournaments>; rel="successor-version"` headers — useful as a signal in dev tools to confirm the frontend has cut over.
- Once every frontend page has moved, the legacy routes can be removed in a future cleanup PR.

## Things to be aware of

- **`name` is the public identifier** in URLs. URL-encode it. The new internal `id` (integer) is exposed in responses but is not used in any path; treat it as informational for now.
- **`startDate` / `endDate` are derived from `eligiblePeriods`** and not directly editable. To shift a tournament's window, edit the periods (and therefore the heats); the dates will update on save. See the Heats section.
- **`leaderboards` field** appears only on `GET /v1/tournaments/{name}` — it is computed on read, not stored. Don't expect it on the list endpoint.
- **`lockedAt` blocks ingestion.** While set, new run uploads from clients will not be matched into the tournament. Frontend should show a banner on a locked tournament.
- **`hide` is a soft-delete.** Hidden tournaments are excluded from the public list endpoint but still return on direct `GET /v1/tournaments/{name}` (the route does not filter them). If you need a public-facing "browse" page that excludes them, use the list endpoint; if you need a moderation surface that includes them, query the URL directly.
- **The backend has an audit log** (`tournament_audit_log` table) but no read endpoint for it yet. Don't try to fetch it from the frontend — it's a backend-only concern for now.
- **Capability checks are server-authoritative.** The client-side helpers above are for hiding/disabling UI; never assume a successful 200 means the user had permission — always trust the server's response.

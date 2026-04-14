# Frontend Integration Guide: Game & Category Management

## Overview

This guide covers the complete API surface for game/category management. Endpoints span 5 handler groups: Series, Game Management, Aliases, Roles, and Leaderboards.

All responses follow the shape `{ result: <data> }`. Errors return `{ error: "<message>" }` with appropriate HTTP status codes (400 for client errors, 404 for not found, 500 for server errors).

Auth is via `Authorization: Bearer <sessionId>` header.

---

## Data Model Quick Reference

```
Series (hierarchical, max 5 levels)
  └── Games
       ├── Category Groups (custom named, ordered, optionally hidden)
       │    └── Categories (with rules, timing, video requirements)
       └── Ungrouped Categories (groupId = null, shown in default section)
```

### Roles (highest to lowest authority)

| Role | Scope | Key Abilities |
|------|-------|---------------|
| `global-admin` | Site-wide | Everything |
| `series-manager` | Site-wide | Create series only |
| `series-admin` | Per series | Full control over series and all its games |
| `series-mod` | Per series | Edit/verify within series |
| `game-admin` | Per game | Full control over game, can appoint other admins |
| `game-mod` | Per game | Edit categories, verify runs, assign category roles |
| `game-verifier` | Per game | Verify/reject runs only |
| `category-mod` | Per category | Edit/verify within assigned categories |
| `category-verifier` | Per category | Verify/reject within assigned categories |

Role resolution walks up: category -> game -> series hierarchy -> global. A series-admin automatically has authority over all games in that series.

---

## pageData: The Game Page Read Model

**`GET /v1/games/:gameId`** returns the pre-computed `pageData` — a single JSON blob containing everything needed to render a game page. This is the primary read path; use it for game page loads.

### pageData Shape

```typescript
interface PageData {
  game: {
    id: number;
    display: string;
    image: string;
    seriesId: number | null;
    seriesDisplay: string | null;
    forceRealTime: boolean;
    autoCreated: boolean;
  };
  ungroupedCategories: Category[];
  groups: {
    id: number;
    name: string;           // "Full Game", "Individual Levels", etc.
    sortOrder: number;
    hiddenByDefault: boolean;
    categories: Category[];
  }[];
  roles: {
    userId: number;
    username: string;
    role: string;
  }[];
  aliases: string[];
  updatedAt: string;        // ISO timestamp
}

interface Category {
  id: number;
  display: string;
  sortOrder: number;
  primaryTiming: string;    // "realtime" | "gametime"
  rules: string | null;
  requireVideo: boolean;
  showMilliseconds: boolean;
  variables: any[];         // leaderboard variable definitions (future spec)
  defaultSubcategoryHash: string;
}
```

### Rendering Logic

1. Show `ungroupedCategories` first (these are the "default" section)
2. Then render each `group` in `sortOrder` order
3. Groups with `hiddenByDefault: true` should be collapsed/accordion
4. Categories within each group are ordered by their `sortOrder`
5. If `game.autoCreated` is true, show a banner: "This game was auto-created and has no moderators. [Request moderatorship]"
6. `roles` array tells you who moderates the game — show on the game page sidebar

### When pageData Updates

pageData rebuilds asynchronously after any mutation (game edit, category change, role assignment, alias change). There may be a brief delay (< 1 second) between a write and the pageData reflecting the change. If you need immediate consistency after a mutation, either:
- Optimistically update the local state
- Re-fetch after a short delay (500ms)

---

## 1. Series Endpoints

### GET /series/:id

Fetch a series with its children and games.

```typescript
// Response
{
  result: {
    id: number;
    name: string;
    display: string;
    image: string | null;
    parentSeriesId: number | null;
    sortOrder: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
    children: Series[];      // child series (active only)
    games: {
      id: number;
      display: string;
      image: string;
      sortOrderInSeries: number;
    }[];
  }
}
```

**Auth:** None (public)

### POST /series

Create a new series. Creator automatically becomes series-admin.

```typescript
// Request body
{
  display: string;            // required, 1-200 chars
  image?: string;
  parentSeriesId?: number;    // null for top-level series
}

// Response
{ result: { id: number } }
```

**Auth:** Required. Needs `create-series` permission (global-admin or series-manager).

### PUT /series/:id

Edit series metadata.

```typescript
// Request body (all fields optional)
{
  display?: string;
  image?: string;
  parentSeriesId?: number | null;  // null to make top-level
  sortOrder?: number;
}

// Response
{ result: { updated: true } }
```

**Auth:** Required. Needs `edit-series` on this series.

### POST /series/:id/archive

Archive a series. Orphans all child series and games (they become parentless but stay active).

```typescript
// Response
{ result: { archived: true } }
```

**Auth:** Required. Needs `archive-series` (global-admin only).

### PUT /series/:id/games

Set which games belong to this series. Replaces the current list entirely. Order of `gameIds` determines `sortOrderInSeries`.

```typescript
// Request body
{
  gameIds: number[];    // ordered list of game IDs
}

// Response
{ result: { updated: true } }
```

**Auth:** Required. Needs `manage-series-games` on this series.

---

## 2. Game Management Endpoints

### GET /v1/games/by-slug/:slug

Resolve a game slug (the searchable form — lowercased, spaces removed) to its numeric id. All other `/v1/games/:id/*` endpoints are id-based; use this when you only have a name/slug from a URL or search result.

```typescript
// Response
{ result: { id: number; name: string; display: string } }
```

**Auth:** None (public). Returns 404 if no game matches.

### GET /v1/games/:id

Fetch the denormalized pageData for a game. This is the fast path — use this for page loads.

```typescript
// Response
{ result: PageData }   // see pageData shape above
```

**Auth:** None (public). Returns `{}` if pageData hasn't been built yet.

### GET /v1/games/:id/audit-log

Fetch audit history for a game.

```typescript
// Query params
?limit=50    // max 100
&offset=0

// Response
{
  result: {
    id: number;
    userId: number;
    action: string;         // "game.create", "category.update", "role.assign", etc.
    entityType: string;     // "game", "category", "series", "role", "alias", "group"
    entityId: number;
    diff: {                 // what changed
      [field: string]: { old: any; new: any }
    } | null;
    createdAt: string;
  }[]
}
```

**Auth:** None (public).

### POST /v1/games

Create a new game manually. Creator becomes game-admin. IGDB image lookup fires in background.

```typescript
// Request body
{
  display: string;            // required, 1-200 chars
  primaryTiming?: string;     // "realtime" | "gametime"
  forceRealTime?: boolean;
  seriesId?: number;
  image?: string;             // manual image overrides IGDB
}

// Response
{ result: { id: number } }
```

**Auth:** Required. Needs `create-game` permission.

### PUT /v1/games/:id

Edit game metadata.

```typescript
// Request body (all optional)
{
  display?: string;
  image?: string;
  forceRealTime?: boolean;
  seriesId?: number | null;
  sortOrderInSeries?: number;
}

// Response
{ result: { updated: true } }
```

**Auth:** Required. Needs `edit-game` on this game.

### POST /v1/games/:id/archive

Archive a game. Hidden from browse/search but still accepts runs via uploads.

```typescript
// Response
{ result: { archived: true } }
```

**Auth:** Required. Needs `archive-game` on this game.

---

## 3. Category Group Endpoints

Category groups are custom containers for categories (e.g., "Full Game", "Individual Levels", "Meme Runs"). Categories without a group (`groupId = null`) appear in the default/ungrouped section.

### POST /v1/games/:gameId/groups

Create a category group.

```typescript
// Request body
{
  name: string;               // required, 1-100 chars, unique per game
  sortOrder?: number;         // default 0
  hiddenByDefault?: boolean;  // default false (collapsed on page load)
}

// Response
{ result: { id: number } }
```

**Auth:** Required. Needs `create-edit-group` on this game.

### PUT /v1/games/:gameId/groups/:groupId

Edit a category group.

```typescript
// Request body (all optional)
{
  name?: string;
  sortOrder?: number;
  hiddenByDefault?: boolean;
}

// Response
{ result: { updated: true } }
```

**Auth:** Required. Needs `create-edit-group` on this game.

### DELETE /v1/games/:gameId/groups/:groupId

Delete a category group. All categories in the group become ungrouped (`groupId = null`).

```typescript
// Response
{ result: { deleted: true } }
```

**Auth:** Required. Needs `create-edit-group` on this game.

### PUT /v1/games/:gameId/groups/reorder

Reorder category groups. Pass group IDs in desired order.

```typescript
// Request body
{
  groupIds: number[];   // [3, 1, 2] means group 3 first, then 1, then 2
}

// Response
{ result: { reordered: true } }
```

**Auth:** Required. Needs `create-edit-group` on this game.

---

## 4. Category Endpoints

### POST /v1/games/:gameId/categories

Create a category.

```typescript
// Request body
{
  display: string;              // required, 1-200 chars
  groupId?: number;             // null = ungrouped
  primaryTiming?: string;       // "realtime" (default) | "gametime"
  rules?: string;
  requireVideo?: boolean;       // default false
  requireVideoTopN?: number;    // require video only for top N
  sortAscending?: boolean;      // default true (lower time = better)
  showMilliseconds?: boolean;   // default true
}

// Response
{ result: { id: number } }
```

**Auth:** Required. Needs `create-edit-category` on this game.

### PUT /v1/games/:gameId/categories/:catId

Edit a category. The category must belong to this game.

```typescript
// Request body (all optional)
{
  display?: string;
  groupId?: number | null;      // move between groups, null = ungrouped
  primaryTiming?: string;
  rules?: string | null;
  requireVideo?: boolean;
  requireVideoTopN?: number | null;
  sortAscending?: boolean;
  showMilliseconds?: boolean;
  sortOrder?: number;
}

// Response
{ result: { updated: true } }
```

**Auth:** Required. Needs `edit-category-settings` on this game + category.

### POST /v1/games/:gameId/categories/:catId/archive

Archive a category. Hidden on game page unless "show archived" is toggled.

```typescript
// Response
{ result: { archived: true } }
```

**Auth:** Required. Needs `archive-category` on this game.

### PUT /v1/games/:gameId/categories/reorder

Reorder categories within their groups.

```typescript
// Request body
{
  categoryIds: number[];    // ordered list
}

// Response
{ result: { reordered: true } }
```

**Auth:** Required. Needs `create-edit-category` on this game.

---

## 5. Alias Endpoints

Aliases let alternate names map to canonical games/categories. Any authenticated user can create aliases. Mods can remove and ban them.

### GET /aliases/game/:gameId

List all aliases for a game.

```typescript
// Response
{
  result: {
    id: number;
    alias: string;
    gameId: number;
    createdBy: number;
    banned: boolean;
    createdAt: string;
  }[]
}
```

**Auth:** None (public).

### POST /aliases/game/:gameId

Create a game alias. Takes effect immediately.

```typescript
// Request body
{
  alias: string;    // 1-200 chars, must be globally unique
}

// Response
{ result: { id: number } }
```

**Auth:** Required. Any logged-in user (unless restricted). Returns 400 if:
- Alias conflicts with existing game name
- Alias already exists
- Alias has been banned
- User is restricted from alias creation

### POST /aliases/category/:categoryId

Create a category alias.

```typescript
// Request body
{
  gameId: number;     // game the category belongs to
  alias: string;      // 1-200 chars, unique per game
}

// Response
{ result: { id: number } }
```

**Auth:** Required. Any logged-in user (unless restricted).

### DELETE /aliases/game/:aliasId/remove

Remove a game alias.

```typescript
// Response
{ result: { removed: true } }
```

**Auth:** Required. Needs `create-alias` permission.

### DELETE /aliases/category/:aliasId/remove

Remove a category alias.

```typescript
// Response
{ result: { removed: true } }
```

**Auth:** Required. Needs `create-alias` permission.

### POST /aliases/game/:aliasId/ban

Ban a game alias. Prevents anyone from re-creating this alias string.

```typescript
// Response
{ result: { banned: true } }
```

**Auth:** Required. Needs `ban-alias` permission.

### POST /aliases/category/:aliasId/ban

Ban a category alias.

```typescript
// Response
{ result: { banned: true } }
```

**Auth:** Required. Needs `ban-alias` permission.

---

## 6. Role Management Endpoints

### GET /roles/game/:gameId

List all role assignments for a game.

```typescript
// Response
{
  result: {
    id: number;
    userId: number;
    role: string;
    seriesId: number | null;
    gameId: number | null;
    categoryId: number | null;
    assignedBy: number;
    createdAt: string;
  }[]
}
```

**Auth:** None (public).

### GET /roles/series/:seriesId

List all role assignments for a series.

```typescript
// Response — same shape as game roles
```

**Auth:** None (public).

### POST /roles/assign

Directly assign a role to a user. No acceptance needed.

```typescript
// Request body
{
  userId: number;
  role: string;          // one of the 9 roles
  seriesId?: number;     // for series-scoped roles
  gameId?: number;       // for game-scoped roles
  categoryId?: number;   // for category-scoped roles
}

// Response
{ result: { id: number } }
```

**Auth:** Required. Permission depends on role being assigned:
- `series-admin` -> needs `assign-series-admin`
- `series-mod` -> needs `assign-series-mod`
- `game-admin` -> needs `assign-game-admin`
- `game-mod` -> needs `assign-game-mod`
- `game-verifier`, `category-verifier` -> needs `assign-verifier`
- `category-mod` -> needs `assign-category-mod`

### DELETE /roles/:roleAssignmentId

Revoke a role assignment.

```typescript
// Response
{ result: { revoked: true } }
```

**Auth:** Required. Needs the same assign permission as the role being revoked.

### POST /roles/invite

Invite a user to a role. Creates a pending invitation that the user must accept.

```typescript
// Request body — same shape as /roles/assign
{
  userId: number;
  role: string;
  seriesId?: number;
  gameId?: number;
  categoryId?: number;
}

// Response
{ result: { id: number } }
```

**Auth:** Required. Same permission check as assign.

### GET /roles/invitations

List pending invitations for the current user.

```typescript
// Response
{
  result: {
    id: number;
    userId: number;
    role: string;
    seriesId: number | null;
    gameId: number | null;
    categoryId: number | null;
    invitedBy: number;
    status: "pending";
    createdAt: string;
    respondedAt: string | null;
  }[]
}
```

**Auth:** Required. Returns only the authenticated user's invitations.

### PUT /roles/invitations/:invitationId

Accept or decline an invitation.

```typescript
// Request body
{
  accept: boolean;    // true = accept, false = decline
}

// Response
{ result: { responded: true } }
```

**Auth:** Required. User can only respond to their own invitations. Invitations expire after 30 days.

### POST /roles/mod-requests

Submit a mod request for a game. Any user can request to moderate an unmoderated game.

```typescript
// Request body
{
  gameId: number;
  message: string;    // 1-1000 chars, why you should be mod
}

// Response
{ result: { id: number } }
```

**Auth:** Required. Returns 400 if:
- User was rejected for this game in the last 30 days
- User is restricted from mod requests

### GET /roles/mod-requests

List pending mod requests. Optionally filter by game.

```typescript
// Query params
?gameId=123    // optional filter

// Response
{
  result: {
    id: number;
    userId: number;
    gameId: number;
    message: string;
    status: "pending";
    reviewedBy: number | null;
    createdAt: string;
    reviewedAt: string | null;
  }[]
}
```

**Auth:** Required.

### PUT /roles/mod-requests/:requestId

Approve or reject a mod request. On approval, the user gets `game-mod` role.

```typescript
// Request body
{
  approve: boolean;    // true = approve, false = reject
}

// Response
{ result: { reviewed: true } }
```

**Auth:** Required. Needs `review-mod-request` on the game the request is for.

### POST /roles/restrictions

Create a user restriction. Only global-admin.

```typescript
// Request body
{
  userId: number;
  type: string;          // "alias_creation" | "mod_request"
  reason: string;
  expiresAt?: string;    // ISO date, null = permanent
}

// Response
{ result: { id: number } }
```

**Auth:** Required. Global-admin only.

### DELETE /roles/restrictions/:restrictionId

Remove a restriction. Only global-admin.

```typescript
// Response
{ result: { removed: true } }
```

**Auth:** Required. Global-admin only.

### GET /roles/restrictions/user/:userId

List active restrictions for a user.

```typescript
// Response
{
  result: {
    id: number;
    userId: number;
    type: string;
    reason: string;
    restrictedBy: number;
    createdAt: string;
    expiresAt: string | null;
  }[]
}
```

**Auth:** Required.

---

## Frontend Page Architecture

### Game Page

**Data source:** `GET /v1/games/:gameId` -> pageData

**Sections:**
1. **Header** — game image, display name, series breadcrumb (if `seriesId` set)
2. **Auto-created banner** — if `autoCreated`, show "No moderators" banner with mod request button
3. **Category browser** — ungrouped categories first, then groups in order. Hidden groups as accordions.
4. **Moderator sidebar** — list from `pageData.roles`
5. **Aliases** — shown in a small section or tooltip

**Mod panel** (visible to users with appropriate role):
- Edit game metadata (name, image, timing)
- Manage category groups (create, edit, reorder, delete, toggle visibility)
- Manage categories (create, edit, archive, reorder, move between groups)
- Manage roles (assign, invite, revoke)
- View/manage aliases (remove, ban)
- View audit log

### Series Page

**Data source:** `GET /series/:id`

**Sections:**
1. Header with series name/image
2. Child series list (with links)
3. Games grid/list ordered by `sortOrderInSeries`

### Mod Dashboard

For users with any moderation role. Show:
- Games they moderate (from their role assignments)
- Pending mod requests for their games
- Pending invitations
- Quick links to game mod panels

### Admin Dashboard

For global-admin. Show:
- Pending mod requests across all games (prioritize unmoderated games)
- Auto-created games with no moderators
- User restriction management
- Series management

---

## Permission Checking on Frontend

To determine what UI to show, check the user's role against the permission matrix.

**Quick check:** After loading pageData, look at `pageData.roles` to see if the current user has a role on this game. For series-inherited permissions, you'll need to check the user's roles on the game's series too.

**Recommended approach:** Create a frontend utility:

```typescript
type GameMgmtAction =
  | "edit-game"
  | "archive-game"
  | "create-alias"
  | "ban-alias"
  | "assign-game-admin"
  | "assign-game-mod"
  | "assign-category-mod"
  | "assign-verifier"
  | "create-edit-group"
  | "create-edit-category"
  | "archive-category"
  | "edit-category-settings"
  | "verify-reject-run"
  | "review-mod-request";

function canPerform(userRole: string | null, action: GameMgmtAction): boolean {
  if (!userRole) return false;
  // Map from src/rbac/roles.ts ROLE_PERMISSIONS
  const permissions: Record<string, GameMgmtAction[]> = {
    "global-admin": [/* all actions */],
    "series-admin": [/* most actions */],
    "series-mod": ["create-edit-group", "create-edit-category", "edit-category-settings", "verify-reject-run", "create-alias", "ban-alias", "edit-game"],
    "game-admin": ["edit-game", "create-alias", "ban-alias", "assign-game-admin", "assign-game-mod", "assign-category-mod", "assign-verifier", "create-edit-group", "create-edit-category", "archive-category", "edit-category-settings", "verify-reject-run", "review-mod-request"],
    "game-mod": ["create-alias", "ban-alias", "assign-category-mod", "assign-verifier", "create-edit-group", "create-edit-category", "edit-category-settings", "verify-reject-run"],
    "game-verifier": ["verify-reject-run"],
    "category-mod": ["create-edit-category", "edit-category-settings", "verify-reject-run"],
    "category-verifier": ["verify-reject-run"],
  };
  return permissions[userRole]?.includes(action) ?? false;
}
```

Use this to conditionally render edit buttons, mod panels, etc.

---

## Error Handling

All endpoints return consistent error shapes:

```typescript
// 400 Bad Request (client error, validation error, permission denied)
{ error: "Game name is required" }
{ error: "Permission denied: cannot perform 'edit-game' in this scope" }
{ error: "This alias has been banned" }
{ error: "You are restricted from this action: spam aliases" }

// 404 Not Found
{ error: "No results" }

// 500 Internal Server Error
// Unexpected errors — show generic error message to user
```

**Permission denied vs not found:** The API returns 400 (not 403) for permission errors. Check for the `"Permission denied"` prefix in the error message to distinguish from validation errors.

---

## Typical Frontend Flows

### Flow: User Creates a Game Alias

1. User views game page, sees "Suggest alias" button
2. User types alias name
3. `POST /aliases/game/:gameId` with `{ alias: "sm64" }`
4. On success: show confirmation, alias takes effect immediately
5. On error: show error message (banned, duplicate, restricted)

### Flow: Mod Manages Category Groups

1. Mod views game page, clicks "Manage" tab
2. Fetch current state from pageData
3. "Create Group" -> `POST /v1/games/:id/groups` with `{ name: "Full Game" }`
4. Drag to reorder -> `PUT /v1/games/:id/groups/reorder` with new order
5. Toggle hidden -> `PUT /v1/games/:id/groups/:groupId` with `{ hiddenByDefault: true }`
6. Delete group -> `DELETE /v1/games/:id/groups/:groupId` (categories become ungrouped)
7. After each mutation, optimistically update local state or re-fetch pageData after 500ms

### Flow: Player Requests Moderatorship

1. Player visits auto-created game with no mods
2. Clicks "Request Moderatorship"
3. Types message explaining why
4. `POST /roles/mod-requests` with `{ gameId, message }`
5. Show "Request submitted" confirmation
6. Admin/game-admin sees request in mod dashboard
7. Admin approves -> `PUT /roles/mod-requests/:id` with `{ approve: true }`
8. Player automatically gets `game-mod` role

### Flow: Game Admin Invites a Verifier

1. Game admin goes to game mod panel -> "Manage Roles"
2. Searches for user
3. Selects "Game Verifier" role
4. `POST /roles/invite` with `{ userId, role: "game-verifier", gameId }`
5. Invitee sees invitation on their profile / notifications
6. `GET /roles/invitations` to see pending invitations
7. `PUT /roles/invitations/:id` with `{ accept: true }`
8. Role is now active

### Flow: Mod Edits Category Settings

1. Mod clicks edit icon on a category
2. Shows form with current values (from pageData)
3. Changes rules text and enables video requirement
4. `PUT /v1/games/:gameId/categories/:catId` with `{ rules: "...", requireVideo: true }`
5. Optimistically update local state
6. pageData rebuilds in background

---

## 7. Leaderboard Endpoints

Leaderboard data lives under `/v1/leaderboards/`. Game and category names are matched via `convertToSearchable()` (lowercased, spaces removed) — e.g., `/v1/leaderboards/supermario64/120star`.

### GET /v1/leaderboards/{game}/{category}

Fetch the ranked leaderboard for a game+category. Unfiltered queries hit Redis (fast). Variable-filtered queries go to PostgreSQL.

```typescript
// Path params: game and category as searchable strings

// Query params
?subcategory=       // subcategory hash (empty = default)
&timing=rt          // "rt" (realtime, default) | "gt" (gametime)
&verified=false     // true = only verified runs
&page=1
&pageSize=25        // max 100
&var_platform=N64   // filter by variable value, comma-separated for multiple

// Response
{
  result: {
    items: {
      rank: number;
      runnerName: string;
      userId: number | null;
      time: number;              // milliseconds
      verificationStatus: string;
      vodUrl: string | null;
      runDate: string;
      isGuest: boolean;
    }[];
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }
}
```

**Auth:** None (public).

### GET /v1/leaderboards/wr-history/{game}/{category}

World record progression timeline.

```typescript
// Query params
?subcategory=       // subcategory hash

// Response
{
  result: {
    runnerName: string;
    time: number;
    timingMethod: string;
    setAt: string;
    supersededAt: string | null;
  }[]
}
```

**Auth:** None (public).

### GET /v1/leaderboards/user/{userId}/rankings

All leaderboard entries for a user across all games/categories, with rank in each.

```typescript
// Response
{
  result: {
    gameId: number;
    categoryId: number;
    rank: number;
    time: number;
    // ... game/category metadata
  }[]
}
```

**Auth:** None (public).

### POST /v1/leaderboards/submit

Manually submit a run (for guest/inactive runners). Submitted as verified.

```typescript
// Request body
{
  runnerName: string;       // required
  gameId: number;           // required
  categoryId: number;       // required
  time: number;             // required, milliseconds
  gameTime?: number;        // milliseconds
  vodUrl?: string;
  variables?: Record<string, string>;
}

// Response
{ result: { id: number, runnerName: string, time: number } }
```

**Auth:** Required. Caller must be a moderator for the game.

### POST /v1/leaderboards/verify/{runId}

Verify a pending run. Updates leaderboard entry flags and Redis cache.

```typescript
// Response
{ result: { verified: true } }
```

**Auth:** Required. Caller must be a moderator for the run's game.

### POST /v1/leaderboards/reject/{runId}

Reject a pending run. Promotes next-best run if rejected run held the leaderboard entry flag.

```typescript
// Request body
{
  reason?: string;    // shown to runner
}

// Response
{ result: { rejected: true } }
```

**Auth:** Required. Caller must be a moderator for the run's game.

### GET /v1/leaderboards/mod-queue/{gameId}

Fetch runs pending moderation for a game.

**Auth:** Required. Caller must be a moderator for the game.

### POST /v1/leaderboards/bulk-verify

Bulk verify multiple runs.

**Auth:** Required. Caller must be a moderator.

### POST /v1/leaderboards/bulk-reject

Bulk reject multiple runs.

**Auth:** Required. Caller must be a moderator.

### PUT /v1/leaderboards/runs/{runId}

Edit a run's metadata.

**Auth:** Required. Caller must be a moderator for the run's game.

### POST /v1/leaderboards/runs/{runId}/move

Move a run to a different category.

**Auth:** Required. Caller must be a moderator for the run's game.

---

## Audit Log Actions Reference

These are the `action` values you'll see in audit log entries:

| Action | Description |
|--------|-------------|
| `series.create` | Series created |
| `series.update` | Series metadata edited |
| `series.archive` | Series archived |
| `series.update-games` | Games added/removed from series |
| `game.create` | Game created |
| `game.update` | Game metadata edited |
| `game.archive` | Game archived |
| `group.create` | Category group created |
| `group.update` | Category group edited |
| `group.delete` | Category group deleted |
| `group.reorder` | Category groups reordered |
| `category.create` | Category created |
| `category.update` | Category settings edited |
| `category.archive` | Category archived |
| `category.reorder` | Categories reordered |
| `alias.create` | Game alias created |
| `alias.remove` | Game alias removed |
| `alias.ban` | Game alias banned |
| `category-alias.create` | Category alias created |
| `category-alias.remove` | Category alias removed |
| `category-alias.ban` | Category alias banned |
| `role.assign` | Role directly assigned |
| `role.revoke` | Role revoked |
| `role.invite` | Role invitation sent |
| `role.invite-accepted` | Invitation accepted |
| `role.invite-declined` | Invitation declined |
| `mod-request.create` | Mod request submitted |
| `mod-request.approve` | Mod request approved |
| `mod-request.reject` | Mod request rejected |
| `restriction.create` | User restriction created |
| `restriction.remove` | User restriction removed |

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
    hideRealTime: boolean;    // hide RT view game-wide (mutually excl. with hideGameTime)
    hideGameTime: boolean;
    autoCreated: boolean;
    slug: string | null;          // admin-editable URL slug; preferred lookup key for /by-slug
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
  hideRealTime: boolean;    // hide RT view on this category (mutually excl. with hideGameTime)
  hideGameTime: boolean;
  rules: string | null;
  requireVideo: boolean;
  showMilliseconds: boolean;
  variables: any[];         // leaderboard variable definitions (future spec)
  defaultSubcategoryHash: string;
  isMain: boolean;          // flagged as a "main" category for this game. Frontend decides how to use it (e.g. featured tabs).
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

Resolve a URL slug to a game id. All other `/v1/games/:id/*` endpoints are id-based; use this when you only have a slug from a URL or search result.

The path param is normalized (lowercase, non-alphanumerics → `-`, dashes collapsed, leading/trailing dashes stripped) before lookup. Resolution priority:

1. `games.slug` — admin-set, editable, URL-friendly
2. `games.name` — auto-derived from the display name (`convertToSearchable`: lowercased, spaces removed). Preserves all legacy `/by-slug/<name>` URLs.

Cached in Redis (1 h hit / 5 min negative). Slug edits propagate within the TTL.

```typescript
// Response
{ result: { id: number; name: string; display: string } }
```

**Auth:** None (public). Returns 404 if no game matches by any of the three keys.

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
  hideRealTime?: boolean;     // mutually exclusive with hideGameTime
  hideGameTime?: boolean;
  seriesId?: number | null;
  sortOrderInSeries?: number;
  slug?: string | null;           // admin-set URL slug. Pass null or "" to clear.
  active?: boolean;               // unarchive (true) / archive (false). Requires `archive-game` permission.
}

// Response
{ result: { updated: true } }
```

**Slug rules:**

- Normalized server-side (lowercase + non-alphanumerics → `-` + collapsed + trimmed). Whatever the admin types, the canonical stored value is the normalized form.
- Max **64 chars** after normalization.
- UNIQUE across all games. A duplicate returns `400` with `{ error: "Slug already in use" }`.
- A value that normalizes to an empty string (e.g. `"!!!"`) returns `400` with `{ error: "Slug must contain at least one alphanumeric character" }`.
- To clear an existing value, send `null` or `""`.
- The normalized value appears in `pageData.game.slug` after the next pageData rebuild (≤ 1 s).

**Active toggle:** `active: false` archives, `active: true` unarchives (the existing `POST /v1/games/:id/archive` still works for archiving). Archived games are hidden from browse/search but still accept run uploads.

**Auth:** Required. Needs `edit-game` on this game. Toggling `active` additionally requires `archive-game`.

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
  hideRealTime?: boolean;       // default false; mutually exclusive with hideGameTime
  hideGameTime?: boolean;       // default false
  rules?: string;
  requireVideo?: boolean;       // default false
  requireVideoTopN?: number;    // require video only for top N
  sortAscending?: boolean;      // default true (lower time = better)
  showMilliseconds?: boolean;   // default true
  isMain?: boolean;             // default false. Marks the category as a "main" one for the game.
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
  hideRealTime?: boolean;       // mutually exclusive with hideGameTime
  hideGameTime?: boolean;
  rules?: string | null;
  requireVideo?: boolean;
  requireVideoTopN?: number | null;
  sortAscending?: boolean;
  showMilliseconds?: boolean;
  sortOrder?: number;
  isMain?: boolean;
  active?: boolean;             // unarchive (true) / archive (false). Requires `archive-category` permission.
}

// Response
{ result: { updated: true } }
```

**Auth:** Required. Needs `edit-category-settings` on this game + category. Toggling `active` additionally requires `archive-category`.

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

**Alias resolution:** Game and category names are resolved through aliases. If `/v1/leaderboards/sm64/any%25` doesn't match a game named "sm64", the system checks `game_aliases` for a mapping to the canonical game. Same for categories. This means frontend URLs can use common abbreviations and they'll work as long as aliases exist.

### GET /v1/leaderboards/{game}/{category}

Fetch the ranked leaderboard for a game+category. Unfiltered queries hit Redis (fast). Variable-filtered queries go to PostgreSQL.

```typescript
// Path params: game and category as searchable strings

// Query params (see "Variable Query Params" below for variable filters)
?timing=rt             // "rt" | "gt". If omitted, server picks based on category.primaryTiming and game.forceRealTime — see "Timing defaults" below.
&verified=true         // true/1 = only verified runs
&combined=1            // drops subcategoryKey filter — returns best per runner across every subcategory in the category
&year=2024             // EXTRACT(YEAR FROM ended_at) = 2024
&page=1
&pageSize=25           // max 100
&platform=n64          // bare variable key (no `var_` prefix). See "Variable Query Params".

// Response (flat — NOT wrapped in `result`)
{
  items: {
    rank: number;
    runId: number;
    runnerName: string;
    userId: number | null;
    time: number;              // milliseconds — equals the queried timing's value (kept for back-compat)
    realTime: number | null;   // the runner's true best realtime in this triple (independent of the queried timing)
    gameTime: number | null;   // the runner's true best gametime in this triple (independent of the queried timing)
    verificationStatus: string;
    vodUrl: string | null;
    runDate: string;
    isGuest: boolean;
  }[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  timing: "rt" | "gt";          // timing actually used for this response
  defaultTiming: "rt" | "gt";   // category's preferred timing
  forceRealTime: boolean;       // true = game forces realtime; toggle should be hidden
  hideRealTime: boolean;        // effective (category > game). Realtime view is hidden.
  hideGameTime: boolean;        // effective (category > game). Gametime view is hidden.
}
```

**404 payload** — when a request resolves to a subcategoryKey that isn't in `valid_subcategory_combinations` for a managed scope:

```typescript
{ error: "leaderboard does not exist", validCombinations: string[] }
```

The `validCombinations` array contains every legal subcategoryKey under the scope so the UI can offer alternatives. Plain text keys, e.g. `platform=nintendo64|region=us`.

**Auth:** None (public).

#### Both timings per entry — no second request

Each entry carries both `realTime` and `gameTime`. The server resolves them per runner: it looks up the runner's GT-flagged row separately from their RT-flagged row in the same `(game, category, subcategory)` triple, so the two times reflect each runner's actual best in each timing — even when the records come from different runs.

That means a frontend that previously made two paginated calls (one `?timing=rt`, one `?timing=gt`) and merged by `runnerName` should:

- Make a single call with the desired `?timing=` (or omit it and let the server pick the category default).
- Read `realTime` and `gameTime` directly off each entry.
- Delete the second-call-and-merge code. It was page-bounded and produced `—` for any runner whose ranks across timings differed by more than `pageSize`.

`time` still equals the queried timing's value (so existing callers don't break), but new code should prefer `realTime`/`gameTime` explicitly.

#### Timing defaults

The server picks the timing column using this precedence:

1. `game.forceRealTime === true` → always `"rt"`. `?timing=gt` is ignored.
2. Effective `hideRealTime` (category overrides game when category sets either hide flag) → `"gt"`.
3. Effective `hideGameTime` → `"rt"`.
4. Explicit `?timing=rt` or `?timing=gt`.
5. `category.primaryTiming === "gametime"` → `"gt"`, else `"rt"`.

Use the returned `timing`, `defaultTiming`, `forceRealTime`, `hideRealTime`, `hideGameTime` to render the toggle:

| Server response | Toggle UI |
|-----------------|-----------|
| `forceRealTime: true` | Hide the toggle. Realtime only. |
| `hideRealTime: true` | Hide the toggle. Gametime only. |
| `hideGameTime: true` | Hide the toggle. Realtime only. |
| Otherwise | Show the toggle, initialized to `timing`. |

Call the endpoint without `?timing=` on first load and let the server resolve the default for you. Only send `?timing=` when the user manually flips the toggle.

**Configuring per-category (`PUT /v1/games/{id}/categories/{catId}`):**

```typescript
{
  primaryTiming?: "realtime" | "gametime";
  hideRealTime?: boolean;   // mutually exclusive with hideGameTime
  hideGameTime?: boolean;
}
```

**Configuring per-game (`PUT /v1/games/{id}`):**

```typescript
{
  forceRealTime?: boolean;  // legacy; forces realtime regardless of category settings
  hideRealTime?: boolean;   // mutually exclusive with hideGameTime
  hideGameTime?: boolean;
}
```

`hideRealTime` and `hideGameTime` cannot both be true on the same row — the API returns 400 if you try, and a DB CHECK constraint enforces it as a safety net. A category-level hide flag overrides game-level hide flags (any category hide flag wins).

#### Discovering Variables for a Leaderboard

To render filter chips, subcategory pickers, and validity hints, frontends should fetch the **merged effective variable defs** for a leaderboard. This is the read-side companion to the admin endpoints in §8.

```typescript
// GET /v1/leaderboards/{game}/{category}/variables
// Public. Returns the merged view: game-wide defs + category-specific defs,
// with category-specific entries winning on `nameNormalized` collisions.

// Response (flat — NOT wrapped in `result`)
{
  variables: {
    id: number;
    gameId: number;
    categoryId: number | null;     // null = game-wide def
    name: string;                  // display name
    nameNormalized: string;        // use this as the query string key
    role: "subcategory" | "filter";
    values: string[][];            // value buckets (see §8)
    defaultValueIndex: number | null;
    sortOrder: number;
    description: string | null;
    version: number;
    published: boolean;
  }[];
  reservedParams: string[];        // builtin query-param names; never variable names
  validCombinations:
    | { mode: "open" }                          // no restriction — all combos legal
    | { mode: "managed"; keys: string[] };      // restricted — only these subcategoryKeys legal
}
```

**Auth:** None (public).

**`validCombinations.mode`:**
- `"open"` — the cartesian product of every subcategory variable's value buckets is legal. The frontend can render any combination.
- `"managed"` — only the listed `keys` are real boards. Render the subcategory picker as a flat list of `keys` (not a cartesian dropdown), or grey out invalid combinations when constructing them piecemeal.

**Don't use the admin endpoint `GET /v1/games/{gameId}/variables` for this.** That endpoint is strict-scope (returns only rows whose `categoryId` matches the query exactly) and is intended for managing definitions — see §8.

#### Variable Query Params

Variables are passed as **bare query string keys** matching the variable's `nameNormalized` (no `var_` prefix). The value is matched case- and whitespace-insensitively against every bucket entry on the variable's def, then folded to that bucket's canonical-normalized form before filtering.

| Use case | Syntax | Backing |
|---|---|---|
| Subcategory variable (selects a specific board) | `?platform=n64` | Affects the `subcategoryKey` the query asks for. Redis-cacheable per resolved key. |
| Filter variable (narrows a board's rows) | `?platform=n64` | JSONB containment `variables @> {platform: "nintendo64"}`. Always goes to PG. |
| Multiple filter variables | `?platform=n64&region=us` | AND. JSONB containment with both keys. |
| Combined view across subcategories | `?combined=1` | Drops the `subcategoryKey` filter — returns best per runner across every subcategory in the category. Always goes to PG. |
| Verified-only | `?verified=true` (or `=1`) | Uses the `is_verified_entry*` flags instead of `is_leaderboard_entry*`. Redis-cacheable as a separate key (`:v` suffix). |
| Year cohort | `?year=2024` | Adds `EXTRACT(YEAR FROM ended_at) = 2024`. Goes to PG. |
| Pagination | `?page=2&pageSize=50` | `pageSize` capped at 100. |
| Timing override | `?timing=rt` or `?timing=gt` | See [Timing Preferences](#timing-preferences) for precedence. |

Notes:
- There is no OR combinator across distinct variables (no `filterMode=or`, no comma-separated values). One value per key.
- There is no "X has any value" (`*`) or "X is unset" (`!`) sentinel. To find runs that didn't supply a variable, query the default subcategory and look at the `subcategoryKey` returned per row.
- Unknown variable names in the query string are silently ignored (the resolver only consults variables that have a published def).
- Built-in reserved params: `combined, verified, country, year, page, pagesize, timing, view`. Anything else is treated as a variable name lookup.

#### Performance

- **No filter + default subcategory + no builtins**: Redis-cached, ~1-5ms.
- **Filter variable applied** (e.g. `?platform=n64` when `platform` is `role: "filter"`): PG with JSONB containment + B-tree on `(gameId, categoryId, subcategoryKey, time)`. ~5-50ms.
- **`?combined=1`** or any non-trivial builtin (`?year=`): PG, ~5-50ms.
- **Specific subcategory** (e.g. `?platform=n64` when `platform` is `role: "subcategory"`): Redis-cached at the resolved key, same speed as default.

If the requested combination of subcategory variables isn't in `valid_subcategory_combinations` for the scope (when that table is populated), the API returns 404 with the list of valid combinations so the frontend can offer alternatives.

### GET /v1/leaderboards/wr-history/{game}/{category}

World record progression timeline. Also resolves game/category via aliases.

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

All leaderboard entries for a user across all games/categories, with rank in each. Uses each category's `primaryTiming` (realtime or gametime) to determine the correct leaderboard for ranking.

```typescript
// Response
{
  result: {
    game: string;
    category: string;
    time: number;
    gameTime: number | null;
    primaryTiming: "rt" | "gt";
    verificationStatus: string;
    vodUrl: string | null;
    runDate: string;
    rank: number | null;          // null if Redis cache is cold
    totalRunners: number;
  }[]
}
```

**Auth:** None (public).

### POST /v1/leaderboards/submit

Manually submit a run (for guest/inactive runners). Submitted as verified. Variable values are resolved through the variable's value buckets — case- and whitespace-insensitively matched against every bucket entry, then stored as the bucket's canonical-normalized form.

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

## 8. Variable Management

### Variable Definitions

Variables are defined per game, optionally scoped to a category. Game-wide variables (`categoryId: null` in the body) apply to all categories unless overridden by a category-specific definition with the same name.

Two roles:
- **`subcategory`**: splits the leaderboard. Each distinct combination of subcategory values produces a different `subcategoryKey` (plain text, e.g. `platform=nintendo64|region=us`). Always effectively required — missing values fall back to the variable's default.
- **`filter`**: queryable at read-time via bare query params (no prefix). Does not split the board. Always optional — missing means "no filter applied".

Values are stored as **buckets**: a `values: string[][]` where each inner array is a bucket whose first entry is the canonical label. Subsequent entries in the same bucket are inline aliases that all resolve to the canonical:

```typescript
values: [
  ["Nintendo 64", "n64", "nin64", "N64"],       // bucket 0 — canonical "Nintendo 64"
  ["Virtual Console", "VC"],                     // bucket 1
  ["Emulator", "emu", "Project64", "Mupen"],     // bucket 2
]
```

Matching is case- and whitespace-insensitive (and strips `=` / `|`). The *stored* form on each `finished_runs` row is the **canonical-normalized** value — `normalize(bucket[0])` — so `variables.platform` ends up as `"nintendo64"` regardless of how the user wrote it in their splits.

`defaultValueIndex` is an index into `values` (required for `subcategory`, optional for `filter`). It picks which bucket's canonical to use when a run has no value for the variable.

**There is no separate alias system.** The legacy `variable_aliases` / `variable_value_aliases` tables and endpoints were removed — aliases live inline on the bucket. If you need to teach the system that "Console" means "platform", do it via a value bucket on the renamed variable, not a separate alias.

### Variable Endpoints

All admin-only (`edit-customizations` permission for the game).

```typescript
// GET /v1/games/{gameId}/variables?categoryId=
// List published variables in scope. STRICT-SCOPE — does NOT merge.
// categoryId omitted/empty -> only rows where `categoryId IS NULL` (game-wide defs).
// categoryId=N            -> only rows where `categoryId = N` (category-N overrides).
//
// To render an "effective variables for this category" view, either call this
// twice (once with no categoryId, once with categoryId=N) and merge client-side
// with the category row winning on nameNormalized collisions, OR use the
// public merged endpoint documented in §7:
//   GET /v1/leaderboards/{game}/{category}/variables
//
// Response
{
  result: {
    id: number;
    gameId: number;
    categoryId: number | null;
    name: string;                  // display name as entered
    nameNormalized: string;        // lowercased, stripped — used in URLs/keys
    role: "subcategory" | "filter";
    values: string[][];
    defaultValueIndex: number | null;
    sortOrder: number;
    description: string | null;
    version: number;
    published: boolean;
  }[];
}
```

```typescript
// POST /v1/games/{gameId}/variables
// Create or update by name. Looks up the existing row by (gameId, categoryId,
// nameNormalized); if found, marks it unpublished and inserts a new row with
// version+1. PUT to /variables/{anyId} is functionally identical — the path
// id is unused, the body's name is what matches.
{
  name: string;                    // required, max 64 chars
  role: "subcategory" | "filter";
  values: string[][];              // required, non-empty buckets of non-empty strings
  defaultValueIndex: number | null;// required for subcategory, optional for filter
  sortOrder?: number;
  description?: string | null;
  categoryId?: number | null;      // null/omit = game-wide
}

// Response
{ result: VariableRow }
```

```typescript
// DELETE /v1/games/{gameId}/variables/{anyId}
// Deletes by name (path id is ignored). Body must carry one of:
{
  name?: string;
  nameNormalized?: string;
  categoryId?: number | null;
}

// Response
{ result: { deleted: true } }
```

Every create / update / delete enqueues a [re-projection](#re-projection-after-variable-changes); the API returns immediately, and existing runs converge to the new defs in the background.

### Reserved Names

The following normalized names are reserved as built-in query params and **cannot** be used as variable names: `combined`, `verified`, `country`, `year`, `page`, `pagesize`, `timing`, `view`. The API returns 400 on attempts to create one.

### Re-projection After Variable Changes

When a subcategory variable is created, edited, or deleted, the backend asynchronously re-projects every affected `finished_runs` row from its `raw_variables` against the current defs — recomputing `variables` and `subcategoryKey`, and rebuilding the entry flags for any board whose key shifted.

**Trigger is automatic.** `POST/PUT/DELETE` on `/v1/games/{gameId}/variables` enqueues the re-projection. The API call returns immediately; the worker processes the scope in the background (large games may take multiple Lambda invocations via SQS continuations). Frontends don't need to poll — once the worker finishes, the next leaderboard read returns the corrected data.

**Manual recovery via `POST /v1/leaderboards/invalidate-cache/{gameId}`.** This admin-only endpoint is now the one-stop "fix this game's leaderboards" handle. Defaults to Redis flush + enqueue a full-game re-projection. Query params:

| Param | Effect |
|---|---|
| _(none)_ | Redis flush + enqueue full-game reproject |
| `?categoryId=N` | Scope the reproject to one category |
| `?rebuildAllFlags=1` | Worker rebuilds entry flags for every combo in scope, not just dirty ones (use when `subcategoryKey` is fine but flags drifted) |
| `?cacheOnly=1` | Original behavior — Redis flush only, no reproject. Escape hatch when you just want to clear caches |

```typescript
// Response
{
  result: {
    invalidated: { gameId: number },
    reproject: { scope: { gameId, categoryId }, rebuildAllFlags: boolean } | null
  }
}
```

**Auth:** Required. `edit:leaderboard` permission.

### Valid Subcategory Combinations

By default every cartesian combination of subcategory variable values is a legal leaderboard ("open" mode). Site admins can restrict a game (or a single category) to a curated list of legal combinations ("managed" mode) — runs that resolve outside the list get folded onto the default-combination key and the leaderboard read endpoint returns 404 with the legal list when a frontend asks for an illegal combination.

**Auth on all endpoints below:** Required. Site-wide admin (`moderate:admins`) — not game-level `edit-customizations`.

```typescript
// GET /admin/combinations/{gameId}
// GET /admin/combinations/{gameId}/{categoryId}
//
// Lists every cartesian combination of the in-scope subcategory variables and
// marks which ones are legal. When no managed list exists, every combo is
// reported `valid: true` and `mode` is "open".
//
// Response
{
  combinations: {
    subcategoryKey: string;     // e.g. "platform=nintendo64|region=us"
    valid: boolean;
  }[];
  mode: "open" | "managed";
}
```

```typescript
// PUT /admin/combinations/{gameId}
// PUT /admin/combinations/{gameId}/{categoryId}
//
// Replaces the entire legal list for the scope. Sending an empty array switches
// the scope back to "open" mode. Keys are normalized server-side — you can
// submit display strings (e.g. "Platform=N64|Region=US") and they will be
// folded to canonical form. Order of `name=value` parts within a key does not
// matter; parts are sorted by nameNormalized server-side.
{
  subcategoryKeys: string[];
}

// Response
{ ok: true, replaced: number }
```

**Note:** Replacing the list does NOT migrate existing runs that now fall on newly-invalid combinations — those runs stay on their current subcategoryKey and remain ineligible-for-leaderboard if their key is no longer legal. Run migration is intentionally not exposed as an API surface; it's handled out-of-band by the rebuild worker when re-projection is triggered (variable edits, manual cache invalidation).

The merged endpoint `GET /v1/leaderboards/{game}/{category}/variables` (§7) reads the same data and surfaces it as `validCombinations: { mode, keys? }` for public consumption.

### Minimum Times

A category can have a minimum-time floor below which runs are flagged ineligible for the leaderboard. Minimums are **strictly per `(gameId, categoryId)`** — one floor covers every subcategoryKey under the category, regardless of how many subcategory variables you've defined. No per-subcategory granularity.

```typescript
// PUT /v1/games/{gameId}/categories/{catId}/minimums
{
  minTimeMs?: number | null;        // realtime floor in ms
  minGameTimeMs?: number | null;    // gametime floor in ms
}

// Response — synchronous response. The retroactive flagger runs in the
// background; results are eventually consistent (typically within seconds).
{ result: { updated: true, rebuildEnqueued: true } }
```

At least one of `minTimeMs` or `minGameTimeMs` must be provided. Both validated as finite, `>= 0`, `<= 10 years`.

The upsert is **asynchronous**. The API writes the minimum row, invalidates Redis caches, and enqueues a rebuild message onto the leaderboard-rebuild queue, then returns. The rebuild worker scans every run in the category, applies the new minimum (flips `leaderboard_eligible = false` / `ineligible_reason = "below_minimum"` on violators, unflags runs that no longer violate, rebuilds entry flags on affected boards), and invalidates caches a final time. Latency from PUT to consistent leaderboard is typically seconds; large games can take longer if the worker re-enqueues a continuation.

```typescript
// DELETE /v1/games/{gameId}/categories/{catId}/minimums
// No body required.

// Response
{ result: { deleted: true, rebuildEnqueued: true } }
```

```typescript
// GET /v1/games/{gameId}/categories/{catId}/minimums
// Response
{
  result: {
    minTimeMs: number | null;
    minGameTimeMs: number | null;
    setBy: number;
    updatedAt: string;
  }[]   // 0 or 1 entries
}
```

**Auth:** Required. `edit-category-settings` permission for the game.

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

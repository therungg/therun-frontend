# Role team admin page — design (Option A: unified on System B)

**Date:** 2026-08-24
**Status:** Design — awaiting review
**Repo:** therun-frontend only. **No backend changes, no migration, no deploy.**
**Classification:** bounded (frontend assembly of existing endpoints/actions).

## Goal

One admin page, gated on `moderate roles`, that manages the leaderboard role team on the
**current (System B) role model**, as three tiers:

1. **Site admins** — `admin` holders. **Read-only** ("managed separately"). Never grantable here.
   (Note: CASL `admin` is auto-bridged to `global-admin` in game-mgmt via `resolve-role.ts:85`.)
2. **Global board admins** — `global-admin` (System B, global scope). Add + remove.
   The real site-wide board authority.
3. **Game team** — per selected game: `game-admin` / `game-mod` (System B, game scope).
   Add + remove. `game-admin` → `adminedGames`; `game-mod` → `moderatedGames` (derived at session).

New route: `app/(new-layout)/admin/roles/team/page.tsx`. Separate from the existing
`/admin/roles` (System A user-search) and `/admin/role-assignments` (global-admin only) pages.

## Why System B, not CASL board-admin/board-moderator

Enforcement for board/game management moved to System B (`role_assignments` +
`checkGameMgmtPermission`). `resolve-role.ts` bridges CASL `admin` → `global-admin` but
**not** `board-admin`, so CASL `board-admin`/`board-moderator` are bypassed by the current
board tooling. `global-admin` is the coherent site-wide board authority. We do not touch the
CASL board roles.

**No global "board-moderator" equivalent exists** in System B (moderation is per-game
`game-mod` or per-series `series-mod`). A site-wide mod-but-not-admin tier is intentionally
out of scope; adding one would require a new System B global role.

## Existing pieces reused (all present today)

- List site admins: `getPaginatedUsers({ role: 'admin' })` (`src/lib/users.ts`).
- List global-admins: `listGlobalRoleAssignments(session.id)` → filter `role === 'global-admin'`
  (`src/lib/role-assignments.ts:9`; already used by `/admin/role-assignments/page.tsx:15`).
- Grant global-admin: `assignGlobalAdminAction` (`admin/role-assignments/actions/`).
  Or generic `assignRole({ username, role: 'global-admin' }, session.id)`.
- Revoke any assignment: `revokeRoleAssignmentAction` / `revokeRoleAssignment(id)`.
- List a game's mods/admins: `listGameModerators(gameSlug)` (`src/lib/game-moderators.ts`).
- Grant/remove game role: `addGameModeratorAction` / `removeGameModeratorAction`
  (`games-v2/[game]/setup/actions/manage-moderators.action.ts`), or generic
  `assignRole({ username, role: 'game-admin'|'game-mod', gameId }, session.id)`.

## Page structure (`app/(new-layout)/admin/roles/team/`)

- **page.tsx** — server component. Gate `confirmPermission(session, 'moderate', 'roles')`
  (throws → error page). Loads site admins + global-admins server-side.
- **Section 1 — Site admins (read-only):** badge list, no controls.
- **Section 2 — Global board admins:** holder list + username-lookup Add + Remove
  (reuse the `role-assignments-client.tsx` grant/revoke pattern; can lift shared bits).
- **Section 3 — Game team:** a game picker (reuse existing game search/select component).
  On select → client-fetch `listGameModerators(slug)`, render two columns
  (`game-admin` / `game-mod`), each with Add (username) + Remove.

Cache/read-your-writes: mutating a tier revalidates that tier's list. Use `updateTag` (not
`revalidateTag`) where the action must read its own write (MEMORY: server actions don't read
their own `revalidateTag` writes).

## Guards

- Page gated on `moderate roles`.
- Section 1 renders no add/remove controls; `admin` is never grantable here.
- Global-admin grant/remove authority: enforced server-side by the existing
  `assign-global-admin` / `revoke` actions (game-mgmt `assign-global-admin` permission).
- Game-role grant/remove authority: existing `edit moderators { game }` /
  `assign-game-admin`/`assign-game-mod` checks inside the reused actions — unchanged.

## Testing

- Component test: page renders three sections; Section 1 has no controls.
- Action wiring: Add/Remove call the correct existing actions with the right role + scope.
- Guard: non-`moderate roles` session → error/notFound.

## Out of scope

- CASL `board-admin`/`board-moderator` (bypassed; not touched).
- A global "board-moderator" tier (doesn't exist in System B).
- series/verifier/category tiers; bulk operations; editing the `admin` role.

# Frontend guide: board claims, per-game moderators, game metadata, configured flag

**Status:** implemented backend-side on branch game-setup-wizard (../therun) — pending migration 0071 + deploy. DB stores status 'rejected'; the API maps it to 'denied'. Global queue excludes already-moderated boards.
**Consumers:** claim CTA on `games-v2/[game]`, admin queue at `/admin/board-claims`, console attention pane, setup wizard at `games-v2/[game]/setup`.

## 1. Board claim requests

A claim request = a user asking to moderate a game's board. One open (`pending`) request per (userId, gameId) — reject duplicates with 409.

### POST /v1/board-claims  (auth: any logged-in user)
Body: `{ "gameId": number, "motivation": string }`  → `{ "result": { "id": number } }`
No eligibility requirements (decision 2026-07-14): signals are surfaced, not gated.

### GET /v1/board-claims?status=pending  (auth: global admin)
### GET /v1/board-claims?status=pending&gameId={id}  (auth: that game's game-admin OR global admin)
### GET /v1/board-claims/mine?gameId={id}  (auth: any; returns caller's request for that game or null)

All return `BoardClaimRequest`:

```json
{
    "id": 1, "gameId": 123, "gameSlug": "supermario64", "gameDisplay": "Super Mario 64",
    "userId": 42, "username": "runner1", "motivation": "…",
    "status": "pending",              // pending | approved | denied
    "signals": {
        "runsOnGame": 17,             // finished ingested runs by this user on this game
        "totalRuns": 220,             // finished ingested runs by this user overall
        "accountCreatedAt": "2024-01-01T00:00:00Z",
        "priorApprovals": 0, "priorDenials": 1
    },
    "createdAt": "…", "decidedBy": null, "decidedAt": null, "denyReason": null
}
```
The list endpoints also inline board activity so the admin can judge stakes:
`"board": { "uniqueRunners": number, "totalFinishedRuns": number }` per request.

### POST /v1/board-claims/{id}/approve  (auth: global admin; for gameId-scoped requests on already-moderated boards: that game's game-admin too)
Body: `{ "role": "game-admin" | "game-mod" }`
Effect: create the role assignment for (userId, gameId), make `canModerateGame`/`moderatedGames` reflect it, mark request approved, send a bell notification to the requester linking to `/games-v2/{gameSlug}/setup`.

### POST /v1/board-claims/{id}/deny  (same auth as approve)
Body: `{ "reason"?: string }` → notification to requester.

## 2. Per-game moderators

`POST /roles/assign` already accepts `{ userId, role: 'game-admin'|'game-mod', gameId }` and
`DELETE /roles/{assignmentId}` exists. **Please confirm** these assignments feed
`user.moderatedGames` / `canModerateGame` on session load — the frontend assumes they do.

### NEW: GET /v1/games/{gameId}/moderators  (public, no auth)
→ `{ "result": [ { "assignmentId": 1, "userId": 42, "username": "runner1", "role": "game-admin", "createdAt": "…" } ] }`
Public because the claim CTA needs "does this board have mods?" for logged-out render too.

### NEW: session shape — per-game admin tier
`user.moderatedGames: string[]` cannot distinguish a game-admin (may manage the mod
team) from a game-mod (may not). The frontend gates mod-team management on CASL
`edit moderators`, which today only global `admin`/`board-admin` roles satisfy — so a
per-game game-admin cannot add/remove mods on their own board until the session
exposes the tier. Please add e.g. `user.adminedGames: string[]` (games where the
user's assignment role is `game-admin`) to the session payload; the frontend will
then grant `edit moderators` per-game in `src/rbac/ability.ts` defaultPermissions.
Until this ships, the wizard's mod-team section and the console's join-team
approvals work only for site staff.
The backend must whitelist assignable roles per surface (game-admin/game-mod only from these flows) and scope role-assignment create/delete authorization to the target game when opening them to game-admins — the frontend's checks are advisory.

## 3. Game metadata

Extend `PUT /v1/games/{gameId}` (existing, already takes `slug`) with:
`coverUrl?: string|null`, `platforms?: string[]`, `releaseYear?: number|null`, `discordUrl?: string|null`.
Extend `GET /v1/games/{gameId}` response's `game` object with the same fields.
Nice-to-have (not blocking): a presigned-URL upload endpoint for game cover images —
the existing NEXT_PUBLIC_UPLOAD_URL path is splits-specific; v1 wizard uses a URL field.

## 4. Configured flag

Board-level `configured: boolean` (default false) on the game.
Settable via the same `PUT /v1/games/{gameId}` body (`configured?: boolean`) by that game's mods
(same authz as category settings). Returned on `GET /v1/games/{gameId}`.
Purpose: "unconfigured board" badges + discovery ranking later; the wizard's Finish step sets it true.

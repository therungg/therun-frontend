# Leaderboards v2: country flags + runner avatars

**Date:** 2026-07-17
**Branches:** `leaderboard-user-meta` (frontend + backend)
**Status:** Implemented

## Goal

Show each runner's country flag and profile picture on the games-v2
leaderboard, without per-user API calls (no N+1).

## Approach

Enrich leaderboard entries server-side in the backend, from data already
in Postgres. Considered and rejected:

- **Frontend per-user fetches** (`/users/global/{user}` per row): N+1
  calls per page render; exactly what the existing pattern does and what
  we must avoid.
- **DynamoDB BatchGetItem per page:** works, but adds a DynamoDB
  round-trip and credentials coupling to every leaderboard read; country
  would still be keyed by username while entries carry userId.
- **Chosen — PG mirror + one batched join:** PG `users` already mirrors
  `picture` from the DynamoDB profile. Mirror `country` the same way,
  then join both into leaderboard pages with a single `inArray` query
  (~pageSize primary-key hits).

## Backend (`therun`, branch `leaderboard-user-meta`)

1. **Schema:** `users.country varchar(3)` — migration
   `drizzle/0072_last_guardian.sql`. **Joey must run `npm run migrate`
   and deploy** before the frontend shows anything.
2. **Mirroring:**
   - Login (`generate-session.ts` → `getOrCreateUser`): copies the
     DynamoDB profile's `country` into PG, healing drift on every login.
   - Profile edit (`api/users/handler.ts` PUT): after a successful
     `editUser`, `updateUserCountry()` syncs the new value (or clears
     it) to PG. Best-effort; a miss self-heals on next login.
   - One-off backfill: `npx tsx src/db/backfill-user-country.ts` — one
     DynamoDB scan, PG updates only for users with a country set.
3. **Enrichment** (`get-leaderboard.ts`): `LeaderboardEntry` gains
   `picture`/`country`. `fetchUserMeta()` runs one `inArray` lookup per
   page, in `Promise.all` with the existing secondary-timings query (no
   added sequential latency). Applied on both the Redis-hydrate path and
   the direct-Postgres path, so cache hits are enriched too. Guests get
   nulls; the `'noimage'` sentinel is normalized to `null`.

## Frontend (`therun-fr`, branch `leaderboard-user-meta`)

- `LeaderboardEntry` type: optional `picture`/`country` (tolerates older
  backend deploys).
- `RunnerAvatar`: renders the picture in the existing monogram circle;
  falls back to the monogram when absent or when the (possibly stale)
  Twitch CDN URL 404s.
- `CountryFlag`: guarded by `hasFlag()`, remote SVG from the same
  hampusborgos GitHub source as the profile page's `CountryIcon`;
  browser caches one SVG per distinct country. Shown after the runner
  name in rows and in the hero WR crown.
- No new frontend data calls: fields ride the existing cached
  leaderboard response (`cacheLife('minutes')`).

## Performance summary

Per leaderboard page render: +1 batched PG query (25 PK lookups),
parallel to an existing query. Zero extra calls from the frontend, zero
DynamoDB reads on the leaderboard path.

## Handoff to Joey

1. Backend: `npm run migrate` (0072), deploy, then run
   `npx tsx src/db/backfill-user-country.ts` once.
2. Interactive browser pass on a games-v2 board (sandbox can't run
   `next dev`).

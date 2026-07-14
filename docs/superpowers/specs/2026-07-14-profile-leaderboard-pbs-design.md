# Profile Leaderboard PBs — Design

**Date:** 2026-07-14
**Status:** Spec (autonomous Tier 0 continuation). Third Tier 0 item; leaves only launch un-gating (Joey's trigger).
**Scope:** Backend + frontend, branches `profile-leaderboard-pbs` stacked on `run-submission-form`.

## 1. Goal

A "Leaderboard PBs" tab on user profiles: every board the runner has a standing on — game, category, time, rank, verified state — with rows linking to the board and the run detail page. This is the retention loop (runners come back to see their name) and closes Tier 0 item 4.

## 2. Ground truth (verified 2026-07-14)

- `GET /v1/leaderboards/user/{userId}/rankings` exists, public, zero consumers anywhere. Handler `src/api/leaderboards/handler.ts:298-305` → `src/leaderboards/get-user-rankings.ts`. Returns a BARE array of `{ game, category, time, gameTime, primaryTiming, verificationStatus, vodUrl, runDate, rank (1-based|null), totalRunners }` — display names only, **no ids/slugs/subcategoryKey/runId**, so rows can't link. Filters: `isLeaderboardEntry(Gt)`, `leaderboardEligible`, `NOT excluded`; pending included (status echoed); rejected excluded; **manual times not unioned** (accepted v1 limitation — the submission form writes finished_runs, so the main non-timer flow is covered; noted as follow-up).
- Frontend `getUserRankings` (`src/lib/leaderboards-v1.ts:176-184`) expects a `{result}` envelope the endpoint doesn't send (would silently return `[]`), and `UserRanking` (types) has a stale ids-only shape. Both wrong; zero consumers → free to fix.
- **No public username→userId lookup exists**; profiles only have the username string (`getGlobalUser` returns no numeric id; it's Dynamo-backed, unrelated to Postgres `users.id`).
- Profile page: `app/(new-layout)/[username]/page.tsx` server-fetches by username into client `user-profile.tsx` Bootstrap `<Tabs>` (overview/stats/sessions/downloads/stream). The Races tab is the precedent for a new tab.

## 3. Backend changes

### 3a. Enrich `getUserRankings` rows (pure read additions)

Each row additionally returns: `gameSlug` (games' URL name column — the one `resolveGame` matches), `categorySlug` (same for categories), `gameId`, `categoryId`, `subcategoryKey`, `runId` (the finished_runs id of the standing row). Verify actual slug column names in schema (`games.name`/`categories.name` vs display) against how `/v1/leaderboards/{game}/{category}` resolves slugs — the returned values must round-trip into `/games-v2/{gameSlug}` URLs.

### 3b. Username-keyed route + envelope

- New: `GET /v1/leaderboards/user/by-name/{username}/rankings` — resolves `lower(users.username) = lower(:username)` → id (404 `"User not found"` when absent), then same logic. Public.
- Both routes now wrap the response as `{ result: [...] }` (matches sibling `/v1/leaderboards` reads; safe — zero consumers).

## 4. Frontend changes

- `types/leaderboards.types.ts`: rewrite `UserRanking` to the real enriched shape.
- `src/lib/leaderboards-v1.ts`: fix `getUserRankings(userId)` unwrap; add `getUserRankingsByName(username)` (`'use cache'`, `cacheLife('minutes')`, `cacheTag(\`user-rankings:${username.toLowerCase()}\`)`, 404 → `[]`).
- Profile page: fetch `getUserRankingsByName(username)` in the existing `Promise.all` (`.catch(() => [])` — the tab must never break the profile); pass `rankings` into `UserProfile`.
- `user-profile.tsx`: new `<Tab eventKey="rankings" title="Leaderboard PBs">` rendered ONLY when `rankings.length > 0` (pre-launch most profiles have none; no empty clutter). Tab body = new component `app/(new-layout)/[username]/leaderboard-pbs.tsx`.
- `leaderboard-pbs.tsx` (client, mirrors leaderboard-table idiom): rows sorted by game display then category — Game (link `/games-v2/{gameSlug}`), Category (+ subcategory pills from `subcategoryKey` when non-empty, parsed `name=value|...` showing values), Time (`DurationToFormatted` of the primary-timing value, linked to `/games-v2/{gameSlug}/run/{runId}`), Rank (`#rank of totalRunners`, em-dash when rank null), verified badge (reuse `VerificationBadge` from `run-view/run-badges`), date (`toLocaleDateString`).

## 5. Testing

- Backend: unit test for the username-resolution 404 + route matching (integration, unauth-free since public — the by-name route with an absurd name must 404, numeric route with absurd id returns empty result; both runnable without migration 0070? The rankings query doesn't touch source/created_at — YES, runnable against the dev DB).
- Frontend: pure `parseSubcategoryKey(key): Array<{name, value}>` helper with vitest tests; the rest is render wiring covered by build + Joey's browser pass.

## 6. Out of scope

Manual-time union in rankings (follow-up; noted), pagination (unbounded row count acceptable — a runner with hundreds of boards is a good problem), obsolete/history rows, per-timing dual rows (primary timing only, matching the endpoint's dedup).

# Profile Leaderboard PBs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Leaderboard PBs" profile tab wired to an enriched, username-keyed rankings endpoint, per `docs/superpowers/specs/2026-07-14-profile-leaderboard-pbs-design.md`.

**Architecture:** Backend enriches the existing zero-consumer rankings read (slugs/ids/runId), adds a by-name route, and normalizes the envelope. Frontend fixes the stale type/lib, adds a lazy-hidden profile tab with a linked PB table.

**Tech Stack:** as prior plans (Drizzle/Jest backend; Next 16/vitest/Biome frontend).

## Global Constraints

- Branches `profile-leaderboard-pbs` in BOTH repos, created FROM `run-submission-form` (stacked; Joey merges in order).
- All environment caveats from the prior two plans hold (filtered backend tsc gate; frontend victory-chart noise; pre-existing jest failures out of scope). The rankings queries do NOT touch migration-0070 columns — integration tests against the dev DB are expected to actually run.
- Zero consumers of the rankings endpoint exist — response-shape changes are safe, but VERIFY with a repo-wide grep before relying on that.
- Spec copy/behavior binding: tab renders only when rankings non-empty; profile page must never fail because rankings failed (`.catch(() => [])`).
- Commits conventional, no co-author; no pushes until final task; no PRs.

## File Structure

**Backend:** modify `src/leaderboards/get-user-rankings.ts` (enrich select), `src/api/leaderboards/handler.ts` (by-name route + `{result}` envelope on both); test `test/manual/integration/leaderboards/user-rankings.test.ts`.
**Frontend:** modify `types/leaderboards.types.ts` (rewrite `UserRanking`), `src/lib/leaderboards-v1.ts` (fix + add fetchers), `app/(new-layout)/[username]/page.tsx` (fetch + prop), `app/(new-layout)/[username]/user-profile.tsx` (tab); create `app/(new-layout)/[username]/leaderboard-pbs.tsx`, `src/lib/run-view/parse-subcategory-key.ts` + `src/lib/run-view/__tests__/parse-subcategory-key.test.ts`.

---

## Task 1: Backend — enrich rankings, by-name route, envelope

**Files:** Modify `src/leaderboards/get-user-rankings.ts`, `src/api/leaderboards/handler.ts`. Test: `test/manual/integration/leaderboards/user-rankings.test.ts`.

**Interfaces — Produces:**
- Row shape (each ranking): `{ game, gameSlug, gameId, category, categorySlug, categoryId, subcategoryKey, runId, time, gameTime, primaryTiming, verificationStatus, vodUrl, runDate, rank, totalRunners }`.
- `GET /v1/leaderboards/user/{userId}/rankings` and `GET /v1/leaderboards/user/by-name/{username}/rankings` — both public, both `ok(JSON.stringify({ result: rows }))`; by-name 404s `"User not found"` for unknown usernames.

**READ FIRST:** `src/leaderboards/get-user-rankings.ts` in full (the select already joins games+categories — add the slug/id fields to the existing select rather than new joins; find the slug columns by checking what `/v1/leaderboards/{game}/{category}` resolution matches against — likely `games.name`/`categories.name`; confirm in schema + the resolve code). `runId` = the selected finished_runs row's `id` (the dedup keeps one row per slice — carry its id through). Grep both repos for `user/` + `rankings` consumers to confirm zero before changing the envelope.

- [ ] **Step 0:** `cd /home/joey/therun/therun && git checkout run-submission-form && git checkout -b profile-leaderboard-pbs`
- [ ] **Step 1: Failing integration test** — `test/manual/integration/leaderboards/user-rankings.test.ts`:

```ts
import { handleLeaderboards } from "../../../../src/api/leaderboards/handler";

describe("user rankings", () => {
    it("numeric route returns an enveloped result array", async () => {
        const event: any = {
            path: "/v1/leaderboards/user/999999999/rankings",
            httpMethod: "GET",
            headers: {},
        };
        const res = await handleLeaderboards(event);
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(Array.isArray(body.result)).toBe(true);
        expect(body.result).toHaveLength(0);
    });

    it("by-name route 404s for an unknown username", async () => {
        const event: any = {
            path: "/v1/leaderboards/user/by-name/definitely-not-a-real-user-9f8e7d/rankings",
            httpMethod: "GET",
            headers: {},
        };
        const res = await handleLeaderboards(event);
        expect(res.statusCode).toBe(404);
    });
});
```

- [ ] **Step 2:** Run — first test FAILS today (bare array, no `result` key), second FAILS (route missing).
- [ ] **Step 3:** Implement: enrich the select + carry through dedup; in `handler.ts`, replace the existing rankings branch with two branches — by-name FIRST (`/\/user\/by-name\/([^/]+)\/rankings/`, decodeURIComponent the capture, resolve id via `lower(users.username) = lower($name)`, 404 when absent) then numeric (existing regex); both wrap `{ result }`.
- [ ] **Step 4:** `npx jest test/manual/integration/leaderboards/user-rankings.test.ts` GREEN (these hit the dev DB and should genuinely run — if the DB connection itself fails, record verbatim + fall back to filtered tsc); `npx tsc --noEmit 2>&1 | grep -v node_modules` empty.
- [ ] **Step 5:** Commit `feat(rankings): enrich user rankings with slugs/ids/runId, by-name route, result envelope`.

---

## Task 2: Frontend — type rewrite, fetchers, subcategory parser (TDD)

**Files:** Modify `types/leaderboards.types.ts`, `src/lib/leaderboards-v1.ts`. Create `src/lib/run-view/parse-subcategory-key.ts` + test.

**Interfaces — Produces:**
- `UserRanking` rewritten: `{ game: string; gameSlug: string; gameId: number; category: string; categorySlug: string; categoryId: number; subcategoryKey: string; runId: number; time: number; gameTime: number | null; primaryTiming: 'rt' | 'gt'; verificationStatus: 'pending' | 'verified' | 'rejected'; vodUrl: string | null; runDate: string; rank: number | null; totalRunners: number }`.
- `getUserRankings(userId)` fixed to the `{result}` envelope; `getUserRankingsByName(username: string): Promise<UserRanking[]>` — `'use cache'`, `cacheLife('minutes')`, `cacheTag(\`user-rankings:${username.toLowerCase()}\`)`, 404 → `[]` (V1FetchError pattern), path `/v1/leaderboards/user/by-name/${encodeURIComponent(username)}/rankings`.
- `parseSubcategoryKey(key: string): Array<{ name: string; value: string }>` — `''` → `[]`; `'platform=n64|region=us'` → both pairs in order; tolerates segments without `=` by skipping them.

- [ ] **Step 0:** `cd /home/joey/therun/therun-fr && git checkout run-submission-form && git checkout -b profile-leaderboard-pbs`
- [ ] **Step 1: Failing test** — `src/lib/run-view/__tests__/parse-subcategory-key.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { parseSubcategoryKey } from '../parse-subcategory-key';

describe('parseSubcategoryKey', () => {
    test('empty key', () => expect(parseSubcategoryKey('')).toEqual([]));
    test('single pair', () =>
        expect(parseSubcategoryKey('platform=n64')).toEqual([{ name: 'platform', value: 'n64' }]));
    test('multiple pairs keep order', () =>
        expect(parseSubcategoryKey('platform=n64|region=us')).toEqual([
            { name: 'platform', value: 'n64' },
            { name: 'region', value: 'us' },
        ]));
    test('skips malformed segments', () =>
        expect(parseSubcategoryKey('junk|platform=n64')).toEqual([{ name: 'platform', value: 'n64' }]));
});
```

- [ ] **Step 2:** RED, then implement:

```ts
// Parses a board slice key ('name=value|name=value') into ordered pairs for display.
export function parseSubcategoryKey(
    key: string,
): Array<{ name: string; value: string }> {
    if (!key) return [];
    return key
        .split('|')
        .map((segment) => {
            const eq = segment.indexOf('=');
            if (eq <= 0) return null;
            return { name: segment.slice(0, eq), value: segment.slice(eq + 1) };
        })
        .filter((p): p is { name: string; value: string } => p !== null);
}
```

- [ ] **Step 3:** Type rewrite + both fetchers (mirror `getManualTimeById`'s 404→null pattern but return `[]`).
- [ ] **Step 4:** `npx vitest run` (all green, +4), `npm run typecheck` (no NEW — the UserRanking rewrite has zero other consumers; verify with grep and fix any that appear).
- [ ] **Step 5:** Commit `feat(profile): rankings fetchers, UserRanking type matching real contract, subcategory parser`.

---

## Task 3: Frontend — profile tab + PB table

**Files:** Modify `app/(new-layout)/[username]/page.tsx`, `app/(new-layout)/[username]/user-profile.tsx`. Create `app/(new-layout)/[username]/leaderboard-pbs.tsx`.

**Interfaces — Consumes:** `getUserRankingsByName`, `UserRanking`, `parseSubcategoryKey`, `DurationToFormatted` (~src/components/util/datetime), `VerificationBadge` (~app path to run-view/run-badges — compute the relative/alias import from the [username] dir).

**READ FIRST:** `page.tsx` (the `Promise.all` block ~line 81 and the `<UserProfile>` props ~line 141) and `user-profile.tsx` (the `<Tabs>` block ~line 172, Races tab as precedent, and its props interface).

- Page: add `getUserRankingsByName(username).catch(() => [])` to the `Promise.all`; pass `rankings={rankings}` into `<UserProfile>`.
- `user-profile.tsx`: add `rankings?: UserRanking[]` to props; after the existing tabs, `{rankings && rankings.length > 0 && (<Tab eventKey="rankings" title="Leaderboard PBs">...<LeaderboardPbs rankings={rankings} />...</Tab>)}` matching sibling Tab structure/wrappers.
- `leaderboard-pbs.tsx` (`'use client'`, mirrors the leaderboard-table idiom): sort rows by `game.localeCompare` then `category.localeCompare`; `<table className="table">` with columns Game / Category / Time / Rank / Verified / Date:
  - Game: `<Link href={`/games-v2/${row.gameSlug}`}>{row.game}</Link>`
  - Category: `{row.category}` + `parseSubcategoryKey(row.subcategoryKey).map(p => <span key={p.name} className="badge text-bg-secondary ms-1">{p.value}</span>)`
  - Time: `<Link href={`/games-v2/${row.gameSlug}/run/${row.runId}`}><DurationToFormatted duration={primary} /></Link>` where `primary = row.primaryTiming === 'gt' ? (row.gameTime ?? row.time) : row.time` (check DurationToFormatted's actual prop name in datetime.tsx before writing)
  - Rank: `row.rank != null ? `#${row.rank} of ${row.totalRunners}` : '—'`
  - Verified: `<VerificationBadge status={row.verificationStatus} />`
  - Date: `new Date(row.runDate).toLocaleDateString()`

- [ ] **Step 1:** Build all three changes.
- [ ] **Step 2:** Gates: `npm run typecheck` (no NEW), `npx vitest run` green, lint clean on touched files, `rm -rf .next && npm run build` passes.
- [ ] **Step 3:** Commit `feat(profile): leaderboard PBs tab`.

---

## Task 4: Finalize

- [ ] Final whole-branch review (most capable model, both repo diffs from the run-submission-form merge-bases) → fix wave if needed.
- [ ] Spec status update + docs commit; push `profile-leaderboard-pbs` both repos; NO PRs.
- [ ] Ledger + memory + report (branch stack: run-detail-provenance → run-submission-form → profile-leaderboard-pbs).

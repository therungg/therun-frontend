# Run Submission Form — Design

**Date:** 2026-07-14
**Status:** Spec (autonomous continuation of Tier 0, per Joey's standing instruction 2026-07-14). Second Tier 0 item, after run detail + provenance.
**Scope:** Backend (`../therun`) + frontend (`therun-fr`), branches `run-submission-form` in each (based on the pushed `run-detail-provenance` branches, which this depends on: `source` column, detail pages to link to).

---

## 1. Goal

Let a logged-in runner submit their own run — category, variables, time(s), date achieved, video — without a timer upload and without a moderator doing it for them. This is Tier 0's biggest functional gap: most console/retro runners don't use LiveSplit, and today the only paths onto a board are timer sync, a mod entering a guest run, or a raw self-claimed manual time. Submissions are real `finished_runs` rows (`source='submission'`), land in the existing verify queue, and get a real run detail page.

Autonomous design decisions (flagged for Joey's review):

- **Submissions are `finished_runs`, not manual times.** A manual time is a per-slice minimum candidate with one timing and no date; a submission is a run — both timings, a date, a video, verify-queue membership, a detail page. The backend already treats `source='submission'` as a known origin value.
- **Trust model mirrors `/v1/me/manual-times` exactly** (`wouldBeNewEntry` + `evaluateTrust`): a submission that can't improve the runner's board standing verifies instantly; an improving one is `pending` unless the account is trusted (≥1 prior verified run or >7 days old — `ACCOUNT_AGE_DAYS_FOR_INSTANT`). One trust model across all self-service, not two.
- **GT-only submissions mirror into `time`** (`time := gameTime` when RTA omitted on a GT-primary category) because `finished_runs.time` is NOT NULL; the resolution warning surface tells the runner. Boards for those categories display GT anyway.

## 2. Ground truth (verified in backend 2026-07-14, branch run-detail-provenance)

- `POST /leaderboards/submit` (`submit-handler.ts:21-126`) is mod-only (`verify-reject-run` gate), guest-only (`userId: null`), auto-verified, `endedAt = now()` (no claimed date), `isPb` hardcoded true, and writes the Redis *verified* board keys unconditionally. It is a template, not a reusable endpoint.
- Verify queue (`triage/list-queue.ts:112-137`) surfaces ANY `finished_runs` row with `verificationStatus='pending' AND leaderboardEligible AND NOT excluded AND NOT verifyQueueHidden` — no source filter; partial index exists. `applyVerifyWindowForBoard` (`verify-window/apply.ts`) auto-hides low-impact pending rows from the queue.
- `resolveRunVariables` (`resolve-run-variables.ts:68-119`) + `getMergedVariableDefs` + `getValidCombinationsSet` produce `{rawVariables, variables, subcategoryKey, warnings}` — reusable verbatim; warnings are response-only, never persisted.
- Trust: `src/rbac/self-service-trust.ts` — `isBanned(userId)`, `evaluateTrust(userId)`. Used by `/v1/me/manual-times` (`me/manual-time.ts:71-162`) and `/v1/me/runs/{id}/verdict`. The `/v1/me/*` handler pattern (bearer → username → id → isBanned) is the auth template.
- `LeaderboardEntryManager.updateForNewRun` computes `isLeaderboardEntry` regardless of status and `isVerifiedEntry` only when verified — pass `verificationStatus` through and it does the right thing. It never touches `isPb`.
- No dedup and no rate limiting exist anywhere on the write paths.
- Minimum-time check: `getMinimumTime` + `checkMinimumEligibility` (submit-handler.ts:58-71) — reuse.
- Frontend: `parseTimeInput` exists at `src/lib/fast50/time-input.ts` (tested) — lift to a shared location rather than importing fast50 from games-v2. `SubmitWarning` type exists with no UI consumer. Public variables endpoint + `getVariables` already power the board filter UI.

## 3. Backend: `POST /v1/me/submissions`

New handler `src/api/me/submission.ts`, routed from `src/api/me/handler.ts` (pattern: manual-time.ts). Auth: bearer → `resolveCaller` → `isBanned` → 403 `"You are banned from leaderboards"`.

Request body:

```typescript
{
  gameId: number;             // required
  categoryId: number;         // required
  time?: number;              // RTA ms; required unless gameTime present
  gameTime?: number;          // GT ms
  runDate: string;            // required, ISO date (YYYY-MM-DD or full ISO); becomes endedAt
  vodUrl?: string;            // http(s) URL, max 500 chars
  variables?: Record<string, string>;
}
```

Validation (400 with plain-text message, matching sibling handlers):
- `gameId`/`categoryId` must resolve to an existing active category of that game.
- At least one of `time`/`gameTime`, both integers > 0 and < 7 days in ms. When `time` absent: `time := gameTime`.
- `runDate` parses, not in the future (UTC day granularity), not before 1970.
- `vodUrl` when present: `new URL()` parses, protocol http/https.
- Minimum-time check (reuse): below minimum → 400 with the existing message shape.

Rate limit: count `logs` rows `action='self_submit_run' AND userId=caller AND timestamp > now()-interval '1 hour'`; ≥10 → 429 `"Too many submissions — try again later"`.

Dedup: existing non-rejected `finished_runs` row with same `(userId, gameId, categoryId, subcategoryKey)` and same `time` (and same `gameTime` when provided) → 409 `"You already submitted this exact run"`.

Insert (after `resolveRunVariables`):

```typescript
{
  username: caller.username, runnerName: caller.username, userId: callerId,
  time, gameTime: gameTime ?? null,
  endedAt: new Date(runDate),
  gameId, categoryId,
  rawVariables, variables, subcategoryKey,
  verificationStatus,            // trust outcome, below
  verifiedBy: verificationStatus === 'verified' ? callerId : null,   // self-verified via trust — provenance shows path
  verifiedAt: verificationStatus === 'verified' ? new Date() : null,
  submittedBy: callerId,
  isGuest: false,
  isPb, isPbGametime,            // computed, below
  leaderboardEligible: true,
  vodUrl: vodUrl || null,
  source: "submission",
  createdAt: new Date(),
}
```

Trust outcome (mirror manual-time.ts:90-105): compute `wouldBeNewEntry` = the submitted time beats the caller's current best candidate on the slice (check both `finishedRuns` best and `manualTimes`, per timing). Not a new entry → `verified`. New entry → `evaluateTrust(callerId)`: `instant` → `verified`, `provisional` → `pending`.

`isPb` computation: `isPb` = no existing non-rejected, non-excluded `finished_runs` row for `(userId, gameId, categoryId)` with `time <=` submitted time; `isPbGametime` analogous over `gameTime` (false when `gameTime` null). One query each, mirroring the wouldBeNewEntry query shape.

Post-insert (mirror submit-handler.ts:97-118, with the status fix):
- `LeaderboardEntryManager.updateForNewRun(...)` with the actual `verificationStatus`.
- `applyVerifyWindowForBoard`.
- Redis board-cache upsert: rt/gt keys always; **verified keys only when `verificationStatus === 'verified'`** (do not copy the unconditional `vKey` writes).
- Audit: `logs` insert `{ userId: callerId, action: 'self_submit_run', entity: 'finished_run', target: String(id), data: { gameId, categoryId, subcategoryKey, verificationStatus } }`. This row feeds both the rate limit and the run-history timeline for free (`entity='finished_run' AND target=runId` is already selected by `getRunHistory`; the unmapped action defaults to type `'other'` and renders via `describeEvent`'s fallback — no mapping change needed).

Response 200: `{ result: { id, verificationStatus, applied: 'instant' | 'provisional', warnings } }` (`{result}` envelope — this is a `/v1/me` endpoint; meFetch unwraps).

**Origin path fix rolled in:** `deriveOriginPath` already returns `'submission'`; frontend `originSummary` already maps it ("Submitted by <runner>"). No change needed — verify with a unit test addition.

## 4. Frontend

### Route: `app/(new-layout)/games-v2/[game]/submit/page.tsx`

Server page: `resolveGame` (404 unknown), `getSession()`. Not admin-gated (same posture as run detail pages — reachable pre-launch by URL, linked only from gated surfaces). Logged-out → renders a sign-in prompt card (copy: "Sign in with Twitch to submit a run"), NOT a redirect. Loads active categories (reuse the game page's category loading) and passes to the client form.

### Client form: `submit-form.tsx` (`'use client'`)

- **Category** select (active categories; groups flattened with optgroup when groups exist).
- **Variables**: on category change, fetch merged variables via a server action wrapping the existing public variables fetch (same data the board filter uses). `role='subcategory'` → required radio/select per variable, default `defaultValueIndex` preselected; `role='filter'` → optional selects with an explicit "—" empty choice. Managed combinations: disable invalid combos client-side when `validCombinations.mode==='managed'` (same rule the board picker uses); server still resolves/warns.
- **Times**: RT and GT inputs shown per category `hideRealTime`/`hideGameTime`; primary timing marked required. Input parsing via `parseTimeInput` **lifted** from `src/lib/fast50/time-input.ts` to `src/lib/time-input.ts` (fast50 re-exports or updates imports; its tests move too). Live preview of the parsed time next to each input (`formatTimeMs`).
- **Date achieved**: `<input type="date">`, default today, `max` today.
- **Video URL**: optional text input; client-side URL validation; helper text when the category `requireVideo` ("This category requires video for verification").
- Submit → server action `submitRunAction` → on success:
  - **Warnings panel** — the `SubmitWarning[]` consumer at last: render each per the spec'd copy rules (`no_match_default_used` → "«X» isn't a recognized value for <variable>; your run was placed on the default board"; `missing_default_used` → silent; `no_match_filter_dropped` → "Filter <x> was ignored"; `combination_invalid_default_used` → "That combination isn't an active leaderboard; your run was placed on the default board").
  - Status line: instant → "Your run is on the board." / provisional → "Your run is submitted and awaiting verification — it appears on the board marked unverified."
  - Link: "View your run" → `/games-v2/{game}/run/{id}`.
- Errors: 429/409/400 messages surfaced verbatim (plain-text `ModError`-style body).

### Lib + action

- `src/lib/me-submissions.ts`: `submitRun(sessionId, input): Promise<SubmitRunResult>` via `meFetch('/v1/me/submissions', { sessionId, method: 'POST', body: input })`.
- `src/actions/submit-run.action.ts`: `'use server'`, `getSession()` gate, calls lib, returns `Result<SubmitRunResult>` in the run-user-actions style; on success revalidate the board tags for the affected slice (reuse `revalidateAffectedBoards`-adjacent logic — at minimum `revalidateTag` on the leaderboard tag scheme for that game/category, plus `run:{id}` is fresh anyway).
- Types in `types/leaderboards.types.ts`: `SubmitRunInput`, `SubmitRunResult { id, verificationStatus, applied, warnings: SubmitWarning[] }`.

### Entry points

- Game page header: "Submit a run" button (logged-in users; next to existing actions) → `/games-v2/{game}/submit`.
- Run detail origin panel already labels these "Submitted by <runner>" via the existing `submission` path.

## 5. Testing

- Backend unit (jest, no DB): input validation matrix (dates, times, vod URL) extracted into a pure `validateSubmissionInput` function; trust-outcome decision table as pure function `decideSubmissionStatus(wouldBeNewEntry, trust)`.
- Backend integration (env-blocked until migration 0070 + DB access — same caveat as provenance work): 403 banned, 400 validation, happy path. Write them; they run when Joey's DB is migrated.
- Frontend vitest: time-input tests move with the lift; warnings-copy mapper pure function + tests; form submit-payload builder pure function + tests.
- Joey's browser pass: submit per path (RT-only, GT-only mirror, variables with aliases, invalid combo), verify queue shows it, verify/reject from queue, board + detail page reflect status.

## 6. Out of scope

Guest submissions by non-mods (stays mod-only), co-runners, IL runs, submission editing after the fact (self-verdict reject + resubmit covers v1), notifications on verdict (exists generally), fixing guest-submit's own `endedAt`/`isPb` behavior (noted in provenance spec; separate cleanup), CAPTCHA (rate limit + trust + bans suffice for v1).

## 7. Build order

1. Backend: pure helpers (validation, status decision) → endpoint → route + tests.
2. Frontend: time-input lift → types/lib/action → form + page → entry-point button.
3. Gates: builds, suites, final review, push. No PRs.

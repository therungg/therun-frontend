# Run Submission Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authenticated runners submit their own runs (`POST /v1/me/submissions` → pending/verified `finished_runs` with `source='submission'`) via a guided form at `games-v2/[game]/submit`, per `docs/superpowers/specs/2026-07-14-run-submission-form-design.md`.

**Architecture:** Backend adds one self-scoped endpoint mirroring the `/v1/me/manual-times` pattern (auth → ban check → validate → variable resolution → trust decision → insert → entry-manager/verify-window/cache/audit). Frontend adds a lifted shared time-input parser, a lib+action pair, and a client form page wired to the public variables contract.

**Tech Stack:** Backend: TypeScript, Drizzle, Jest. Frontend: Next.js 16, React 19, vitest, Bootstrap utilities, Biome.

## Global Constraints

- Branches: `run-submission-form` in BOTH repos, created FROM `run-detail-provenance` (not main — depends on the `source` column and detail pages).
- Backend repo `/home/joey/therun/therun`; frontend `/home/joey/therun/therun-fr`.
- Known environment (from the provenance build): dev DB reachable by jest but lacks migration 0070 → integration tests touching `finished_runs.source` are environment-blocked (record exact error, fall back to filtered typecheck `npx tsc --noEmit 2>&1 | grep -v node_modules` → empty). Frontend typecheck has pre-existing victory-chart errors; gate = no NEW errors. 43 backend jest failures pre-exist on main (story-mode/rbac/splits) — out of scope.
- `/v1/me/*` responses use the `{ result: ... }` envelope; plain-text error bodies with 400/403/409/429 status; `meFetch` unwraps `result`.
- Trust model calls: `isBanned`, `evaluateTrust` from `src/rbac/self-service-trust.ts` — reuse, do not reimplement.
- Backend style double quotes; frontend Biome (4-space, single quotes). Commits conventional, NO co-author. NO pushes until the final task. NO PRs ever.
- Copy strings for warnings and status lines are spec §4 verbatim.

## File Structure

**Backend:** Create `src/leaderboards/submissions/{validate-submission.ts,decide-submission-status.ts}`, `src/api/me/submission.ts`; modify `src/api/me/handler.ts`; create `test/automated/unit/submissions/{validate-submission.test.ts,decide-submission-status.test.ts}`, `test/manual/integration/me/submission.test.ts`.
**Frontend:** Create `src/lib/time-input.ts` (lifted) + move its tests; modify fast50 imports; add types to `types/leaderboards.types.ts`; create `src/lib/me-submissions.ts`, `src/actions/submit-run.action.ts`, `src/lib/run-view/submit-warnings.ts` (+ test), `app/(new-layout)/games-v2/[game]/submit/{page.tsx,submit-form.tsx,load-variables.action.ts}`; modify the game page header for the entry button.

---

## Task 1: Backend — pure validation + status decision (TDD)

**Files:**
- Create: `src/leaderboards/submissions/validate-submission.ts`, `src/leaderboards/submissions/decide-submission-status.ts`
- Test: `test/automated/unit/submissions/validate-submission.test.ts`, `test/automated/unit/submissions/decide-submission-status.test.ts`

**Interfaces:**
- Produces:
  - `validateSubmissionInput(body: unknown): { ok: true; value: ValidSubmission } | { ok: false; message: string }` where `ValidSubmission = { gameId: number; categoryId: number; time: number; gameTime: number | null; endedAt: Date; vodUrl: string | null; variables: Record<string, string> }` — GT-mirror rule applied (`time := gameTime` when time absent), all spec §3 validation rules, plain-text messages.
  - `decideSubmissionStatus(wouldBeNewEntry: boolean, trust: "instant" | "provisional"): "verified" | "pending"` — verified unless (wouldBeNewEntry && trust === "provisional").

- [ ] **Step 0: Branches**

```bash
cd /home/joey/therun/therun && git checkout run-detail-provenance && git checkout -b run-submission-form
```

- [ ] **Step 1: Write failing tests**

`test/automated/unit/submissions/decide-submission-status.test.ts`:

```ts
import { decideSubmissionStatus } from "../../../../src/leaderboards/submissions/decide-submission-status";

describe("decideSubmissionStatus", () => {
    it("non-improving submissions verify regardless of trust", () => {
        expect(decideSubmissionStatus(false, "provisional")).toBe("verified");
        expect(decideSubmissionStatus(false, "instant")).toBe("verified");
    });
    it("improving submissions follow trust", () => {
        expect(decideSubmissionStatus(true, "instant")).toBe("verified");
        expect(decideSubmissionStatus(true, "provisional")).toBe("pending");
    });
});
```

`test/automated/unit/submissions/validate-submission.test.ts`:

```ts
import { validateSubmissionInput } from "../../../../src/leaderboards/submissions/validate-submission";

const base = {
    gameId: 1,
    categoryId: 2,
    time: 60000,
    runDate: "2026-07-01",
};

describe("validateSubmissionInput", () => {
    it("accepts a minimal valid body", () => {
        const r = validateSubmissionInput(base);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.value.time).toBe(60000);
            expect(r.value.gameTime).toBeNull();
            expect(r.value.endedAt.toISOString().slice(0, 10)).toBe("2026-07-01");
            expect(r.value.vodUrl).toBeNull();
            expect(r.value.variables).toEqual({});
        }
    });
    it("mirrors gameTime into time when time is absent", () => {
        const r = validateSubmissionInput({ ...base, time: undefined, gameTime: 45000 });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.value.time).toBe(45000);
            expect(r.value.gameTime).toBe(45000);
        }
    });
    it("rejects when both times are missing", () => {
        const r = validateSubmissionInput({ ...base, time: undefined });
        expect(r).toEqual({ ok: false, message: "time or gameTime is required" });
    });
    it("rejects non-positive, non-integer, and absurd times", () => {
        expect(validateSubmissionInput({ ...base, time: 0 }).ok).toBe(false);
        expect(validateSubmissionInput({ ...base, time: -5 }).ok).toBe(false);
        expect(validateSubmissionInput({ ...base, time: 1.5 }).ok).toBe(false);
        expect(validateSubmissionInput({ ...base, time: 7 * 86400000 }).ok).toBe(false);
    });
    it("rejects missing/invalid/future runDate", () => {
        expect(validateSubmissionInput({ ...base, runDate: undefined }).ok).toBe(false);
        expect(validateSubmissionInput({ ...base, runDate: "not-a-date" }).ok).toBe(false);
        const future = new Date(Date.now() + 3 * 86400000).toISOString();
        expect(validateSubmissionInput({ ...base, runDate: future }).ok).toBe(false);
    });
    it("rejects bad vod URLs and accepts http(s)", () => {
        expect(validateSubmissionInput({ ...base, vodUrl: "ftp://x" }).ok).toBe(false);
        expect(validateSubmissionInput({ ...base, vodUrl: "notaurl" }).ok).toBe(false);
        const r = validateSubmissionInput({ ...base, vodUrl: "https://youtu.be/abc" });
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.value.vodUrl).toBe("https://youtu.be/abc");
    });
    it("rejects missing gameId/categoryId and non-object variables", () => {
        expect(validateSubmissionInput({ ...base, gameId: undefined }).ok).toBe(false);
        expect(validateSubmissionInput({ ...base, categoryId: "x" }).ok).toBe(false);
        expect(validateSubmissionInput({ ...base, variables: "nope" }).ok).toBe(false);
    });
});
```

- [ ] **Step 2: Run to verify they fail** — `npx jest test/automated/unit/submissions/` → module not found.

- [ ] **Step 3: Implement**

`src/leaderboards/submissions/decide-submission-status.ts`:

```ts
import { TrustTier } from "../../rbac/self-service-trust";

// A submission that can't improve the runner's standing is harmless — verify it.
// An improving one is provisional unless the account is trusted (mirrors /v1/me/manual-times).
export const decideSubmissionStatus = (
    wouldBeNewEntry: boolean,
    trust: TrustTier,
): "verified" | "pending" => {
    if (!wouldBeNewEntry) return "verified";
    return trust === "instant" ? "verified" : "pending";
};
```

(Check `self-service-trust.ts` for the actual exported tier type name; if it exports none, declare `type TrustTier = "instant" | "provisional"` locally and match `evaluateTrust`'s return type.)

`src/leaderboards/submissions/validate-submission.ts`:

```ts
const MAX_TIME_MS = 7 * 24 * 60 * 60 * 1000; // sanity ceiling, not a rule of speedrunning

export interface ValidSubmission {
    gameId: number;
    categoryId: number;
    time: number;
    gameTime: number | null;
    endedAt: Date;
    vodUrl: string | null;
    variables: Record<string, string>;
}

type Result = { ok: true; value: ValidSubmission } | { ok: false; message: string };

const isPosInt = (n: unknown): n is number =>
    typeof n === "number" && Number.isInteger(n) && n > 0;

export const validateSubmissionInput = (body: unknown): Result => {
    const b = (body ?? {}) as Record<string, unknown>;
    if (!isPosInt(b.gameId)) return { ok: false, message: "gameId is required" };
    if (!isPosInt(b.categoryId)) return { ok: false, message: "categoryId is required" };

    const rawTime = b.time;
    const rawGameTime = b.gameTime;
    if (rawTime === undefined && rawGameTime === undefined) {
        return { ok: false, message: "time or gameTime is required" };
    }
    for (const [label, v] of [["time", rawTime], ["gameTime", rawGameTime]] as const) {
        if (v !== undefined && (!isPosInt(v) || v >= MAX_TIME_MS)) {
            return { ok: false, message: `${label} must be a positive duration in milliseconds` };
        }
    }
    const gameTime = rawGameTime !== undefined ? (rawGameTime as number) : null;
    const time = rawTime !== undefined ? (rawTime as number) : (gameTime as number);

    if (typeof b.runDate !== "string" || !b.runDate) {
        return { ok: false, message: "runDate is required" };
    }
    const endedAt = new Date(b.runDate);
    if (Number.isNaN(endedAt.getTime())) return { ok: false, message: "runDate is not a valid date" };
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);
    if (endedAt > endOfToday) return { ok: false, message: "runDate cannot be in the future" };
    if (endedAt.getTime() < 0) return { ok: false, message: "runDate is not a valid date" };

    let vodUrl: string | null = null;
    if (b.vodUrl !== undefined && b.vodUrl !== null && b.vodUrl !== "") {
        if (typeof b.vodUrl !== "string" || b.vodUrl.length > 500) {
            return { ok: false, message: "vodUrl must be a URL (max 500 chars)" };
        }
        try {
            const u = new URL(b.vodUrl);
            if (u.protocol !== "http:" && u.protocol !== "https:") {
                return { ok: false, message: "vodUrl must be an http(s) URL" };
            }
        } catch {
            return { ok: false, message: "vodUrl must be an http(s) URL" };
        }
        vodUrl = b.vodUrl;
    }

    let variables: Record<string, string> = {};
    if (b.variables !== undefined && b.variables !== null) {
        if (typeof b.variables !== "object" || Array.isArray(b.variables)) {
            return { ok: false, message: "variables must be an object of name -> value" };
        }
        variables = Object.fromEntries(
            Object.entries(b.variables as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
        );
    }

    return {
        ok: true,
        value: { gameId: b.gameId, categoryId: b.categoryId, time, gameTime, endedAt, vodUrl, variables },
    };
};
```

- [ ] **Step 4: Run to verify green** — `npx jest test/automated/unit/submissions/` → all passing.

- [ ] **Step 5: Commit** — `git add src/leaderboards/submissions/ test/automated/unit/submissions/ && git commit -m "feat(submissions): pure input validation and trust-status decision"`

---

## Task 2: Backend — `POST /v1/me/submissions` endpoint

**Files:**
- Create: `src/api/me/submission.ts`
- Modify: `src/api/me/handler.ts` (route), 
- Test: `test/manual/integration/me/submission.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers; `resolveRunVariables`/`getMergedVariableDefs`/`getValidCombinationsSet` (as used in `src/api/leaderboards/submit-handler.ts:52-55`); `getMinimumTime`+`checkMinimumEligibility` (submit-handler.ts:58-71); `isBanned`/`evaluateTrust`; `LeaderboardEntryManager.updateForNewRun` + `applyVerifyWindowForBoard` + the Redis upsert helpers (all per submit-handler.ts:97-118); the caller-resolution pattern from `src/api/me/manual-time.ts:18-30`; the `wouldBeNewEntry` computation from `manual-time.ts:90-93` (adapt: compare against best `finishedRuns` + `manualTimes` per timing on the slice).
- Produces: `POST /v1/me/submissions` per spec §3 — statuses 200/400/403/409/429, `{ result: { id, verificationStatus, applied, warnings } }`.

**READ FIRST (the template files are the spec for glue details):** `src/api/me/manual-time.ts` in full, `src/api/leaderboards/submit-handler.ts` in full, `src/api/me/handler.ts`. Mirror their idioms exactly (caller resolution, error helpers, logs insert shape, cache upsert calls). Key deltas from submit-handler:
1. Auth = any user (no `checkGameMgmtPermission`); `isBanned` → 403.
2. Rate limit BEFORE heavy work: `SELECT count(*) FROM logs WHERE "userId" = $caller AND action = 'self_submit_run' AND "timestamp" > now() - interval '1 hour'`; ≥10 → status 429, body `"Too many submissions — try again later"` (add a `tooMany` helper local to the file returning `{ statusCode: 429, body }` if `src/api/responses.ts` has none).
3. Validate with `validateSubmissionInput`; 400 on `.message`.
4. Verify the category belongs to the game and is active (query `categories` by id; mismatch/missing → 400 `"category not found for game"`).
5. Resolve variables; minimum-time check (reuse; 400 on failure like submit-handler).
6. Dedup: `SELECT id FROM finished_runs WHERE user_id=$caller AND "gameId"=$gameId AND "categoryId"=$categoryId AND subcategory_key=$key AND time=$time AND verification_status <> 'rejected' AND (($gameTime::bigint IS NULL) OR "gameTime" = $gameTime) LIMIT 1` (write with drizzle `and/eq` — the SQL here states intent); hit → 409 `"You already submitted this exact run"`.
7. `wouldBeNewEntry` + `evaluateTrust` → `decideSubmissionStatus`.
8. `isPb`: no existing row for `(userId, gameId, categoryId)` with `verification_status <> 'rejected' AND excluded = false AND time <= $time`; `isPbGametime` analogous over `gameTime` (false when null).
9. Insert exactly per spec §3 (incl. `source: "submission"`, `createdAt: new Date()`, `submittedBy: callerId`, `verifiedBy/verifiedAt` only when verified).
10. Post-insert mirrors submit-handler.ts:97-118 BUT verified Redis keys (`vKey`/`vGtKey`) written only when `verificationStatus === "verified"`.
11. Audit `logs` insert per spec §3.
12. Response: `ok(JSON.stringify({ result: { id, verificationStatus, applied: verificationStatus === "verified" ? "instant" : "provisional", warnings } }))`.

Route in `src/api/me/handler.ts`: `POST` + path match `/v1/me/submissions` → `handleSelfSubmission(event)`, alongside the existing manual-times route.

- [ ] **Step 1: Failing integration test** — `test/manual/integration/me/submission.test.ts`:

```ts
import { handleMe } from "../../../../src/api/me/handler";

describe("/v1/me/submissions", () => {
    it("403s without auth", async () => {
        const event: any = {
            path: "/v1/me/submissions",
            httpMethod: "POST",
            headers: {},
            body: JSON.stringify({ gameId: 1, categoryId: 1, time: 60000, runDate: "2026-07-01" }),
        };
        const res = await handleMe(event);
        expect(res.statusCode).toBe(403);
    });
});
```

(Verify the actual exported name of the me handler in `src/api/me/handler.ts` — adjust the import; if unauthenticated currently yields a different status in sibling routes, match the sibling behavior and assert that.)

- [ ] **Step 2: Run** — expect FAIL (404/400 fallthrough, or import error before the route exists).
- [ ] **Step 3: Implement handler + route per the delta list.**
- [ ] **Step 4: Gates** — `npx jest test/automated/unit/submissions/ test/manual/integration/me/submission.test.ts` (unit green; integration green for the 403 — if any DB-dependent assertion is added and fails on the missing-0070 column, label environment-blocked with the verbatim error) and `npx tsc --noEmit 2>&1 | grep -v node_modules` → empty.
- [ ] **Step 5: Commit** — `git add src/api/me/ test/manual/integration/me/ && git commit -m "feat(submissions): POST /v1/me/submissions self-submission endpoint"`

---

## Task 3: Frontend — time-input lift, types, lib, action (TDD)

**Files:**
- Create: `src/lib/time-input.ts`; Move test: `src/lib/__tests__/time-input.test.ts` (from `src/lib/fast50/__tests__/time-input.test.ts`)
- Modify: `src/lib/fast50/time-input.ts` → re-export shim (`export * from '../time-input';`) so fast50 callers keep working; update the moved test's import.
- Modify: `types/leaderboards.types.ts` (+`SubmitRunInput`, `SubmitRunResult`)
- Create: `src/lib/me-submissions.ts`, `src/actions/submit-run.action.ts`, `src/lib/run-view/submit-warnings.ts`
- Test: `src/lib/run-view/__tests__/submit-warnings.test.ts`

**Interfaces:**
- Produces:
  - `parseTimeInput` (unchanged behavior, new home `~src/lib/time-input`).
  - Types: `SubmitRunInput { gameId, categoryId, time?, gameTime?, runDate, vodUrl?, variables? }`, `SubmitRunResult { id: number; verificationStatus: 'pending' | 'verified'; applied: 'instant' | 'provisional'; warnings: SubmitWarning[] }`.
  - `submitRun(sessionId: string, input: SubmitRunInput): Promise<SubmitRunResult>` — `meFetch('/v1/me/submissions', { sessionId, method: 'POST', body: input })`.
  - `submitRunAction(input: SubmitRunInput): Promise<Result<SubmitRunResult>>` — run-user-actions style (`getSession` gate → lib → `ModError` mapping); on success revalidates `run:{id}` via `revalidateRunDetails([result.id])` (board tags recompute on their own cadence; the submitted run's page must be fresh immediately).
  - `describeSubmitWarning(w: SubmitWarning, variableDisplayNames: Record<string, string>): string | null` in submit-warnings.ts — spec §4 copy verbatim; `missing_default_used` → null (silent).

- [ ] **Step 0: Branch** — `cd /home/joey/therun/therun-fr && git checkout run-detail-provenance && git checkout -b run-submission-form`
- [ ] **Step 1: Failing test for the warnings mapper**

`src/lib/run-view/__tests__/submit-warnings.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { describeSubmitWarning } from '../submit-warnings';
import type { SubmitWarning } from '../../../../types/leaderboards.types';

const names = { platform: 'Platform' };
const w = (over: Partial<SubmitWarning>): SubmitWarning => ({
    nameNormalized: 'platform',
    submitted: 'BLABLA',
    resolved: 'Nintendo 64',
    reason: 'no_match_default_used',
    ...over,
});

describe('describeSubmitWarning', () => {
    test('no_match_default_used names the variable and both values', () => {
        const s = describeSubmitWarning(w({}), names);
        expect(s).toContain('BLABLA');
        expect(s).toContain('Platform');
        expect(s).toContain('Nintendo 64');
    });
    test('missing_default_used is silent', () => {
        expect(describeSubmitWarning(w({ reason: 'missing_default_used' }), names)).toBeNull();
    });
    test('no_match_filter_dropped mentions ignoring', () => {
        expect(describeSubmitWarning(w({ reason: 'no_match_filter_dropped' }), names)).toContain('ignored');
    });
    test('combination_invalid_default_used mentions default board', () => {
        expect(
            describeSubmitWarning(w({ reason: 'combination_invalid_default_used', nameNormalized: '' }), names),
        ).toContain('default board');
    });
    test('falls back to nameNormalized when display name unknown', () => {
        expect(describeSubmitWarning(w({ nameNormalized: 'region' }), names)).toContain('region');
    });
});
```

- [ ] **Step 2: Run → FAIL.** Then implement all files of this task. `describeSubmitWarning`:

```ts
import type { SubmitWarning } from '../../../types/leaderboards.types';

export function describeSubmitWarning(
    w: SubmitWarning,
    variableDisplayNames: Record<string, string>,
): string | null {
    const name = variableDisplayNames[w.nameNormalized] ?? w.nameNormalized;
    switch (w.reason) {
        case 'no_match_default_used':
            return `"${w.submitted}" isn't a recognized value for ${name}. Your run was placed on the default board (${name}: ${w.resolved}).`;
        case 'missing_default_used':
            return null;
        case 'no_match_filter_dropped':
            return `Filter ${name}: "${w.submitted}" was ignored.`;
        case 'combination_invalid_default_used':
            return `The combination you submitted isn't an active leaderboard for this game. Your run was placed on the default board.`;
    }
}
```

For the lift: `git mv` is unnecessary — create `src/lib/time-input.ts` with the exact current content of `src/lib/fast50/time-input.ts`, replace the fast50 file's body with `export * from '../time-input';`, move the test file and fix its import to `../time-input` (new location `src/lib/__tests__/`). Verify no other fast50 file re-declares these symbols.

- [ ] **Step 3: Gates** — `npx vitest run` (whole suite — the moved time-input tests and 5 new warnings tests must be green; count should be prior 91 + 5), `npm run typecheck` (no NEW errors).
- [ ] **Step 4: Commit** — `git add src/lib/ types/ src/actions/submit-run.action.ts && git commit -m "feat(submit): shared time-input, submission types/lib/action, warnings copy"`

---

## Task 4: Frontend — submit page + form + entry button

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/submit/page.tsx` (server), `submit-form.tsx` ('use client'), `load-variables.action.ts` ('use server')
- Modify: the game page header component (`app/(new-layout)/games-v2/[game]/header/game-header.tsx` — verify the actual file) to add the "Submit a run" button

**Interfaces:**
- Consumes: `resolveGame`, `getSession`, the game page's category loading (read `app/(new-layout)/games-v2/[game]/data.ts` for how categories+groups resolve — reuse the same fetchers), `getVariables` (find it in `src/lib/leaderboards-v1.ts` — the public merged variables fetch the board filter uses), `parseTimeInput`, `formatTimeMs`, `describeSubmitWarning`, `submitRunAction`.
- Produces: `/games-v2/{game}/submit` page per spec §4.

Page (server): `resolveGame` → 404 unknown; `getSession()`; logged-out → sign-in card (reuse the repo's existing sign-in-link component/URL — find how the topbar renders "log in with Twitch" and reuse); logged-in → load categories (+groups) server-side, render `<SubmitForm game={...} categories={...} sessionUsername={...} />`. `generateMetadata`: title `Submit a run — {game.display}`.

`load-variables.action.ts`: `'use server'` — `loadVariablesAction(gameName: string, categoryName: string)` → returns the public merged variables response (VariableRow[] + validCombinations) via the existing lib fetch. This is the category-change fetch path for the client form.

Form (client) per spec §4, exactly:
- Category select (flatten groups via optgroup when present; only `active` categories).
- On category change: `startTransition` → `loadVariablesAction` → render subcategory variables as required selects (default `defaultValueIndex` bucket preselected, canonical display = first alias) and filter variables as optional selects with a "—" empty option. When `validCombinations.mode === 'managed'`: compute the would-be key from current subcategory selections (sorted `name=value|...` canonical-normalized — mirror how the board filter computes it; find that code in `filters/` and reuse/lift rather than re-deriving) and disable submit with a "this combination has no leaderboard" note when invalid.
- Time inputs: RT and GT text inputs; visibility per category `hideRealTime`/`hideGameTime`; the category's `primaryTiming` input marked required; each parses on blur via `parseTimeInput` with a live `formatTimeMs` preview or an inline "unrecognized time" error.
- Date: `<input type="date">`, default today, `max` today. Video: url input + requireVideo helper text when the category has it.
- Submit: build `SubmitRunInput` (times in ms; `variables` = chosen subcategory+filter values keyed by `nameNormalized`), disable while pending, call `submitRunAction`.
- Success panel: status line per spec copy (instant vs provisional), warnings list via `describeSubmitWarning` (skip nulls), "View your run" link to `/games-v2/{gameSlug}/run/{id}`. Reset button for "submit another".
- Error: render the returned message verbatim in an alert.

Entry button: in the game page header, when `sessionUsername` is non-empty, `<Link href={`/games-v2/${gameSlug}/submit`} className="btn btn-sm btn-primary">Submit a run</Link>` — verify the header component's actual props (it may need `gameSlug`/session threading from the page; keep the change minimal).

- [ ] **Step 1: Build the three files + header button.**
- [ ] **Step 2: Gates** — `npm run typecheck` (no NEW), `npx vitest run` green, `npm run lint` clean on touched files, `rm -rf .next && npm run build` passes.
- [ ] **Step 3: Commit** — `git add "app/(new-layout)/games-v2/[game]/submit/" "app/(new-layout)/games-v2/[game]/header/" && git commit -m "feat(submit): run submission page, guided form, game-page entry point"`

---

## Task 5: Finalize — gates, final review, push

- [ ] **Step 1:** Backend: `npx jest test/automated/unit/ 2>&1 | tail -5` (new suites green; pre-existing failures unchanged), filtered tsc empty. Frontend: full `npx vitest run`, `npm run build` (already run in Task 4 — re-run only if fixes landed since).
- [ ] **Step 2:** Final whole-branch review (controller dispatches on the most capable model, both repo diffs from the `run-detail-provenance` merge-bases) → fix wave if needed → re-verify.
- [ ] **Step 3:** Update spec Status line (implemented; pending Joey merge/migration/deploy — submissions additionally depend on migration 0070 being applied before the endpoint works in prod). Commit docs.
- [ ] **Step 4:** Push `run-submission-form` in both repos. NO PRs.
- [ ] **Step 5:** Ledger + memory updates; report to Joey (include: branch stack order run-detail-provenance → run-submission-form; browser-pass checklist).

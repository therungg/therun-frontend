# VOD Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Moderators frame-step a run's YouTube/Twitch VOD inside the run inspector, place start/end/split/note markers, see a computed retime against the submitted time, save the markers on the run, and optionally apply the retime; runners may pin start/end when submitting.

**Architecture:** One `vod_review` jsonb column on `finished_runs` and `manual_times`, written through the existing edit/create endpoints (no new API route) and returned by the existing detail reads. Frontend: a `vod-review/` module (pure retime math, a `VodPlayer` adapter over the YouTube IFrame API and Twitch Embed JS, a hook, the workbench UI) mounted from `EvidenceSection` in the run inspector, from the manual inspector, and in runner mode from the submit dialog's time step.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, vitest (+ jsdom, @testing-library/react), SCSS modules with `design-tokens`; backend Node Lambda + Drizzle (Postgres), vitest unit tests.

**Spec:** `docs/plans/2026-08-17-vod-review-design.md` (this repo). Read it first; this plan argues from it.

## Global Constraints

- No new API Gateway route — the `api` CFN stack has one resource slot left. Every write rides `PUT /v1/leaderboards/runs/{runId}`, `PUT /v1/leaderboards/games/{gameId}/manual-times/{id}`, `POST /v1/leaderboards/games/{gameId}/manual-times`, `POST /v1/me/manual-times`; every read rides `GET /v1/leaderboards/runs/{runId}` and `GET /v1/leaderboards/manual-times/{id}`.
- Backend has no zod; validation is manual `typeof` checks. Backend unit tests are pure-function only (`test/unit/**`, `npm test`); handler behaviour is not unit-tested — extract pure logic.
- Frontend: Biome formatting (4-space indent, single quotes, trailing commas, semicolons); unused vars prefixed `_`; `'use cache'` for cached reads only — the review loader is deliberately **uncached** (`cache: 'no-store'`), same as `getRunByIdAsViewer`.
- The mod-edit endpoints require `reason` ≥ 10 characters; server actions stamp fixed sentences (pattern: `attach-vod.action.ts`).
- Frames are canonical; times are derived: `frame = floor(t × fps + 1e-6)`, `t = (frame + 0.5) / fps`, `retimeMs = round((end − start) / fps × 1000)`.
- fps: 60 default, 30, or Other (number, `0 < fps ≤ 240`).
- Copy: never mention speedrun.com. No gradient washes.
- Branches: backend `vod-review` in `therun/`, frontend `vod-review` in `therun-fr/` (branch off `main`; the design doc commit `ade0f97c` currently sits on `board-filters` — cherry-pick it onto the new branch first). Never push frontend `main`; never open PRs.
- Frontend `typecheck`/`lint` are not clean on `main` (~356 pre-existing errors): gate on "no new errors in files you touched", not exit 0.
- Kill any dev server you start before ending a turn.

---

# Part A — Backend (`/home/joey/therun/therun`, branch `vod-review`)

### Task A1: `VodReview` types + pure validator/merger

**Files:**
- Create: `src/types/vod-review.ts`
- Create: `src/leaderboards/vod-review.ts`
- Test: `test/unit/leaderboards/vod-review.test.ts`

**Interfaces:**
- Produces: `VodReview`, `VodMarker`, `VodReviewAuthor` types; `parseVodReviewPatch(input: unknown): VodReviewPatchResult`; `applyVodReviewPatch(existing: VodReview | null, patch: VodReviewPatch, role: 'runner' | 'mod', by: number, now: Date): VodReview`; `retimeMsFromMarkers(markers, fps): number | null`.

- [ ] **Step 1: Write the failing tests**

```ts
// test/unit/leaderboards/vod-review.test.ts
import { describe, expect, it } from "vitest";
import {
    applyVodReviewPatch,
    parseVodReviewPatch,
    retimeMsFromMarkers,
} from "../../../src/leaderboards/vod-review";

const now = new Date("2026-08-17T12:00:00Z");
const start = { kind: "start", frame: 600 } as const;
const end = { kind: "end", frame: 6600 } as const;

describe("parseVodReviewPatch", () => {
    it("accepts a minimal runner patch", () => {
        const r = parseVodReviewPatch({ fps: 60, markers: [start, end] });
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.patch.markers).toHaveLength(2);
    });
    it("rejects fps out of range", () => {
        expect(parseVodReviewPatch({ fps: 0, markers: [] }).ok).toBe(false);
        expect(parseVodReviewPatch({ fps: 241, markers: [] }).ok).toBe(false);
        expect(parseVodReviewPatch({ fps: 59.94, markers: [] }).ok).toBe(true);
    });
    it("rejects non-integer or negative frames and unknown kinds", () => {
        expect(parseVodReviewPatch({ fps: 60, markers: [{ kind: "start", frame: 1.5 }] }).ok).toBe(false);
        expect(parseVodReviewPatch({ fps: 60, markers: [{ kind: "start", frame: -1 }] }).ok).toBe(false);
        expect(parseVodReviewPatch({ fps: 60, markers: [{ kind: "pause", frame: 1 }] }).ok).toBe(false);
    });
    it("rejects two starts, two ends, >200 markers, long label/note", () => {
        expect(parseVodReviewPatch({ fps: 60, markers: [start, start] }).ok).toBe(false);
        expect(parseVodReviewPatch({ fps: 60, markers: [end, end] }).ok).toBe(false);
        const many = Array.from({ length: 201 }, (_, i) => ({ kind: "note", frame: i, note: "x" }));
        expect(parseVodReviewPatch({ fps: 60, markers: many }).ok).toBe(false);
        expect(parseVodReviewPatch({ fps: 60, markers: [{ kind: "note", frame: 1, note: "n".repeat(501) }] }).ok).toBe(false);
        expect(parseVodReviewPatch({ fps: 60, markers: [{ kind: "split", frame: 1, label: "l".repeat(81) }] }).ok).toBe(false);
    });
    it("rejects an end before the start", () => {
        expect(parseVodReviewPatch({ fps: 60, markers: [{ kind: "start", frame: 10 }, { kind: "end", frame: 5 }] }).ok).toBe(false);
    });
    it("rejects a retimedMs that disagrees with the markers by more than 1 ms", () => {
        expect(parseVodReviewPatch({ fps: 60, markers: [start, end], retimedMs: 100000 }).ok).toBe(true);
        expect(parseVodReviewPatch({ fps: 60, markers: [start, end], retimedMs: 100002 }).ok).toBe(false);
    });
    it("strips unknown marker fields and sorts by frame", () => {
        const r = parseVodReviewPatch({ fps: 60, markers: [{ ...end, junk: 1 }, start] });
        expect(r.ok && r.patch.markers).toEqual([start, end]);
    });
});

describe("retimeMsFromMarkers", () => {
    it("is null without both start and end", () => {
        expect(retimeMsFromMarkers([start], 60)).toBeNull();
    });
    it("rounds to the millisecond", () => {
        expect(retimeMsFromMarkers([start, end], 60)).toBe(100000);
        expect(retimeMsFromMarkers([{ kind: "start", frame: 0 }, { kind: "end", frame: 1 }], 30)).toBe(33);
    });
});

describe("applyVodReviewPatch", () => {
    it("writes the runner block and leaves mod alone", () => {
        const next = applyVodReviewPatch(null, { fps: 60, markers: [start, end] }, "runner", 7, now);
        expect(next.fps).toBe(60);
        expect(next.runner?.markers).toEqual([start, end]);
        expect(next.runner?.at).toBe(now.toISOString());
        expect(next.mod).toBeUndefined();
    });
    it("mod save keeps the runner block and computes retimedMs", () => {
        const existing = applyVodReviewPatch(null, { fps: 60, markers: [start] }, "runner", 7, now);
        const next = applyVodReviewPatch(existing, { fps: 30, markers: [start, end] }, "mod", 9, now);
        expect(next.runner).toEqual(existing.runner);
        expect(next.fps).toBe(30);
        expect(next.mod).toEqual({ markers: [start, end], retimedMs: 200000, by: 9, at: now.toISOString() });
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /home/joey/therun/therun && npx vitest run --project unit test/unit/leaderboards/vod-review.test.ts`
Expected: FAIL — cannot resolve `../../../src/leaderboards/vod-review`.

- [ ] **Step 3: Write the types**

```ts
// src/types/vod-review.ts
/** Frame-stepped VOD verification. Frames are canonical; times derive from fps. */
export type VodMarkerKind = "start" | "end" | "split" | "note";

export interface VodMarker {
    kind: VodMarkerKind;
    /** Integer ≥ 0, counted from video time 0 at `VodReview.fps`. */
    frame: number;
    /** Split name / short title, ≤ 80 chars. */
    label?: string;
    /** Free text, ≤ 500 chars. */
    note?: string;
    splitIndex?: number;
}

export interface VodReviewAuthor {
    markers: VodMarker[];
    /** ISO timestamp of the save. */
    at: string;
}

export interface VodReview {
    /** 0 < fps ≤ 240. Shared by both blocks: the fps is a fact about the video. */
    fps: number;
    /** What the runner pinned at submission. Never rewritten by moderators. */
    runner?: VodReviewAuthor;
    /** The authoritative markers. */
    mod?: VodReviewAuthor & { retimedMs: number | null; by: number };
}
```

- [ ] **Step 4: Write the validator/merger**

```ts
// src/leaderboards/vod-review.ts
import type { VodMarker, VodMarkerKind, VodReview } from "../types/vod-review";

export const VOD_REVIEW_LIMITS = {
    maxFps: 240,
    maxMarkers: 200,
    maxLabel: 80,
    maxNote: 500,
    retimeToleranceMs: 1,
} as const;

const KINDS: readonly VodMarkerKind[] = ["start", "end", "split", "note"];

export interface VodReviewPatch {
    fps: number;
    markers: VodMarker[];
    /** Client-computed; re-derived server-side and rejected on mismatch. */
    retimedMs?: number | null;
}

export type VodReviewPatchResult =
    | { ok: true; patch: VodReviewPatch }
    | { ok: false; error: string };

export function retimeMsFromMarkers(markers: VodMarker[], fps: number): number | null {
    const start = markers.find((m) => m.kind === "start");
    const end = markers.find((m) => m.kind === "end");
    if (!start || !end) return null;
    return Math.round(((end.frame - start.frame) / fps) * 1000);
}

function parseMarker(raw: unknown): VodMarker | string {
    if (typeof raw !== "object" || raw === null) return "marker must be an object";
    const m = raw as Record<string, unknown>;
    if (!KINDS.includes(m.kind as VodMarkerKind)) return `unknown marker kind ${String(m.kind)}`;
    if (typeof m.frame !== "number" || !Number.isInteger(m.frame) || m.frame < 0) {
        return "marker.frame must be a non-negative integer";
    }
    const out: VodMarker = { kind: m.kind as VodMarkerKind, frame: m.frame };
    if (m.label !== undefined) {
        if (typeof m.label !== "string" || m.label.length > VOD_REVIEW_LIMITS.maxLabel) {
            return `marker.label must be a string of at most ${VOD_REVIEW_LIMITS.maxLabel} chars`;
        }
        out.label = m.label;
    }
    if (m.note !== undefined) {
        if (typeof m.note !== "string" || m.note.length > VOD_REVIEW_LIMITS.maxNote) {
            return `marker.note must be a string of at most ${VOD_REVIEW_LIMITS.maxNote} chars`;
        }
        out.note = m.note;
    }
    if (m.splitIndex !== undefined) {
        if (typeof m.splitIndex !== "number" || !Number.isInteger(m.splitIndex) || m.splitIndex < 0) {
            return "marker.splitIndex must be a non-negative integer";
        }
        out.splitIndex = m.splitIndex;
    }
    return out;
}

/** Validate a `vodReview` request body value (one author's markers + fps). */
export function parseVodReviewPatch(input: unknown): VodReviewPatchResult {
    if (typeof input !== "object" || input === null) return { ok: false, error: "vodReview must be an object" };
    const b = input as Record<string, unknown>;
    if (typeof b.fps !== "number" || !Number.isFinite(b.fps) || b.fps <= 0 || b.fps > VOD_REVIEW_LIMITS.maxFps) {
        return { ok: false, error: `vodReview.fps must be a number in (0, ${VOD_REVIEW_LIMITS.maxFps}]` };
    }
    if (!Array.isArray(b.markers)) return { ok: false, error: "vodReview.markers must be an array" };
    if (b.markers.length > VOD_REVIEW_LIMITS.maxMarkers) {
        return { ok: false, error: `vodReview.markers: at most ${VOD_REVIEW_LIMITS.maxMarkers} markers` };
    }
    const markers: VodMarker[] = [];
    for (const raw of b.markers) {
        const parsed = parseMarker(raw);
        if (typeof parsed === "string") return { ok: false, error: `vodReview.markers: ${parsed}` };
        markers.push(parsed);
    }
    if (markers.filter((m) => m.kind === "start").length > 1) return { ok: false, error: "vodReview.markers: only one start marker" };
    if (markers.filter((m) => m.kind === "end").length > 1) return { ok: false, error: "vodReview.markers: only one end marker" };
    markers.sort((a, b2) => a.frame - b2.frame);
    const start = markers.find((m) => m.kind === "start");
    const end = markers.find((m) => m.kind === "end");
    if (start && end && end.frame < start.frame) return { ok: false, error: "vodReview.markers: end is before start" };

    const patch: VodReviewPatch = { fps: b.fps, markers };
    if (b.retimedMs !== undefined && b.retimedMs !== null) {
        if (typeof b.retimedMs !== "number") return { ok: false, error: "vodReview.retimedMs must be a number" };
        const derived = retimeMsFromMarkers(markers, b.fps);
        if (derived === null || Math.abs(derived - b.retimedMs) > VOD_REVIEW_LIMITS.retimeToleranceMs) {
            return { ok: false, error: "vodReview.retimedMs disagrees with the start/end markers" };
        }
        patch.retimedMs = b.retimedMs;
    }
    return { ok: true, patch };
}

/** Merge one author's patch into the stored review. The other author's block is preserved. */
export function applyVodReviewPatch(
    existing: VodReview | null,
    patch: VodReviewPatch,
    role: "runner" | "mod",
    by: number,
    now: Date,
): VodReview {
    const at = now.toISOString();
    const next: VodReview = { ...(existing ?? { fps: patch.fps }), fps: patch.fps };
    if (role === "runner") {
        next.runner = { markers: patch.markers, at };
    } else {
        next.mod = { markers: patch.markers, retimedMs: retimeMsFromMarkers(patch.markers, patch.fps), by, at };
    }
    return next;
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run --project unit test/unit/leaderboards/vod-review.test.ts`
Expected: PASS (all).

- [ ] **Step 6: Commit**

```bash
git checkout -b vod-review main
git add src/types/vod-review.ts src/leaderboards/vod-review.ts test/unit/leaderboards/vod-review.test.ts
git commit -m "feat(vod-review): VodReview types + pure patch validator/merger"
```

---

### Task A2: `vod_review` column on both tables + migration + detail reads

**Files:**
- Modify: `src/db/schema.ts` (finishedRuns block ends ~:1063; manualTimes block :1889-1913)
- Create: `drizzle/0096_*.sql` (generated)
- Modify: `src/api/leaderboards/handler.ts:168-204` (select) and `:296-337` (result)
- Modify: `src/api/leaderboards/manual-time-detail-handler.ts:124-148` (select) and `:196-236` (result)

**Interfaces:**
- Produces: `finishedRuns.vodReview`, `manualTimes.vodReview` (Drizzle columns, `VodReview | null`); `vodReview: VodReview | null` on both detail responses.

- [ ] **Step 1: Add the columns**

In `src/db/schema.ts`, import the type at the top with the other `../types/*` imports:

```ts
import type { VodReview } from "../types/vod-review";
```

In `finishedRuns`, directly after `description: text(),` (before `createdAt`):

```ts
        // Frame-stepped VOD verification: fps + runner/mod markers + retime.
        // Cleared whenever vod_url changes (markers are about one video).
        vodReview: jsonb("vod_review").$type<VodReview>(),
```

In `manualTimes`, directly after `description: text(),`:

```ts
        vodReview: jsonb("vod_review").$type<VodReview>(),
```

- [ ] **Step 2: Generate the migration**

Run: `npm run generate-migration`
Expected: a new `drizzle/0096_<name>.sql` containing exactly two statements:
`ALTER TABLE "finished_runs" ADD COLUMN "vod_review" jsonb;` and `ALTER TABLE "manual_times" ADD COLUMN "vod_review" jsonb;`. If it contains anything else, stop — the schema drifted from prod; report it.

- [ ] **Step 3: Return the field from both detail reads**

`src/api/leaderboards/handler.ts` — in the `.select({...})` at :168-204 add `vodReview: finishedRuns.vodReview,` next to `vodUrl: finishedRuns.vodUrl,`; in the result literal at :296-337 add `vodReview: row.vodReview ?? null,` next to `vodUrl: row.vodUrl,`.

`src/api/leaderboards/manual-time-detail-handler.ts` — same two edits with `manualTimes.vodReview` at :124-148 and `vodReview: row.vodReview ?? null,` at :196-236.

- [ ] **Step 4: Typecheck + unit tests**

Run: `npx tsc --noEmit && npm test`
Expected: clean typecheck; tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/ src/api/leaderboards/handler.ts src/api/leaderboards/manual-time-detail-handler.ts
git commit -m "feat(vod-review): vod_review jsonb on finished_runs + manual_times; returned by detail reads"
```

---

### Task A3: Writes — mod edit (runs + manual times) and creates (mod + self)

**Files:**
- Modify: `src/api/leaderboards/run-mgmt-handler.ts:629-646` (body type), `:697-708` (oldSnapshot), `:726` area (updates), `:787-799` (newSnapshot)
- Modify: `src/api/leaderboards/mod-manual-times-handler.ts:405-486` (PUT), `:250-320` (POST create)
- Modify: `src/api/me/manual-time.ts:135+` (self create)
- Modify: `src/repositories/manual-times.ts` (`upsertManualTime` input gains `vodReview?`)

**Interfaces:**
- Consumes: `parseVodReviewPatch`, `applyVodReviewPatch` (A1); columns (A2).
- Produces: request contract — `vodReview?: VodReviewPatch | null` on the four bodies. `null` clears (mod edits only). Object → merged as `mod` on mod endpoints, `runner` on `/v1/me/manual-times`. Changing `vodUrl` / `evidenceUrl` clears the stored review unless the same request also sends a `vodReview`.

- [ ] **Step 1: Run edit (`handleEditRun`)**

Add to the body type: `vodReview?: unknown;` (validated below, so `unknown`).
Import: `import { applyVodReviewPatch, parseVodReviewPatch } from "../../leaderboards/vod-review";`

Add `vodReview: run.vodReview,` to `oldSnapshot`. After the `if ("vodUrl" in body)` block:

```ts
    if ("vodReview" in body) {
        if (body.vodReview === null) {
            updates.vodReview = null;
        } else {
            const parsed = parseVodReviewPatch(body.vodReview);
            if (!parsed.ok) return yourFault(parsed.error);
            updates.vodReview = applyVodReviewPatch(
                run.vodReview ?? null,
                parsed.patch,
                "mod",
                actorUserId,
                new Date(),
            );
        }
    } else if ("vodUrl" in body && (body.vodUrl ?? null) !== run.vodUrl && run.vodReview) {
        // Markers describe frames of one specific video.
        updates.vodReview = null;
    }
```

Add `vodReview: "vodReview" in updates ? updates.vodReview : run.vodReview,` to `newSnapshot`. `computeDiff` picks it up; no other mod-log change.

- [ ] **Step 2: Manual time PUT (`mod-manual-times-handler.ts:405+`)**

Load the existing row before building `updateFields` (the handler already selects it for `before` — reuse that row; if it doesn't, add `const [existing] = await auth.db.select().from(manualTimes).where(eq(manualTimes.id, id)).limit(1); if (!existing) return notFound(...)`). Then after the `evidenceUrl` line:

```ts
    if ("vodReview" in body) {
        if (body.vodReview === null) {
            updateFields.vodReview = null;
        } else {
            const parsed = parseVodReviewPatch(body.vodReview);
            if (!parsed.ok) return yourFault(parsed.error);
            updateFields.vodReview = applyVodReviewPatch(
                existing.vodReview ?? null, parsed.patch, "mod", auth.userId, new Date(),
            );
        }
    } else if (body.evidenceUrl !== undefined && body.evidenceUrl !== existing.evidenceUrl && existing.vodReview) {
        updateFields.vodReview = null;
    }
```

(Use whatever the handler's actor-id variable is named — read the file; `auth.userId` is illustrative.) Add `vodReview` to the log row's `before`/`after` objects.

- [ ] **Step 3: Manual time creates**

`upsertManualTime` input: add `vodReview?: VodReview | null` and pass it through to the insert (`vodReview: input.vodReview ?? null`).

Mod create (`mod-manual-times-handler.ts:250+`): after the existing validation, before the upsert:

```ts
    let vodReview: VodReview | null = null;
    if (body.vodReview !== undefined && body.vodReview !== null) {
        const parsed = parseVodReviewPatch(body.vodReview);
        if (!parsed.ok) return yourFault(parsed.error);
        vodReview = applyVodReviewPatch(null, parsed.patch, "mod", actorUserId, new Date());
    }
```

and pass `vodReview` into `upsertManualTime` for the primary row (the secondary-clock row, if any, gets the same object — both rows are the same submission).

Self create (`src/api/me/manual-time.ts:135+`): identical block with role `"runner"` and the caller's user id; skip it entirely on the description-only branch (`manualTimeId` present, `timeMs === undefined`).

- [ ] **Step 4: Typecheck + tests + integration smoke**

Run: `npx tsc --noEmit && npm test`
Expected: clean. If Docker is available: `npm run test:integration -- test/integration/run-mgmt-move-run-refactor.test.ts` still passes (touching handleEditRun must not regress it).

- [ ] **Step 5: Commit**

```bash
git add src/api/leaderboards/run-mgmt-handler.ts src/api/leaderboards/mod-manual-times-handler.ts src/api/me/manual-time.ts src/repositories/manual-times.ts
git commit -m "feat(vod-review): accept vodReview on run edit, manual-time edit and both creates; vodUrl change clears it"
```

---

### Task A4: Frontend guide + push

**Files:**
- Create: `docs/frontend-guide-vod-review.md`
- Copy to: `/home/joey/therun/therun-fr/docs/frontend-guide-vod-review.md`

- [ ] **Step 1: Write the guide** — sections: Types (paste `src/types/vod-review.ts` verbatim), Reads (`GET /v1/leaderboards/runs/{runId}` → `vodReview`, `GET /v1/leaderboards/manual-times/{id}` → `vodReview`), Writes (table from A3 Interfaces with example bodies for: mod save, clear, runner pin at create, and the "vodUrl change clears" rule), Validation errors (the exact `yourFault` messages from A1), Retime math (the three formulas from Global Constraints).

- [ ] **Step 2: Commit + push the backend branch**

```bash
git add docs/frontend-guide-vod-review.md
git commit -m "docs(vod-review): frontend guide"
git push -u origin vod-review
cp docs/frontend-guide-vod-review.md /home/joey/therun/therun-fr/docs/
```

Do **not** merge to main / deploy — merging main runs migration 0096 + auto-deploys; that's Joey's call (see `backend-main-means-deployed`).

---

# Part B — Frontend (`/home/joey/therun/therun-fr`, branch `vod-review`)

### Task B1: Branch, type mirror, pure `retime.ts`

**Files:**
- Modify: `types/leaderboards.types.ts` (add types; `RunDetail.vodReview`, `ManualTimeDetail.vodReview`)
- Modify: `types/moderation.types.ts` (`UpdateManualTimeInput.vodReview`, `CreateManualTimeInput.vodReview`, `SelfManualTimeInput.vodReview`)
- Modify: `src/lib/moderation/run-edit.ts` (`EditRunInput.vodReview`)
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/vod-review/retime.ts`
- Test: `app/(new-layout)/games-v2/[game]/leaderboard/vod-review/retime.test.ts`

**Interfaces:**
- Produces: `VodReview`, `VodMarker`, `VodMarkerKind`, `VodReviewPatch` (in `types/leaderboards.types.ts`); from `retime.ts`: `frameFromSeconds(t, fps)`, `secondsFromFrame(frame, fps)`, `retimeMs(markers, fps)`, `formatFrameTime(frame, fps)`, `formatMs(ms)`, `formatDeltaMs(ms)`, `setMarker(markers, marker)`, `removeMarkerAt(markers, index)`, `FPS_PRESETS`.

- [ ] **Step 1: Branch**

```bash
cd /home/joey/therun/therun-fr
git checkout -b vod-review main
git cherry-pick ade0f97c   # the design doc, currently on board-filters
```

- [ ] **Step 2: Types**

Append to `types/leaderboards.types.ts` (near `RunDetail`):

```ts
// ---- VOD review (frame-stepped verification) ------------------------------
// Backend: src/types/vod-review.ts — see docs/frontend-guide-vod-review.md.
export type VodMarkerKind = 'start' | 'end' | 'split' | 'note';

export interface VodMarker {
    kind: VodMarkerKind;
    /** Integer ≥ 0 from video time 0 at `VodReview.fps`. */
    frame: number;
    label?: string;
    note?: string;
    splitIndex?: number;
}

export interface VodReviewAuthor {
    markers: VodMarker[];
    at: string;
}

export interface VodReview {
    fps: number;
    runner?: VodReviewAuthor;
    mod?: VodReviewAuthor & { retimedMs: number | null; by: number };
}

/** What a client sends: one author's markers + fps. `null` clears (mod only). */
export interface VodReviewPatch {
    fps: number;
    markers: VodMarker[];
    retimedMs?: number | null;
}
```

Add `vodReview?: VodReview | null;` to `RunDetail` (after `vodUrl`) and to `ManualTimeDetail` (after `evidenceUrl`). Optional because older backend deploys omit it.

`types/moderation.types.ts`: import `VodReviewPatch` from `./leaderboards.types` and add `vodReview?: VodReviewPatch | null;` to `UpdateManualTimeInput`, and `vodReview?: VodReviewPatch;` to `CreateManualTimeInput` and `SelfManualTimeInput`.

`src/lib/moderation/run-edit.ts`: add `vodReview?: VodReviewPatch | null;` to `EditRunInput` with the doc line "explicit `null` clears the whole review; changing `vodUrl` clears it server-side".

- [ ] **Step 3: Failing tests for `retime.ts`**

```ts
// vod-review/retime.test.ts
import { describe, expect, it } from 'vitest';
import type { VodMarker } from '../../../../../types/leaderboards.types';
import {
    formatDeltaMs,
    formatFrameTime,
    formatMs,
    frameFromSeconds,
    removeMarkerAt,
    retimeMs,
    secondsFromFrame,
    setMarker,
} from './retime';

describe('frame <-> seconds', () => {
    it('round-trips at 30, 60 and 59.94', () => {
        for (const fps of [30, 60, 59.94]) {
            for (const frame of [0, 1, 17, 1000, 123456]) {
                expect(frameFromSeconds(secondsFromFrame(frame, fps), fps)).toBe(frame);
            }
        }
    });
    it('floors player time onto the frame it is inside', () => {
        expect(frameFromSeconds(0.0166, 60)).toBe(0);
        expect(frameFromSeconds(0.0167, 60)).toBe(1);
        expect(frameFromSeconds(1, 60)).toBe(60); // exact boundary, no float slop
    });
    it('seeks to the middle of a frame', () => {
        expect(secondsFromFrame(0, 60)).toBeCloseTo(0.5 / 60, 9);
    });
});

describe('retimeMs', () => {
    const start: VodMarker = { kind: 'start', frame: 600 };
    it('is null until both markers exist', () => {
        expect(retimeMs([start], 60)).toBeNull();
        expect(retimeMs([], 60)).toBeNull();
    });
    it('rounds to the millisecond', () => {
        expect(retimeMs([start, { kind: 'end', frame: 6600 }], 60)).toBe(100000);
        expect(retimeMs([{ kind: 'start', frame: 0 }, { kind: 'end', frame: 1 }], 30)).toBe(33);
    });
});

describe('formatting', () => {
    it('formats frame time as h:mm:ss.mmm', () => {
        expect(formatFrameTime(0, 60)).toBe('0:00.000');
        expect(formatFrameTime(60 * 3661 + 30, 60)).toBe('1:01:01.500');
    });
    it('formats ms and deltas', () => {
        expect(formatMs(5025670)).toBe('1:23:45.670');
        expect(formatDeltaMs(50)).toBe('+0.050');
        expect(formatDeltaMs(-1234)).toBe('−1.234');
        expect(formatDeltaMs(0)).toBe('±0.000');
    });
});

describe('marker ops', () => {
    it('setMarker replaces an existing start/end but appends splits/notes, sorted', () => {
        let m = setMarker([], { kind: 'start', frame: 100 });
        m = setMarker(m, { kind: 'start', frame: 90 });
        m = setMarker(m, { kind: 'note', frame: 50, note: 'a' });
        m = setMarker(m, { kind: 'note', frame: 60, note: 'b' });
        expect(m).toEqual([
            { kind: 'note', frame: 50, note: 'a' },
            { kind: 'note', frame: 60, note: 'b' },
            { kind: 'start', frame: 90 },
        ]);
    });
    it('removeMarkerAt drops by index', () => {
        expect(removeMarkerAt([{ kind: 'start', frame: 1 }, { kind: 'end', frame: 2 }], 0)).toEqual([{ kind: 'end', frame: 2 }]);
    });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/\[game\]/leaderboard/vod-review/retime.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `retime.ts`**

```ts
// vod-review/retime.ts
import type { VodMarker } from '../../../../../types/leaderboards.types';

export const FPS_PRESETS = [60, 30] as const;
export const MAX_FPS = 240;

/** Player time → frame index. The epsilon absorbs float noise on exact boundaries. */
export function frameFromSeconds(seconds: number, fps: number): number {
    return Math.max(0, Math.floor(seconds * fps + 1e-6));
}

/** Frame index → the seek time that lands inside that frame. */
export function secondsFromFrame(frame: number, fps: number): number {
    return (frame + 0.5) / fps;
}

export function retimeMs(markers: VodMarker[], fps: number): number | null {
    const start = markers.find((m) => m.kind === 'start');
    const end = markers.find((m) => m.kind === 'end');
    if (!start || !end) return null;
    return Math.round(((end.frame - start.frame) / fps) * 1000);
}

/** h:mm:ss.mmm (hours omitted when zero). */
export function formatMs(ms: number): string {
    const sign = ms < 0 ? '−' : '';
    const abs = Math.abs(ms);
    const h = Math.floor(abs / 3_600_000);
    const m = Math.floor((abs % 3_600_000) / 60_000);
    const s = Math.floor((abs % 60_000) / 1000);
    const milli = abs % 1000;
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    return `${sign}${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}.${String(milli).padStart(3, '0')}`;
}

export function formatFrameTime(frame: number, fps: number): string {
    return formatMs(Math.round((frame / fps) * 1000));
}

export function formatDeltaMs(ms: number): string {
    if (ms === 0) return '±0.000';
    const sign = ms > 0 ? '+' : '−';
    return `${sign}${(Math.abs(ms) / 1000).toFixed(3)}`;
}

/** Add a marker; start/end are singletons and replace, others append. Always sorted by frame. */
export function setMarker(markers: VodMarker[], marker: VodMarker): VodMarker[] {
    const singleton = marker.kind === 'start' || marker.kind === 'end';
    const rest = singleton ? markers.filter((m) => m.kind !== marker.kind) : markers;
    return [...rest, marker].sort((a, b) => a.frame - b.frame);
}

export function removeMarkerAt(markers: VodMarker[], index: number): VodMarker[] {
    return markers.filter((_, i) => i !== index);
}
```

- [ ] **Step 6: Run tests**

Run the same command. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add types/leaderboards.types.ts types/moderation.types.ts src/lib/moderation/run-edit.ts "app/(new-layout)/games-v2/[game]/leaderboard/vod-review/"
git commit -m "feat(vod-review): type mirror + pure retime math"
```

---

### Task B2: `VodPlayer` adapters (YouTube IFrame API, Twitch Embed) + `detectVod`

**Files:**
- Create: `vod-review/player/types.ts`, `vod-review/player/youtube.ts`, `vod-review/player/twitch.ts`, `vod-review/player/create-player.ts`
- Test: `vod-review/player/types.test.ts`

**Interfaces:**
- Produces: `interface VodPlayer { ready: Promise<void>; seek(s: number): void; play(): void; pause(): void; getTime(): number; setRate(r: PlaybackRate): void; supportsRate: boolean; duration(): number | null; destroy(): void }`, `type PlaybackRate = 0.25 | 0.5 | 1 | 2`, `detectVod(url): { kind: 'youtube'; id: string } | { kind: 'twitch'; id: string } | null`, `createVodPlayer(el: HTMLElement, url: string): VodPlayer | null`, `type PlayerFactory = typeof createVodPlayer`.

- [ ] **Step 1: Failing test for `detectVod`**

```ts
// vod-review/player/types.test.ts
import { describe, expect, it } from 'vitest';
import { detectVod } from './types';

describe('detectVod', () => {
    it('recognises YouTube watch, short and embed links', () => {
        expect(detectVod('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
        expect(detectVod('https://youtu.be/dQw4w9WgXcQ?t=10')).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
    });
    it('recognises Twitch VODs but not clips or channels', () => {
        expect(detectVod('https://www.twitch.tv/videos/123456789?t=1h2m')).toEqual({ kind: 'twitch', id: '123456789' });
        expect(detectVod('https://clips.twitch.tv/SomeClip')).toBeNull();
        expect(detectVod('https://twitch.tv/somechannel')).toBeNull();
    });
    it('returns null for everything else', () => {
        expect(detectVod('https://drive.google.com/file/d/abc')).toBeNull();
    });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run "app/(new-layout)/games-v2/\[game\]/leaderboard/vod-review/player/types.test.ts"` → FAIL.

- [ ] **Step 3: `types.ts`**

```ts
// vod-review/player/types.ts
import { youtubeParser } from '~src/components/run/dashboard/vod';

export type PlaybackRate = 0.25 | 0.5 | 1 | 2;
export const PLAYBACK_RATES: PlaybackRate[] = [0.25, 0.5, 1, 2];

/** The bit of an embedded player the workbench needs. Time in seconds. */
export interface VodPlayer {
    ready: Promise<void>;
    /** Pauses, then seeks. */
    seek(seconds: number): void;
    play(): void;
    pause(): void;
    getTime(): number;
    setRate(rate: PlaybackRate): void;
    /** Twitch has no rate setter; the UI hides the control. */
    supportsRate: boolean;
    duration(): number | null;
    destroy(): void;
}

export type VodTarget =
    | { kind: 'youtube'; id: string }
    | { kind: 'twitch'; id: string };

export function detectVod(url: string): VodTarget | null {
    const yt = youtubeParser(url);
    if (yt) return { kind: 'youtube', id: yt };
    const tw = url.match(/twitch\.tv\/videos\/(\d+)/);
    if (tw) return { kind: 'twitch', id: tw[1] };
    return null;
}
```

- [ ] **Step 4: `youtube.ts`**

```ts
// vod-review/player/youtube.ts
import type { PlaybackRate, VodPlayer } from './types';

// Minimal typing of the parts of the IFrame API we use.
interface YTPlayerLike {
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    playVideo(): void;
    pauseVideo(): void;
    getCurrentTime(): number;
    getDuration(): number;
    setPlaybackRate(rate: number): void;
    destroy(): void;
}
interface YTNamespace {
    Player: new (
        el: HTMLElement,
        opts: {
            videoId: string;
            playerVars: Record<string, string | number>;
            events: { onReady: () => void; onError: (e: unknown) => void };
        },
    ) => YTPlayerLike;
}
declare global {
    interface Window {
        YT?: YTNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Load https://www.youtube.com/iframe_api once per page. */
function loadYouTubeApi(): Promise<YTNamespace> {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prev?.();
            if (window.YT) resolve(window.YT);
            else reject(new Error('YT missing after ready'));
        };
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.async = true;
        s.onerror = () => {
            apiPromise = null;
            reject(new Error('Could not load the YouTube player.'));
        };
        document.head.appendChild(s);
    });
    return apiPromise;
}

export function createYouTubePlayer(el: HTMLElement, videoId: string): VodPlayer {
    let player: YTPlayerLike | null = null;
    const ready = loadYouTubeApi().then(
        (YT) =>
            new Promise<void>((resolve, reject) => {
                player = new YT.Player(el, {
                    videoId,
                    playerVars: {
                        enablejsapi: 1,
                        origin: window.location.origin,
                        rel: 0,
                        controls: 1,
                        playsinline: 1,
                    },
                    events: {
                        onReady: () => resolve(),
                        onError: () => reject(new Error('The YouTube player refused this video.')),
                    },
                });
            }),
    );
    return {
        ready,
        supportsRate: true,
        seek(seconds) {
            player?.pauseVideo();
            player?.seekTo(Math.max(0, seconds), true);
        },
        play: () => player?.playVideo(),
        pause: () => player?.pauseVideo(),
        getTime: () => player?.getCurrentTime() ?? 0,
        setRate: (rate: PlaybackRate) => player?.setPlaybackRate(rate),
        duration: () => {
            const d = player?.getDuration() ?? 0;
            return d > 0 ? d : null;
        },
        destroy: () => {
            player?.destroy();
            player = null;
        },
    };
}
```

- [ ] **Step 5: `twitch.ts`**

```ts
// vod-review/player/twitch.ts
import type { VodPlayer } from './types';

interface TwitchPlayerLike {
    seek(seconds: number): void;
    play(): void;
    pause(): void;
    getCurrentTime(): number;
    getDuration(): number;
    addEventListener(event: string, cb: () => void): void;
    destroy?: () => void;
}
interface TwitchNamespace {
    Player: (new (
        el: HTMLElement,
        opts: { video: string; parent: string[]; autoplay: boolean; width: string; height: string },
    ) => TwitchPlayerLike) & { READY: string };
}
declare global {
    interface Window {
        Twitch?: TwitchNamespace;
    }
}

let apiPromise: Promise<TwitchNamespace> | null = null;

function loadTwitchApi(): Promise<TwitchNamespace> {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.Twitch?.Player) return Promise.resolve(window.Twitch);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://player.twitch.tv/js/embed/v1.js';
        s.async = true;
        s.onload = () => (window.Twitch ? resolve(window.Twitch) : reject(new Error('Twitch missing after load')));
        s.onerror = () => {
            apiPromise = null;
            reject(new Error('Could not load the Twitch player.'));
        };
        document.head.appendChild(s);
    });
    return apiPromise;
}

export function createTwitchPlayer(el: HTMLElement, videoId: string): VodPlayer {
    let player: TwitchPlayerLike | null = null;
    const ready = loadTwitchApi().then(
        (Twitch) =>
            new Promise<void>((resolve) => {
                player = new Twitch.Player(el, {
                    video: videoId,
                    // Same allow-list vod.tsx uses, plus wherever we're actually
                    // running (preview deploys, LAN dev hosts).
                    parent: Array.from(new Set(['localhost', 'therun.gg', window.location.hostname])),
                    autoplay: false,
                    width: '100%',
                    height: '100%',
                });
                player.addEventListener(Twitch.Player.READY, () => resolve());
            }),
    );
    return {
        ready,
        supportsRate: false,
        seek(seconds) {
            player?.pause();
            player?.seek(Math.max(0, seconds));
        },
        play: () => player?.play(),
        pause: () => player?.pause(),
        getTime: () => player?.getCurrentTime() ?? 0,
        setRate: () => {},
        duration: () => {
            const d = player?.getDuration() ?? 0;
            return d > 0 ? d : null;
        },
        destroy: () => {
            player?.destroy?.();
            el.replaceChildren();
            player = null;
        },
    };
}
```

- [ ] **Step 6: `create-player.ts`**

```ts
// vod-review/player/create-player.ts
import { createTwitchPlayer } from './twitch';
import { detectVod, type VodPlayer } from './types';
import { createYouTubePlayer } from './youtube';

export type PlayerFactory = (el: HTMLElement, url: string) => VodPlayer | null;

export const createVodPlayer: PlayerFactory = (el, url) => {
    const target = detectVod(url);
    if (!target) return null;
    return target.kind === 'youtube'
        ? createYouTubePlayer(el, target.id)
        : createTwitchPlayer(el, target.id);
};
```

- [ ] **Step 7: Run tests + typecheck the folder**

Run: `npx vitest run "app/(new-layout)/games-v2/\[game\]/leaderboard/vod-review/"` → PASS; `npx tsc --noEmit 2>&1 | grep vod-review` → no lines.

- [ ] **Step 8: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard/vod-review/player/"
git commit -m "feat(vod-review): VodPlayer adapters for YouTube IFrame API and Twitch Embed"
```

---

### Task B3: `useVodPlayer` hook (cursor, stepping, marking) with a fake player

**Files:**
- Create: `vod-review/use-vod-player.ts`
- Test: `vod-review/use-vod-player.test.tsx`

**Interfaces:**
- Consumes: `VodPlayer`, `PlayerFactory` (B2); `frameFromSeconds`, `secondsFromFrame` (B1).
- Produces:
```ts
export function useVodPlayer(opts: {
    url: string;
    fps: number;
    factory?: PlayerFactory;          // default createVodPlayer; tests inject a fake
}): {
    containerRef: RefObject<HTMLDivElement | null>;
    status: 'loading' | 'ready' | 'unavailable' | 'error';
    error: string | null;
    supportsRate: boolean;
    cursorFrame: number;              // what the workbench believes is shown
    stepFrames(delta: number): void;  // seeks to cursor+delta, clamped ≥ 0 (and ≤ duration when known)
    stepSeconds(delta: number): void;
    seekToFrame(frame: number): void;
    togglePlay(): void;
    playing: boolean;
    setRate(rate: PlaybackRate): void;
    rate: PlaybackRate;
    /** Reads the player's clock (not the cursor) and converts at the current fps. */
    currentFrameFromPlayer(): number;
}
```
  Semantics: `cursorFrame` is set by our own step/seek calls; a 250 ms poll while `playing` (and once after each seek) syncs `cursorFrame` from `getTime()` so the readout tracks the player even when the mod uses YouTube's own `,`/`.` keys. Changing `fps` re-derives `cursorFrame` from the player's clock (`frameFromSeconds(getTime(), fps)`), never scales frames.

- [ ] **Step 1: Failing test with a fake player**

```tsx
// vod-review/use-vod-player.test.tsx
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerFactory } from './player/create-player';
import type { VodPlayer } from './player/types';
import { useVodPlayer } from './use-vod-player';

function fakePlayer(): VodPlayer & { time: number } {
    const p = {
        time: 0,
        ready: Promise.resolve(),
        supportsRate: true,
        seek: vi.fn((s: number) => {
            p.time = s;
        }),
        play: vi.fn(),
        pause: vi.fn(),
        getTime: () => p.time,
        setRate: vi.fn(),
        duration: () => 100,
        destroy: vi.fn(),
    };
    return p;
}

describe('useVodPlayer', () => {
    it('steps frames by seeking to the middle of the target frame', async () => {
        const player = fakePlayer();
        const factory: PlayerFactory = () => player;
        const { result } = renderHook(() => useVodPlayer({ url: 'https://youtu.be/dQw4w9WgXcQ', fps: 60, factory }));
        // attach a container so the effect runs
        act(() => {
            (result.current.containerRef as { current: HTMLDivElement | null }).current = document.createElement('div');
        });
        await act(async () => {
            await player.ready;
        });
        act(() => result.current.stepFrames(1));
        expect(player.seek).toHaveBeenLastCalledWith(1.5 / 60);
        expect(result.current.cursorFrame).toBe(1);
        act(() => result.current.stepFrames(-5));
        expect(result.current.cursorFrame).toBe(0);
    });
    it('reads the frame from the player clock at the current fps', async () => {
        const player = fakePlayer();
        const { result, rerender } = renderHook(
            ({ fps }) => useVodPlayer({ url: 'https://youtu.be/dQw4w9WgXcQ', fps, factory: () => player }),
            { initialProps: { fps: 60 } },
        );
        await act(async () => {
            await player.ready;
        });
        player.time = 1.0;
        expect(result.current.currentFrameFromPlayer()).toBe(60);
        rerender({ fps: 30 });
        expect(result.current.currentFrameFromPlayer()).toBe(30);
    });
    it('reports unavailable for a non-embeddable url', () => {
        const { result } = renderHook(() => useVodPlayer({ url: 'https://example.com/x.mp4', fps: 60, factory: () => null }));
        expect(result.current.status).toBe('unavailable');
    });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run "app/(new-layout)/games-v2/\[game\]/leaderboard/vod-review/use-vod-player.test.tsx"` → FAIL.

- [ ] **Step 3: Implement the hook**

```ts
// vod-review/use-vod-player.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createVodPlayer, type PlayerFactory } from './player/create-player';
import type { PlaybackRate, VodPlayer } from './player/types';
import { frameFromSeconds, secondsFromFrame } from './retime';

export type VodPlayerStatus = 'loading' | 'ready' | 'unavailable' | 'error';

export function useVodPlayer({
    url,
    fps,
    factory = createVodPlayer,
}: {
    url: string;
    fps: number;
    factory?: PlayerFactory;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<VodPlayer | null>(null);
    const [status, setStatus] = useState<VodPlayerStatus>('loading');
    const [error, setError] = useState<string | null>(null);
    const [supportsRate, setSupportsRate] = useState(true);
    const [cursorFrame, setCursorFrame] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [rate, setRateState] = useState<PlaybackRate>(1);
    // fps in a ref so the poll reads the current value without re-arming.
    const fpsRef = useRef(fps);
    fpsRef.current = fps;

    // Mount / remount the player when the url changes.
    useEffect(() => {
        const el = containerRef.current ?? document.createElement('div');
        const player = factory(el, url);
        if (!player) {
            setStatus('unavailable');
            return;
        }
        playerRef.current = player;
        setSupportsRate(player.supportsRate);
        setStatus('loading');
        let cancelled = false;
        player.ready
            .then(() => {
                if (!cancelled) setStatus('ready');
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setStatus('error');
                setError(e instanceof Error ? e.message : 'The player failed to load.');
            });
        return () => {
            cancelled = true;
            player.destroy();
            playerRef.current = null;
        };
    }, [url, factory]);

    const currentFrameFromPlayer = useCallback(
        () => frameFromSeconds(playerRef.current?.getTime() ?? 0, fpsRef.current),
        [],
    );

    // Re-derive the cursor when fps changes (frames don't scale, the clock does).
    useEffect(() => {
        if (status === 'ready') setCursorFrame(currentFrameFromPlayer());
    }, [fps, status, currentFrameFromPlayer]);

    // While playing, follow the player clock so the readout stays honest.
    useEffect(() => {
        if (!playing || status !== 'ready') return;
        const id = window.setInterval(() => setCursorFrame(currentFrameFromPlayer()), 250);
        return () => window.clearInterval(id);
    }, [playing, status, currentFrameFromPlayer]);

    const seekToFrame = useCallback((frame: number) => {
        const p = playerRef.current;
        if (!p) return;
        const dur = p.duration();
        const maxFrame = dur != null ? Math.max(0, Math.floor(dur * fpsRef.current) - 1) : Infinity;
        const target = Math.min(Math.max(0, Math.round(frame)), maxFrame);
        p.seek(secondsFromFrame(target, fpsRef.current));
        setPlaying(false);
        setCursorFrame(target);
        // One late sync: some players report the pre-seek time for a tick.
        window.setTimeout(() => setCursorFrame(target), 300);
    }, []);

    const stepFrames = useCallback(
        (delta: number) => seekToFrame(currentFrameFromPlayer() === cursorFrame ? cursorFrame + delta : currentFrameFromPlayer() + delta),
        [cursorFrame, currentFrameFromPlayer, seekToFrame],
    );
    const stepSeconds = useCallback(
        (delta: number) => stepFrames(Math.round(delta * fpsRef.current)),
        [stepFrames],
    );

    const togglePlay = useCallback(() => {
        const p = playerRef.current;
        if (!p) return;
        if (playing) {
            p.pause();
            setPlaying(false);
            setCursorFrame(currentFrameFromPlayer());
        } else {
            p.play();
            setPlaying(true);
        }
    }, [playing, currentFrameFromPlayer]);

    const setRate = useCallback((r: PlaybackRate) => {
        playerRef.current?.setRate(r);
        setRateState(r);
    }, []);

    return {
        containerRef,
        status,
        error,
        supportsRate,
        cursorFrame,
        stepFrames,
        stepSeconds,
        seekToFrame,
        togglePlay,
        playing,
        setRate,
        rate,
        currentFrameFromPlayer,
    };
}
```

Note on `stepFrames`: if the mod stepped inside the iframe (YouTube `,`/`.`), the player clock has moved but our cursor hasn't; stepping from the player's clock in that case keeps our button in sync with what is on screen. The expression above does exactly that: use the cursor when it agrees with the clock, else the clock.

- [ ] **Step 4: Run tests** — the same command → PASS. If the first test's ref-assignment dance is flaky under React 19's `renderHook`, mount the container via `factory` receiving a detached `div` (the effect already falls back to `document.createElement('div')`), and drop the ref assignment from the test.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard/vod-review/use-vod-player.ts" "app/(new-layout)/games-v2/[game]/leaderboard/vod-review/use-vod-player.test.tsx"
git commit -m "feat(vod-review): useVodPlayer — cursor, frame stepping, player-clock marking"
```

---

### Task B4: Server actions — load review, save review, apply retime

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/leaderboard/actions/vod-review.action.ts`
- Modify: `src/lib/run-detail-viewer.ts` (add `getManualTimeByIdAsViewer`)
- Test: `app/(new-layout)/games-v2/[game]/leaderboard/actions/vod-review.action.test.ts`

**Interfaces:**
- Consumes: `editRun` (`src/lib/moderation/run-edit.ts`), `updateManualTime` (`src/lib/moderation/manual-times.ts`), `getRunByIdAsViewer`, `canModerateGame`, `resolveGame`, `revalidateRunDetails`, `revalidateTag('manual-time:<id>', 'minutes')` (matches `getManualTimeById`'s `cacheLife('minutes')`).
- Produces:
```ts
export type VodReviewTarget =
    | { kind: 'run'; runId: number }
    | { kind: 'manual'; manualTimeId: number; gameId: number };

export async function loadVodReviewAction(target: VodReviewTarget): Promise<
    | { ok: true; vodReview: VodReview | null; vodUrl: string | null; realTimeMs: number | null; timing: 'realtime' | 'gametime' }
    | { error: string }
>;

export async function saveVodReviewAction(
    gameSlug: string,
    target: VodReviewTarget,
    patch: VodReviewPatch | null,          // null clears
    opts?: { applyRetimeMs?: number },     // when set, also writes the run/set time
): Promise<{ ok: true } | { error: string }>;
```
  Reasons stamped: save → `'Saved VOD review markers from the board mod drawer.'`; clear → `'Cleared VOD review markers from the board mod drawer.'`; apply → `` `Retimed from VOD: frames ${start}→${end} at ${fps} fps.` `` (needs ≥ 10 chars — it always is).

- [ ] **Step 1: Failing tests** (mock the fetchers; assert on the bodies)

```ts
// actions/vod-review.action.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    resolveGame: vi.fn(),
    canModerateGame: vi.fn(),
    editRun: vi.fn(),
    updateManualTime: vi.fn(),
    revalidateRunDetails: vi.fn(),
    revalidateTag: vi.fn(),
}));
vi.mock('~src/actions/session.action', () => ({ getSession: mocks.getSession }));
vi.mock('~src/lib/games-v1', () => ({ resolveGame: mocks.resolveGame }));
vi.mock('~src/lib/moderation/can-moderate', () => ({ canModerateGame: mocks.canModerateGame }));
vi.mock('~src/lib/moderation/run-edit', () => ({ editRun: mocks.editRun }));
vi.mock('~src/lib/moderation/manual-times', () => ({ updateManualTime: mocks.updateManualTime }));
vi.mock('~src/lib/moderation/revalidate-boards', () => ({ revalidateRunDetails: mocks.revalidateRunDetails }));
vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));

import { saveVodReviewAction } from './vod-review.action';

const patch = { fps: 60, markers: [{ kind: 'start', frame: 600 }, { kind: 'end', frame: 6600 }], retimedMs: 100000 } as const;

describe('saveVodReviewAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSession.mockResolvedValue({ username: 'mod', id: 'sess' });
        mocks.resolveGame.mockResolvedValue({ id: 1, name: 'Game' });
        mocks.canModerateGame.mockReturnValue(true);
        mocks.editRun.mockResolvedValue({ updated: true });
        mocks.updateManualTime.mockResolvedValue({ id: 5, updated: true });
    });
    it('saves markers on a run with the stamped reason', async () => {
        const r = await saveVodReviewAction('game', { kind: 'run', runId: 9 }, patch);
        expect(r).toEqual({ ok: true });
        expect(mocks.editRun).toHaveBeenCalledWith('sess', 9, {
            vodReview: patch,
            reason: 'Saved VOD review markers from the board mod drawer.',
        });
        expect(mocks.revalidateRunDetails).toHaveBeenCalledWith([9]);
    });
    it('applies the retime as the run time in the same edit', async () => {
        await saveVodReviewAction('game', { kind: 'run', runId: 9 }, patch, { applyRetimeMs: 100000 });
        expect(mocks.editRun).toHaveBeenCalledWith('sess', 9, {
            vodReview: patch,
            time: 100000,
            reason: 'Retimed from VOD: frames 600→6600 at 60 fps.',
        });
    });
    it('clears with null', async () => {
        await saveVodReviewAction('game', { kind: 'manual', manualTimeId: 5, gameId: 1 }, null);
        expect(mocks.updateManualTime).toHaveBeenCalledWith('sess', 1, 5, {
            vodReview: null,
            reason: 'Cleared VOD review markers from the board mod drawer.',
        });
        expect(mocks.revalidateTag).toHaveBeenCalledWith('manual-time:5', 'minutes');
    });
    it('refuses non-moderators', async () => {
        mocks.canModerateGame.mockReturnValue(false);
        expect(await saveVodReviewAction('game', { kind: 'run', runId: 9 }, patch)).toEqual({ error: 'Not authorized to moderate this game.' });
        expect(mocks.editRun).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run "app/(new-layout)/games-v2/\[game\]/leaderboard/actions/vod-review.action.test.ts"` → FAIL.

- [ ] **Step 3: Add the uncached manual-time reader**

Append to `src/lib/run-detail-viewer.ts`:

```ts
/** Uncached manual-time detail (same reasoning as getRunByIdAsViewer). */
export async function getManualTimeByIdAsViewer(
    id: number,
    sessionId: string,
): Promise<ManualTimeDetail | null> {
    try {
        const body = await v1Fetch<{ result: ManualTimeDetail }>(
            `/v1/leaderboards/manual-times/${id}`,
            { headers: { Authorization: `Bearer ${sessionId}` }, cache: 'no-store' },
        );
        return body.result;
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return null;
        throw e;
    }
}
```
(import `ManualTimeDetail` from `../../types/leaderboards.types`).

- [ ] **Step 4: Implement the action**

```ts
// actions/vod-review.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { updateManualTime } from '~src/lib/moderation/manual-times';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { revalidateRunDetails } from '~src/lib/moderation/revalidate-boards';
import { editRun } from '~src/lib/moderation/run-edit';
import { getManualTimeByIdAsViewer, getRunByIdAsViewer } from '~src/lib/run-detail-viewer';
import type { VodReview, VodReviewPatch } from '../../../../../../types/leaderboards.types';

type Fail = { error: string };

export type VodReviewTarget =
    | { kind: 'run'; runId: number }
    | { kind: 'manual'; manualTimeId: number; gameId: number };

const SAVE_REASON = 'Saved VOD review markers from the board mod drawer.';
const CLEAR_REASON = 'Cleared VOD review markers from the board mod drawer.';

function retimeReason(patch: VodReviewPatch): string {
    const start = patch.markers.find((m) => m.kind === 'start')?.frame ?? 0;
    const end = patch.markers.find((m) => m.kind === 'end')?.frame ?? 0;
    return `Retimed from VOD: frames ${start}→${end} at ${patch.fps} fps.`;
}

/** The current review + what the retime line compares against. Uncached. */
export async function loadVodReviewAction(target: VodReviewTarget): Promise<
    | { ok: true; vodReview: VodReview | null; vodUrl: string | null; realTimeMs: number | null; timing: 'realtime' | 'gametime' }
    | Fail
> {
    const session = await getSession();
    if (!session?.id) return { error: 'Not signed in.' };
    try {
        if (target.kind === 'run') {
            const d = await getRunByIdAsViewer(target.runId, session.id);
            if (!d) return { error: 'Run not found.' };
            return { ok: true, vodReview: d.vodReview ?? null, vodUrl: d.vodUrl, realTimeMs: d.realTime ?? d.time, timing: 'realtime' };
        }
        const d = await getManualTimeByIdAsViewer(target.manualTimeId, session.id);
        if (!d) return { error: 'Set time not found.' };
        return { ok: true, vodReview: d.vodReview ?? null, vodUrl: d.evidenceUrl, realTimeMs: d.timing === 'realtime' ? d.timeMs : null, timing: d.timing };
    } catch {
        return { error: 'Could not load the review.' };
    }
}

export async function saveVodReviewAction(
    gameSlug: string,
    target: VodReviewTarget,
    patch: VodReviewPatch | null,
    opts: { applyRetimeMs?: number } = {},
): Promise<{ ok: true } | Fail> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) return { error: 'Not authorized to moderate this game.' };

    const reason = patch === null ? CLEAR_REASON : opts.applyRetimeMs != null ? retimeReason(patch) : SAVE_REASON;
    try {
        if (target.kind === 'run') {
            await editRun(session.id, target.runId, {
                vodReview: patch,
                ...(opts.applyRetimeMs != null ? { time: opts.applyRetimeMs } : {}),
                reason,
            });
            revalidateRunDetails([target.runId]);
        } else {
            await updateManualTime(session.id, target.gameId, target.manualTimeId, {
                vodReview: patch,
                ...(opts.applyRetimeMs != null ? { timeMs: opts.applyRetimeMs } : {}),
                reason,
            });
            revalidateTag(`manual-time:${target.manualTimeId}`, 'minutes');
        }
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Could not save the review. Please try again.' };
    }
    return { ok: true };
}
```

- [ ] **Step 5: Run tests** → PASS. `npx tsc --noEmit 2>&1 | grep -E "vod-review|run-detail-viewer"` → nothing.

- [ ] **Step 6: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard/actions/vod-review.action.ts" "app/(new-layout)/games-v2/[game]/leaderboard/actions/vod-review.action.test.ts" src/lib/run-detail-viewer.ts
git commit -m "feat(vod-review): load/save/apply-retime server actions"
```

---

### Task B5: Workbench UI (marker rail, transport, retime line, keyboard)

**Files:**
- Create: `vod-review/vod-review-workbench.tsx`, `vod-review/marker-rail.tsx`, `vod-review/vod-review.module.scss`
- Test: `vod-review/vod-review-workbench.test.tsx`

**Interfaces:**
- Consumes: `useVodPlayer` (B3), `retime.ts` (B1), `PLAYBACK_RATES` (B2), actions (B4).
- Produces:
```tsx
export interface VodReviewWorkbenchProps {
    mode: 'mod' | 'runner';
    url: string;
    /** mod: what to compare/save against. runner: omitted. */
    target?: VodReviewTarget;
    gameSlug?: string;
    /** Preloaded state (mod: from loadVodReviewAction; runner: whatever is in form state). */
    initial: { fps: number; markers: VodMarker[]; runnerMarkers?: VodMarker[]; realTimeMs: number | null; timing: 'realtime' | 'gametime' };
    /** runner mode: report the pinned markers/fps back to the form on every change. */
    onChange?: (patch: VodReviewPatch | null) => void;
    /** mod mode: after a successful save/apply (drawer refetches). */
    onSaved?: (patch: VodReviewPatch | null, appliedMs?: number) => void;
    playerFactory?: PlayerFactory;   // tests
}
export function VodReviewWorkbench(props: VodReviewWorkbenchProps): JSX.Element;
```

- [ ] **Step 1: Failing component tests** (fake player; jsdom)

```tsx
// vod-review/vod-review-workbench.test.tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VodPlayer } from './player/types';
import { VodReviewWorkbench } from './vod-review-workbench';

const mocks = vi.hoisted(() => ({ saveVodReviewAction: vi.fn() }));
vi.mock('../actions/vod-review.action', () => ({ saveVodReviewAction: mocks.saveVodReviewAction }));

function fake(): VodPlayer & { time: number } {
    const p = {
        time: 0, ready: Promise.resolve(), supportsRate: true,
        seek: vi.fn((s: number) => { p.time = s; }),
        play: vi.fn(), pause: vi.fn(), getTime: () => p.time, setRate: vi.fn(),
        duration: () => 1000, destroy: vi.fn(),
    };
    return p;
}
const base = { url: 'https://youtu.be/dQw4w9WgXcQ', gameSlug: 'g', target: { kind: 'run' as const, runId: 1 } };

describe('VodReviewWorkbench (mod)', () => {
    it('sets start and end from the player clock and shows the retime against the submitted time', async () => {
        const player = fake();
        render(<VodReviewWorkbench mode="mod" {...base} playerFactory={() => player}
            initial={{ fps: 60, markers: [], realTimeMs: 100050, timing: 'realtime' }} />);
        await waitFor(() => expect(screen.getByRole('button', { name: /set start/i })).toBeEnabled());
        player.time = 10;
        fireEvent.click(screen.getByRole('button', { name: /set start/i }));
        player.time = 110;
        fireEvent.click(screen.getByRole('button', { name: /set end/i }));
        expect(screen.getByText(/retimed 1:40\.000/)).toBeInTheDocument();
        expect(screen.getByText(/−0\.050/)).toBeInTheDocument();
    });
    it('saves markers with the chosen fps and computed retime', async () => {
        const player = fake();
        mocks.saveVodReviewAction.mockResolvedValue({ ok: true });
        render(<VodReviewWorkbench mode="mod" {...base} playerFactory={() => player}
            initial={{ fps: 60, markers: [{ kind: 'start', frame: 0 }, { kind: 'end', frame: 60 }], realTimeMs: 1000, timing: 'realtime' }} />);
        await waitFor(() => expect(screen.getByRole('button', { name: /save markers/i })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: /save markers/i }));
        await waitFor(() => expect(mocks.saveVodReviewAction).toHaveBeenCalledWith('g', base.target,
            { fps: 60, markers: [{ kind: 'start', frame: 0 }, { kind: 'end', frame: 60 }], retimedMs: 1000 }, {}));
    });
    it('disables Apply retime when the set time is game time', async () => {
        render(<VodReviewWorkbench mode="mod" {...base} target={{ kind: 'manual', manualTimeId: 2, gameId: 1 }} playerFactory={() => fake()}
            initial={{ fps: 60, markers: [{ kind: 'start', frame: 0 }, { kind: 'end', frame: 60 }], realTimeMs: null, timing: 'gametime' }} />);
        await waitFor(() => expect(screen.getByRole('button', { name: /apply retime/i })).toBeDisabled());
    });
});

describe('VodReviewWorkbench (runner)', () => {
    it('reports start/end to the form and hides mod-only controls', async () => {
        const player = fake();
        const onChange = vi.fn();
        render(<VodReviewWorkbench mode="runner" url={base.url} playerFactory={() => player} onChange={onChange}
            initial={{ fps: 60, markers: [], realTimeMs: null, timing: 'realtime' }} />);
        await waitFor(() => expect(screen.getByRole('button', { name: /set start/i })).toBeEnabled());
        expect(screen.queryByRole('button', { name: /add note/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /save markers/i })).toBeNull();
        player.time = 2;
        fireEvent.click(screen.getByRole('button', { name: /set start/i }));
        expect(onChange).toHaveBeenLastCalledWith({ fps: 60, markers: [{ kind: 'start', frame: 120 }] });
    });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL (module missing).

- [ ] **Step 3: `marker-rail.tsx`**

```tsx
// vod-review/marker-rail.tsx
'use client';

import type { VodMarker } from '../../../../../types/leaderboards.types';
import { formatFrameTime } from './retime';
import styles from './vod-review.module.scss';

const KIND_LABEL: Record<VodMarker['kind'], string> = { start: 'Start', end: 'End', split: 'Split', note: 'Note' };

export function MarkerRail({
    markers,
    ghostMarkers,
    fps,
    onSeek,
    onRemove,
    onEditText,
    readOnly = false,
}: {
    markers: VodMarker[];
    /** The other author's markers, shown dimmed and unremovable. */
    ghostMarkers?: VodMarker[];
    fps: number;
    onSeek: (frame: number) => void;
    onRemove: (index: number) => void;
    onEditText: (index: number, text: string) => void;
    readOnly?: boolean;
}) {
    if (markers.length === 0 && !ghostMarkers?.length) {
        return <p className={styles.empty}>No markers yet. Step to the first frame of the run and press Set start.</p>;
    }
    return (
        <ol className={styles.rail} aria-label="Markers">
            {ghostMarkers?.map((m, i) => (
                <li key={`ghost-${i}`} className={`${styles.marker} ${styles.ghost}`}>
                    <span className={styles.kind}>{KIND_LABEL[m.kind]}</span>
                    <button type="button" className={styles.markerTime} onClick={() => onSeek(m.frame)}>
                        {formatFrameTime(m.frame, fps)} <span className={styles.frameNo}>#{m.frame}</span>
                    </button>
                    <span className={styles.author}>runner</span>
                </li>
            ))}
            {markers.map((m, i) => (
                <li key={`${m.kind}-${m.frame}-${i}`} className={styles.marker}>
                    <span className={`${styles.kind} ${styles[`kind_${m.kind}`]}`}>{KIND_LABEL[m.kind]}</span>
                    <button type="button" className={styles.markerTime} onClick={() => onSeek(m.frame)}>
                        {formatFrameTime(m.frame, fps)} <span className={styles.frameNo}>#{m.frame}</span>
                    </button>
                    {(m.kind === 'split' || m.kind === 'note') && (
                        <input
                            className={styles.markerText}
                            value={m.kind === 'split' ? (m.label ?? '') : (m.note ?? '')}
                            placeholder={m.kind === 'split' ? 'Split name' : 'Note'}
                            maxLength={m.kind === 'split' ? 80 : 500}
                            readOnly={readOnly}
                            onChange={(e) => onEditText(i, e.target.value)}
                        />
                    )}
                    {!readOnly && (
                        <button type="button" className={styles.remove} aria-label={`Remove ${KIND_LABEL[m.kind]} marker`} onClick={() => onRemove(i)}>
                            ×
                        </button>
                    )}
                </li>
            ))}
        </ol>
    );
}
```

- [ ] **Step 4: `vod-review-workbench.tsx`**

```tsx
// vod-review/vod-review-workbench.tsx
'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { VodMarker, VodReviewPatch } from '../../../../../types/leaderboards.types';
import { saveVodReviewAction, type VodReviewTarget } from '../actions/vod-review.action';
import { MarkerRail } from './marker-rail';
import type { PlayerFactory } from './player/create-player';
import { PLAYBACK_RATES, type PlaybackRate } from './player/types';
import { FPS_PRESETS, MAX_FPS, formatDeltaMs, formatFrameTime, formatMs, removeMarkerAt, retimeMs, setMarker } from './retime';
import { useVodPlayer } from './use-vod-player';
import styles from './vod-review.module.scss';

export interface VodReviewWorkbenchProps {
    mode: 'mod' | 'runner';
    url: string;
    target?: VodReviewTarget;
    gameSlug?: string;
    initial: {
        fps: number;
        markers: VodMarker[];
        runnerMarkers?: VodMarker[];
        realTimeMs: number | null;
        timing: 'realtime' | 'gametime';
    };
    onChange?: (patch: VodReviewPatch | null) => void;
    onSaved?: (patch: VodReviewPatch | null, appliedMs?: number) => void;
    playerFactory?: PlayerFactory;
}

function toPatch(fps: number, markers: VodMarker[]): VodReviewPatch {
    const r = retimeMs(markers, fps);
    return r === null ? { fps, markers } : { fps, markers, retimedMs: r };
}

export function VodReviewWorkbench({
    mode, url, target, gameSlug, initial, onChange, onSaved, playerFactory,
}: VodReviewWorkbenchProps) {
    const isMod = mode === 'mod';
    const [fps, setFps] = useState(initial.fps);
    const [fpsChoice, setFpsChoice] = useState<'60' | '30' | 'other'>(
        initial.fps === 60 ? '60' : initial.fps === 30 ? '30' : 'other',
    );
    const [markers, setMarkers] = useState<VodMarker[]>(initial.markers);
    const [dirty, setDirty] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const player = useVodPlayer({ url, fps, factory: playerFactory });
    const ready = player.status === 'ready';

    // Runner mode streams every change up to the form.
    useEffect(() => {
        if (!onChange) return;
        onChange(markers.length ? toPatch(fps, markers) : null);
    }, [fps, markers, onChange]);

    const update = useCallback((next: VodMarker[]) => {
        setMarkers(next);
        setDirty(true);
    }, []);

    const mark = useCallback(
        (kind: VodMarker['kind']) => {
            const frame = player.currentFrameFromPlayer();
            const m: VodMarker = kind === 'note' ? { kind, frame, note: '' } : kind === 'split' ? { kind, frame, label: '' } : { kind, frame };
            update(setMarker(markers, m));
        },
        [markers, player, update],
    );

    const retimed = useMemo(() => retimeMs(markers, fps), [markers, fps]);
    const delta = retimed != null && initial.realTimeMs != null ? retimed - initial.realTimeMs : null;
    const canApply = isMod && retimed != null && initial.timing === 'realtime' && retimed !== initial.realTimeMs;

    // Keyboard, only while focus is inside the workbench but not the iframe.
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!ready) return;
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
        const map: Record<string, () => void> = {
            ',': () => player.stepFrames(-1),
            '.': () => player.stepFrames(1),
            '<': () => player.stepFrames(-10),
            '>': () => player.stepFrames(10),
            ' ': () => player.togglePlay(),
            '[': () => mark('start'),
            ']': () => mark('end'),
            m: () => isMod && mark('note'),
        };
        const fn = map[e.key];
        if (fn) {
            e.preventDefault();
            fn();
        }
    };

    const save = (applyRetimeMs?: number) => {
        if (!isMod || !target || !gameSlug) return;
        setError(null);
        const patch = toPatch(fps, markers);
        startTransition(async () => {
            const res = await saveVodReviewAction(gameSlug, target, patch, applyRetimeMs != null ? { applyRetimeMs } : {});
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setDirty(false);
            toast.success(applyRetimeMs != null ? 'Retime applied.' : 'Markers saved.');
            onSaved?.(patch, applyRetimeMs);
        });
    };

    const changeFps = (choice: '60' | '30' | 'other', value?: number) => {
        setFpsChoice(choice);
        const next = choice === 'other' ? (value ?? fps) : Number(choice);
        if (next > 0 && next <= MAX_FPS) {
            setFps(next);
            if (markers.length) setDirty(true);
        }
    };

    return (
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the workbench is a keyboard surface
        <div className={styles.workbench} tabIndex={0} onKeyDown={onKeyDown} aria-label="VOD review">
            <div className={styles.playerBox}>
                <div ref={player.containerRef} className={styles.player} />
                {player.status === 'unavailable' && <p className={styles.note}>This link can't be frame-stepped here (only YouTube and Twitch VODs can).</p>}
                {player.status === 'error' && <p className={styles.note}>{player.error}</p>}
            </div>

            <div className={styles.transport}>
                <button type="button" disabled={!ready} onClick={() => player.stepSeconds(-1)} title="Back 1 second">−1s</button>
                <button type="button" disabled={!ready} onClick={() => player.stepFrames(-10)} title="Back 10 frames (<)">−10f</button>
                <button type="button" disabled={!ready} onClick={() => player.stepFrames(-1)} title="Back 1 frame (,)">−1f</button>
                <button type="button" disabled={!ready} onClick={player.togglePlay} aria-label={player.playing ? 'Pause' : 'Play'}>{player.playing ? '⏸' : '▶'}</button>
                <button type="button" disabled={!ready} onClick={() => player.stepFrames(1)} title="Forward 1 frame (.)">+1f</button>
                <button type="button" disabled={!ready} onClick={() => player.stepFrames(10)} title="Forward 10 frames (>)">+10f</button>
                <button type="button" disabled={!ready} onClick={() => player.stepSeconds(1)} title="Forward 1 second">+1s</button>
                {player.supportsRate && (
                    <select aria-label="Playback speed" value={player.rate} disabled={!ready} onChange={(e) => player.setRate(Number(e.target.value) as PlaybackRate)}>
                        {PLAYBACK_RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
                    </select>
                )}
                <span className={styles.fps}>
                    <span className={styles.fpsLabel}>fps</span>
                    {FPS_PRESETS.map((p) => (
                        <button key={p} type="button" className={fpsChoice === String(p) ? styles.on : ''} onClick={() => changeFps(String(p) as '60' | '30')}>{p}</button>
                    ))}
                    <button type="button" className={fpsChoice === 'other' ? styles.on : ''} onClick={() => changeFps('other', fps)}>Other</button>
                    {fpsChoice === 'other' && (
                        <input type="number" aria-label="Frames per second" min={1} max={MAX_FPS} step="any" value={fps} onChange={(e) => changeFps('other', Number(e.target.value))} />
                    )}
                </span>
                <span className={styles.cursor} aria-live="polite">
                    frame {player.cursorFrame} · {formatFrameTime(player.cursorFrame, fps)}
                </span>
            </div>

            <div className={styles.markButtons}>
                <button type="button" disabled={!ready} onClick={() => mark('start')}>Set start <kbd>[</kbd></button>
                <button type="button" disabled={!ready} onClick={() => mark('end')}>Set end <kbd>]</kbd></button>
                {isMod && <button type="button" disabled={!ready} onClick={() => mark('split')}>Add split</button>}
                {isMod && <button type="button" disabled={!ready} onClick={() => mark('note')}>Add note <kbd>m</kbd></button>}
                {isMod && initial.runnerMarkers?.length ? (
                    <button type="button" className={styles.secondary} onClick={() => update(initial.runnerMarkers!.reduce((acc, m) => setMarker(acc, m), markers))}>
                        Use runner's markers
                    </button>
                ) : null}
            </div>

            <MarkerRail
                markers={markers}
                ghostMarkers={isMod ? initial.runnerMarkers : undefined}
                fps={fps}
                onSeek={player.seekToFrame}
                onRemove={(i) => update(removeMarkerAt(markers, i))}
                onEditText={(i, text) => update(markers.map((m, j) => (j === i ? (m.kind === 'split' ? { ...m, label: text } : { ...m, note: text }) : m)))}
            />

            {isMod && (
                <>
                    <p className={styles.retimeLine}>
                        {initial.realTimeMs != null ? <>submitted {formatMs(initial.realTimeMs)} · </> : <>submitted time is {initial.timing === 'gametime' ? 'game time' : 'unknown'} · </>}
                        {retimed != null ? <>retimed {formatMs(retimed)}{delta != null && <> ({formatDeltaMs(delta)})</>}</> : <>retimed —</>}
                        {initial.timing === 'gametime' && <span className={styles.note}> Retime is real time; it can't replace a game-time entry.</span>}
                    </p>
                    <p className={styles.hint}>Frames keep their numbers when fps changes. Inside the video, YouTube's own , and . also step a frame — Set start/end read the player's clock either way.</p>
                    {error && <p className="text-danger small mb-0">{error}</p>}
                    <div className={styles.footer}>
                        <button type="button" className="btn btn-primary" disabled={isPending || !dirty} onClick={() => save()}>{isPending ? 'Saving…' : 'Save markers'}</button>
                        <button type="button" className="btn btn-outline-primary" disabled={isPending || !canApply} onClick={() => retimed != null && save(retimed)}>Apply retime</button>
                    </div>
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 5: `vod-review.module.scss`** — use `@use '../../../../styles/design-tokens' as dt;` (mirror `run-inspector.module.scss`'s relative path, one level deeper). Classes: `.workbench` (grid, `gap: dt.$space-3`), `.playerBox`/`.player` (`aspect-ratio: 16/9; width: 100%; background: dt.$surface-2` — the player replaces the div's contents; make sure the iframe fills: `.player :global(iframe) { width: 100%; height: 100%; }`), `.transport` (flex-wrap, small buttons in the drawer's existing button style — reuse `.secondaryBtn` look), `.fps`, `.on` (active preset), `.cursor` (monospace, tabular-nums), `.markButtons`, `.rail`/`.marker`/`.ghost` (opacity .55)/`.kind`/`.kind_start`/`.kind_end`/`.kind_split`/`.kind_note` (chip colours from tokens, no gradients), `.markerTime` (monospace), `.frameNo` (muted), `.markerText`, `.remove`, `.retimeLine` (tabular-nums, larger), `.hint`/`.note` (muted small), `.footer` (flex, gap). Keyboard focus ring on `.workbench:focus-visible`. Read `run-inspector.module.scss` before writing to pick the same tokens.

- [ ] **Step 6: Run tests** → PASS. `npx tsc --noEmit 2>&1 | grep vod-review` → nothing. `npx @biomejs/biome check --write "app/(new-layout)/games-v2/[game]/leaderboard/vod-review"`.

- [ ] **Step 7: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard/vod-review/"
git commit -m "feat(vod-review): workbench — transport, fps, marker rail, retime line, keyboard"
```

---

### Task B6: Mount in the run inspector and the manual inspector

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/run-inspector.tsx` (`EvidenceSection`, :268-478; mount at :883)
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/manual-inspector.tsx` (evidence links block ~:300-325)
- Create: `vod-review/review-vod-panel.tsx` (loads the review, then renders the workbench — keeps both inspectors thin)
- Modify: `run-inspector.module.scss` (one `.reviewToggle` button style, and the change-link hint)
- Test: extend `run-inspector-owner.test.tsx` with one case (owner mode shows no Review VOD button)

**Interfaces:**
- Consumes: `VodReviewWorkbench` (B5), `loadVodReviewAction` (B4), `detectVod` (B2).
- Produces: `ReviewVodPanel({ url, target, gameSlug, onSaved })` — fetches via `loadVodReviewAction`, shows a one-line loading state, then `<VodReviewWorkbench mode="mod" …/>` with `initial` from the response (`fps: vodReview?.fps ?? 60`, `markers: vodReview?.mod?.markers ?? []`, `runnerMarkers: vodReview?.runner?.markers`, `realTimeMs`, `timing`).

- [ ] **Step 1: `review-vod-panel.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { VodReview } from '../../../../../types/leaderboards.types';
import { loadVodReviewAction, type VodReviewTarget } from '../actions/vod-review.action';
import { VodReviewWorkbench } from './vod-review-workbench';
import styles from './vod-review.module.scss';

export function ReviewVodPanel({ url, target, gameSlug, onSaved }: {
    url: string;
    target: VodReviewTarget;
    gameSlug: string;
    onSaved: () => void;
}) {
    const [state, setState] = useState<
        | { status: 'loading' }
        | { status: 'error'; error: string }
        | { status: 'ready'; vodReview: VodReview | null; realTimeMs: number | null; timing: 'realtime' | 'gametime' }
    >({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;
        loadVodReviewAction(target).then((res) => {
            if (cancelled) return;
            setState('error' in res ? { status: 'error', error: res.error } : { status: 'ready', vodReview: res.vodReview, realTimeMs: res.realTimeMs, timing: res.timing });
        });
        return () => {
            cancelled = true;
        };
        // target identity: kind + id
    }, [target.kind, target.kind === 'run' ? target.runId : target.manualTimeId]);

    if (state.status === 'loading') return <p className={styles.note}>Loading markers…</p>;
    if (state.status === 'error') return <p className="text-danger small">{state.error}</p>;
    return (
        <VodReviewWorkbench
            mode="mod"
            url={url}
            target={target}
            gameSlug={gameSlug}
            initial={{
                fps: state.vodReview?.fps ?? 60,
                markers: state.vodReview?.mod?.markers ?? [],
                runnerMarkers: state.vodReview?.runner?.markers,
                realTimeMs: state.realTimeMs,
                timing: state.timing,
            }}
            onSaved={onSaved}
        />
    );
}
```

- [ ] **Step 2: Run inspector — `EvidenceSection`**

Add state `const [reviewing, setReviewing] = useState(false);`. In the "has url" branch (the final `return` at ~:430), when `editable && detectVod(url)`:
- render `<button type="button" className={styles.vodEditBtn} onClick={() => setReviewing((v) => !v)}>{reviewing ? 'Close review' : 'Review VOD'}</button>` in `.vodActions` next to "Change link";
- when `reviewing`, render `<ReviewVodPanel url={url} target={{ kind: 'run', runId }} gameSlug={gameSlug} onSaved={onMutated} />` **instead of** the `<div className={styles.vodFrame}><Vod vod={url} /></div>` embed (the workbench has its own player; two players of the same video in one drawer is a mess). Add the prop `runId` is already there.
- In the change-link form's `.vodHint`, append: " Changing the link clears any saved frame markers."

- [ ] **Step 3: Manual inspector**

In `manual-inspector.tsx`'s evidence links block (~:308), when `entry.vodUrl && detectVod(entry.vodUrl)`, add a `Review VOD` toggle button (same class as its other fact links) and, when open, `<ReviewVodPanel url={entry.vodUrl} target={{ kind: 'manual', manualTimeId, gameId }} gameSlug={gameSlug} onSaved={onMutated} />` under the block. Confirm the component already has `gameId` and `onMutated` in scope (read its props; if `gameId` is missing, thread it from where `ManualInspector` is mounted in `leaderboard-pager.tsx`/`leaderboard-table.tsx` — the run inspector receives `gameId` already).

- [ ] **Step 4: Owner-mode test**

In `run-inspector-owner.test.tsx`, add:

```tsx
it('owner mode has no Review VOD control', async () => {
    renderOwner({ vodUrl: 'https://youtu.be/dQw4w9WgXcQ' }); // use the file's existing render helper + entry factory
    expect(screen.queryByRole('button', { name: /review vod/i })).toBeNull();
});
```
Adapt to the helper names actually in that file.

- [ ] **Step 5: Run the inspector tests + typecheck**

Run: `npx vitest run "app/(new-layout)/games-v2/\[game\]/leaderboard/"` → PASS. `npx tsc --noEmit 2>&1 | grep -E "run-inspector|manual-inspector|vod-review"` → nothing.

- [ ] **Step 6: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard/"
git commit -m "feat(vod-review): Review VOD in the run inspector and manual inspector"
```

---

### Task B7: Runner mode in the submit dialog

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/submit-dialog/step-time.tsx` (disclosure under the Video link field)
- Modify: `app/(new-layout)/games-v2/[game]/submit-dialog/submit-run-dialog.tsx` (state `vodReview`, pass to both create paths, `:300-360` and `:513-530`)
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/actions/manual-times.action.ts` (`createManualTimeAction` passes `vodReview` through — check it forwards the whole input; if it destructures fields, add `vodReview`)
- Modify: `src/actions/self-claim.action.ts` (passes the whole input already — verify)
- Test: extend `submit-dialog/submit-run-dialog.test.tsx` with one case

**Interfaces:**
- Consumes: `VodReviewWorkbench` runner mode (B5), `isEmbeddableVod`/`detectVod` (B2), `VodReviewPatch` (B1).

- [ ] **Step 1: `StepTime` props + disclosure**

Add props: `vodReview: VodReviewPatch | null; onVodReviewChange: (p: VodReviewPatch | null) => void;`. Under the Video link block, when `vodUrl.trim() && !vodInvalid && detectVod(vodUrl.trim())`:

```tsx
<details className={styles.pinFrames}>
    <summary>Pin start and end frames (optional)</summary>
    <p className={styles.hint}>Step to the first and last frame of your run so the moderator can confirm the time faster.</p>
    <VodReviewWorkbench
        mode="runner"
        url={vodUrl.trim()}
        initial={{ fps: vodReview?.fps ?? 60, markers: vodReview?.markers ?? [], realTimeMs: null, timing: 'realtime' }}
        onChange={onVodReviewChange}
    />
</details>
```
Mount the workbench only while the `<details>` is open (track `open` via `onToggle`) so the player script isn't loaded for the 95% who skip it. Add `.pinFrames` to `submit-run-dialog.module.scss` (summary styled like the dialog's hints, cursor pointer).

- [ ] **Step 2: Dialog state + payloads**

`const [vodReview, setVodReview] = useState<VodReviewPatch | null>(null);` — reset to `null` whenever `vodUrl` changes to a different `detectVod` target (add to the `onVodChange` handler: `if (detectVod(v)?.id !== detectVod(vodUrl)?.id) setVodReview(null);`).
In `submit()`: add `vodReview: vodReview ?? undefined,` to both the `createManualTimeAction` input and the `selfClaimTimeAction` input. Only send it when both start and end exist (`vodReview?.markers.some(m => m.kind==='start') && …'end'`); a lone start is not worth storing.

- [ ] **Step 3: Test**

In `submit-run-dialog.test.tsx`, add a case: with a YouTube link typed, the "Pin start and end frames" summary appears; with a Google Drive link it does not. (Rendering the workbench itself needs a player factory; assert only on the summary's presence — the workbench has its own tests.)

- [ ] **Step 4: Run** — `npx vitest run "app/(new-layout)/games-v2/\[game\]/submit-dialog/"` → PASS; typecheck grep clean.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/submit-dialog/" "app/(new-layout)/games-v2/[game]/manage/moderation/shared/actions/manual-times.action.ts" src/actions/self-claim.action.ts
git commit -m "feat(vod-review): runners can pin start/end frames in the submit dialog"
```

---

### Task B8: Browser pass, docs status, push

- [ ] **Step 1: Dev server** — `ps -eo pid,args | grep "next dev" | grep -v grep` (must be empty), then `npm run dev` in the background. Point `.env.local` at the deployed backend that has A1–A3 (or, if the backend branch isn't deployed yet, expect saves to 400 with "unknown field"? — no: unknown body fields are ignored by the manual handlers, and `vodReview` on the run PUT is ignored too, so the UI works but nothing persists; say so in the report).
- [ ] **Step 2: Check, on a board with a YouTube run and a Twitch run** (dark + light, drawer at 38rem and on a narrow viewport):
  1. Review VOD opens the workbench; ±1f steps visibly by one frame at 60 fps on a known 60 fps VOD (10 steps = 10 distinct frames); `,`/`.` work with focus on the workbench; YouTube's own `,`/`.` still work with focus in the iframe and Set start reads that position.
  2. fps 30 / Other 59.94 change the readout, markers keep frame numbers.
  3. Save markers → reopen drawer → markers persist; Apply retime → time changes; history timeline shows the edit with the retime reason.
  4. Change link → hint states markers clear; after changing, review is empty.
  5. Twitch: no speed control; seek works.
  6. Submit dialog: Pin frames appears only for embeddable links; submitting with pins → the run's drawer shows ghost runner markers and "Use runner's markers".
- [ ] **Step 3: Kill the dev server** (by exact pid). `rm -rf .next` if chunk errors appeared.
- [ ] **Step 4: Update the design doc status line** to `BUILT <date> — frontend vod-review (pushed), backend vod-review (pushed, not merged; merge = migration 0096 + deploy). Browser pass: <what was checked>` and commit `docs(vod-review): status`.
- [ ] **Step 5: Push** — `git push -u origin vod-review`. Do not open a PR (Joey opens PRs). Report: branches, what's verified, and that Place splits (phase 1b) is not built.

---

## Self-review notes (done while writing)

- Spec coverage: player adapters (B2), frame stepping/marking/fps (B3, B5), markers + retime + Apply (B5, B4), storage/contract (A1–A3), reads (A2), runner mode (B7), inspector mount (B6), `vodUrl` change clears (A3 + hint in B6), keyboard (B5), tests + browser pass (each task + B8), guide doc (A4). **Place splits (phase 1b)** is intentionally not planned — spec marks it stretch; it needs `finished_runs.run_id → speedrun_runs.historyFilename → history.json` attempt matching, which is a follow-up plan once the resolution is proven.
- Type consistency: `VodReviewPatch { fps, markers, retimedMs? }` is the wire shape everywhere (A1 `parseVodReviewPatch`, B1 type, B4 action, B5 `toPatch`); `VodReviewTarget` is defined once (B4) and consumed by B5/B6; `PlayerFactory` (B2) is what B3/B5 inject.
- Known judgment calls: mod-created manual times store pins in the `mod` block, self-created in `runner`; Apply is disabled for game-time set times; the run inspector swaps the plain embed for the workbench player rather than showing two players.

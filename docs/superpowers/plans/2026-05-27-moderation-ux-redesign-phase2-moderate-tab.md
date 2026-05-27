# Moderation UX Redesign — Phase 2: Moderate Tab + Needs Attention Inbox

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`). No test framework — verify with `npm run typecheck` + `npm run lint` + `npm run build` and rigorous static data-flow tracing. Commits authorized this session; never add a Co-Authored-By line. Branch: `moderation-ux-redesign`.

**Goal:** Replace the moderation hub + the separate queue/reports pages with **one tabbed page** (`Moderate` | `Configure`) whose Moderate tab is a single prioritized **"Needs Attention"** inbox that merges flags + reports + appeals + pending self-claims into one list, deduped per run and grouped per runner, acted on with the Phase 1 `RunActionDialog`.

**Architecture:** The route `app/(new-layout)/games-v2/[game]/manage/moderation/page.tsx` becomes the tabbed shell (server component: gate + parallel data load). A pure merge module turns the three backend sources into a sorted `AttentionItem[]`. A client `NeedsAttention` component renders the list (per-runner grouping, per-run multi-source dedupe) and wires each item's actions to `RunActionDialog` (runs verbs) or a manual-time verdict (self-claims with no finished_run). The Configure tab in this phase only links to the still-existing policies/rules/log pages (Phase 4 replaces its contents), gated to board-admins.

**Tech Stack:** Next.js 16 App Router, React 19, TS, Bootstrap, react-toastify, CASL. Reuses Phase 1 `RunActionDialog` + `action-model.ts`.

**Spec:** `docs/superpowers/specs/2026-05-27-moderation-ux-redesign-design.md` §5 (one surface), §6 (merged inbox), §12 (Configure gated to board-admin).

**Prerequisite:** Phase 1 merged (provides `RunActionDialog`, `RunActionTarget`, `ModVerb`). Confirm `app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog.tsx` exists before starting.

---

## Context the implementer needs

**The three inbox sources (all already loaded for counts in the current `page.tsx`):**
- `listQueue(sessionId, gameId, { limit })` → `QueueItem[]`. Each `QueueItem`: `{ flagId: number|null, reason: FlagReason, severity: FlagSeverity, details, run: QueueItemRun, suggestedAction, createdAt }`. `QueueItemRun` has `runId, userId, runnerName, categoryId, categoryName, subcategoryKey, timeMs, gameTimeMs, vodUrl, verificationStatus, endedAt`. `FlagReason` already includes `'reported' | 'appeal' | 'pending_self_claim'` plus system flags (`impossible`, `pb_jump`, `missing_vod`, `fresh_account_top_n`, `below_minimum`, …).
- `listGameReports(sessionId, gameId)` → `ModReportRow[]`: `{ id, runId, reporterUserId, reason, createdAt, resolvedAt, resolution, reporterName, runnerName, runnerUserId, gameId, categoryId, subcategoryKey, timeMs }`.
- `listManualTimes(sessionId, gameId)` → `ManualTimeRow[]`: filter `verificationStatus === 'pending'` for self-claims. `{ id, userId, guestName, runnerName, categoryId, subcategoryKey, timing, timeMs, evidenceUrl, verificationStatus, source, createdBy, reason, createdAt }`. NB: a manual time has NO `runId` (it isn't a finished_run); a self-claim is `source === 'self'`.

**Why merge AND dedupe:** the backend queue producer for reports/appeals/self-claims may or may not be live (status doc lists flag producers as "deferred"). So merge all three sources but **dedupe by `runId`**: a run flagged by the system AND reported collapses to one item carrying both sources. Items with no `runId` (manual-time self-claims) are keyed by `manualTimeId` and never dedupe against runs.

**Acting on an item:**
- Item with a `runId` → `RunActionDialog` with `RunActionTarget`. The item has `categoryId`+`categoryName`, so a Ban target is buildable: `{ kind:'runner', runnerId: userId, runnerName, categoryId, categoryDisplay: categoryName, gameDisplay }`. Verbs offered: Approve, Remove…, Restore (only if `verificationStatus==='rejected'`), Ban runner (only if `userId != null`).
- Item that is a self-claim manual time (no `runId`) → NOT `RunActionDialog`. Offer **Verify time / Reject time**, wired to the existing manual-time verdict server action in `shared/actions/manual-times.action.ts` (read it; reuse its verdict action — it wraps `manualTimeVerdict(sessionId, gameId, id, { action, reason })`).

**Visual template:** `app/(new-layout)/games-v2/[game]/manage/moderation/queue/queue-view.tsx` is the closest existing rendering — reuse its card layout (severity badge, runner/category/time/VOD line, `moment().fromNow()`, `UserLink`, `DurationToFormatted`) but elevate it per the "Apple-grade" bar: calm spacing, one clear primary action per row, source tags as quiet pills, and a clean empty state ("All clear — nothing needs attention.").

---

## File Structure (Phase 2)

**Create:**
- `app/(new-layout)/games-v2/[game]/manage/moderation/attention/attention-model.ts` — pure: `AttentionItem`, `AttentionSource`, `mergeAttention(queue, reports, claims, ctx)` → sorted+deduped `AttentionItem[]`, `groupByRunner(items)`. No React/fetch.
- `app/(new-layout)/games-v2/[game]/manage/moderation/moderation-tabs.tsx` — client tab shell (`Moderate` | `Configure`), tab state via `?tab=` query or local state; renders `NeedsAttention` and the Configure placeholder.
- `app/(new-layout)/games-v2/[game]/manage/moderation/attention/needs-attention.tsx` — client: the inbox list (filters by source + category), per-runner grouping, per-item action routing to `RunActionDialog` / manual-time verdict.
- `app/(new-layout)/games-v2/[game]/manage/moderation/attention/manual-time-verdict-row.tsx` — small client control for self-claim Verify/Reject (or fold into needs-attention.tsx if it stays small).

**Modify:**
- `app/(new-layout)/games-v2/[game]/manage/moderation/page.tsx` — keep gate + parallel load of the 3 sources; compute `AttentionItem[]` via `mergeAttention`; resolve whether the viewer is a board-admin (for Configure gating); render `ModerationTabs` instead of `ModerationHub`.

**Do NOT delete yet:** `moderation-hub.tsx`, `queue/`, `reports/` (and their views) stay on disk this phase — they're removed in Phase 5 once nothing routes to them. The new page simply stops rendering `ModerationHub`. (Keeps the app whole; old deep-link routes still resolve until Phase 5.)

---

## Task 1: The attention merge model

**Files:** Create `attention/attention-model.ts`

- [ ] **Step 1: Define the types + merge.** Implement exactly this shape (fill the mapping bodies):

```typescript
import type {
    FlagSeverity,
    ManualTimeRow,
    ModReportRow,
    QueueItem,
} from '../../../../../../../types/moderation.types';

export type AttentionSource = 'flag' | 'report' | 'appeal' | 'self_claim';

export interface AttentionItem {
    key: string;
    sources: AttentionSource[]; // one row may carry several
    severity: FlagSeverity;     // max across sources
    createdAt: string;          // earliest across sources (oldest wins for "deal with first")
    // run identity (null for a pure manual-time self-claim):
    runId: number | null;
    manualTimeId: number | null;
    runnerName: string;
    userId: number | null;
    categoryId: number | null;
    categoryName: string;
    subcategoryKey: string;
    timeMs: number;
    gameTimeMs: number | null;
    vodUrl: string | null;
    verificationStatus: string | null;
    note: string | null;        // report/appeal reason, or a short flag detail
}

const SEV_RANK: Record<FlagSeverity, number> = { high: 3, medium: 2, low: 1 };
export function maxSeverity(a: FlagSeverity, b: FlagSeverity): FlagSeverity {
    return SEV_RANK[a] >= SEV_RANK[b] ? a : b;
}

/** Map a queue flag reason to a coarse source bucket. */
function sourceForFlag(reason: string): AttentionSource {
    if (reason === 'reported') return 'report';
    if (reason === 'appeal') return 'appeal';
    if (reason === 'pending_self_claim') return 'self_claim';
    return 'flag';
}

export interface CategoryNameLookup {
    (categoryId: number): string;
}

/**
 * Merge the three backend streams into one prioritized list.
 * Dedupe by runId (a run flagged + reported = one row, both sources).
 * Manual-time self-claims (no runId) key by manualTimeId and never dedupe vs runs.
 * Sort: severity desc, then createdAt asc (oldest first within a severity).
 */
export function mergeAttention(
    queue: QueueItem[],
    reports: ModReportRow[],
    pendingClaims: ManualTimeRow[],
    categoryName: CategoryNameLookup,
): AttentionItem[] {
    const byRun = new Map<number, AttentionItem>();
    const standalone: AttentionItem[] = [];

    const fold = (runId: number | null, next: AttentionItem) => {
        if (runId == null) {
            standalone.push(next);
            return;
        }
        const prev = byRun.get(runId);
        if (!prev) {
            byRun.set(runId, next);
            return;
        }
        prev.sources = Array.from(new Set([...prev.sources, ...next.sources]));
        prev.severity = maxSeverity(prev.severity, next.severity);
        if (next.createdAt < prev.createdAt) prev.createdAt = next.createdAt;
        prev.note = prev.note ?? next.note;
        prev.vodUrl = prev.vodUrl ?? next.vodUrl;
    };

    for (const q of queue) {
        const src = sourceForFlag(String(q.reason));
        fold(q.run.runId, {
            key: `run:${q.run.runId}`,
            sources: [src],
            severity: q.severity,
            createdAt: q.createdAt,
            runId: q.run.runId,
            manualTimeId: null,
            runnerName: q.run.runnerName,
            userId: q.run.userId,
            categoryId: q.run.categoryId,
            categoryName: q.run.categoryName,
            subcategoryKey: q.run.subcategoryKey,
            timeMs: q.run.timeMs,
            gameTimeMs: q.run.gameTimeMs,
            vodUrl: q.run.vodUrl,
            verificationStatus: q.run.verificationStatus,
            note: q.reason === 'reported' ? null : shortDetail(q.details),
        });
    }
    for (const r of reports) {
        fold(r.runId, {
            key: `run:${r.runId}`,
            sources: ['report'],
            severity: 'medium',
            createdAt: r.createdAt,
            runId: r.runId,
            manualTimeId: null,
            runnerName: r.runnerName,
            userId: r.runnerUserId,
            categoryId: r.categoryId,
            categoryName: categoryName(r.categoryId),
            subcategoryKey: r.subcategoryKey,
            timeMs: r.timeMs,
            gameTimeMs: null,
            vodUrl: null,
            verificationStatus: null,
            note: r.reason,
        });
    }
    for (const m of pendingClaims) {
        // self-claims = source 'self'; mod-added pendings aren't a triage item.
        if (m.source !== 'self') continue;
        standalone.push({
            key: `mt:${m.id}`,
            sources: ['self_claim'],
            severity: 'low',
            createdAt: m.createdAt,
            runId: null,
            manualTimeId: m.id,
            runnerName: m.runnerName,
            userId: m.userId,
            categoryId: m.categoryId,
            categoryName: categoryName(m.categoryId),
            subcategoryKey: m.subcategoryKey,
            timeMs: m.timeMs,
            gameTimeMs: null,
            vodUrl: m.evidenceUrl,
            verificationStatus: m.verificationStatus,
            note: m.reason || null,
        });
    }

    const all = [...byRun.values(), ...standalone];
    all.sort(
        (a, b) =>
            SEV_RANK[b.severity] - SEV_RANK[a.severity] ||
            a.createdAt.localeCompare(b.createdAt),
    );
    return all;
}

function shortDetail(details: Record<string, unknown>): string | null {
    const entries = Object.entries(details ?? {});
    if (entries.length === 0) return null;
    return entries
        .slice(0, 2)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
        .join(' · ');
}

/** Group consecutive items by non-null userId for the "this runner has many" case. */
export interface RunnerGroup {
    userId: number | null;
    runnerName: string;
    items: AttentionItem[];
}
export function groupByRunner(items: AttentionItem[]): RunnerGroup[] {
    const groups = new Map<string, RunnerGroup>();
    const order: string[] = [];
    for (const it of items) {
        const gkey = it.userId != null ? `u:${it.userId}` : `g:${it.key}`;
        let g = groups.get(gkey);
        if (!g) {
            g = { userId: it.userId, runnerName: it.runnerName, items: [] };
            groups.set(gkey, g);
            order.push(gkey);
        }
        g.items.push(it);
    }
    // Preserve priority order: a group's position = its first (highest-priority) item.
    return order.map((k) => groups.get(k) as RunnerGroup);
}
```

- [ ] **Step 2:** `npm run typecheck` — fix import depth (`../../../../../../../types/...` matches existing files at this nesting; verify the count). Commit: `feat(moderation): attention merge model`.

---

## Task 2: The tab shell

**Files:** Create `moderation-tabs.tsx`; modify `page.tsx`.

- [ ] **Step 1:** Build `ModerationTabs` (client). Bootstrap `nav nav-tabs`. Two tabs: **Moderate** (default) renders `<NeedsAttention …/>`; **Configure** renders, only when `canConfigure` (board-admin), a simple section linking to the existing `…/policies`, `…/rules`, `…/log` (these become embedded in Phase 4). When `!canConfigure`, hide the Configure tab entirely. Header: `Moderation — {gameDisplay}` + a "Back to leaderboards" link (match `moderation-hub.tsx`). Props:

```tsx
interface Props {
    gameSlug: string;
    gameDisplay: string;
    canConfigure: boolean;
    items: AttentionItem[];
    categories: Array<{ id: number; display: string }>;
}
```

- [ ] **Step 2:** Rewrite `page.tsx` to: gate (unchanged), `Promise.all` the 3 sources (`listQueue` limit 200, `listGameReports`, `listManualTimes`) + `resolveCategory(game.id)` (unchanged pattern, keep the `.catch(() => null)` resilience but coerce nulls to `[]` before merge), build a `categoryName` lookup from the resolved categories, call `mergeAttention(...)`, compute `canConfigure` via the RBAC ability (board-admin: reuse `defineAbilityFor(session)` — check for a board-admin-level grant; if no distinct check exists, gate on `can('manage','all')` OR a `board-admin` role on the session — read `src/rbac/ability.ts` to pick the correct predicate, and if none cleanly expresses "board-admin", gate Configure on the same `canModerateGame` for now and leave a `// TODO Phase 4: tighten to board-admin` note). Render `<ModerationTabs … />`.

- [ ] **Step 3:** `npm run typecheck && npm run lint && npm run build`. Commit: `feat(moderation): tabbed moderation page shell`.

---

## Task 3: The Needs Attention inbox

**Files:** Create `attention/needs-attention.tsx` (+ optional `manual-time-verdict-row.tsx`).

- [ ] **Step 1:** Build `NeedsAttention` (client). State: `items` (seed from props), `sourceFilter` ('all'|AttentionSource), `categoryFilter` ('any'|number), and the active `RunActionDialog` invocation `{ verb, item }` or active manual-time verdict. Use `groupByRunner(filtered)` to render:
  - **Single-item group →** one card (template: `queue-view.tsx` `QueueCard`, elevated). Source pills (⚙ flag · 🚩 reported · ⚖ appeal · ✋ self-claim). Primary action chosen by the most-severe source's `suggestedAction` if available, else Approve. Action buttons: **Approve**, **Remove…**, **Restore** (if `verificationStatus==='rejected'`), **Ban runner…** (if `userId != null`). All open `RunActionDialog` with the right `verb` + target. For a self-claim item (`runId == null`): show **Verify time / Reject time** instead, wired to the manual-time verdict action.
  - **Multi-item group (same runner, >1 item) →** an expandable card. Header row: runner name + count ("speedyZ — 7 items needing attention") + group actions **Ban runner…** (RunActionDialog ban, category from the first item) and **Remove all** (RunActionDialog remove with `kind:'runs'`, `runIds` = all the group's items' runIds that are non-null). Expanded: the per-item rows.
  - Acting **optimistically removes** the affected item(s) from local `items` on success (mirror `queue-view`'s `removeByKey`); `RunActionDialog.onDone` → drop the item(s) + close.
- [ ] **Step 2:** Filters bar (source dropdown + category dropdown) above the list; empty state "All clear — nothing needs attention." Keep it calm and uncluttered.
- [ ] **Step 3:** `npm run typecheck && npm run lint && npm run build`. Manual reasoning check: trace that every action's target is built with real fields and that removal updates the list. Commit: `feat(moderation): Needs Attention inbox`.

---

## Task 4: Wire `page.tsx` end-to-end + verify

- [ ] **Step 1:** Confirm the `Moderate` button (`header/game-header.tsx`) still points at `…/manage/moderation` (it does) — no change needed; the route now renders tabs.
- [ ] **Step 2:** `npm run build` clean. Update `MODERATION_FRONTEND_STATUS.md` "UX redesign" section with a Phase 2 line. Commit: `docs(moderation): record Phase 2 (Moderate tab + inbox) landed`.

---

## Self-Review checklist (run after Task 4)
- Spec §6 inbox: merged sources ✓, source tags ✓, multi-source dedupe ✓ (by runId), multi-runner grouping ✓, acts via RunActionDialog ✓, filters source+category ✓, count badge — the Moderate button badge is added in Phase 5 cleanup or here if trivial.
- Spec §5: one surface (tabs) ✓. §12: Configure gated to board-admin (best-effort this phase; tightened in Phase 4).
- No double-counting when the backend queue already includes reports/claims (dedupe by runId handles it).
- Self-claims with no finished_run use manual-time verdict, not RunActionDialog.
- Types/fields all confirmed against `types/moderation.types.ts`.

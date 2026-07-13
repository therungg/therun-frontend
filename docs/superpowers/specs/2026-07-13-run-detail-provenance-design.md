# Run Detail Page + Provenance — Design

**Date:** 2026-07-13
**Status:** Implemented on branch run-detail-provenance (both repos); final whole-branch review passed with fixes applied (2026-07-14). Pending Joey's merge + backend migration 0070 + deploy.
**Scope:** Frontend (`therun-fr`) + backend (`../therun`) — backend access granted for this task.

---

## 1. Goal

A public, shareable detail page for every leaderboard entry, with a **provenance view** answering "how did this run get on the board?" — ingestion path, who submitted it (when not the runner), original game/category before reassignment, identity merges. Public visitors get a summary; game moderators get the full chain. This exists because therun.gg has multiple ingestion paths (timer sync, guest submit, manual times, reassignment moves, identity merges) where speedrun.com has one.

Decisions already made with Joey:

- Run detail + provenance is the first Tier 0 spec (before submission form, profiles, launch).
- **Public summary, mod full detail.**
- Launch un-gating (separate spec) will be all-at-once. Decision at implementation (2026-07-14): the run/manual detail pages carry NO gate of their own and are reachable pre-launch by direct URL — the underlying API data is public regardless, and the only links to them live on admin-gated board pages. The launch flip needs no changes here.

## 2. Ground truth (verified in both repos, 2026-07-13)

### Ingestion paths — exactly what exists

| Path | Table | Markers | Provenance already stored |
|---|---|---|---|
| LiveSplit sync | `finished_runs` | `isGuest=false`, `runId` NOT NULL, `submittedBy` NULL | `userId`, `runId`→`speedrun_runs`, `startedAt/endedAt`, `platform`, `emulator`, `rawVariables` |
| Guest submit (`POST /leaderboards/submit`, mod-auth) | `finished_runs` | `isGuest=true`, `runId` NULL, `submittedBy`=mod | `submittedBy`, `verifiedBy/At` (auto-verified), `vodUrl` |
| Manual time (mod or self) | `manual_times` (separate table, merged into boards at read time) | board entry has `source:'manual'`, `manualTimeId` | `source` (`mod\|self\|system`), `createdBy`, `reason`, `evidenceUrl`, `verificationStatus`, `createdAt` |
| Reassignment move | in-place UPDATE of `finished_runs.gameId/categoryId` | — | `run_reassignment_history` (per-run: from/to game+category, `movedAt`, `undoneAt`; indexed on `run_id`) join `game_/category_reassignments` (`performedBy`, `performedAt`) |
| Identity merge (`move-user`, guest claim) | in-place UPDATE of `userId/username/runnerName` | — | **Nothing. Unaudited; prior guest name destroyed. Unrecoverable for past merges.** |

Verification actor: `finished_runs.verifiedBy/verifiedAt` (latest) + full timeline in `logs` (`action='verdict_*'`). Manual-time verdict actors are in `logs` only.

### Existing endpoints

- `GET /v1/leaderboards/runs/{runId}` (`src/api/leaderboards/handler.ts:111`) — public. Returns the current `RunDetail`; omits `submittedBy`, `verifiedBy/At`, `rejectionReason`, `modNote`, `ineligibleReason`, `runId`→speedrun link — all on the row already.
- `GET /v1/runs/{runId}/history` (`src/leaderboards/run-history.ts:41`) — **public**, reads `logs`. Two bugs: appeals are logged with `entity='run_flag'` but the query only selects `finished_run|run_report|manual_time` (appeals never appear); the `manual_time AND data->>'runId'` branch matches nothing (manual-time logs carry no `runId`).
- Manual times: mod CRUD + `/v1/me/manual-times` only. **No public read for a single manual time** — board entries with `source:'manual'` have no detail page target today.
- `logs` has no index on `(entity, target)` — per-run history is a filtered scan.

### Frontend

- Mod run page exists: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/` — thin (`RunDetail` + action card). Board rows do not currently link to any run page.
- `canModerate` (`src/lib/moderation/can-moderate.ts`) is the single mod gate; `modFetch` prepends `/mod`.

## 3. Backend changes (`../therun`)

### 3a. Extend `RunDetail` (pure read + user-name joins, no schema change)

`GET /v1/leaderboards/runs/{runId}` additionally returns:

```typescript
{
  // ...existing fields...
  origin: {
    path: 'timer' | 'guest_submit';        // derived: runId NOT NULL → timer; isGuest+submittedBy → guest_submit
    submittedBy: { userId: number; name: string } | null;   // when ≠ runner (guest submits)
    speedrunRunId: string | null;          // timer path: link target for splits
    ingestedAt: string | null;             // new created_at column; null for historical rows
  };
  verifiedBy: { userId: number; name: string } | null;      // display name joined from users
  verifiedAt: string | null;
  rejectionReason: string | null;          // runner-visible per moderation vision §8
}
```

Derivation is unambiguous for the two existing paths; when the future submission form adds a third, it sets the `source` column (3d) rather than growing the inference.

### 3b. New public manual-time detail

`GET /v1/leaderboards/manual-times/{id}` — public, mirrors `RunDetail` shape (`runId: null`, `manualTimeId`, `timing`, `timeMs`, `evidenceUrl` as the vod slot) with:

```typescript
origin: {
  path: 'manual_mod' | 'manual_self';
  submittedBy: { userId, name } | null;   // populated when source='self' (it's the runner) — mod names stay mod-side
  ingestedAt: string;                      // manual_times.createdAt
}
```

Public copy for `manual_mod`: "Time asserted by a moderator." The mod's name and `reason` appear only in the mod provenance (3c). Rejected/pending status is returned as-is (`verificationStatus`).

### 3c. New mod provenance endpoint

Two routes sharing one handler, gated like the rest of `/mod` (`verify-reject-run` on the game):

- `GET /mod/leaderboards/games/{gameId}/runs/{runId}/provenance`
- `GET /mod/leaderboards/games/{gameId}/manual-times/{manualTimeId}/provenance` (no `reassignments`/`identity` — manual times never move today; arrays return empty)

```typescript
{
  ingest: {
    path: 'timer' | 'guest_submit' | 'manual_mod' | 'manual_self';
    submittedBy: { userId, name } | null;
    createdBy:   { userId, name } | null;  // manual times
    reason: string | null;                 // manual times
    ingestedAt: string | null;
    speedrunRunId: string | null;
    platform: string | null; emulator: boolean | null;
    rawVariables: Record<string, string> | null;
  };
  reassignments: Array<{                   // run_reassignment_history joined to parents, movedAt ASC
    kind: 'game' | 'category';
    reassignmentId: number;                // the batch identity — there is no separate batchId
    from: { gameId, gameName, categoryId, categoryName };
    to:   { gameId, gameName, categoryId, categoryName };
    movedAt: string; undoneAt: string | null;
    performedBy: { userId, name };
  }>;
  identity: Array<{                        // from new run_identity_history (3e); empty for pre-existing merges
    fromGuestName: string | null; fromUserId: number | null;
    to: { userId, name };
    mergedAt: string; performedBy: { userId, name } | null;
  }>;
  moderation: {                            // mod-only row fields
    modNote: string | null; ineligibleReason: string | null;
    excluded: boolean; verifyQueueHidden: boolean;
  };
}
```

### 3d. Schema: ingest timestamp + source (forward-only)

- `finished_runs.created_at timestamptz DEFAULT now()` — NULL for historical rows (no backfill: sync rows' ingest time is unknowable; approximating from `endedAt` would be silently wrong for guest submits, which already clobber `endedAt` with submit time). UI renders "unknown" when null.
- `finished_runs.source varchar` — set by each insert site going forward (`timer`, `guest_submit`; the submission form will add `submission`). Read path prefers `source`, falls back to marker derivation.
- Out of scope, noted: guest submit should collect a real run date instead of writing `endedAt = now()` — belongs to the submission-form spec.

### 3e. Schema: identity-merge audit (forward-only)

New table `run_identity_history`, mirroring `run_reassignment_history`: `run_id text`, `from_guest_name`, `from_user_id`, `to_user_id`, `merged_at`, `performed_by`, indexed on `run_id`. Written by `carryGuestClaimOverrides` / `moveUser` per moved run. Past merges are unrecoverable — the provenance UI says nothing rather than guessing.

### 3f. Fixes rolled in

- History query: include `entity='run_flag'` so appeals appear; drop the dead `manual_time AND data->>'runId'` branch.
- Index `logs (entity, target)`.

## 4. Frontend changes (`therun-fr`)

### Routes

- `app/(new-layout)/games-v2/[game]/run/[runId]/` — public run page.
- `app/(new-layout)/games-v2/[game]/manual/[manualTimeId]/` — same component, manual-time source.
- `manage/run/[runId]` becomes a thin wrapper over the shared view with the mod layer always on (keeps existing bookmarks; the action card stays).
- Board rows (`leaderboard-row.tsx`) and the WR card link every entry to its page — `runId` → `run/`, `source:'manual'` → `manual/`. No dead ends.

### Shared `RunView` component

Sections, top to bottom:

1. **Header** — game art (3:4), category + subcategory pills, runner (link to profile), current rank, RT/GT times, run date, verification badge with verifier name (public — community norm).
2. **Video** — YouTube/Twitch embed parsed from `vodUrl`/`evidenceUrl`; plain external link fallback; empty state when absent.
3. **Origin panel (public summary)** — one sentence + metadata per path:
   - timer: "Auto-tracked from a LiveSplit upload · ingested `<date|unknown>`" + **"View splits & attempt stats"** linking to the runner's profile game page (requires `userId`; hidden for guests).
   - guest_submit: "Submitted on behalf of `<runnerName>` by `<submittedBy.name>`".
   - manual_self: "Self-claimed by the runner" (+ "unverified" chip while pending).
   - manual_mod: "Time asserted by a moderator".
4. **Verification history** — public `/v1/runs/{runId}/history` rendered as a timeline (runner-visible slice: verdicts with reasons, appeals). Hidden for manual entries (no run history endpoint) — their status chip covers it.
5. **Actions** — report (exists), appeal (own runs, exists), copy-link share.
6. **Mod layer** (rendered when `canModerate(game)`) — full provenance timeline from 3c merged chronologically: ingest → reassignment moves ("originally on *Game X / Category Y*, moved `<date>` by `<mod>`", undone moves struck through) → identity merges → moderation fields (modNote, ineligibleReason, excluded). Reuses the existing run action model (approve/remove/restore/ban) from `moderation/shared/`.

### Behavior

- **Degrade gracefully** (same pattern as the moderation build): missing `origin` → hide origin panel; provenance 404/501 → mod layer shows moderation fields only; `ingestedAt` null → "unknown".
- **Caching:** `'use cache'` + `cacheLife('minutes')`, tags `run-detail:{runId}` / `manual-detail:{id}`; mod actions revalidate via the existing `revalidate-boards.ts` hook extended with these tags. History fetch stays uncached (it must reflect verdicts immediately).
- **SEO:** `generateMetadata` — title "`<time>` by `<runner>` — `<game>` `<category>`", description with rank + date. OG images are Tier 3, not here.
- **404s:** unknown id, or run's `gameId` doesn't match the slug → `notFound()` (matches `manage/run` behavior). Rejected/excluded runs still render (they're linkable from history/notifications) with their status shown — a rejected run's page is part of transparency, not a leak, since rejection status is already public on the endpoint.

### Testing

- Unit: origin-path derivation fallback, vod URL → embed parsing (YouTube/Twitch/invalid), provenance timeline merge ordering.
- Integration: page renders for each of the four origin shapes with mocked API; mod layer visibility via `canModerate` true/false; manual-time page for pending/verified/rejected.
- Manual pass (Joey): real runs from each path, one reassigned run, board-row links.

## 5. Out of scope

Comments, OG share images, splits *embedding* (link only), the submission form (next Tier 0 spec), guest-submit run-date fix (noted in 3d), backfilling historical ingest times or pre-existing identity merges (impossible).

## 6. Build order

1. Backend 3a/3b/3f (pure reads + fixes) → frontend public page + links.
2. Backend 3c (mod provenance) → frontend mod layer.
3. Backend 3d/3e (columns + identity audit) — provenance gets richer as data accrues.

Frontend never blocks on 3d/3e; it renders what the API gives it.

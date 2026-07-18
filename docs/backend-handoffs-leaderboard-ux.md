# Backend handoffs — leaderboard UX fixes branch

Collected from the `leaderboard-ux-fixes` frontend work (2026-07-17/18). Each item is a
backend change the frontend already degrades gracefully without, but that would unlock a
better version of a shipped feature. Frontend call sites are noted so the wiring is a
small diff once the API exists.

## 1. `categorySlug` on RunDetail / ManualTimeDetail

The run view and run badges can only humanize subcategory keys via the generic fallback
(`Pc · Patch 1.0`) because the detail payloads don't carry the category slug needed to
look up variable definitions for display names.

- Wanted: `categorySlug` (or embedded variable defs) on the run detail and manual-time
  detail responses.
- Frontend: `run-view/run-view.tsx`, `run-view/run-badges.tsx` already thread defs when
  available (`labels.ts` helpers).

## 2. Filter-aware rank lookup ("Find me")

"Find me" on the leaderboard scans forward up to 10 pages because
`getUserRankingsByName` ignores board filters (variables, verified-only).

- Wanted: a rank-lookup endpoint that accepts the same filter set as the page list and
  returns the user's rank/page under those filters.
- Frontend: `leaderboard/leaderboard-pager.tsx` (bidirectional scan becomes a direct jump).

## 3. Unverify verb (inverse of approve)

Approve has no undo because no back-to-pending/unverify endpoint exists. Remove/restore
and rule-creating bans have working undo.

- Wanted: an `unverify` (verified → pending) verdict action, audit-logged like the rest.
- Frontend: `manage/moderation/shared/run-action-dialog.tsx` undo-toast wiring is already
  generic (`hasTrueInverse` in `action-model.ts` — flip approve to true and add the call).

## 4. Runner trust summary on moderation list rows

Attention cards render no runner context because queue/report/manual-time rows carry no
trust fields. Note: `evaluateTrust` (backend `src/rbac/self-service-trust.ts`) only does
an existence check, so counts need new queries; `accountCreatedAt` is a trivial expose
(`users.createdAt` is already queried there).

- Wanted per list row: `verifiedCount`, `rejectedCount`, `accountCreatedAt`.
- Frontend: `manage/moderation/attention/attention-model.ts` `groupByRunner` +
  `needs-attention.tsx` `RunnerGroupCard` (render spots documented in comments).
- Related: `BoardClaimSignals` (`types/board-claims.types.ts`) already models
  `accountCreatedAt/priorApprovals/priorDenials/runsOnGame/totalRuns` but is wired
  nowhere — consider reusing that shape.

## Round 2

### 5. Numeric session userId for id-based own-run checks (W11)

Own-run/current-user checks (`isCurrentUser`, find-me, `isOwn`, `isOwnRun`) compare
`sessionUsername` against `entry.runnerName`/`model.runnerName` by string. The frontend
now compares case-insensitively (`isSameRunner`), but a name-based comparison is still
fragile long-term — `LeaderboardEntry.userId` already exists and would let these checks
compare stable numeric ids instead.

- Wanted: a numeric `userId` on the session (alongside `sessionUsername`) so id-based
  checks are possible.
- Frontend: `shared/is-same-runner.ts`, and its call sites in
  `leaderboard/leaderboard-table.tsx`, `leaderboard/leaderboard-pager.tsx`,
  `leaderboard/row-actions-menu.tsx`, `run-view/run-actions.tsx`.

### 6. Notification payload field guarantees (W4)

The notifications bell can only link a row to its subject, and only names the game/category
in the copy, when the payload happens to carry `gameSlug`/`gameDisplay`/`categoryDisplay`.
Checked against the actual `emitNotification` call sites in `../therun` (2026-07-18):

- `verdict_applied` (`src/leaderboards/verdicts/bulk-verdicts.ts`) emits
  `{ gameId, categoryId, runId, action }` — no `gameSlug`, `gameDisplay`, or
  `categoryDisplay`. Today this notification **never links** and never gets the enriched
  "Your Any% run of Celeste was rejected" copy; it silently falls back to the generic
  "One of your runs was rejected by a moderator."
- `manual_time_created` / `manual_time_verdict` (`src/api/leaderboards/mod-manual-times-handler.ts`)
  emit `{ gameId, categoryId, manualTimeId, ... }` — same gap, no slug/display names.
- `manual_time_deleted` emits `{ gameId, categoryId, timeMs }` — no `manualTimeId` at all,
  so it can never link even with a slug.
- `board_claim_approved` / `board_claim_denied` (`src/services/board-claims-service.ts`)
  already emit `gameSlug` and `gameDisplay` — these two already link and enrich correctly.

- Wanted: add `gameSlug`, `gameDisplay`, and `categoryDisplay` to the `verdict_applied`,
  `manual_time_created`, `manual_time_verdict`, and `manual_time_deleted` payloads (plus
  `manualTimeId` on the delete emission, if a post-delete detail page is worth linking to).
- Frontend: `src/components/Topbar/notification-copy.ts` (`describe`/`linkFor`) already
  reads these fields opportunistically — typeof-guarded, so nothing to change frontend-side
  once the backend adds them; the links/copy just start appearing.

### 7. Authoritative ties in leaderboard `rank` (W10)

The board's `rank` field doesn't reliably collapse to a shared value when two entries
have the identical primary time — the frontend currently derives its own tie/`=1` display
by comparing consecutive primary times within whatever page window happens to be loaded
client-side, which means a tie that straddles an unloaded page boundary (e.g. rank 25 on
page 1 and rank 26 on page 2, tied but never rendered adjacently) is never marked.

- Wanted: the leaderboard list endpoint assigns a genuinely shared `rank` to entries with
  equal primary times (standard competition ranking — ties share the lower rank, the next
  distinct time skips to `rank + tieCount`), so ties are correct across page boundaries
  without the client needing the full board loaded.
- Frontend: `leaderboard/display-rank.ts` (`computeDisplayRanks`) is the pure windowed
  fallback — call site in `leaderboard/leaderboard-table.tsx`. Once backend ranks are
  authoritative, this can likely simplify to just detecting `entry.rank === prevRank`
  instead of re-deriving group membership from time equality.

### 8. `runId`/`country` on WR history entries (W2)

The WR history drawer's narrative list can't link a past record to its run page or show a
country flag — `WrHistoryEntry` (`types/leaderboards.types.ts`) carries only `runnerName`,
`time`, `timingMethod`, `setAt`, `supersededAt`; no `runId`/`manualTimeId` and no `country`,
unlike `LeaderboardEntry` which has both.

- Wanted: `runId` (or `manualTimeId`) and `country` on each WR history entry, so past records
  can deep-link to their run page and show the runner's flag like the current-record crown
  and the leaderboard rows already do.
- Frontend: `drawers/wr-history-drawer.tsx` renders a plain runner name with no flag and no
  link for every row; `drawers/wr-history-model.ts`'s `WrHistoryRow` has no field to carry
  either through — degrades honestly rather than guessing at a link.

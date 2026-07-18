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

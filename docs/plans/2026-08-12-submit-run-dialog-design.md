# Submit a run — dialog design

**Status:** Implemented 2026-08-12 on branch `submit-run-dialog` (frontend) and
`main` (backend, commits 5c4a831 + fb7d1e8). Not yet browser-verified.

Date: 2026-08-12
Repos: `therun-frontend` (primary), `therun-backend` (one endpoint)

## Summary

"Submit a run" stops being a page and becomes a dialog on the game page. It has
three steps; the middle one is moderator-only and chooses *who* the run is for.
Everything submitted — by a runner for themselves or by a mod for someone else —
lands as a **manual time**. The two roles differ only in attribution.

## Why one write path

Today there are two: `submitRunAction` (a real `finished_runs` submission with
RT + GT, `vodUrl`, verification warnings) and `selfClaimTimeAction` (a manual
time: one timing, `evidenceUrl`, optional date). They are presented as two modes
in a switch at the top of the submit form, and the distinction does not survive
contact with what people actually use them for.

Collapsing onto manual times means:

- Mods already have the "for someone else" path (`createManualTime`,
  `RunnerRef = {userId} | {guestName}`), so nothing new is needed to attribute a
  run.
- Self-submission loses dual RT + GT entry — one timing per submission. A runner
  who wants both submits twice.
- `requireVideo` is unaffected: it is stored on categories but never enforced on
  write on *either* path today.
- Submit warnings and the instant-vs-pending distinction survive; both live on
  the manual-time result.

Write targets by role, both existing:

| Who | Endpoint | Frontend |
|---|---|---|
| Runner, for themselves | `POST /v1/me/manual-times` | `selfClaimTimeAction` |
| Mod, for someone else | `POST /v1/leaderboards/games/{gameId}/manual-times` | `createManualTimeAction` |

Mod-created entries carry `reason: 'Added via Submit a run'`.

## Reachability

Six entry points link to `/games-v2/[game]/submit` today: the hero, the
leaderboard empty state, the category card, run-view, run-actions, and setup
step 4. They all go through `buildSubmitHref`.

`buildSubmitHref` changes to return the **board href plus `?submit=1`**, keeping
the `category` / subcategory params it already builds and dropping `mode`
(there are no modes now). All six call sites keep working unchanged. The game
page reads `?submit=1` and opens the dialog. `/games-v2/[game]/submit` becomes a
redirect to that URL so external links and bookmarks survive.

Deleted: `submit/submit-form.tsx`, `submit/run-fields.tsx`,
`submit/claim-fields.tsx`, the mode switch and its hint copy, and
`src/actions/submit-run.action.ts`.

Built on the existing `shared/board-dialog.tsx` primitive.

## Step 1 — Board

- Category select, grouped, reusing today's `renderCategoryOptions`.
- Subcategory selects driven by `loadVariablesAction` for the chosen category.
- Rules disclosure (`RulesPanel` / `RulesBody`) stays — it is the contract the
  runner is agreeing to, game rules above category rules, same as the board.
- An invalid subcategory combination blocks Next, with today's message.

**Defaults.** The dialog opens on whatever board the button was clicked from:
category and subcategory prefilled from the `?category=…` / variable params
`buildSubmitHref` carries. With no context — the overview hero, setup — it falls
back to the first category and each variable's default value.

Next is enabled once the category and every subcategory are chosen and the
combination is valid.

## Step 2 — Runner (moderators only)

Shown only when the viewer moderates this game (`can-moderate.ts`). Non-mods
never see it; the runner is implicitly themselves and the dialog goes straight
from step 1 to step 3.

A search field using the topbar's `search-input` + results panel, users only.
Selecting a result, or confirming a typed name, calls the runner-entries lookup
(below) scoped to this game.

Three outcomes:

1. **Account found, has an entry on the selected board.**
   "Kirbymastah already has a run on this board — 35:48 (#3)." with a link to
   that entry and a control to pick someone else. Next is blocked.
2. **Account found, no entry on the selected board.** Next is enabled.
3. **No account found.** An escape line: "No account found. Check the spelling —
   if they don't have one, the run is added under this name and won't be linked
   to a therun account." Confirming the typed name sends `{ guestName }`.
   The same lookup runs for the typed name against existing guest entries, so a
   guest who already has an entry on the selected board blocks Next the same way.

**Other boards in this game.** In all three outcomes, entries the runner already
has on *other* boards of this game are shown as context, not a block:
"Also on this game: Any% NG+ — 35:48 (#3) · 100% — 1:12:04 (#7)". This is what
tells a mod that a typed guest name is probably the same person who already has
times here, before they create a second unlinked identity.

Attribution sent to the create call is `{ userId }` when an account was found
(the lookup returns the id) and `{ guestName }` otherwise. `RunnerRef` needs no
new variant.

## Step 3 — Time

- Timing picker only when the category shows both RT and GT — the rule
  `ClaimFields` uses today. Otherwise the single visible timing is implicit.
- Time, parsed with `parseRunTimeInput` (`h:mm:ss`, `m:ss`, `m:ss.SSS`).
- Date achieved, prefilled with today and clearable. Empty means the entry is
  dated from its `created_at`, matching `manual_times.run_date` semantics.
- VOD URL, optional, validated as http/https, sent as `evidenceUrl`.

Submit routes by role as in the table above. The success panel is today's:
instant-vs-pending status line, a link to the board, and a link to the entry.

## Backend — one endpoint

`getUserRankings` reads only `finished_runs`. `manual_times` is a separate table
merged into boards at read time, so `getUserRankingsByName` cannot answer "does
this runner already have an entry on this board" for exactly the kind of entry
this dialog creates. It also has no concept of a guest name. Hence a new lookup.

```
GET /mod/v1/leaderboards/games/{gameId}/runner-entries?username=…
GET /mod/v1/leaderboards/games/{gameId}/runner-entries?guestName=…

→ {
    userId: number | null,
    entries: RunnerGameEntry[]
  }

RunnerGameEntry = {
    categoryId: number,
    category: string,        // display
    categorySlug: string,
    subcategoryKey: string,
    timeMs: number,
    timing: 'realtime' | 'gametime',
    rank: number | null,
    totalRunners: number,
    source: 'run' | 'manual',
    runId?: number,          // source === 'run'
    manualTimeId?: number,   // source === 'manual'
  }
```

- Rides the `/mod` base path, which is `proxy: true` and strips the prefix. No
  route registration, so it costs none of the `api` stack's remaining CFN
  resources (one slot left).
- Public read, no session. It exposes only board contents, which are public.
- `?username=` resolves case-insensitively against `users.username` with the
  same `anonymized IS NOT TRUE` guard the existing `by-name/rankings` route
  carries, and 404s on an unknown or globally-anonymized name — that 404 is what
  drives outcome 3. `userId` is null on the `?guestName=` form.
- `entries` unions `manual_times` and `finished_runs` for that game, one row per
  (categoryId, subcategoryKey), preferring the category's primary timing where
  both exist. Excluded and non-leaderboard rows are filtered out.

Mirrored into `types/moderation.types.ts` frontend-side; fetcher in
`src/lib/leaderboards-v1.ts` alongside `getUserRankingsByName`, with
`'use cache'` + `cacheLife('minutes')` and a per-(game, runner) `cacheTag`.

## Cache invalidation

Creating an entry already revalidates boards through
`src/lib/moderation/revalidate-boards.ts`. The new runner-entries tag joins that
set, so the dialog's own "already has a run" answer does not go stale after a
submission.

## Open item — resolved

Both route shapes exist (`app/(new-layout)/games-v2/[game]/run/[runId]` and
`.../manual/[manualTimeId]`), so `RunnerGameEntry.source` picks between them:
`'run'` → `/games-v2/{game}/run/{runId}`, `'manual'` →
`/games-v2/{game}/manual/{manualTimeId}`. Implemented in `step-runner.tsx`'s
`entryHref`.

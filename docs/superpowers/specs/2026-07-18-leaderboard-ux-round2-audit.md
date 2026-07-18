# Leaderboard UX Round 2 — Consolidated Audit

Sources: four lens audits on branch `leaderboard-ux-fixes` (tip `96be2f75`) —
`.superpowers/round2/audit-viewer.md` (V1–V14), `audit-runner.md` (R1–R12),
`audit-moderator.md` (M1–M13), `audit-craft-ia.md` (C1–C14) — plus the round-1
ledger's deferred round-2 candidates (`.superpowers/sdd/progress.md`, marked L-*
below). 53 audit findings deduped to the entries here. Every bug finding's
file:line claims were re-verified against the working tree before inclusion.

Classification: **[bug]** = incorrect behavior, **[gap]** = missing capability /
broken loop, **[polish]** = correct but below the bar. **FE** = frontend-only,
**BE** = needs backend (goes to wishlist; a degrading frontend version may still
ship as a task).

Executed by: `docs/superpowers/plans/2026-07-18-leaderboard-ux-round2.md`.
Task refs (T1–T18) point into that plan.

---

## Bugs (all verified in code)

### B1. Own-run identity checks are case-sensitive string compares — [bug] FE — T1
(R7) `entry.runnerName === sessionUsername` at `leaderboard/leaderboard-table.tsx:117`,
`leaderboard/leaderboard-pager.tsx:137` and `:183` (find-me scan),
`leaderboard/row-actions-menu.tsx:42`, `run-view/run-actions.tsx:31`. Any casing
divergence between Twitch's `preferred_username` and the stored runner name
silently kills the youRow highlight, makes Find me report a miss while the
runner stares at their own row, and hides Hide/Restore/Appeal on their own run.
BE note: id-based identity needs a numeric userId on the session (wishlist W11).

### B2. Time input truncates milliseconds and parses bare numbers as minutes — [bug] FE — T2
(R3) `src/lib/time-input.ts:5` strips `\.\d+$` before parsing; `:9` maps a
single bare number to minutes. The submit form (`submit/submit-form.tsx:195`)
reuses this presenter-target parser, so `1:23:45.678` submits as `1:23:45.000`
(silently — the `formatTimeMs` echo at `:738` drops ms for times over a minute
too) and a pasted `45.678` becomes 45 **minutes**. Milliseconds decide ranks;
this is the single most important input in the product.

### B3. Date-only strings render one day off west of UTC — [bug] FE — T3
(R10) `YYYY-MM-DD` run dates go through `new Date(iso).toLocaleDateString()`:
`run-view/run-view.tsx:179`, `leaderboard/leaderboard-row.tsx:225` (title),
`header/game-hero.tsx:190`, `app/(new-layout)/[username]/leaderboard-pbs.tsx:79`,
`manage/run/[runId]/run-card.tsx:52`. JS parses date-only ISO as UTC midnight;
every viewer west of UTC sees the previous day — including the date the runner
just typed into the round-1 date input.

### B4. Dark-mode shadow tokens are dead code — [bug] FE — T4
(C7) `styles/_design-tokens.scss:87-92` reassigns `$shadow-*` inside a
`[data-bs-theme="dark"]` block — Sass variables are lexically scoped there and
the block compiles to nothing. Dark mode ships light-mode 0.08–0.2-alpha
shadows, so floating panels lose their lift exactly where the borders+tint
depth strategy needs the assist.

### B5. Verdict notifications are dead ends — [bug] FE (degrades) / BE — T5
(R1) `src/components/Topbar/NotificationsBell.tsx:46-52`: `linkFor()` returns a
link only for `board_claim_approved`. `verdict_applied` and
`manual_time_verdict` — the ones a runner waits for — render anonymous,
unlinked copy ("One of your runs was rejected by a moderator." Which run?
Which game?). The rejection reason and appeal button live on the run page the
notification doesn't link to. `payload` is `Record<string, unknown>`
(`types/moderation.types.ts:510`) so the frontend can link opportunistically;
if payloads lack `runId`/`gameSlug`, that's wishlist W4.

### B6. Category "Show milliseconds" setting is a no-op — [bug] FE — T6
(V2) `DurationToFormatted` defaults `withMillis=false` and nothing on the
public board, crown, or run detail ever passes it (verified: only manage
surfaces do). `ResolvedCategory.showMilliseconds`
(`types/leaderboards.types.ts:33`, defaulted **true** in
`manage/category-tab/category-settings-section.tsx:40`) is configurable and
ignored on the surface it exists for. Viewer symptom: runs 0.4s apart render
identical times at different ranks.

### B7. Empty deep pages claim "No runs on this board yet" — [bug] FE — T6
(L: filtersActive ignores `?page`) `game-page.tsx:83-88` computes
`filtersActive` from verified/combined/subcategory/var filters only, while
`ClearFiltersButton` (`filters/clear-filters-button.tsx:19`) also clears
`page`. A `?page=N` past the end renders the "board is empty" copy on a board
that has runs.

### B8. Sticky band paints over open dropdowns — [bug] FE — T7
(C13) `game-page.module.scss`: band `z-index: 20`, variable-pill
`.dropdownPanel` `z-index: 10`, filters `.popoverPanel` 30, info popover 1050 —
two scales, ad hoc. Scrolling with a subcategory dropdown open slides the band
over it.

### B9. Console pane switches erase history; category never reaches the URL — [bug]/[gap] FE — T15
(M3 + C3, merged) `manage/console/console-shell.tsx:183` uses
`router.replace('?pane=…')` so Back exits the console instead of retracing
panes; `selectedCategoryId` is pure React state (`:116`), so refresh while
editing "Rules — 100%" lands on the default category and per-category pane
links are unshareable at their last level. No last-pane memory across visits.

### B10. "When" cell renders empty string for undated runs — [bug] FE — T6
(V14) `leaderboard/leaderboard-row.tsx:229` renders `''` where every other
absent value on the board renders `—`.

---

## UX gaps

### G1. The run page is an off-register dead end — [gap] FE (rank approximated) — T11
(V1 + C1 + C6-run + R6, merged: viewer and craft both flag the dead end,
runner adds the missing rank.) `run-view/run-view.tsx` is the most-shared
artifact (crown link, row link, OG unfurl) and it drops the design system
(`badge text-bg-secondary` at :84/:88, `alert alert-warning` at :103, no
`mono-time`, no avatar/flag) **and** the hierarchy: game art unlinked, category
badges inert, no path back to the board, no rank. Verified: `UserRanking`
(`types/leaderboards.types.ts:148`) carries `runId`, `categorySlug`,
`subcategoryKey`, `rank`, `totalRunners` — so `getUserRankingsByName(runner)`
matched on `runId` gives an exact "#N of M" and the deep link frontend-only
whenever the run is the runner's current board entry. Exact rank on every run
needs W1.

### G2. WR history is the flagship story told as an admin export — [gap] FE (links need BE) — T12
(V3) `drawers/wr-history-drawer.tsx` is still a raw Bootstrap `Modal` +
`<Table hover responsive>` (verified :4/:54/:73), `text-danger` error (:62),
absolute dates, no mono times, no gold current holder, no improvement deltas —
`heldMs` is already computed (:90) and barely surfaced. Linking entries to run
pages needs `runId` on `WrHistoryEntry` (W2); country flags need `country` (W2).

### G3. No loading, not-found, or error boundaries anywhere in games-v2 — [gap] FE — T8
(V4 + C4 + C5, merged) Zero `loading.tsx`/`not-found.tsx`/`error.tsx` under
`app/(new-layout)/games-v2/` (verified; only `frontpage/loading.tsx` exists in
the layout group). Board navigation blocks up to `maxDuration = 60` with a
frozen previous page; mistyped slugs and dead run ids get Next's unstyled 404;
render errors fall to the root global-error and lose the whole layout.

### G4. Category/filter switches feel dead until the server answers — [gap] FE — T13
(V5) `header/category-pills.tsx:49`, `filters/subcategory-pills.tsx:60`,
`filters/verified-toggle.tsx:33` all `disabled={isPending}` — every pill dims
uniformly, the active state doesn't move, the stale board stays saturated.
Reads as "click didn't register" on slow connections. Three copies of the same
URL-push transition logic.

### G5. Submit funnel throws away category context, and claim mode is unreachable — [gap] FE — T10
(C8 + R8 + L: defaultCategoryId, merged: craft and runner both flag lost
category context.) Every submit entry link (`header/game-hero.tsx:118`, crown
"set the first record" :201, empty states) drops the category the visitor is
standing in; `submit/page.tsx:13` can't even receive one (`searchParams:
{ mode?: string }`, verified). And "Claim an existing time" — whose own hint
says it exists to fix a wrong imported time — has no entry point from the own
row or own run page where that need is discovered.

### G6. Post-submit card answers nothing — [gap] FE (queue stats need BE) — T10
(R4 + R5) `submit-form.tsx` success cards omit a board link even though
`SubmitRunResult.subcategoryKey` (`types/leaderboards.types.ts:256`) makes it
constructible; no "you'll be notified" promise despite the bell firing
`verdict_applied`; no current-standing context during submission (the rankings
endpoint returns rank + time per board today). Queue position / median wait
needs W5.

### G7. No "my submissions" surface — [gap] FE degraded / BE full — T14
(R2) `src/lib/me-submissions.ts` is POST-only (verified). Once the runner
navigates away, pending and hidden runs have no re-discovery path ("Restore my
run" only renders on a visible row). Degraded frontend version is real:
`getUserRankingsByName` returns per-board `runId`, `rank`, `totalRunners`,
`verificationStatus`, `runDate` — enough for a game-scoped "Your runs" panel
and status pills on the profile PBs tab. Full fidelity (pending non-PBs,
hidden runs, claims) needs `GET /v1/me/submissions` (W3).

### G8. A mod of five games has no cross-game overview — [gap] FE (summary endpoint would help) — T17
(M1) The console is strictly per-game; `moderatedGames: string[]` sits unused
in `src/lib/get-session-data.ts:15` (verified). Frontend fan-out of the
existing list calls per game ships a hub without W8.

### G9. No new-work signal while the console is open — [gap] FE (WS needs BE) — T17
(M2) `console-shell.tsx:123-133`: the badge only moves when the mod acts. No
polling, no tab-title count. Frontend version: visible-tab interval + focus
revalidate + `document.title` count — no WebSocket (W9 for a moderation topic).

### G10. Every approve pays a preview round-trip before Confirm unlocks — [gap] FE — T16
(M4) `run-action-dialog.tsx:253` folds `isPreviewing` into `busy`; `:593`
disables Confirm on it. The `v`, Enter fast path stalls on
`previewVerdictsAction` for every card; 20 runs cost 20 sequential forced
waits. The preview is a safety gate for remove/ban, not approve/restore.

### G11. Verifying a legit self-claim demands a 10-char essay — [gap] FE — T16
(M5) `attention/manual-time-verdict-row.tsx:8` (`MIN_REASON = 10`), `:27`
(gates verify AND reject), `:117`. Round 1 made approve reasons optional
everywhere else; this trains "looks fine ok" garbage into the audit log.

### G12. Triage has no position sense and a dead-end "All clear" — [gap] FE — T16
(M7) `needs-attention.tsx:402-404` (no "n of m"), `:430-441` (empty state with
no next action).

### G13. Roster selects lag 350ms by design; table can't sort; no count — [gap] FE — T16
(M9) `roster/roster-view.tsx:126-133` debounces `<select>`s together with text
inputs; table has fixed order and no result count.

### G14. Back-links drift and lie — [gap] FE — T9 + T15
(C10 + M12 + M11, merged) Five raw-Bootstrap `btn-outline-secondary`
back-links with inconsistent copy; roster/runner "Back to console"
(`roster-view.tsx:45`, `runner-view.tsx:73`) hardcodes `?pane=attention`
regardless of origin; the setup wizard (`setup/wizard-shell.tsx:65-84`) has no
way back to the console at all.

### G15. Rows are mouse-only navigation — [gap] FE — T13
(V13) `leaderboard-row.tsx:163-170` uses `onRowClick` → `router.push`;
cmd/ctrl-click, middle-click, and long-press do nothing on the row surface.
Compare-in-tabs is the viewer's core workflow.

### G16. Recent PBs rail: no "when", no way in — [gap] FE — T13
(V11) `sidebar/recent-pbs-panel.tsx` uses neither `RecentPb.endedAt` nor `id`
(verified both exist on the type). No relative time, no run link, no board link.

### G17. Deep-page back-nav strands scroll — [gap] FE cheap version — T13
(C14) Return to `?page=4` after "Show more" built pages 1–4: SSR serves only
page 4, browser scroll restoration points into absent rows. Cheap fix: scroll
board top into view on `initial.page > 1` arrival. Full window restore is cut
(N1 list).

### G18. History drawer can't answer "what did mod X do last week?" — [gap] FE — T18
(M6) `configure/history-drawer.tsx:68-228`: filterless 90-day list in a 28rem
overlay, targets rendered as dead strings.

### G19. Rejected manual claims explain nothing — [gap] BE mostly — T11 (guidance line only)
(R9) `manual/[manualTimeId]/page.tsx:59-93` hardcodes `rejectionReason: null`,
`history: []`; `run-actions.tsx:30-35` gates all runner actions on
`kind === 'run'`. Frontend ships a "Submit a corrected claim" guidance line;
the reason itself needs W6.

### G20. Pending pill and find-me don't acknowledge the owner — [gap] FE — T13
(R11) `leaderboard-row.tsx:238-244` explains the runner's own pending run in
third person; the pager's find-me miss (`:301-310`) says "Not on this board
yet" even when the Verified filter is what's hiding their pending run.

### G21. Board/console pages are untitled or mistitled — [gap] FE — T10
(C9) `[game]/page.tsx` titles from the raw slug ("Statistics for
supermario64"), ignores `?category`; manage/setup/roster/runner pages have no
`generateMetadata` at all.

### G22. Mobile console sidebar is an instant display:none flip — [gap] FE — T7
(C11) `console.module.scss:470-480`: toggling inserts/removes a full-height
block above the content, teleporting the pane being read.

---

## Polish

### P1. Crown eyebrow under-claims scope and over-claims when pending — [polish] FE — T6
(V12 + L: crown eyebrow while pending) "World record — Any%" over a PC-only
record; eyebrow keeps "World record" wording when the crowned run is pending.

### P2. Ties are invisible — [polish] FE within-window — T6
(V10) `leaderboard-row.tsx:205` renders `entry.rank` verbatim; equal primary
times get sequential ranks. Authoritative cross-page ties: W10.

### P3. All-dash secondary timing column — [polish] FE — T6
(V8) `leaderboard-table.tsx:98-102`: a column of `—` when no run carries the
secondary timing.

### P4. Zero enter motion on overlays — [polish] FE — T7
(C2) BoardDialog, filters popover, variable dropdown, row-actions menu, info
popover, history drawer: all pop in with no transition, no
`prefers-reduced-motion` story needed because there's no motion at all.

### P5. Three answers to "what does a primary action look like?" — [polish] FE — T9
(C12) Stock `btn btn-sm btn-primary` hero CTA vs `control-pill` board actions
vs mixed wizard buttons; system.md never defines a primary button.

### P6. Archive/Featured toggles commit with no Undo — [polish] FE — T18
(M10) `game-tab/categories-table.tsx:92-124`: the only reversible mutations in
the console without the round-1 undo-toast convention; no statement of what
archiving does to runners.

### P7. Round-1 ledger residue — [polish] FE — T18 (+ T6, T10)
(L) run-card raw Bootstrap; ClearFiltersButton Bootstrap; undo-toast
`btn-outline-secondary`; groups-section `btn-link text-danger` delete; submit
H1/metadata stuck on "Submit a run" in claim mode (→ T10); varsError copy not
mode-aware (→ T10); degraded sidebar badge renders "0+" at count 0; self-claim
cards accept j/k but v/r silently no-op; selection ring vanishes after
keyboard actions; no aria-live on bulk-bar count; submit-form.tsx at 777 lines
(RunFields/ClaimFields extraction → T10); humanizeAction/humanizeWord
near-duplicate; GameTab rAF scroll coupling; canModerate predicate re-derived
inline in two pages.

---

## Backend wishlist additions

Append to `docs/backend-handoffs-leaderboard-ux.md` (do not build; frontend
tasks degrade gracefully without them):

- **W1** — rank on run detail: `rank` + `totalRunners` on `RunDetail` (or a
  cheap rank-for-run endpoint). Frontend approximates via the runner's
  rankings when the run is their board entry (G1).
- **W2** — `WrHistoryEntry`: add `runId` and `country` so history entries can
  link to run pages and show flags (G2).
- **W3** — `GET /v1/me/submissions`: list every submission with status
  (pending non-PBs, hidden runs, claims) to pair with the existing POST (G7).
- **W4** — verdict notification payloads (`verdict_applied`,
  `manual_time_verdict`, `manual_time_created`, `manual_time_deleted`)
  guarantee `runId`/`manualTimeId`, `gameSlug`, `gameDisplay`,
  `categoryDisplay`, `timeMs` (B5).
- **W5** — queue stats for submitters: position in queue / median time-to-verdict (G6).
- **W6** — `ManualTimeDetail.rejectionReason` (+ appeal path for manual times) (G19).
- **W7** — `comment?: string` on `SubmitRunInput` + run detail display (N6).
- **W8** — `GET /moderation/summary` (game → open counts) to replace the hub's
  3×N fan-out (G8).
- **W9** — WebSocket moderation topic for live console badge (G9).
- **W10** — authoritative tied ranks from the leaderboard API (P2).
- **W11** — numeric `userId` on the session for id-based own-run checks
  (`LeaderboardEntry.userId` already exists) (B1).
- **W12** — reiterate round-1 handoff: filter-aware rank lookup so Find-me and
  run-page rank stop scanning (`getUserRankingsByName` ignores board filters).

---

## Not this round

- **N1** (V7) Sticky table header — the `overflow-x` wrapper creates a
  clipping context; the fix needs browser iteration the autonomous session
  can't do. Revisit with a manual pass.
- **N2** (V9) Sticky-band height collapse for many category groups — needs
  measured-height heuristics or a redesign of group presentation; speculative.
- **N3** (V6) Variables rendered on rows / combined-board UI — `?combined=1`
  is a URL-only hidden mode today; design its entry point before decorating
  rows for it.
- **N4** (M8) Compact density toggle for the queue — a second rendering mode
  across the whole triage surface; impact doesn't justify it at current queue
  sizes.
- **N5** (M13) Moderator-add autocomplete — needs user-search wiring; the
  round-1 resolved-username toast already covers the worst case.
- **N6** (R12) Submission comment field — backend-first (W7); no frontend
  version without the field.
- **N7** (C14 full) Multi-page window restore (`?pages=1-4` SSR) — unbounded
  SSR cost; the cheap scroll-anchor version ships in T13.
- **N8** (R2 full / R9 full / G6 queue position / M1 single endpoint / M2 WS)
  — backend-dependent halves of shipped degraded versions; tracked as W3, W6,
  W5, W8, W9.

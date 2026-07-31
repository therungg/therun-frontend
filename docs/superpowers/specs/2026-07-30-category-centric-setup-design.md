# Category-centric setup wizard — design

**Date:** 2026-07-30
**Status:** Implemented on branch `setup-category-centric` (2026-07-30); backend items
1–3 DEPLOYED to prod same date (`therun` main `9a46e9d`). Remaining before merge:
Joey's browser pass.
**Approach:** Single branch, full restructure (approach A)

## Goal

Restructure the games-v2 setup wizard from seven steps to five, organized around the
way a moderator actually thinks: configure the game once, pick the categories, group
them, then manage each category as a whole (rules, timing, variables — everything in
one place), and finally look at the real boards and make them true. The last step is
the payoff: boards are often wildly inaccurate, and the wizard ends with an instant,
per-runner curation pass on the actual leaderboards.

## Design principles (binding)

- Apple-grade clarity: hierarchy from type scale, spacing, and alignment. No gradient
  washes, no decoration standing in for structure.
- One obvious action per moment; progressive disclosure for everything else.
- Reversible actions apply instantly with undo. Confirmation dialogs only for the
  genuinely destructive (ban). No modal spam.
- The board preview is not a moderation queue wearing board clothes — it *is* the
  board, rendered as the public sees it, with quiet curation controls.

## Step structure

| # | Step        | Content                                                        |
|---|-------------|----------------------------------------------------------------|
| 1 | Game        | Details + everything game-global                               |
| 2 | Categories  | Feature/archive triage (today's step, plus default seeding)    |
| 3 | Groups      | Unchanged from today                                           |
| 4 | Category setup | Hub over featured categories → full shared category editor  |
| 5 | Boards      | Real board preview, run curation, ordering, go live            |

Deleted: `step-defaults.tsx`, `step-exceptions.tsx`, `step-variables.tsx`, and the
standalone finish step (its summary + go-live control fold into step 5's footer).
`src/lib/setup/steps.ts` and `completeness.ts` get the new canon; the console
checklist card follows automatically because it reads from there.

## Step 1 — Game

Today's details form (IGDB match, links, cover upload, about, platforms, release
year) plus a **Board defaults** section:

- **Default timing method** (RTA/IGT). Game-level; `ResolvedGame.primaryTiming`
  exists read-side, must become writable (backend item 1).
- **Category rules template.** Stored game-level in a new `games.rules_template`
  column (backend item 1) so it can seed categories added at any later date. The
  hardcoded `RULES_STARTER_TEMPLATE` becomes the placeholder for this field.
- **Game-wide minimum time.** Existing categoryId-null min_time policy; saves
  immediately. The input binds to the default timing method: RTA → `minTimeMs`
  only, IGT → `minGameTimeMs` only. The other field is never offered or written.
- **Game rules text.** Rules that apply to every board, displayed above category
  rules on public boards. New column (backend item 1).
- **Emulator policy.** Structured field, `allowed | banned`, displayed on public
  boards and the submit form. Display-only this round — no run-level enforcement.
  New column (backend item 1).

Skipped deliberately: verification policy (`defaultVerified`) — later round.
Proof requirements stay per-category only (step 4).

### Defaults semantics: stamp, not inherit

Step 1 runs before categories are selected, so stamping happens at **feature time**:
when step 2 features a category, its empty fields seed from the game defaults
(timing always; rules from template only where the category's rules are empty).
Categories keep their own copies afterwards — no read-time inheritance anywhere.
The category editor shows a quiet "from game defaults" hint on a field until it
diverges from the game value (pure comparison, no stored state).

## Steps 2 and 3

Unchanged apart from step 2 gaining the seeding behavior above. Triage heuristics
(`suggestFeaturedIds`), group builder, all as today.

## Step 4 — Category setup

### The hub

Lists featured categories in board order. Each row: emblem, name, a status line
(rules · timing · deviation · minimum · N variables) with a ⚠ on missing pieces —
reusing the outlier logic the console categories index already computes. Row click
opens the editor full-screen in the wizard shell; back returns to the hub. Continue
is never blocked; unconfigured categories keep their warning.

### The shared category editor

One `CategoryEditor` component extracted from the console's
`manage/category/[categoryId]/category-detail.tsx` (215 lines of composition over
already-shared sections: Variables, Combinations, Timing, Proof, Rules, Settings).
Both the console route and the wizard render it. `context="wizard"` hides
console-only chrome (history drawer, danger zone) and adds the back-to-hub header.

Additions to the editor (both contexts):

- **Category minimum time** input, bound to the category's primary timing exactly
  like the game-wide rule (primary RTA → `minTimeMs` only; the other field never
  written).
- **Copy from another category.** Header control: pick a source category, tick what
  to copy — rules, timing + deviation, proof, minimum, variables. Variables copy is
  a client-side deep copy (variables → values → combinations) through existing
  endpoints, preceded by a confirm listing what will be overwritten. Copies stamp
  values; no link to the source is kept.

## Step 5 — Boards

Renders the real board: segmented category switcher, the actual subcategory button
rows, the actual table — fed by the mod roster endpoint
(`getCategoryRoster`, subcategoryKey filter) so rows carry mod-only facts. Go-live
control and completeness summary in the footer; going live happens from here.

### Per-row actions (focus/hover reveals them)

- **Accept** — the default state; no button, no action. Unmarked = accepted.
- **Later** — shared mark-for-later flag (backend item 2). Marked rows get a subtle
  pin; a filter chip shows the marked pile.
- **Remove** — excludes the run (existing exclusions API), row slides out with an
  undo toast, and an inline slip shows the runner's next-best run ("next: 10:42 →
  would rank #14 · Keep / Remove too") via the existing eligible-runs endpoint.
- **Ban** — user exclusion rule (existing API). The one confirm: a slim sheet with
  the preview (N runs across M boards) before applying.
- **Fix time** — the time becomes editable in place; entering a value creates a
  manual time for the runner (existing manual-times API).
- **Move to…** — board assignment override (backend item 3): the run's recorded
  data never changes; a mod asserts "this run belongs on that board" (target
  category + subcategory values). Eventually runners get to *suggest* the same move;
  the mod action ships now, the suggestion flow is future work.

### Selection and bulk

Multi-select rows → bulk **Accept** (clears later-marks, keeps runs) and bulk
**Ban** (one preview sheet covering all selected runners). No below-minimum sweeps:
the minimum policy already keeps those runs off boards.

### Board-level controls on the preview

- **Adjust minimum** inline (edits the category minimum, timing-bound as always);
  the board re-renders under the new floor.
- **Reorder everything where you see it:** groups, category tabs (category
  `sortOrder`), subcategory button rows (variable `sortOrder`), and the values
  within a row (bucket order in `values`). All existing fields/endpoints.
- **Default view:** while looking at a subcategory combination, "make this the
  default" writes the existing `defaultValueIndex` on the involved variables.
- **Display popover:** milliseconds, hide RTA/IGT column, sort direction — the same
  category fields the editor owns, editable at the moment you notice they're wrong.

### Add runner

A ghost row at the end of the board: type a name (therun user match or free-text
guest — `RunnerRef` supports both), enter a time, done. Creates a manual time.

## Console integration

- `CategoryEditor` — shared as above; the console detail route keeps its full chrome.
- `BoardCuration` — the step-5 component mounts as a console pane under the board
  group (per category, subcategory tabs), so curation stays available after setup.
  Mark-for-later counts badge there.
- Deleted wizard steps take the old defaults/exceptions code with them; the
  exceptions deep-link (`?step=exceptions&cat=`) redirects to step 4's hub.

## Backend handoff (one doc, three items)

1. **Game columns + update surface:** `rules_template`, `game_rules` (text),
   `emulator_policy` (enum) new; `primary_timing` exposed in the mod update
   endpoint; all four returned on mod + public reads; public board pages display
   game rules and emulator policy.
2. **Mark-for-later flag:** run-level, shared across a game's mods. Set/clear +
   included in roster rows + a count endpoint or field for console badges.
3. **Board assignment override:** per-run override (target categoryId +
   subcategoryKey) that boards resolve when placing the run; original run data
   untouched. Mod-set now; designed so a runner-suggested variant can sit on top
   later.

Everything else the design touches — roster, exclusions (run + user rule, with
previews), manual times (user + guest), category/variable/group CRUD and ordering,
min_time policies — already exists.

## Out of scope (this round)

- Verification policy, VOD/proof affordances on the curation view, verdict actions.
- Game/category/variable *merging* (reassignment project) and runner merging.
- Editing run metadata (dates, video URLs) beyond the time itself.
- Run-level emulator enforcement.
- Runner-facing "this belongs there" suggestions (the mod-side override lands first).

## Data flow & error handling

- Curation actions are optimistic: row updates instantly, undo toast where
  reversible, row restores with an inline error on `ApiError` failure.
- Board data loads per category+subcategory selection from the roster endpoint;
  after a mutation the affected board refetches (revalidate the roster fetch tag)
  rather than trusting client math beyond the optimistic interim.
- Wizard save semantics per step stay as today: each screen saves its own writes;
  nothing global is held hostage until "finish".

## Testing

- `steps.test.ts` / completeness tests: new five-step canon, exhaustiveness.
- Seeding: featuring a category stamps timing/template correctly; non-empty rules
  never overwritten.
- Minimum binding: RTA-primary writes `minTimeMs` only (game + category), IGT
  symmetric; switching timing never silently carries the other field.
- Copy-from deep copy: variables/values/combinations land on the target; overwrite
  confirm lists the right items.
- BoardCuration component tests (mocked actions): remove → next-run slip + undo;
  ban → preview sheet; fix time → manual-time payload; multi-select bulk paths;
  add-runner ghost row (user and guest).
- Hub status rows: warning states for missing rules/timing/minimum.

## Deviations

- **Move-backed board override, not read-time.** Backend item 3 (board assignment
  override) executes through the real move-run path instead of resolving the
  override at read time; `run_board_overrides` only records the run's original
  placement so the move stays reversible. Same shape and same user-visible
  behavior as specced, smaller backend blast radius. Details in
  `docs/plans/2026-07-30-category-centric-backend-handoff.md`.
- **Verification-policy game setting skipped by request.** Not built in this pass.
- **Mark-for-later badge needs a backend count endpoint.** The console
  sidebar/tile-grid badge for marked-for-later runs is stubbed with TODOs pending
  a backend endpoint to supply the count.

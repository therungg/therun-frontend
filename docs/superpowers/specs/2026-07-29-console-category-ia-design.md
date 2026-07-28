# Console category IA — redesign

Date: 2026-07-29
Status: approved, not yet implemented
Area: `app/(new-layout)/games-v2/[game]/manage/console/`,
`app/(new-layout)/games-v2/[game]/manage/category-tab/`,
`app/(new-layout)/games-v2/[game]/manage/game-tab/`,
`src/lib/setup/{steps,health}.ts`.
Audit this answers: `2026-07-29-setup-flow-ux-audit.md` §D.

## Problem

The console's sidebar has 18 items in three groups. Six of them — `Minimum time`,
`Timing`, `Rules`, `Variables`, `Sub-boards`, `Category settings`
(`nav-model.ts:104-119`) — are `categoryScoped: true` and answer one question between
them: *how is this category configured?* Four failures follow.

1. **The category picker is a nav element pretending to be a scope control.**
   `console-sidebar.tsx:85-110` renders a bare `<select>` between the "Per category" group
   label and its six buttons, and only while `activeIsCategoryScoped`. The sidebar
   physically reflows as you navigate: a dropdown materialises inside the nav on Timing and
   vanishes on Groups. The current category is invisible from every other pane.

2. **Configuring one category costs six navigations.** Each of the six is a separate pane
   (`content-router.tsx:115-176`), each falling back to `<Placeholder>Pick a category.`
   when none is selected.

3. **No cross-category view exists.** "Which of my categories still need rules?" is
   unanswerable one dropdown selection at a time. `completeness.ts` computes exactly this
   fact for the wizard rail and the console never shows it. On a board with hundreds of
   categories a flat `<option>` list is not a usable instrument.

4. **The console discards the board's own structure.** The public page shows categories
   inside groups in an order the mod set in wizard step 3; the picker is a flat list.

Underneath all four: the wizard is organised by task (set board-wide defaults, then make
exceptions), the console by scope (game things / per-category things). There is no
board-wide layer in the console at all, so `health.ts:21-27` maps step `defaults` → pane
`timing` and step `exceptions` → pane `rules` — landing a board-wide concern on one
arbitrary category.

## Principles

1. **A sidebar holds destinations.** Not scope controls, not anchors, not three kinds of
   row in one column.
2. **Show the board, not one row of it.** The mod's question is usually comparative. If the
   system knows which categories disagree, it says so on screen.
3. **The console mirrors the board.** Group order, category order, featured/archived — as
   the mod arranged them, not alphabetically.
4. **One vocabulary.** A concept has one name in the wizard, the console nav, and the
   section heading.
5. **Bulk edits write only the field you chose.** Never a blanket write of every field on
   the form — that is audit A2's defect and it is not to be reproduced.

## Decisions taken

| Question | Decision |
|---|---|
| The six per-category panes | Collapse into one index + one detail screen. |
| The index | A comparison matrix, not a list. It is where bulk edits happen. |
| Category picker | Deleted. The index replaces it. |
| `categories-visibility` | Merged into the index as a column + bulk action. It was the same screen. |
| Nav groups | Three → two (`moderate`, `board`). 18 items → 12. |
| Detail screen | Real sub-route, like `roster` and `run/[runId]` already are. |
| Board-wide edits | Multi-select on the index. (Rejected: separate board-wide panes — a whole second settings surface to keep in sync.) |
| Variables | Stays category-scoped on the detail screen, per the approved variables plan. |
| Section order on detail | Wizard order, so setup muscle memory transfers. |

---

## The design

### 1. Nav model

```
MODERATE                        BOARD
  Needs attention  3              Setup wizard
  Browse runs                     Game details            → GameTab #details
  Reports                         Categories              → the index  ★
  Bans                            Groups                  → GameTab #groups
  History                         URL slug                → GameTab #identifiers
                                  Moderators
                                  Merge games & categories
```

18 items → 12. `NavGroupId` becomes `'moderate' | 'board'`. `per-category` is deleted along
with its six ids; `categories-visibility` is renamed `categories` and moves to the board
group between `game-details` and `groups` — which is wizard order (details 1, categories 2,
groups 3).

**`Cache` deliberately gets no nav row.** `game-tab.tsx:78-84` has a `CACHE_ANCHOR` section
with no way to reach it, so it looked like an orphan worth linking. It isn't:
`invalidate-cache.action.ts:10-11` gates the button on the global `admin` / `board-admin`
roles, so the per-game `game-admin` this console exists for cannot use it. Adding a nav row
would advertise dead UI to exactly the wrong audience. The approved variables plan opens
this to per-game admins in its Task 1 ("Per-game authorization for the rebuild trigger");
once that ships, the row can be added in one line. Tracked, not forgotten.

`categoryScoped` disappears from `NavItem` entirely, and with it the
`activeIsCategoryScoped` branch in the sidebar and `resolveCategoryId` in the nav model.

Permission gating is unchanged in intent but simplifies: the `standards`-is-visible-to-any-
moderator carve-out (`nav-model.ts:135`) becomes a rule about which *sections* the detail
screen renders, not which nav items exist. A moderator without `canConfigure` reaching a
detail screen sees Minimum time and nothing else.

### 2. The index

```
Categories                    ⌕ search        [Featured ▾]  5 featured · 12 archived
──────────────────────────────────────────────────────────────────────────────
     Main                    Timing   Minimum    Rules   Proof     Sub-boards
  ☐  ├ Any%                  RTA      1:15:00    ✓       top 10    4
  ☑  ├ 16 Star               RTA      15:00      ✓       top 10    4
  ☑  └ 70 Star               RTA      45:00      —  ▲    top 10    4
     Challenge
  ☐  ├ 120 Star              IGT ▲    1:40:00    ✓       all  ▲    4
  ☐  └ Any% NoBLJ            RTA      —    ▲     —  ▲    none ▲    1
──────────────────────────────────────────────────────────────────────────────
▲ differs from the rest of the board · 3 categories missing rules

[2 selected]  Set timing ▾  Set minimum ▾  Set proof ▾  Copy rules from ▾  Archive
```

Rows are grouped by the board's groups and ordered by `sortOrder` within each, matching the
public page. Ungrouped categories follow, archived collapse into a disclosure.

**Columns.** Featured (checkbox state), Timing, Minimum, Rules (✓/—), Proof, Sub-boards.
Deliberately not run counts — this is a configuration instrument, not a stats table.

**The `▲` marker** means "differs from the modal value among *featured* categories in this
game". Defined in a pure module so it is testable and the copy can't drift:

```ts
// src/lib/console/agreement.ts
export function modalValue<T>(values: T[]): { value: T; count: number } | null
export function disagreements(rows: CategoryConfigRow[]): Record<ColumnId, Set<number>>
```

A column where every featured category agrees shows no markers at all. A column with no
majority (a true split) shows none either — `▲` means "the odd one out", and when there is
no consensus there is no odd one out. The footer sentence is generated from the same data.

**Bulk actions** apply to the checked rows. Each writes exactly one field. Each confirms
with the list of categories that will change and what they will change *from*:

> Set timing to IGT for 2 categories?
> 16 Star — RTA → IGT
> 70 Star — RTA → IGT

`Copy rules from…` takes a source category rather than opening a text editor, because the
common operation is "make these match that one".

Selection state is component-local and clears on filter change — a bulk action must never
apply to a row the mod can no longer see.

### 3. The detail screen

`/games-v2/[game]/manage/category/[categoryId]`, rendered in `SubrouteChrome` with
`activeItem="categories"`. The console sidebar stays exactly as it is on every other
screen; nav never morphs.

Seven sections, in wizard order:

| Section | Source today |
|---|---|
| Variables | `VariablesSection` |
| Sub-boards | `CombinationsSection` |
| Timing | `TimingSettingsSection` |
| Proof & review | extracted from `category-settings-section.tsx:44-47, 142-145` |
| Minimum time | `Standards` |
| Rules | `RulesSection` |
| Settings | `CategorySettingsSection` minus the proof fields |

Chrome: a sticky in-page section rail, the category name as `<h1>`, a `‹ Categories`
back link, and prev/next category stepping in board order — the mod configuring five
categories in a row should never return to the index between them.

**Proof & review gets its own section.** It is wizard step 5's third heading
(`step-defaults.tsx:335`) and today it is two fields buried in a catch-all pane. Same
concept, two names, and the console's copy is the unfindable one.

The Variables and Sub-boards sections are hosts for the approved variables redesign; this
design does not touch their internals. That plan's decision to keep `combinations` as a
deep link is satisfied by the section anchor.

### 4. Data

No new endpoint. Every column already arrives in calls `page.tsx` makes:

| Column | Source | Field |
|---|---|---|
| Featured, group, order | `resolveCategory` (`page.tsx:87`) | `isMain`, `archived`, `groupId`, `groupName`, `sortOrder` |
| Timing | same | `primaryTiming`, `hideRealTime`, `hideGameTime`, `showMilliseconds` |
| Rules | same | `rules` |
| Proof | same | `requireVideo`, `requireVideoTopN` |
| Minimum | `listPolicies` (`page.tsx:161`) | `min_time` rows, `categoryId` |
| Sub-boards | `listGameVariables` (`page.tsx:161`) | combination count |

`ResolvedCategory` (`types/leaderboards.types.ts:24-49`) carries all of it.

**Hazard: two incompatible timing enums.** `ResolvedCategory.primaryTiming` is
`'rt' | 'gt'`; `ManageCategoryRow.primaryTiming` is `PrimaryTiming = 'realtime' |
'gametime'` (`category-mgmt.ts:5`). The matrix reads the former and the write actions take
the latter. Normalise once, in one place, or the column will silently render every row as
"differs".

`min_time` policy values use `{ minTimeMs, minGameTimeMs }` — not `rtMs`/`gtMs`, which the
backend rejects.

### 5. Routing & back-compat

| Old | New |
|---|---|
| `?pane=categories-visibility` | `?pane=categories` |
| `?pane={timing,rules,standards,variables,combinations,category-settings}&cat=N` | `/manage/category/N#<section>` |
| same, no `&cat=` | `?pane=categories` (the index) |
| `/manage/categories` (today: `redirect('?pane=groups')`, `page.tsx:9`) | redirect target changed to `?pane=categories`. The index stays a pane, not a route — it needs the console shell's sidebar, selection state and filters, which `?pane=` already provides. |
| `/manage/moderation/rules` | unchanged → `?pane=rules` → resolves per row 3 |

The redirect must live where `resolveInitialPane` runs, so a stored `localStorage` last-pane
from before the change is also migrated rather than falling back silently.

`NON_LANDING_IDS` keeps `history`, `roster`, `reports`, `setup`. The index is a valid
landing pane and a good `defaultItem` for a board admin.

### 6. Wizard reconciliation

| Wizard step | Console today | Console after |
|---|---|---|
| 1 Game details | Details & metadata + URL slug | **Game details** + URL slug |
| 2 Categories | Categories & visibility | **Categories** (the index) |
| 3 Groups | Groups | Groups |
| 4 Variables | Variables + Sub-boards | Category ▸ **Variables** / **Sub-boards** |
| 5 Defaults › Timing | Timing | Category ▸ **Timing** |
| 5 Defaults › Proof & review | *buried in Category settings* | Category ▸ **Proof & review** |
| 5 Defaults › Minimum time | Minimum time | Category ▸ **Minimum time** |
| 5 Defaults › Board rules | Rules | Category ▸ **Rules** |
| 6 Exceptions | — | the `▲` column markers |
| 7 Go live | — | — |

Two supporting changes:

**A shared vocabulary module.** `src/lib/console/vocabulary.ts` owns one label per concept,
consumed by the wizard rail, the wizard step headers, the console nav and the detail
section headings — the role `steps.ts` already plays for step labels, extended across the
seam. Asserted by a test that every `SetupStepId` and every `NavItemId` resolves to a label
from it.

**Wayfinding footers.** Each wizard step ends with *"After setup this lives in the console
under Categories ▸ Timing."* `health.ts:21-27` already holds most of the mapping; it gains
`variables` and an anchor per entry, and its `defaults`/`exceptions` entries stop pointing
at a single arbitrary category.

### 7. Code shape

```
src/lib/console/
  agreement.ts        modal value + disagreement sets      (pure, tested)
  vocabulary.ts       one label per concept                (pure, tested)
  category-rows.ts    resolved+policies+variables → rows   (pure, tested)

manage/console/
  nav-model.ts        two groups, no categoryScoped
  console-sidebar.tsx picker deleted
manage/console/
  categories-pane/    the index: table, filters, selection, bulk dialogs
manage/category/[categoryId]/   detail route + section rail
```

The three pure modules are the load-bearing ones: everything the matrix asserts is derived
there, so it is testable without rendering a table.

## Out of scope

- The wizard's own defects (audit A1–A4, B1–B5). Separate work.
- The variables redesign internals — approved and planned separately
  (`plans/2026-07-29-leaderboard-variables-redesign.md`). This design hosts it.
- Any backend change. If a bulk action turns out to need a batch endpoint for
  performance, that is a follow-up; N sequential writes with a progress state is acceptable
  at the category counts in play.
- Run counts / stats columns on the index.

## Testing

Pure modules carry the load: `agreement.ts` (unanimous → no markers, clear majority → odd
ones marked, even split → no markers, single featured category → no markers),
`category-rows.ts` (the two timing enums normalise; missing policy → `—`; archived
excluded from the modal), `vocabulary.ts` (exhaustive over both id unions).

Beyond that: `nav-model.test.ts` updated for two groups; a redirect test per row of the §5
table; and a render test that a `canModerate`-only viewer sees exactly one section on the
detail screen.

## Consequences of this design

- The sidebar stops changing shape as you navigate, because nothing in it is scoped.
- "Which categories need work" becomes the console's landing screen rather than an
  unanswerable question — which is also the first-run problem audit §D1 raises, where
  go-live currently lands on an empty triage queue.
- Configuring one category costs one navigation instead of six; configuring five costs
  five clicks of *next* instead of thirty.
- Bulk edits become safe to offer, because the confirmation shows the from-value per
  category and only one field is written.
- The wizard and the console name the same things the same way, enforced by a test rather
  than by discipline.
- Cost: one new route (the detail screen), one new pane, and a table with selection
  state — replacing six panes and a `<select>`. The six pane components survive nearly unchanged — they become sections.

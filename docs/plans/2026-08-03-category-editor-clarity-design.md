# Category editor (wizard step 4 detail / console category page) — clarity analysis

Status: FULLY IMPLEMENTED on `setup-hub-order-groups` (2026-08-03) — R1–R7
plus the Subcategories & filters step and console pane described below. Joey
approved the step recommendation ("yeah do everything").
Scope: `manage/category/category-editor.tsx` and the six sections it mounts, as
experienced inside the setup wizard (`?step=category-setup&cat=<id>`) and on the
console category detail page. Prompted by Joey: layout off, visuals inconsistent,
explanations weird, sub-boards incomprehensible, variables unclear, timing not
transferring from game settings, general settings buried at the bottom.

## What the screen currently is

Six independent forms stacked on one scroll page, with a sticky 12rem scrollspy
rail on the left and a "Copy from…" popover top-right:

1. Variables (580-line section: scope pills, in-effect panel, two tables, inline form)
2. Sub-boards (combinations checkbox table)
3. Timing (primary clock + secondary toggle)
4. Minimum time (one field + live below-minimum preview)
5. Rules (markdown edit/preview tabs)
6. Settings (ranking direction, milliseconds, emblem)

Each section loads its own data through its own server action after mount, has
its own save/reset, its own error surface, and its own visual chrome.

## Findings

### F1 — The order is backwards for the job

The section order is documented as "the wizard's order", but the reader's job on
this screen is "make this one category presentable". The things every category
needs — timing, rules, minimum, settings — sit *below* the two most advanced,
least-used concepts (variables, sub-boards). Most categories have zero
variables; the screen leads with the thing 90% of categories don't use and ends
with the basics. The hub's own status line (`RTA · no rules`) is about
timing/rules/minimum — none of which are near the top when the row is opened.

### F2 — Double rail in the wizard

The wizard already draws a 16rem step rail on the left. CategoryEditor draws a
*second* sticky left rail (12rem, scrollspy) beside it. Two adjacent vertical
navs with similar styling but different behaviors is the single biggest "layout
is way off" contributor. `data-context="wizard"` is set on the wrapper but no
style or markup keys off it — the editor renders identically in both contexts.
The rail's `top: 5rem` / `rootMargin: -80px` are tuned for the console header,
not the wizard page.

### F3 — Three visual languages on one page

- Timing / Minimum / Rules / Settings use the form-kit `FormSection` (eyebrow
  small-caps title, flat section, hairline divider, `kit.saveBtn`).
- Sub-boards is a raw Bootstrap `border rounded p-3` card with an `h5` title and
  `btn-primary` save — different chrome, different heading scale, different button.
- Variables adds a third register: the In-effect panel is a lifted
  `board-surface` with a *large bold* title that outranks every section title on
  the page, the variable form is another Bootstrap bordered card with
  border-in-border "value buckets", and the toggles are Bootstrap `nav-pills`
  (scope) and `nav-tabs` (rules edit/preview) while the rest of the page uses
  form-kit segmented controls.

Same page, three heading styles, three toggle idioms, two save-button styles,
two card chromes. That is the "visuals all over the place" complaint, precisely.

### F4 — Variables: three lists, spec-sheet prose, scope-first

- The lede is an abstract spec paragraph (roles, overrides, scopes) the reader
  must absorb before seeing a single concrete thing.
- The same variables then appear up to three times: In-effect panel, "Variables
  that split this board" table, "Filter-only variables" table — different
  orderings, different labels ("splits this board into 4" vs role names).
- The scope pills ("Shared by all categories" / "Any% only") come *before* the
  tables and default to game scope — on a screen that is explicitly about one
  category. Scope only matters in the rare override case, yet everyone pays for
  the concept up front.
- The role explanation appears three times in one screen (lede, bullet list
  under the segmented control, roleConsequence sentence) — triple redundancy
  that still fails, because none of them *show* the result. The one thing that
  would make roles obvious — "Platform splits Any% into three boards: N64 ·
  Switch · PC" rendered as the public band's chips — exists only as text.

### F5 — Sub-boards: disconnected and rendered in slugs

- Sub-boards ARE the combinations of the subcategory variables defined one
  section up, but nothing on screen says so; it presents as an unrelated
  concept with its own jargon ("N combinations, all live boards").
- The table's cell values come from `parseSubcategoryKey`, which yields
  **normalized slugs** — a board renders as `nintendo64 | 116star`, not
  "Nintendo 64 · 116 Star". Headers are raw variable param names. This is why
  it reads as incomprehensible: it is literally showing internal keys.
  (Display names are recoverable by mapping each normalized value back through
  the variable's value buckets, as board-curation already learned to do.)
- With no subcategory variables it still renders as a full section explaining
  that there is nothing to manage.

### F6 — Timing "doesn't transfer": three real mechanisms

1. **The hide pair never seeds.** `buildCategorySeed` carries only
   `primaryTiming` + rules template. The game's step-1 "Time columns" choice
   (`hideRealTime`/`hideGameTime`) is never applied to newly featured
   categories — an IGT-only game gets categories that show both clocks.
2. **The timing form re-fetches through pageData.** `loadTimingSettingsAction` →
   `getCategoryTimingSettings` → `loadPageData` — the cached page_data blob that
   rebuilds asynchronously after writes. Right after the wizard features and
   seeds a category, pageData often hasn't rebuilt, so the form shows the
   *pre-seed* values even though the write landed. Meanwhile the `category`
   prop already carries live `primaryTiming`, `hideRealTime`, `hideGameTime`
   from Postgres (`resolveCategory`) — the fetch is strictly worse than the prop.
3. **Flash of defaults.** Until the load resolves, the form shows
   `DEFAULT_STORED` (Real time, secondary on). A gametime game reads as "my
   setting didn't come across" for the first second even when it did.

Also: nothing in the section tells the mod what the game default *is*, so
"transferred or not?" can't even be checked by eye.

### F7 — Copy is off in specific places

- Timing lede: "Defaults for **Any%**…" — these aren't defaults, they're the
  category's actual settings. "Defaults" actively suggests the game→category
  inheritance that (per F6) people already doubt.
- Settings lede promises "Ranking direction, display precision, and **video
  requirement**" — the form contains no video requirement field. Drift.
- "Higher value = better" as one of two equal ranking options mispitches a
  niche case (score boards) as a 50/50 decision on a speedrun site.
- Sub-boards status line: "N combinations, all live boards. Runners can submit
  any of them." — jargon ("combinations", "live boards", "rebuild") with no
  anchor to what a runner sees.
- Six ledes in six different registers (some address "you", some describe the
  system, some describe policy).

### F8 — No sense of progress or doneness

The hub computes `categorySetupStatus` (missing rules, minimum, timing label)
but the editor doesn't carry it in: all six sections render with equal weight,
nothing marks what's missing vs done, and there's no way to see "this category
is finished" without scrolling everything. Six separate save buttons, six
separate toasts.

## Proposed redesign

### R1 — Reorder into two tiers (small change, big effect)

Tier 1 "**The board**" — what every category needs, form-kit family, in job
order: **Timing → Rules → Minimum time → Settings**.
Tier 2 "**Split this board** (optional)" — Variables + Sub-boards merged into
one section (see R4).
Same order in console context; the argument is the same there.

### R2 — One visual system

Everything moves onto form-kit: `FormSection` wraps sub-boards and the variable
form; segmented controls replace `nav-pills`/`nav-tabs`; every save/reset is a
`SectionFooter` with `kit.saveBtn`. The In-effect panel loses its own lifted
surface and large title (see R4). One heading scale, one toggle idiom, one
button pair, one card chrome.

### R3 — Fix timing transfer (three concrete fixes)

1. Seed `hideRealTime`/`hideGameTime` from game metadata in
   `buildCategorySeed`/`seedUpdateBody` alongside `primaryTiming`.
2. Seed the timing form's state from the `category` prop (live Postgres via
   `resolveCategory`) instead of the pageData fetch — kills both the staleness
   and the flash. Drop `loadTimingSettingsAction` from this path entirely.
3. Add a one-line caption under the control: "Game default: Game time · IGT
   only" with the current game metadata, plus a "Use game default" link when
   the category differs. Now "did it transfer?" is answerable at a glance.

### R4 — Variables + Sub-boards become one story: "One board, or several?"

Lead with the *result*, not the theory: render the category's current board
structure as the public band's chips ("Any% is one board" / "Any% splits by
Platform: N64 · Switch · PC — 3 boards"), reusing the masthead chip vocabulary
the mod already knows from the preview in step 2. That replaces the In-effect
panel's text rows.

Under it, one list of this category's effective variables (source noted inline:
"shared" / "this category only"), each row expandable to edit. Scope stops
being a pre-filter and becomes a property printed on the row; the "Shared by
all categories" editing surface moves behind an explicit "shared variables"
link (or stays in the console's game-level pane) rather than being the default
tab on a category screen.

Sub-boards folds in as the tail of the same section, only when subcategory
variables exist: "These 6 boards exist — untick one to close it", with **display
values** (map normalized key parts back through value buckets), variable names
as proper column headers, and the runner-visible consequence spelled once.

Role copy shrinks to one sentence at the decision point (the segmented control),
worded by consequence: "Own leaderboard per value" vs "Filter within one
leaderboard" — and the live chip preview above does the real explaining.

### R5 — Wizard context: no second rail

In `context="wizard"`, drop the vertical rail and use the horizontal chip row
the ≤900px breakpoint already produces (or nothing — with R1's order and R4's
consolidation the page is 5 sections and scrolls fine). Keep the vertical
scrollspy rail for the console detail page, where it isn't fighting another rail.

### R6 — Carry the checklist in

Reuse the hub's status glyphs on the section headings: Rules gets the amber dot
when empty, Timing/Minimum get the check when set. The editor then reads as the
hub row expanded — same doneness language in both places — and "finished"
is visible without reading six forms.

### R7 — Copy pass

- Timing lede: "How **Any%** is timed and ranked." (drop "Defaults")
- Settings lede: drop "video requirement" (or add the field — decide, don't drift).
- Ranking direction: keep the control but caption the desc option as the
  exception it is ("for score-based boards").
- Sub-boards status: "Runners can currently submit to any of these 6 boards."
- One register everywhere: address the moderator, name the runner-visible effect.

## Suggested sequencing

1. **R3** (timing transfer) — smallest, fixes a trust-breaking data bug, two of
   three fixes are pure frontend; the seed change touches `category-seed.ts` +
   its tests.
2. **R1 + R5 + R7** — reorder, de-rail the wizard, copy pass. Layout/clarity win
   with no data-model work.
3. **R2** — visual unification (mechanical, medium-size).
4. **R4 + R6** — the variables/sub-boards merge is the real redesign; do it
   last, on top of a stable frame.

## Decisions (Joey, 2026-08-03)

- Console gets the same treatment — the component stays shared.
- Emblem stays in Settings.
- Shared (game-wide) variables should NOT be editable from inside a category's
  editor. Joey floated a dedicated step; recommendation below.

## Recommendation: a "Subcategories & filters" wizard step

Shared variables are the *common* case (Platform/Version apply to every
category), so evicting them from the category editor requires a first-class
home. Proposal:

- New wizard step between Groups and Category setup: **Subcategories &
  filters** (wizard becomes 6 steps). It edits game-wide variables only, with
  the band-chip preview making the consequence concrete ("this splits every
  board into N64 · Switch · PC").
- Console reuses the same component as a game-level pane (same trick as
  CategoryEditor's dual mount).
- The category editor's variables section shrinks to: effective chips +
  category-scoped overrides + a "shared variables live here →" link.
- The step must carry a warning for configured games: adding a game-wide
  subcategory reshuffles every category's boards — it's a structural act, not
  a setup-only toy.

This subsumes part of R4; the remaining R4 work (chips-first presentation,
sub-boards folded in with display values) applies to both the new step and the
slimmed category section.

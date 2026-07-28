# UX audit — games-v2 new-leaderboard setup flow

Date: 2026-07-29
Scope: claim → approval → `/games-v2/[game]/setup` (7 steps) → go live → console handoff → re-entry.
Files: `app/(new-layout)/games-v2/[game]/{claim,setup,manage}/`, `src/lib/setup/`, `src/components/Topbar/notification-copy.ts`.

Verdict: the wizard's information design is good — the rail, the live band preview, the
per-step ledes, and `computeCompleteness` as one shared status model are all better than
what most sites ship. What it does *not* yet do is protect the user. Four defects on the
default happy path either publish wrong content, destroy prior configuration, or dead-end
a first-time board admin. Those come first.

---

## A. Blockers

### A1. The default path publishes the unedited rules template to the public board

`steps/step-defaults.tsx:33-34` initialises `rulesEnabled = true` and
`rules = RULES_STARTER_TEMPLATE`. The primary button ("Apply to all N & continue")
writes it to every featured category that has no rules yet (`:158-169`).

A mod who reads the timing controls, ignores the "Board rules" card at the bottom, and
clicks the only forward button publishes this as the board's rules:

```
Timing starts on [first input / cutscene end].
Timing ends on [final hit / last input].
- Video proof is [required / recommended] for all submissions.
- Allowed platforms and versions: [list them].
```

Worse, `completeness.ts:187-199` scores the exceptions step on *whether rules exist*, so
the placeholder text flips the board from "3 of 5 featured categories missing rules" to
"All 5 featured categories have rules". The product then reports the board as complete
while the public page shows brackets.

The same trap exists at `steps/step-exceptions.tsx:376-378` + `:405-411`: opening
"Adjust" on a category with no rules prefills the template, and "Save override" always
sends `rules`, so an untouched open-and-save writes it.

Fix: either default `rulesEnabled` to false, or block Apply while `/\[[^\]]+\]/` still
matches the textarea ("Fill in the bracketed parts first"), or only write rules for
categories where the template was actually edited. Same guard on the override save.

### A2. Step 5 is not seeded from current state, so revisiting it resets the board

`step-defaults.tsx:24-33` hardcodes `primaryTiming: 'realtime'`, `showRt/showIgt/
showMilliseconds: true`, `requireVideo: false` — regardless of what the categories
currently hold. `apply()` writes all of them unconditionally to every featured category
(`:146-174`; `update-category-settings.action.ts:56-66` passes every defined field
through).

Consequence: an IGT-primary board with video proof required, revisited via the sidebar's
permanent "Setup wizard" item, is silently reverted to RTA / no video proof / both
timings shown by the step's own primary button. Per-category overrides set in step 6 are
wiped by any later step-5 apply.

The minimum-time block on the same screen *is* seeded from existing policies
(`:38-59`), which makes the inconsistency invisible — half the form reflects reality and
half doesn't.

Fix: seed every control from the current featured categories; where they disagree, show a
"mixed" state and only write the fields the mod touched.

### A3. "Go live" doesn't go live — the board was public the whole time

`configured` is written by `set-configured.action.ts:27` and read by exactly one thing:
`completeness.ts:204`. It has no effect on public visibility, ranking, or anything else.
Meanwhile step 7 is labelled "Go live" (`src/lib/setup/steps.ts:25`) and the success
screen says "Your board is live" (`step-finish.tsx:132`).

Both readings of that are wrong and both are harmful:

- Admin believes nothing is public until they finish → they take their time while the
  junk categories they haven't triaged sit on the live board.
- Admin believes finishing published something → they don't realise step 2's save had
  already changed the public board minutes earlier.

Fix: pick one. Either gate something real on `configured`, or rename the step ("Finish &
review") and say plainly on step 1 that every save is live immediately.

### A4. A brand-new board's resume pointer lands on a dead-end step

For an ingestion-empty board, `computeCompleteness` marks categories/groups/variables/
defaults `done` and **exceptions `todo`** (`completeness.ts:180-185`). So
`firstIncomplete === 'exceptions'`.

Both entry points use that value: `setup/page.tsx:105-108` and the console checklist
card's link (`setup-checklist-card.tsx:36-40`). A newly approved board admin's first ever
screen of the wizard is therefore **step 6**, rendering "Pick your featured categories
first" and a "Choose categories" button (`step-exceptions.tsx:221-244`).

Side effect: that board can never exceed 6/7 — the rail and card read "6 of 7 steps done"
permanently, with a step that can't be completed.

Fix: on an empty board, exceptions should be `done` ("Nothing to except yet") like its
neighbours, or `firstIncomplete` should skip steps whose own component renders a
can't-act-yet state.

---

## B. High — the flow loses work

### B1. Any step change silently discards unsaved edits

`wizard-shell.tsx:40-47` navigates with `router.replace` + `router.refresh`, and the step
body is keyed on `${step}-${data.renderedAt}` (`:109`), so the component unmounts. Every
step holds its edits in local `useState`. There is no dirty tracking and no `beforeunload`
handler anywhere in this flow (the only one in the repo is `fast50/prep/studio.tsx:123`).

So: type a slug, a Discord invite, and an About blurb; click a rail row to check
something; come back to an empty form. Same for Back, and for "Skip this step".

Fix: track dirty per step; confirm before rail/Back/Skip navigation away from a dirty step.

### B2. "Everything saves as you go" is not true

`step-details.tsx:15-16` tells the user exactly that. `GameDetailsForm` commits only in
`save()` on the "Save & continue" click (`game-details-form.tsx:126-168`). This copy
actively invites the data loss in B1.

### B3. Step 4's "Save & continue" saves nothing

`step-variables.tsx:114-120` calls `onAdvance()` only; the embedded `VariablesSection`
commits on its own buttons. A mod mid-way through the variable form who clicks the big
primary button loses the form and advances. Label it "Continue" — or make it commit.

### B4. Step 6 has two save models on one screen, and the inner one leaves stale UI

"Save override" (`step-exceptions.tsx:526-533`) is per-category; "Save minimums &
continue" (`:339-352`) is the step's primary. Editing an override and hitting the primary
discards the override.

And the override's successful save (`:394-421`) doesn't `router.refresh()`, so the row it
just changed still reads "no rules" and the rail still counts it as missing — the user
sees a success toast next to UI that says it didn't work.

### B5. Choosing "One flat list" can create a blocker the step said was fine

`step-groups.tsx:38-39`: in `flat` layout `groupIdOf` returns null for everything, and
`groupingOk` is unconditionally true (`:89`). Saving unfiles every category **but leaves
the groups in existence**. `completeness.ts:137-146` then fires the blocker
"N featured categories are not in a group" (groupCount > 1 && ungrouped > 0).

The user is now blocked from finishing by a step that told them their choice was valid,
and returning to it shows "One flat list" selected with no warning.

Fix: switching to flat should offer to delete the groups, or completeness should treat
"groups exist but nothing is filed" as flat rather than broken.

---

## C. Medium — friction and mixed signals

### C1. `/setup` 404s where `/manage` recruits

`setup/page.tsx:55` calls `notFound()` when `canConfigure` is false. `/manage` renders the
`ModDoor` recruiting panel for the same viewer (`manage/page.tsx:65,78-84`).

This matters because the claim-approved bell notification links straight to `/setup`
(`notification-copy.ts:79-80`, `linkFor` case). `moderatedGames` is derived server-side per
session fetch, but the frontend caches session data for up to 300s
(`get-session-data.ts:31`). A freshly approved board admin who clicks their notification
inside that window gets a bare 404 as their first impression of the thing they were just
granted.

Fix: render a ModDoor-shaped panel ("If you were just approved, give it a minute or sign
out and back in") instead of `notFound()`.

### C2. Step 6 is scored on rules but foregrounds minimums

Rail label "Exceptions", step title "Minimum times & exceptions", lede leads with minimum
times — but the only thing that clears the step's warning is rules
(`completeness.ts:187-199`), and the rules editor is hidden behind a per-row "Adjust"
link. The single control that resolves the outstanding warning is the least visible one
on the screen.

### C3. Joining an existing mod team is undiscoverable from the public page

`game-hero.tsx:173` renders `ClaimCta` only when `!claim.hasModerators`. `ClaimCta`
already carries full "join the team" copy (`claim-cta.tsx:41-43, 81-90`), but on a
moderated board it only surfaces on the `/manage` mod door — a URL nobody navigates to
speculatively. The recruiting funnel is closed for exactly the boards that have people
looking at them.

### C4. Copy that contradicts the flow

- `category-band-preview.tsx:186-189`: "Subcategories come from variables, which you set
  up in the console — not in this wizard." Shown on steps 2 and 3, one screen before step
  4, which is the variables step.
- `step-finish.tsx:189-194`: "No moderators listed yet (the backend mod list may not be
  deployed — you can still finish setup)." Implementation detail as user-facing copy, and
  it lands precisely where the "add a co-mod" nudge matters most.

### C5. Two scope controls stacked in step 4

`step-variables.tsx:91-106` adds an "Editing category" select plus prose about game vs
category scope; the embedded `VariablesSection` then renders its own game/category scope
toggle (`variables-section.tsx:37, 70-77`). Two controls, one concept, no stated
relationship.

### C6. The forward action is split from the nav

Each step renders its primary button at the bottom of its own body; Back and "Skip this
step" live in a separate bar below it (`wizard-shell.tsx:118-138`). Reading order is
[Save & continue] → divider → [Back] [Skip this step]. Documented as deliberately deferred
in `docs/plans/2026-07-26-setup-wizard-step-navigation-design.md` ("Out of scope") — it's
still the flow's most visible inconsistency.

### C7. Step 2's pre-selection is silent

`step-categories.tsx:34-43` pre-ticks suggested categories when the board has no explicit
featured flags. Nothing in the UI says the selection was made for them, on what basis, or
that it needs review — the checkboxes are just already ticked. On a 900-category board
that's the highest-stakes screen in the flow.

---

## D. The handoff to ongoing management

The ask was "lead users perfectly through *managing* their new leaderboard", and this is
where the flow currently stops rather than fails.

1. **Go-live lands on an empty queue.** `step-finish.tsx:139` sends the new admin to
   `?pane=attention`. On a board that just went live that pane is empty. "Your board is
   live" → a blank triage list is an anticlimax with no next action. A first-run console
   state ("share your board / invite runners / your rules are still placeholders") would
   carry the momentum.
2. **Nothing maps wizard → console.** The console has 18 nav items across three groups;
   the wizard covers seven concepts. A one-line footer per step — "this lives in the
   console under *Timing*" — would teach the console for free while the user is already
   in the relevant context. `health.ts:21-27` already holds that step→pane mapping.
3. **Progress meter isn't a work estimate.** Optional steps report `done` from the start
   and "Go live" is in the denominator, so a fresh board reads 1/7 then jumps. It reads
   like a completion percentage but isn't one.

---

## E. Variable editing — deep dive

Asked separately: is variable editing clear? No. It is the least clear surface in the
flow, and the one with the most public consequence per click. Files:
`manage/variables/{variables-section,variable-form,variable-row,combinations-section}.tsx`,
`setup/steps/step-variables.tsx`.

### E1. Three scope controls for one concept, and the outer one is a no-op by default

- The console's Variables pane is category-scoped (`nav-model.ts:111`,
  `content-router.tsx:145-154`) — you must pick a category in the sidebar to reach it.
- `VariablesSection` then opens on `scope: 'game'` (`variables-section.tsx:37`) and lists
  game-wide rows, where the category you were forced to pick is irrelevant.
- The wizard adds a third: `step-variables.tsx:91-106` renders its own "Editing category"
  select, plus prose about game vs category scope, above a section that has its own
  Game-wide / Category-specific pills.

Nothing states how the three relate.

### E2. Category-scoped rows shadow game-wide rows invisibly

The merge rule is wholesale override on `nameNormalized` (frontend guide, §Merge rule;
restated at `variables-section.tsx:230-237`). But in Category-specific scope the list
filters to category rows only (`:70-77`). A mod creating "Platform" for one category
cannot see that a game-wide "Platform" exists, gets no collision warning, and silently
replaces its values *and* its default for that category.

### E3. There is no "what will runners actually see" view

The merged, published, per-category list is computed for the public page and never shown
to the mod. The question a board admin actually has — "what does this board look like
now?" — is answerable only by leaving the console and loading the board. Step 4 has no
band preview either, though steps 2 and 3 do; a variable created in step 4 doesn't appear
in any preview until you navigate backwards.

### E4. Edits that repartition the board carry no warning

`handleSubmit`'s edit path (`variables-section.tsx:122-149`) correctly upserts on the
editing row's identity. What it doesn't do is say what the edit means:

- Renaming or removing a value bucket changes `subcategoryKey` derivation — i.e. which
  board existing runs belong to.
- Changing `defaultValueIndex` moves every run that never specified the variable onto a
  different board.

The **delete** dialog warns about exactly this class of consequence
(`:368` — "Existing finished runs keep their resolved values until a re-resolve worker
runs"). The **edit** path, which is far more common, says nothing.

### E5. The one warning that exists is unactionable by the person who sees it

"…until a re-resolve worker runs" is internal vocabulary, and the mod can't run it. The
re-resolve is a leaderboard rebuild (`sync/reproject-run-finished-runs.ts`, triggered by
`POST /v1/leaderboards/invalidate-cache/{gameId}` or the daily cron). A button exists —
`InvalidateCacheButton` at `game-tab.tsx:84` — but `invalidate-cache.action.ts:30-35`
gates it on **global** roles (`admin`, `board-admin`, `board-moderator`). The per-game
`game-admin` the wizard just onboarded cannot trigger it.

Fix: say "existing runs move to their new boards on the next rebuild (usually within a
day)", and let a game-admin trigger one for their own game.

### E6. An open form silently retargets when the scope or category changes

- Switching the Game-wide / Category-specific pills calls `closeForm()`
  (`:246-249, 259-263`) — a half-filled create form is discarded without asking.
- Changing the wizard's "Editing category" select does *not* close the form
  (`:63-68` only refreshes rows). A create form left open now submits against the **new**
  category (`handleSubmit:93-94` reads `selectedCategory?.id` at submit time), while an
  edit form still submits against the old one (`:132`). Same screen, two different
  behaviours, neither announced.

### E7. Two competing sort mechanisms, one of them unsafe

`variable-form.tsx:213-224` exposes raw integer `sortOrder`; `variable-row.tsx:42-59`
offers ↑/↓. `swapSortOrder` (`variables-section.tsx:180-206`) fires two sequential
upserts with no rollback — a failure on the second leaves two rows sharing a sortOrder,
reported only as a toast. Drop the integer field; make the arrows transactional or
optimistic-with-revert.

### E8. Sub-boards are missing from the wizard entirely

Step 4 renders `VariablesSection` only. `CombinationsSection` is not there. Creating two
subcategory variables (platform × version) in the wizard silently creates N×M public
leaderboards in "open" mode, and nothing in the flow mentions it. In the console it's a
separate nav item ("Sub-boards", `nav-model.ts:112`) a mod has no prompt to visit.

Related contradiction: `category-band-preview.tsx:186-189` tells the user subcategories
are set up "in the console — not in this wizard", one step before the wizard's variables
step.

### E9. Role lock is explained inconsistently

The wizard states it up front (`step-variables.tsx:75-80`). The console's form only shows
the note in edit mode (`variable-form.tsx:263-268`) — i.e. after the choice is
irreversible. And the stated remedy ("delete and recreate") is destructive given E4.

### E10. Smaller

- `describeBucket` (`variable-row.tsx:16-19`) inlines every alias into the Values cell
  with no truncation; a five-alias bucket is a wall of text.
- Aliases are a comma-joined text input (`variable-form.tsx:317-330`): an alias containing
  a comma cannot be expressed.
- The reserved-name error dumps the entire reserved list (`:202-207`) instead of naming
  the collision.
- `description` is "Mod-facing note" (`:392`) but surfaces only as a `title` tooltip
  (`variable-row.tsx:62`) — invisible on touch and to keyboard users.
- The delete dialog doesn't mention what happens to a managed valid-combination set keyed
  on the deleted variable's name.
- `combinations-section.tsx:117-136` explains open vs managed mode well, but the only way
  to *leave* managed mode is implicit (check every row), and that isn't stated.

---

## Suggested order of work

1. A1 (placeholder rules published + falsely scored complete) — content correctness.
2. A2 (revisit resets the board) — data loss, and the sidebar makes revisits common.
3. A4 + C1 (first-run entry lands on a dead end / a 404) — first impression.
4. B1–B4 (unsaved-work loss and lying labels) — one dirty-state pass covers most of it.
5. B5, C2, A3 (models that disagree with what the UI told the user).
6. C3–C7, D (funnel and handoff).

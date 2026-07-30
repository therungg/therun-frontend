# Game details step redesign — design

**Date:** 2026-07-30
**Status:** Approved
**Scope:** `app/(new-layout)/games-v2/[game]/setup/steps/step-details.tsx`, `app/(new-layout)/games-v2/[game]/setup/game-details-form.tsx`, `setup.module.scss`

## Problem

The Game details step (step 1 of the category-centric setup wizard) has three
structural problems:

1. **No hierarchy.** ~12 fields render in one undifferentiated scroll.
   "Confirm IGDB-prefilled facts" work and "make policy decisions" work look
   identical, so the moderator can't tell what needs judgment and what needs a
   glance.
2. **The primary action sits mid-page.** `GameDetailsForm` renders its own
   "Save & continue" button at the end of the form — but the Timing, Category
   rules template, Game rules, Emulator policy, and Minimum time sections
   render *after* it, and the same button saves those too.
3. **Layout inconsistency.** The top half is a two-column Bootstrap grid; the
   bottom half is stacked full-width sections. It reads as two screens glued
   together.

All content stays on this step (explicitly decided — no fields move to other
steps or behind progressive disclosure).

## Constraint

`GameDetailsForm` is shared: the console's game-details pane
(`manage/console/game-details-pane.tsx`) uses it with its own inline
"Save details" button and must keep working unchanged.

## Design

### 1. Two zones, one scroll

The step body becomes two labeled zones. Each zone is an eyebrow heading
(`h3.h6`, the existing step-section vocabulary) over `board-surface` content:

**Zone 1 — "Check the facts."** The `GameDetailsForm` fields, keeping the
internal two-column split (cover / release year / platforms / about on the
left; slug / discord / links on the right) but wrapped in one
`styles.section` card. The IGDB provenance line ("Prefilled data comes from
this IGDB entry. Wrong game? Fix the match") moves from the bottom of the
left column to directly under the zone heading, where it explains the whole
zone.

**Zone 2 — "Set the ground rules."** The policy decisions, reordered so
coupled controls sit together:

1. A first row pairing the **Timing** segmented control with the
   **Minimum time** input. The minimum's label already follows the selected
   timing (`Minimum real time` / `Minimum in-game time`); showing them apart
   hides that dependency.
2. **Emulator policy**
3. **Game rules** (textarea)
4. **Category rules template** (monospace textarea) — the two big free-text
   areas end the scroll.

These render as surface cards under the one zone heading, replacing today's
five sibling `.section` blocks each with their own `h3.h6`.

### 2. Control normalization

Emulator policy's three stacked radio buttons become the same segmented
control used for Timing: `Not specified / Allowed / Banned`. One control
vocabulary for one-of-N choices on this screen. State shape is unchanged
(`'allowed' | 'banned' | null`).

### 3. Save flow

- `GameDetailsForm` becomes a real `<form>` element with:
  - an optional `formId` prop, and
  - a prop to suppress its internal submit button (e.g. `hideAction`).
  - Its `save()` runs on the form's `onSubmit`.
- The wizard step renders the single **Save & continue** button in the
  standard `styles.navBar` at the page bottom, using the native
  `<button form="{formId}">` association to submit the form — no refs, no
  imperative handles.
- The save chain is unchanged: form saves identity via
  `updateIdentifiersAction` + `updateGameMetadataAction` → `onSaved` → step
  saves timing/rules/emulator metadata and the min-time policy → `onAdvance`.
- The console pane passes no new props and keeps its inline button (the
  internal button becomes `type="submit"` inside the new form element;
  behavior identical).
- Error notes render above the navBar. The separate "Saving board defaults…"
  paragraph is removed; the button's busy label ("Saving…") covers the whole
  chain, driven by the existing `savingExternally` wiring.

### Out of scope

- No live game-page preview (Approach B — rejected for now).
- No sub-panes / segmented step navigation (Approach C — rejected).
- No data-layer, action, or backend changes.
- No changes to other wizard steps.

## Testing

- `npm run typecheck` gated on the existing baseline diff (main is not clean;
  ~356 pre-existing errors).
- Existing unit tests for setup libs must still pass (no logic changes
  expected there).
- Browser pass, both surfaces:
  - Wizard step 1: save happy path, validation error path (bad minimum time,
    bad slug), timing flip re-reads the minimum bound to that timing,
    Enter-to-submit inside the form.
  - Console `?pane=game-details`: renders and saves exactly as before with
    its inline button.

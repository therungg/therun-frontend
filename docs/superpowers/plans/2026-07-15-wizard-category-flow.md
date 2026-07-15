# Wizard Category-Major Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the setup wizard per `docs/superpowers/specs/2026-07-15-wizard-category-flow-design.md`: categories step becomes a plural-main picker (main = shown), the four dimension steps collapse into a per-main-category config step plus a bulk-apply defaults step.

**Architecture:** Step ids stay a static union (`category-config` carries an internal `?cat=` cursor), so completeness/health/checklist/finish all keep their shape with a remapped step set. All writes reuse the existing, already-reviewed server actions — this is a UI-flow restructure, not a new write surface.

**Tech Stack:** unchanged (Next 16, React 19, vitest, Biome).

## Global Constraints

- Branch: `tier1-console-completion`, direct (Joey's call). Never create PRs.
- No new server actions. Category-scoped writes pass the category's id through the existing actions (`updateTimingSettingsAction`, `updateCategorySettingsAction`, `createVariableAction`/`deleteVariableAction` with `body.categoryId`, `createPolicyAction` with `categoryId`, `curateCategoryAction` for active/isMain).
- `ResolvedCategory.primaryTiming` is `'rt' | 'gt'`; the timing action takes `'realtime' | 'gametime'` — keep the `toPrimaryTiming` mapping (it lives in the old step-timing.tsx; move it with the logic).
- Optional-field defaults precedent: `active ?? true`, `isMain ?? false`, `hideRealTime ?? false`, `hideGameTime ?? false`, `showMilliseconds ?? true`, counts `?? 0` — SYMMETRIC between state init and change-detection everywhere.
- min_time policy value keys `{ minTimeMs, minGameTimeMs }`. Duplicate-policy skip via `data.policies` check (pattern in old step-standards.tsx — preserve it).
- Gates per task: scoped typecheck grep empty; `npx vitest run` green; Biome via hook. No co-author lines.
- Path shorthand: `A/ = app/(new-layout)/games-v2/[game]/`, `S/ = A/setup/`.

---

### Task 1: Completeness + health remodel (TDD)

**Files:**
- Modify: `src/lib/setup/completeness.ts`, `src/lib/setup/health.ts`
- Test: `src/lib/setup/__tests__/completeness.test.ts`, `src/lib/setup/__tests__/health.test.ts` (update)

**Interfaces (breaking, all consumers updated in later tasks):**
- `SetupStepId = 'welcome' | 'details' | 'categories' | 'category-config' | 'defaults' | 'finish'`; `SETUP_STEP_ORDER` matches.
- `CategoryFacts` unchanged (`{ id, display, active, isMain, hasRules }`); "main" everywhere = `active && isMain`.
- `CompletenessInput` unchanged shape; `variableCount`/`policyCount`/`requireVideoAnywhere` feed the defaults/config summaries as below.
- Step semantics:
  - `welcome`: done ("Board snapshot").
  - `details`: unchanged (slug && abbreviation → done, else todo).
  - `categories`: empty ingested list → done (empty-board exception, unchanged summary); else no main (`active && isMain`) → blocker "No categories are marked main (shown on the board)"; else done "N shown / M hidden" (N = mains, M = rest).
  - `category-config`: empty board OR no mains → todo "Configure categories after choosing mains"; all mains have rules → done "All N main categories configured"; else warning "K of N main categories not configured" (K = mains without rules).
  - `defaults`: always done — summary "N variables · standards set" when `variableCount > 0 || policyCount > 0 || requireVideoAnywhere`, else "Optional bulk settings".
  - `finish`: unchanged (configured flag).
- `health.ts` STEP_PANE remap: `details → 'game-details'`, `categories → 'categories-visibility'`, `'category-config' → 'rules'`, `'defaults' → 'timing'`. Stale-triage logic unchanged.

- [ ] **Step 1: Rewrite the completeness tests** for the new step set — keep the fixture helper; cases: clean board all-done; no-main blocker (categories exist, none `active && isMain`); a category `isMain: true` but `active: false` does NOT count as main; empty-board exception (categories AND category-config not blocking); category-config warning counts mains-without-rules only (a hidden category without rules is ignored); defaults always done; finish todo when unconfigured; firstIncomplete ordering. Update the health tests' STEP_PANE expectations (a `category-config` warning maps to pane 'rules').

- [ ] **Step 2: Run, watch the old implementation fail the new tests.**

- [ ] **Step 3: Implement** the remodel in `completeness.ts` (keep `categoryFactsFromResolved` as-is) and the STEP_PANE remap in `health.ts`.

- [ ] **Step 4: `npx vitest run src/lib/setup`** — all green. NOTE: the app will NOT typecheck yet (steps/shell still reference removed ids) — that's expected mid-plan; the task gate here is the vitest suite plus `npm run typecheck 2>&1 | grep 'src/lib/setup'` empty (the lib itself must be clean; app-layer errors are Tasks 2-4's to burn down).

- [ ] **Step 5: Commit** `feat(setup): category-major completeness model`.

---

### Task 2: Categories step — plural main picker

**Files:**
- Modify: `S/steps/step-categories.tsx`

**Interfaces:**
- Keeps `StepProps`. RowState drops the radio semantics: one checkbox column **"Show on board (main)"** per row → checked writes `active: true, isMain: true`; unchecked writes `active: false, isMain: false` via `curateCategoryAction` (both fields, changed rows only, symmetric-defaults diff as today).
- Copy per Joey: banner explains "Checked categories are your main categories — they appear on the leaderboards. Unchecked categories stay hidden." Pre-check = current `active && isMain` union with (when NO main exists yet) the top-activity rows above the low-activity cutoff — i.e. today's pre-check heuristic applied to the single main concept.
- Save gate: ≥1 checked (or empty-board variant, unchanged). Groups mini-editor, activity-share banner, per-row errors, sequential batch — all unchanged mechanics.
- The "Main" radio column is deleted.

- [ ] Step 1: Rework the component per above (this is an edit of an existing reviewed component — preserve its batch/save/error scaffolding, change the row model and copy).
- [ ] Step 2: Gates (`grep 'step-categories'` on typecheck; vitest green) + commit `feat(setup): categories step picks plural main = shown`.

---

### Task 3: Per-category config step

**Files:**
- Create: `S/steps/step-category-config.tsx`
- Delete: `S/steps/step-timing.tsx`, `S/steps/step-rules.tsx`, `S/steps/step-standards.tsx`, `S/steps/step-variables.tsx` (absorb their logic first — read all four before writing)

**Interfaces:**
- `StepCategoryConfig({ data, onAdvance, onBack }: StepProps)` plus it reads the cursor from `useSearchParams().get('cat')`: the main-category list is `data.categories.filter(c => c.active && c.isMain)` ordered by activity; cursor = matching id or the first main. Header: "Category 2 of 4 — Any%" with a per-category jump list (small pills).
- Four sections on one screen, each self-saving with the category's id:
  1. **Timing**: primary (RTA/IGT), show RT, show IGT, milliseconds — the old step-timing row UI for ONE category (keep `toPrimaryTiming`, the both-hidden inline guard, and the dual-action save: `updateTimingSettingsAction` + `updateCategorySettingsAction({showMilliseconds})`).
  2. **Rules**: textarea pre-filled with existing rules or STARTER_TEMPLATE (move the constant), save via `updateCategorySettingsAction({rules})`. The untouched-template rule: navigating away without saving writes NOTHING (sections only write on their save buttons — no implicit save-all here).
  3. **Variables** (category-scoped): the old step-variables editor + template cards, but `categoryId: <current category>` on create; list shows only this category's variables (`data.variables.filter(v => v.categoryId === id)`); delete unchanged (confirm() included).
  4. **Standards**: require-video (+top-N) via `updateCategorySettingsAction`; RT minimum with the WR suggestion (`suggestMinTimeMs`, `data.wrTimes[id]`); optional IGT minimum (`minGameTimeMs` — parity with the console pane); `createPolicyAction` with `categoryId: id`, duplicate-policy skip logic preserved from step-standards (policyExists against `data.policies` scoped to this category).
- Footer: **Save section buttons are per-section**; the step's primary button is "Next category →" (or "Continue to defaults" on the last one) which just navigates: `router.replace(...?step=category-config&cat={nextId})` + `router.refresh()` via a callback the shell provides — simplest: the component itself replaces the URL the same way the shell's goTo does (it already has router; keep the shell untouched by cursor mechanics).
- Empty state (no mains): "Pick your main categories first" + button back to the categories step.

- [ ] Step 1: Read the four old step components; write the new component absorbing their section logic (this is the big task — the section internals move nearly verbatim, scoped to one category).
- [ ] Step 2: Delete the four old files. Do NOT touch the shell yet (Task 5 rewires; the app won't fully typecheck until then — gate this task on `npm run typecheck 2>&1 | grep 'step-category-config'` empty and vitest green).
- [ ] Step 3: Commit `feat(setup): per-main-category config step (timing/rules/variables/standards)`.

---

### Task 4: Defaults (bulk-apply) step

**Files:**
- Create: `S/steps/step-defaults.tsx`

**Interfaces:**
- `StepDefaults({ data, onAdvance }: StepProps)`. Two zones:
  1. **Apply to all main categories** — opt-in rows, each with an enable checkbox + control + nothing happens unless enabled: primary timing (RTA/IGT), show RT, show IGT, milliseconds, require video (+top-N). "Apply to all N main categories" button loops the enabled settings over every main category via the same actions (sequential, progress text, per-category error collection — reuse the batch pattern from step-categories).
  2. **Game-wide variables** — the old step-variables game-wide flow verbatim (template cards + editor + list filtered to `categoryId === null`, `createVariableAction` with `categoryId: null`), with the subcategory/filter explainer strip.
- Footer: "Continue" (advance; everything optional).

- [ ] Step 1: Write the component (bulk zone + the game-wide variables zone recovered from the deleted step-variables — retrieve its code from git history `git show 62a64289^:...step-variables.tsx` or the Task 3 implementer's absorption; the Task 3 report should note where the game-wide variant lives).
- [ ] Step 2: Gate (`grep 'step-defaults'`) + commit `feat(setup): bulk-apply defaults step with game-wide variables`.

---

### Task 5: Shell + welcome + finish rewiring

**Files:**
- Modify: `S/wizard-shell.tsx` (STEPS array + switch), `S/steps/step-welcome.tsx` (the "next steps" list copy), `S/steps/step-finish.tsx` (STEP_LABELS + review list + edit links)

**Interfaces:**
- STEPS: welcome (not skippable), details (skippable), categories (skippable), category-config (skippable), defaults (skippable), finish (not skippable) — labels "Welcome / Details / Categories / Configure / All categories / Mods & finish".
- Switch cases map to the new components; removed ids gone. `goTo('category-config')` lands on the first main category (no `cat` param = component defaults).
- step-finish: STEP_LABELS for the new union; review rows come from completeness (already remodeled); the category-config row's edit link → `setup?step=category-config` (component lands on first unconfigured main — pass `?cat=` of the first main without rules when the completeness warning is active; compute from data).
- step-welcome ordered list: game details → pick main categories → configure each main category → all-categories settings → mod team & go live.

- [ ] Step 1: Rewire; then the FULL typecheck must be clean of wizard errors: `npm run typecheck 2>&1 | grep -E 'setup|wizard'` empty (this task ends the mid-plan window).
- [ ] Step 2: `npx vitest run` green; `rm -rf .next && npm run build` green.
- [ ] Step 3: Commit `feat(setup): category-major wizard flow wired`.

---

### Task 6: Final review + push

- [ ] Controller runs the final whole-branch review over the delta (`c6386095..HEAD` — includes the /mod routing fix), fix wave if needed, updates the delta spec status to Implemented, pushes `tier1-console-completion`.

---

## Plan Self-Review (completed)

- Spec-delta coverage: flag mapping (T2), per-category pass all four dimensions (T3), bulk-apply after + game-wide variables (T4), step model + consumers (T1, T5), deletions (T3). Standards GT-min parity carried into T3.
- Mid-plan typecheck window is explicit and bounded (T1→T5), each task's gate scoped accordingly.
- Type consistency: SetupStepId union defined once (T1), consumed T5; StepProps unchanged; cursor via searchParams matches the shell's existing URL-driven step state (post-fix-wave pattern).

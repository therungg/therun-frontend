# Wizard Category-Major Flow — Design Delta

**Date:** 2026-07-15
**Status:** Approved (Joey, live feedback during testing), not yet implemented
**Amends:** `2026-07-14-game-setup-wizard-design.md` (step structure only; claim flow, console, actions unchanged)
**Branch:** `tier1-console-completion` (direct, per Joey)

## Joey's direction (verbatim intent)

1. Ask about the game first (as today).
2. Then categories: "they can control which of the categories show up on the board, and that they can mark the ones that do as main" — clarified: **not-main is actually not shown on the leaderboards**. So *main is plural and means shown*.
3. Then configure **each main category** (rules, timing, standards, category variables — all four confirmed).
4. Then ask if they want settings applied to **all categories** (e.g. RTA timing) — bulk-apply, after the per-category pass.

## Decisions

| Question | Decision |
|---|---|
| Flag mapping | main ⇒ `active: true` + `isMain: true`; hidden ⇒ `active: false` (isMain false). Public board already displays actives only, so behavior matches. `isMain` becomes the plural featured marker; default landing category = first main by activity. |
| Step list | `welcome → details → categories → category-config → defaults → finish`. The four dimension steps (timing, variables, rules, standards) are DELETED; their logic folds into `category-config` (per main category) and `defaults` (bulk/game-wide). |
| category-config navigation | ONE step id with an internal category cursor via `?step=category-config&cat={categoryId}`. Progress copy "Category 2 of 4 — Any%". Save & next advances the cursor; after the last main category, advances to `defaults`. |
| Per-category sections (one screen per category) | Timing (primary, RT/IGT visibility, ms), Rules (starter template), Variables (category-scoped only; create/list/delete with `categoryId` set), Standards (require video + top-N, RT/IGT minimum with WR suggestion). All write through the existing actions with that category's id. |
| defaults step ("settings for all categories") | Bulk-apply to ALL MAIN categories: primary timing, show RT/IGT, milliseconds, require video. Plus game-wide variables (templates + editor with `categoryId: null`) — a game-wide variable IS an all-categories setting, so the old game-wide variables UI lives here. Every control is opt-in (nothing applies unless the mod enables that row); applying loops the existing per-category actions with progress + per-row errors. |
| Completeness model | `SETUP_STEP_ORDER = ['welcome','details','categories','category-config','defaults','finish']`. categories: blocker when ingested categories exist but no main (`active && isMain`); empty-board exception unchanged. category-config: done when every main category has rules; warning "N of M main categories not configured" otherwise (rules presence is the proxy — same signal as before). defaults: always done (optional). finish: configured flag, unchanged. Health STEP_PANE remaps: categories → 'categories-visibility', category-config → 'rules', defaults → 'timing'. |
| Consumer ripple | completeness tests, health module mapping, checklist card (unchanged mechanics, new step set), finish-step review list (STEP_LABELS + edit links, category-config edit link goes to the first unconfigured main category), wizard shell STEPS array + switch. Standards GT-min from the console pane is unaffected. |
| Deletions | `steps/step-timing.tsx`, `steps/step-rules.tsx`, `steps/step-standards.tsx`, `steps/step-variables.tsx` (logic reused/absorbed, files deleted). |

## Out of scope

- Public board rendering changes for plural mains (board already filters actives; featured ordering is a follow-up).
- Console panes (rules/timing/variables/standards panes keep their per-dimension shape — they're power tools; the wizard is the guided path).
- Bulk-apply reaching non-main (hidden) categories — hidden categories aren't on the board; configure them by making them main.

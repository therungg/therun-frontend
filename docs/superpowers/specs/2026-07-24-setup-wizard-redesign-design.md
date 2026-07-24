# Setup Wizard Redesign — Design

**Date:** 2026-07-24
**Status:** Approved (design), pending implementation plan
**Scope:** `app/(new-layout)/games-v2/[game]/setup/` + the console entry point (`SetupChecklistCard`). Frontend only — no backend changes; every write goes through existing server actions.

## Problem

The current 6-step wizard (Welcome → Details → Categories → Configure → All categories → Mods & finish) is muddled: steps compete with a sidebar rail and nav chrome, "Configure" and "All categories" overlap confusingly, the welcome step is prose-heavy, and the category curation step doesn't communicate its core job — *the site discovered way too many categories; cut them down*. The flow should be distinct, succinct, and clear: game data first, then category triage, then step by step to done.

## Flow & shell

Five linear steps, each **full-focus** (one screen, one job, one primary action):

1. `details` — Game data
2. `categories` — Category triage
3. `defaults` — Game-wide defaults
4. `exceptions` — Per-category exceptions
5. `finish` — Mods & finish

Shell changes:

- **No sidebar rail**, no stat-tile welcome screen. The old `welcome` step is deleted; its orientation collapses into a one-line intro on the game-data screen.
- Top of page: slim **game identity strip** (cover art + game title, ambient-art treatment consistent with the leaderboard hero) and a minimal **progress strip** — five segments plus a mono "2 / 5" counter. Visited steps are clickable. "Back to console" link stays.
- Each screen: one heading stating the job in plain words, one short context line, the task, one large primary action. Steps 3 and 4 are skippable in one click.
- Navigation keeps the current URL model: `?step=<id>`, `router.replace` + `router.refresh()` so each step re-reads server state (shareable/resumable, co-mod safe).

## Screens

### 1. Game data (`details`)

Heading: "First, the game itself." One-line intro absorbs the old welcome ("Runners are already racing here — your job is to curate, not build from scratch."). Reuses `GameDetailsForm` as-is (IGDB-prefilled cover, platforms, links). Save advances.

### 2. Category triage (`categories`)

Heading pattern: "We found **34 categories** from ingested runs — that's too many. Which belong on your board?" The board stats (categories discovered, unique runners, finished runs) move here from the old welcome screen, serving as evidence.

- **Default state: suggested picks.** High-activity categories pre-checked via the existing `src/lib/setup/suggestions.ts` heuristics; the rest unchecked. (Replaces the current "keep existing flags, default top category" logic for unconfigured boards; boards with existing explicit flags keep them as the baseline.)
- Unchecking = non-main/hidden. Same save path as today: `curateCategoryAction` per changed row with per-row error reporting.
- Each row: name, unique runners, finished runs, plus a thin inline **activity bar** (run share as data-texture).
- **Live coverage meter** under the table: "6 shown · 28 hidden · 97% of runs covered", meter fills as rows are toggled.
- Groups UI unchanged, behind the same "Organize into groups (optional)" disclosure.
- Guard unchanged: at least one featured category required to continue. Empty board (no ingested categories) keeps the current empty-state screen and remains completable.

### 3. Game-wide defaults (`defaults`)

Heading: "Set the rules once — they apply to every featured category." Framed as *the* settings, not an "optional bulk pass":

- Timing method (primary timing, show RT/IGT, milliseconds)
- Video proof requirement (with top-N option)
- Review policy (manual review)
- **Board rules textarea** (starter template prefilled) — written to every featured category
- Existing cross-category guards kept (can't hide both RT and IGT, etc.)

Reuses the bulk-apply server actions from the current `step-defaults` (`updateTimingSettingsAction`, `updateCategorySettingsAction`, `createPolicyAction`). Game-wide variables move out of the wizard (console work). Skippable.

### 4. Exceptions (`exceptions`)

Heading: "These 6 categories now use your defaults. Any of them different?"

- List of featured categories, each row showing effective timing + rules state.
- Tapping a row opens a **slim inline override**: timing + rules only, with the existing `CategoryLeaderboardPreview`.
- One-click "No, they're all the same → continue."
- Variables and standards/min-times are explicitly **not** in the wizard — console-only depth.

### 5. Mods & finish (`finish`)

Unchanged in substance: invite co-moderators, board summary, "Go live" sets the `configured` flag. Restyled to match the new shell.

## Completeness & console card

- `SetupStepId` in `src/lib/setup/completeness.ts` becomes the five new ids (drop `welcome` and `category-config`, add `exceptions`). `SETUP_STEP_ORDER` updated to match.
- `computeCompleteness` maps accordingly; `exceptions` inherits the rules-coverage check `category-config` had (featured categories without rules → warning).
- `SetupChecklistCard` (console) sharpened: progress fraction, per-step status lines from completeness, single **"Continue setup"** button jumping to `firstIncomplete`.
- Once `configured`, the card swaps to a **"what's left for the console"** list (variables, standards/min-times, per-category depth) instead of disappearing.
- Existing tests in `src/lib/setup/__tests__/` updated for the new step model.

## Visual direction — "focused, not bland"

Standing rule applies: **no gradient washes** — imposing comes from scale, type, and spacing.

- **Scale does the work.** Centered ~44rem column, step heading at `$font-size-2xl`–`display` scale, generous whitespace.
- **Ghost step numeral:** oversized low-contrast "02" beside/behind each heading — same family as the board hero numerals; gives each screen identity and makes progress physical.
- **Game identity strip** ties the wizard to the game via the hero's ambient-art language.
- **Categories screen is the showpiece:** activity bars as data-texture, checked rows crisp vs unchecked dimmed to tertiary, animated coverage meter.
- **Motion, restrained:** step content fades/slides with `$transition-base`; meter animates width. Nothing bouncy.
- **Consistency:** everything through existing `board.*` mixins (`board-btn-primary`, `control-pill`, `board-table`, `%note` spine) and design tokens. The wizard reads as a first-class board surface.
- Frontend-design skill pass against real screens at implementation time.

## Deletions / replacements

| Current | Fate |
| --- | --- |
| `steps/step-welcome.tsx` | Deleted; intro line moves to game-data screen, stats move to triage screen |
| `steps/step-details.tsx` | Becomes step 1 (reframed heading/copy) |
| `steps/step-categories.tsx` | Rebuilt as triage screen (suggested-picks default, activity bars, coverage meter) |
| `steps/step-category-config.tsx` (993 lines) | Deleted; replaced by slim `exceptions` screen |
| `steps/step-defaults.tsx` (777 lines) | Replaced by slimmer `defaults` screen (no game-wide variables section) |
| `steps/step-finish.tsx` | Kept, restyled |
| `wizard-shell.tsx` + `setup.module.scss` | Rebuilt for full-focus shell (no rail, identity strip, progress strip) |

## Error handling

Unchanged patterns: per-row save errors surface inline with retry-by-resave; step transitions always `router.refresh()` so a step never renders stale server state; guards block advance with `%note`-style warnings rather than toasts where the user must act.

## Testing

- `src/lib/setup/completeness` tests updated for new step ids/order and the exceptions mapping.
- `suggestions.ts` gains/keeps coverage for the pre-check heuristic feeding the triage default.
- Manual browser pass across the five steps (including empty-board and already-configured boards) before merge.

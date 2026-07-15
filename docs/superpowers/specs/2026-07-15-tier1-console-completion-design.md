# Tier 1 Console Completion — Design

**Date:** 2026-07-15
**Status:** Implemented (autonomous — Joey delegated 2026-07-15: "proceed with the next tier... you can just go")
**Roadmap:** Tier 1 items 6 (board health score), 7-remainder (moderator management pane), 8 (game details pane), 9 (setup debt cleanup) from `2026-07-13-leaderboards-vs-src-roadmap.md`
**Branch:** `tier1-console-completion` stacked on `game-setup-wizard`

## Problem

The wizard shipped the guided first-run path, but the console still has two "coming in a later phase" stubs (Moderators, Details & metadata), no ongoing quality signal after setup completes, and a dead legacy UI subtree (the pre-console `ManagePage` tab shell plus the orphaned minimums section) that confuses navigation of the codebase.

Grounding facts (explorer-verified on branch `game-setup-wizard`):

- `manage-page.tsx` is imported by nobody; no route mounts it. Its `?tab=` URL scheme is obsolete (console uses `?pane=`). Dead with it: `tab-strip.tsx`, `category-tab/{category-tab,category-header-strip,category-rail}.tsx`, the whole `minimums/` dir (no page.tsx, reachable only via dead `CategoryTab`), and the now-unreferenced exports in `manage/types.ts`.
- The console MUST keep `category-tab/category-settings-section.tsx` and `category-tab/rules-section.tsx` (content-router imports them) and all of `game-tab/` (groups/visibility/identifiers panes).
- `MinTimePolicyValue` already supports `{ minTimeMs?, minGameTimeMs? }` but the Standards pane and wizard only write `minTimeMs` — deleting the old minimums UI would silently drop the GT-minimum capability unless Standards gains a GT input.
- The moderation queue is flag-scoped: a true "all runs pending verification > 7 days" count has no frontend data source. `AttentionItem.createdAt` (earliest flag/report time) supports "items waiting in triage > 7 days".
- `manage/page.tsx` already loads everything a health score and both panes need (completeness inputs, moderators, metadata, identifiers, attention items); `canEditMods` is computed but not threaded into `NavFlags`.
- The wizard's `StepDetails` reads only `identifiers`/`metadata`/`game{id,name,image}` + `onAdvance` — cleanly extractable into a shared form. `step-finish.tsx`'s mod-team block is the prior art for the Moderators pane.
- Nothing public reads the wizard-written metadata yet (coverUrl/platforms/releaseYear/discordUrl) — pane copy must say so; whether the backend folds `coverUrl` into the resolved `game.image` is unverified (backend question, flagged).

## Decisions (made autonomously, rationale recorded)

| Question | Decision |
|---|---|
| Health score shape | No numeric score in v1 — a graded card (Healthy / Needs attention / At risk) with concrete line items. Numbers invite gaming; lines tell mods what to do. Derived from data already loaded; pure module so the Tier-1 "discovery ranking signal" use can consume it later. |
| Health inputs | Setup completeness (blockers/warnings) + triage hygiene (attention items older than 7 days, count) + standards presence. "All pending runs" count is a documented backend gap, not faked from flag-scoped data. |
| Card placement | One slot: when the board is unconfigured → existing `SetupChecklistCard`; when configured → `BoardHealthCard`. Same position in `console-shell.tsx`. |
| Moderators pane scope | List + add + remove (reusing wizard actions), role badges, last-game-admin guard, pending join-team applications note linking to the attention pane. NO role-change (remove+re-add covers it), NO activity stats (needs backend aggregation — documented follow-up), NO ownership transfer ceremony (add new game-admin, then remove yourself, covers it; guard prevents zero-admin state). |
| Details pane | Extract shared `GameDetailsForm` from `StepDetails` (`{ identifiers, metadata, game: {id, name, image}, onSaved }`); wizard step wraps with `onAdvance`, console pane wraps with toast + `router.refresh()`. Copy notes metadata isn't shown publicly yet. |
| GT minimum | Add an optional in-game-time minimum input to the Standards pane's min-time card, writing `minGameTimeMs` alongside `minTimeMs` in the same `min_time` policy — preserves the only capability the minimums deletion would drop, using a value key the backend already validates. Wizard step 7 stays RT-only (simple path). |
| Cleanup blast radius | Delete: `manage-page.tsx`, `tab-strip.tsx`, `category-tab/category-tab.tsx`, `category-tab/category-header-strip.tsx`, `category-tab/category-rail.tsx`, `minimums/` (all files), and prune `manage/types.ts` to only exports that remain referenced (delete the file if none). Fix the stale `categories/page.tsx` redirect to `/manage?pane=groups`. Keep the two moderation redirect stubs (valid targets). Do NOT touch `src/lib/leaderboard-minimums.ts` (backend data retirement is Joey's call — noted as follow-up). |
| Nav gating | `NavFlags` gains `canEditMods`; the Moderators item shows only with it. Details & metadata shows with `canConfigure` (same ability its actions check). Both lose `reserved: true`. |

## Components

### 1. `src/lib/setup/health.ts` (pure, unit-tested)

```ts
export type HealthGrade = 'healthy' | 'needs-attention' | 'at-risk';
export interface HealthItem {
    severity: 'blocker' | 'warning' | 'info';
    label: string;            // "Rules missing on 2 categories", "3 triage items waiting > 7 days"
    pane?: NavItemId-like string; // deep-link target in the console ('rules', 'standards', 'attention', …)
}
export interface BoardHealth { grade: HealthGrade; items: HealthItem[]; }
export function computeBoardHealth(input: {
    completeness: BoardCompleteness;
    attentionCreatedAts: string[];   // AttentionItem.createdAt values
    now: number;                     // injected for testability
}): BoardHealth;
```

Rules: any completeness blocker → `at-risk`. Completeness warnings map to warning items with pane links (rules → 'rules', standards → 'standards'). Attention items older than 7 days: warning "N triage item(s) waiting more than a week" → pane 'attention' (info when 0 < N ≤ 2, warning above). No items at all → `healthy` with a single info line ("All checks pass"). Grade: `at-risk` if any blocker; `needs-attention` if any warning; else `healthy`.

### 2. `BoardHealthCard` (console)

`manage/console/board-health-card.tsx`, rendered in the `SetupChecklistCard` slot in `console-shell.tsx`: `setupCompleteness` unconfigured/incomplete → checklist card (unchanged); configured → health card. Grade pill + item lines, each linking to its console pane via the existing `?pane=` deep-link (`/games-v2/{slug}/manage?pane={pane}`), self-hides nothing (healthy state still shows a slim confirmation line — mods should see the green). `manage/page.tsx` computes `boardHealth` alongside `setupCompleteness` (attention items already in scope) and threads one new prop.

### 3. Moderators pane

- `nav-model.ts`: `NavFlags.canEditMods: boolean`; `moderators` item drops `reserved`, visible iff `canEditMods`.
- `manage/page.tsx`: thread existing `canEditMods` into flags; pass `moderators` (already loaded) to `ConsoleShell`.
- `manage/console/moderators-pane.tsx` (client): list with role badges (`board admin` / `moderator`), username, since-date; add row (username input + role select, `addGameModeratorAction`); remove buttons (`removeGameModeratorAction`) with the last-game-admin client guard (mirrors `step-finish.tsx`); when `modApplications.length > 0`, a note "N pending applications — review in Needs attention" linking `?pane=attention`. `router.refresh()` after mutations.
- `content-router.tsx`: `case 'moderators'` renders the pane (props threaded like `modApplications`).

### 4. Details & metadata pane

- Extract `A/setup/game-details-form.tsx` (client): `{ identifiers: GameIdentifiers, metadata: GameMetadata, game: { id: number; name: string; image: string | null }, onSaved: () => void }`. Body = current `StepDetails` form + save sequence verbatim (identifiers action → metadata action, stop on error, inline error).
- `setup/steps/step-details.tsx` becomes a thin wrapper: `<GameDetailsForm identifiers={data.identifiers} metadata={data.metadata} game={...} onSaved={onAdvance} />` plus the step heading/copy.
- `manage/console/game-details-pane.tsx`: heading, "These details feed the setup wizard and (soon) the public game page — cover/platform display on the public page is a follow-up." + the form with `onSaved` = success toast + `router.refresh()`.
- `manage/page.tsx` already loads `identifiers` and `metadata` — thread to `ConsoleShell` → router; `nav-model.ts` un-reserves `game-details` (visible iff `canConfigure`).

### 5. Standards GT minimum

`moderation/configure/standards.tsx` min-time card: second optional time input "In-game time minimum"; policy write includes `minGameTimeMs` when set (create or update of the same `min_time` policy row; both keys coexist). Read path already tolerates the key (`MinTimePolicyValue`). Display shows both when present.

### 6. Cleanup

Per the blast-radius decision above. Verification: repo-wide grep proves zero remaining imports of each deleted module before commit; typecheck + build green after.

## Error handling & testing

- Pure `health.ts`: vitest (blocker→at-risk, warning mapping, 7-day bucketing with injected `now`, healthy state, pane links).
- Panes/forms: existing action error patterns (inline error / toast); no new actions are created — every write path is an already-reviewed action.
- Gates per task: `npm run typecheck`, `npm run lint`, `npx vitest run`; final `npm run build`; manual browser pass stays Joey's.

## Out of scope (logged as follow-ups)

- True "all pending runs" count (backend endpoint) and mod activity stats (verifications/month — backend aggregation).
- Public game page rendering of metadata (cover override propagation question included).
- Retiring the `leaderboard-minimums` backend table/lib.
- Ownership-transfer ceremony beyond add-then-remove.
- Health score as discovery-ranking input.

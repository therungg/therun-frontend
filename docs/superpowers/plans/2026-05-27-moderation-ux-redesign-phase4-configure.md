# Moderation UX Redesign — Phase 4: Configure Tab (Standards + Active Bans + History)

> Execute task-by-task. No test framework — verify with `npm run typecheck` + `npm run lint` + `npm run build` + static tracing. Commits authorized; never add a Co-Authored-By line. Branch `moderation-ux-redesign`. Work autonomously; do not ask questions. Husky runs Biome on staged files.

**Goal:** Build the **Configure** tab as three calm, plain-language surfaces that replace the abstract policies/rules/log pages: **Standards** (minimum/maximum time, video-required top-N, Off/Normal/Strict auto-flag sensitivity — per category, with a live "this catches N runs" preview), **Active bans** (the standing exclusion rules, with one-click lift), and a **History** slide-over (the mod-action audit feed, with 24-hour undo) reachable from the page header in both tabs.

**Architecture:** Reuse the shipped libs (`policies.ts`, `mass-mgmt.ts` exclusion-rules + mod-actions) and the existing server actions (`policies-actions.action.ts`, `rules/actions/delete-rule.action.ts`, `log/actions/undo.action.ts`). Standards is a plain-language wrapper over the 5 policy types; its live preview is computed **client-side** from the category roster (`loadRosterAction`). Gating: the Configure tab becomes visible to any moderator (so mods can see Standards previews + bans + history, per spec §9/§12), but **Standards editing is gated to board-admins** (read-only for mods).

**Spec:** §9 (Standards, plain language + live preview, board-admin set / mod preview), §10 (History + undo), §12 (permissions).

**Prerequisite:** Phases 1–3 merged. `moderation-tabs.tsx` exists with a Configure tab currently gated entirely to board-admin (`canConfigure`) and a `categories` prop available.

---

## Context the implementer needs

**Templates to read and reuse (do NOT delete them — Phase 5 does):**
- `manage/moderation/policies/policies-view.tsx` — the CRUD plumbing for policies (time parse/format `msToInput`/`parseTime`, the `ValueEditor`, create/update/delete actions). Standards reuses the *plumbing* but presents *plain language*, not raw policy types.
- `manage/moderation/policies/actions/policies-actions.action.ts` — `createPolicyAction` / `updatePolicyAction(gameSlug,id,value,reason)` / `deletePolicyAction(gameSlug,id,reason)`. Reuse as-is.
- `manage/moderation/rules/rules-view.tsx` + `rules/actions/delete-rule.action.ts` — Active bans template: lists `GameExclusionRuleRow[]`, deletes with a reason. Reuse the delete action.
- `manage/moderation/log/log-view.tsx` + `log/actions/undo.action.ts` — History template: lists `ModActionRow[]`, undo for reversible recent entries. Reuse the undo action.
- `roster/actions/load-roster.action.ts` (`loadRosterAction(gameSlug, categoryId, filter)` → `LeaderboardRosterRow[]`) — for the live Standards preview.

**Policy types (`PolicyType`):** `min_time`, `max_time` (value `{rtMs?, gtMs?}`), `require_video_top_n` (`{n}`), `auto_flag_pb_jump_pct` + `auto_flag_faster_than_wr_pct` (`{pct}`). Policies are per-`categoryId` (or `null` = game-wide), optional `subcategoryKey`. List via `listPolicies(sessionId, gameId, categoryId?)`.

**`LeaderboardRosterRow`** (for preview): `{ runId, userId, runnerName, subcategoryKey, time, gameTime, verificationStatus, vodUrl, isLeaderboardEntry, isLeaderboardEntryGt }` — has `time` (RT ms), `vodUrl`, `isLeaderboardEntry`.

---

## Task 1: Gating — Configure visible to mods, editable by board-admins

**Files:** modify `moderation-tabs.tsx`, `manage/moderation/page.tsx`.

- [ ] **Step 1:** In `page.tsx`, compute two booleans: `canModerate` (already the page gate, `canModerateGame`) and `canEditConfig` (the current board-admin check `can('edit','moderators')`). Pass BOTH to `ModerationTabs` (rename the old `canConfigure` prop to `canEditConfig`, and always render the Configure tab when the viewer can moderate — i.e. always, since the page already requires `canModerateGame`).
- [ ] **Step 2:** In `moderation-tabs.tsx`, always show the Configure tab (the page gate guarantees the viewer is at least a moderator). Pass `canEditConfig` down to the Standards component (controls editability) and render Active bans + History for all moderators. Remove the "hide Configure unless board-admin" logic.
- [ ] **Step 3:** `npm run typecheck && npm run lint`. Commit: `feat(moderation): Configure tab visible to mods, edit gated to board-admin`.

---

## Task 2: Standards (plain-language, live preview)

**Files:** Create `manage/moderation/configure/standards.tsx` (+ `configure/sensitivity.ts` for the mapping).

- [ ] **Step 1: Sensitivity mapping** (`configure/sensitivity.ts`, pure):
```typescript
export type Sensitivity = 'off' | 'normal' | 'strict';
// Maps the user-facing sensitivity to the two pct auto-flag policies.
// 'off' => both policies absent (delete if present).
export const SENSITIVITY_PCT: Record<
    Exclude<Sensitivity, 'off'>,
    { pbJumpPct: number; fasterThanWrPct: number }
> = {
    normal: { pbJumpPct: 50, fasterThanWrPct: 5 },
    strict: { pbJumpPct: 25, fasterThanWrPct: 2 },
};
/** Derive the current Sensitivity from existing pct policy values (nullable). */
export function sensitivityFromPcts(
    pbJumpPct: number | undefined,
    fasterThanWrPct: number | undefined,
): Sensitivity {
    if (pbJumpPct == null && fasterThanWrPct == null) return 'off';
    if ((pbJumpPct ?? 99) <= 25 || (fasterThanWrPct ?? 99) <= 2) return 'strict';
    return 'normal';
}
```

- [ ] **Step 2: The Standards panel.** A client component. Props: `{ gameSlug, gameDisplay, categories, canEdit }`. A category selector at top (default the first category; offer the real categories — NOT a "game-wide" option for the live-preview MVP, since preview needs a concrete roster). For the selected category, load its existing policies (`listPolicies` via a small server action `loadStandardsAction(gameSlug, categoryId)` you add in `configure/actions/standards.action.ts`, returning the policies array) and render plain-language fields:
  - **"Reject runs faster than" [time input]** → `min_time` (rtMs). Empty = no minimum (delete the policy if it existed).
  - **"Reject runs slower than" [time input]** → `max_time` (rtMs). Empty = none.
  - **"Require video in the top" [N]** → `require_video_top_n`. Empty/0 = none.
  - **"Auto-flag suspicious runs" [Off · Normal · Strict]** segmented control → the two pct policies via `SENSITIVITY_PCT`.
  Reuse `msToInput`/`parseTime` from `policies-view.tsx` (extract them to `configure/time-input.ts` and import in both, OR copy with a comment — prefer extract to keep DRY; if extracting, update `policies-view.tsx`'s imports too since it's still alive until Phase 5).
  - **Save** (one button, board-admin only): diff the form against the loaded policies and create/update/delete the affected policies via the existing `createPolicyAction`/`updatePolicyAction`/`deletePolicyAction`. A single reason field (min 10) applies to the batch. When `!canEdit`, render every field disabled and hide Save with a muted note "Only board-admins can change standards."
- [ ] **Step 3: Live preview.** Below the fields, a preview box. On category change AND on field edit (debounced or on an explicit "Preview" — pick on-change with a `useTransition`), call `loadRosterAction(gameSlug, categoryId, {})` and compute client-side against the CURRENT (unsaved) field values:
  - runs with `time != null && time < minRtMs` → "would be removed (below minimum)".
  - runs with `time != null && maxRtMs != null && time > maxRtMs` → "below maximum".
  - among rows where `isLeaderboardEntry`, the top `N` by time (ascending) with `vodUrl == null` → "missing required video".
  Render: "With these standards: **X** runs below minimum · **Y** over maximum · **Z** missing required video in the top N." + a collapsible sample list. (Auto-flag sensitivity can't be previewed client-side — show a one-line note "applies to new submissions" rather than a count.) The preview reflects unsaved edits so a board-admin sees consequences before saving.
- [ ] **Step 4:** `npm run typecheck && npm run lint`. Commit: `feat(moderation): plain-language Standards with live preview`.

---

## Task 3: Active bans

**Files:** Create `manage/moderation/configure/active-bans.tsx`; add `loadBansAction` to `configure/actions/standards.action.ts` (or a `bans.action.ts`) wrapping `listExclusionRules`.

- [ ] **Step 1:** List `GameExclusionRuleRow[]` (`{ ruleId, targetDisplayName, categoryName|null, reason, excludedByName, createdAt }`). Template: `rules-view.tsx`. Render as a calm list: "**{targetDisplayName}** — banned from {categoryName ?? 'the whole game'} · by {excludedByName} · {date}" with a **Lift ban** button (reason required, min 10) calling the existing delete-rule action. On success, remove the row + toast "Ban lifted — N runs reinstated." (the `DeleteRuleResult` has `reinstatedRunCount`). Available to any moderator (lifting is recovery, not config).
- [ ] **Step 2:** Empty state: "No active bans." `npm run typecheck && npm run lint`. Commit: `feat(moderation): Active bans list with lift`.

---

## Task 4: History slide-over

**Files:** Create `manage/moderation/configure/history-drawer.tsx`; add a header trigger in `moderation-tabs.tsx`.

- [ ] **Step 1:** A right-side slide-over (Bootstrap offcanvas markup or a fixed-position panel — match any existing drawer in the app; if none, a simple `position-fixed` panel with a backdrop) listing `ModActionRow[]` from `listModActions` (via a `loadHistoryAction`). Template: `log-view.tsx`. Each entry: actor, action, target, remark, `moment(timestamp).fromNow()`; reversible recent entries (the actions `log-view` allows undo for) get an **Undo** button wired to the existing `undo.action.ts`. Load lazily when the drawer opens.
- [ ] **Step 2:** Add a **History** button (clock icon + label) in the `ModerationTabs` header so it's reachable from BOTH tabs (spec §10). Toggles the drawer.
- [ ] **Step 3:** `npm run typecheck && npm run lint && npm run build`. Commit: `feat(moderation): History slide-over with undo`.

---

## Task 5: Assemble the Configure tab + verify

- [ ] **Step 1:** In `moderation-tabs.tsx` Configure tab body, render `<Standards … canEdit={canEditConfig} />` then `<ActiveBans … />`. (History is the header drawer.) Remove the temporary links to the old `/policies`, `/rules`, `/log` pages added in Phase 2.
- [ ] **Step 2:** `npm run build` exit 0. Update `MODERATION_FRONTEND_STATUS.md` Phase 4 line. Commit: `docs(moderation): record Phase 4 (Configure tab) landed`.

---

## Self-Review checklist
- Standards: plain-language fields (no raw `min_time`/`pct` jargon), per-category, live preview from real roster data reflecting unsaved edits, board-admin edit / mod read-only (§9).
- Sensitivity Off/Normal/Strict maps to the two pct policies; deriving current value from existing policies works.
- Active bans list + lift (= Restore) available to mods; reinstated count surfaced.
- History slide-over reachable from both tabs, undo on reversible entries (§10).
- Configure tab visible to any moderator; only Standards editing gated to board-admin (§12) — corrects Phase 2's over-strict full hide.
- Old policies/rules/log pages still on disk (Phase 5 deletes); Configure no longer links to them.
- Types confirmed vs `types/moderation.types.ts`; no fabricated fields.

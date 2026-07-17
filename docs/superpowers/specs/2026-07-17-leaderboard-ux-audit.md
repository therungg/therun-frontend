# Leaderboard UX Audit — Viewing + Moderation

**Date:** 2026-07-17
**Scope:** `app/(new-layout)/games-v2/**` (public board, run view, submit) and `…/manage/**` (console, moderation).
**Method:** three parallel code audits — viewer journey, moderation journey, design-system compliance against `.interface-design/system.md`. All high-severity findings spot-verified against source.
**Bar:** better than speedrun.com; Apple-grade clarity.

---

## Verdict

**Viewing: 8/10 architecture, 6/10 execution.** The bones are genuinely better than speedrun.com: fully URL-driven state (shareable filtered views, honest back button), the crown answers "who's fastest" in one glance, the three-tier grouping (categories → subcategory pills → filter popover) is the right structure, and motion/empty states are considered. What drags it down is the last mile: raw machine strings leak into UI, actions vanish on touch, and stock Bootstrap chrome survives on the flagship surface.

**Moderation: 7/10 concept, 5/10 coherence.** The unified attention inbox (flags + reports + appeals + self-claims deduped per runner, severity-sorted) and the preview-before-commit dialogs are better than speedrun.com's siloed queues — genuinely Apple-grade consequence design. But two competing "moderation homes" coexist, the sidebar is named in system language, the triage loop is slower than SRC's per run, and a backend failure renders as a celebratory "All clear".

**Design system: 7/10.** Depth/spacing discipline is real. Erosion comes from hand-copied recipes instead of composing `_board.scss` (pills, empty states, steppers exist as 3–5 drifted clones) and three different reds / two different greens across surfaces.

---

## Critical findings (verified)

### Trust breakers

1. **False "All clear" on backend failure.** Every attention-inbox source is `.catch(() => null)` (`manage/page.tsx:75-77`, `console/load-chrome.ts:50-52`); a failed queue fetch renders the success empty state. Mods cannot distinguish "no work" from "API down" — pending runs silently rot.
2. **Unverified runs wear the crown unlabeled.** `game-hero.tsx` crowns `entries[0]` even when `pending`; the empty-state copy ("No verified runs yet") implies the crown means verified when it doesn't. The verified toggle is buried inside the Filters popover.
3. **Ranked-timing ambiguity.** `leaderboard-table.tsx:39-40` always renders Real time before Game time regardless of `category.primaryTiming`. On IGT-ranked boards the dominant column is not the ranking column and nothing says which one ranks.

### Dead ends

4. **All row actions vanish on touch.** `leaderboard.module.scss:58-62` hides `.reveal` at `(pointer: coarse)`. "Hide my run" / "Restore my run" exist *only* in that menu (`row-actions-menu.tsx:162,172`) — impossible on mobile.
5. **Logged-out visitors never see "Submit a run"** (`game-hero.tsx` gates it on `sessionUsername`), even though `/submit` handles auth gracefully. The most common visitor has no path to the core action.
6. **The single-run manage page cannot Approve** (`manage/run/[runId]/run-card.tsx` — Remove/Restore/Ban only). The blessed "Open in console" deep-link from a pending run lands a mod somewhere they can't do the one thing they came for.
7. **Console "Roster" and "Reports" sidebar items are placeholders** — a first-time mod clicks them and concludes the console is half-finished.

### Friction

8. **Approve requires a ≥10-char typed reason** (`run-action-dialog.tsx:40,149`), same as Remove/Ban. The 95% action costs 2 clicks + a sentence; mods will type garbage. No keyboard shortcuts, no batch verify. SRC verifies in ~2 clicks; we must beat that, not lose to it.
9. **Two competing moderation homes.** `/manage` (console) and `/manage/moderation` (legacy `ModerationTabs`) render the same panes in different chrome with different names; roster/runner sub-route "Back to moderation" links exit the console into the legacy page.
10. **Self-claim asks users to type a machine string.** "Subcategory key (leave blank if none)" expects `name=value|name=value` matching the canonical fragment exactly (`self-claim-button.tsx:160`). It also competes with "Submit a run" as an undifferentiated second CTA.

### Language

11. **Raw machine keys in user-facing UI** (≥6 places): run-view subcategory badge prints `platform=pc|patch=1.0`; run-badges prints `console=n64, region=ntsc`; invalid-combination pills, attention cards, WR-history "Timing" column (raw enum), history drawer `exclude_via_rule` codes.
12. **System-first nav names**: Standards (= minimum time), Identifiers (= URL & abbreviation), Combinations (= which sub-boards exist), Roster (= run browser, but sits next to "Moderators" which IS people), Reassign (= merge games/categories). Tooltip-only jargon on the board: "set time", "pending" (title attr — unreachable on touch/keyboard).

### Consistency

13. **Five confirmation idioms** in moderation: crafted preview dialog, inline expand-to-confirm, `window.confirm` (3 places), `window.prompt` (2 places). Public board uses native `confirm()` for hide/restore plus three stock Bootstrap modals.
14. **Console pane state not in URL** — refresh loses your place, Back exits the console, can't link a co-mod to "Bans". The `?pane=` reader already exists; navigation just never writes it. Attention badge is a stale server snapshot while the pane removes cards locally.
15. **Design-token drift**: three reds (`$accent-red`, `--bs-danger`, `.text-danger`), two "success" greens (`$accent-green` vs `--bs-primary`), two mono-time vocabularies (`board.mono-time` vs `mx.monospace-value`), 15+ off-grid spacing literals, duplicated pill/empty/stepper/errorAlert recipes because half the console SCSS never composes `_board.scss`.

### Worth protecting (do not regress)

- URL-driven filter/category/page state everywhere on the public board.
- The crown hierarchy + podium spines + `.youRow` marker.
- The unified attention inbox model (`attention-model.ts`).
- Preview-before-commit dialogs with affected-count previews and loud-vs-quiet removal semantics.
- The ban lifecycle: scope choice, one-click lift with reinstated count, "Ban runner instead…" nudge on mass-select, 24 h exclusion undo.

---

## Improvement plan

Ordered by leverage. Phases 1–2 are the "it must be fantastic" core; 3–5 are polish that compounds.

### Phase 1 — Trust & dead ends (viewing + moderation)

1. **Honest degraded states.** Propagate a `degraded` flag per attention source; render "Couldn't load X — retry" instead of "All clear". Same for the leaderboard pager's silent `if (!res) return;`.
2. **Mobile actions.** Show the row menu as a visible kebab on coarse pointers; add Hide/Restore-my-run to `RunActions` on the run detail page.
3. **Always-visible Submit CTA.** Ungate "Submit a run" in the hero; link "set the first record" and the empty-board state to `/submit`. Demote "Apply to moderate" out of the hero.
4. **Approve on the run manage page**, and make the console Roster/Reports items real (direct-navigate Roster; point Reports at the attention pane pre-filtered, or hide until built).
5. **Crown honesty + ranked column.** Badge the crown "pending verification" when rank 1 is unverified; order the primary timing column first and mark it as the ranking column; dim the secondary.

### Phase 2 — The triage loop (moderation core)

6. **One-keystroke verify.** Reason optional for approve/restore (keep ≥10 chars for remove/ban). Keyboard: `J/K` to move between cards, `V` approve, `R` remove, Enter confirm. Multi-select checkboxes on the attention pane with batch verify.
7. **Undo in the toast.** 10-second "Undo" on approve/reject toasts (counter-action under the hood), extending the existing exclusion-undo pattern.
8. **Runner context on the card**: verified-run count + account age inline, so triage doesn't require "View runner" round-trips.
9. **One moderation home.** Redirect `/manage/moderation` → `/manage?pane=attention`; delete `ModerationTabs`; fix all "Back to moderation" links to target the console.
10. **URL-synced panes + live badge.** `router.replace('?pane=…')` in `handleNavigate`; lift the attention count so it decrements as cards clear. `?pane=history` opens the drawer.

### Phase 3 — Language (one pass, whole surface)

11. **`formatSubcategoryKey(key, defs)`** shared helper → "PC · Patch 1.0" everywhere a raw key leaks; map timing enums to "Real time"/"Game time"; map history action codes to sentences.
12. **Rename nav to task language**: Standards → "Minimum time", Identifiers → "URL & abbreviation", Combinations → "Sub-boards", Roster → "Browse runs", Reassign → "Merge games & categories".
13. **Visible microcopy for board jargon**: "set time"/"pending" pills get an info popover (tooltips don't exist on touch); one glossary treatment for RTA/IGT.
14. **Self-claim merged into submit** as an "assert a time (no video/splits)" branch reusing the submit form's subcategory selects; kill the free-text key field and the duplicate hero CTA.

### Phase 4 — One vocabulary (consistency)

15. **One dialog primitive** (focus trap, Escape, autofocus, `aria-labelledby`) replacing: native `confirm()`/`prompt()` (5 call sites), the hand-rolled claim modal, and the three stock Bootstrap modals in `row-actions-menu.tsx` — restyled with the `run-action-dialog` chrome mods already get.
16. **Compose `_board.scss` everywhere** system.md mandates: add `board-empty` + `board-stepper` mixins, delete the hand-copied pill/surface/eyebrow/errorAlert clones in console/needs-attention/reassignments SCSS.
17. **Settle the palette**: one red (`$accent-red`), one green (decide and encode in system.md), one mono-time mixin. Fix the off-grid spacing literals while touching each file.
18. **Uniform pane conventions**: save-button placement, inline-error vs toast policy, category picker (Standards consumes the shell's picker), split or anchor-scroll the triple-entry GameTab pane.

### Phase 5 — Polish that beats SRC

19. **"Find me" jump** when the signed-in user has an entry beyond page 1; persistent "Showing 51–75 of 312" range indicator; crown fetches the real WR on deep-linked pages.
20. **Filter chips in the band** echoing active variable filters ("Filters · Glitchless"); surface the verified toggle at band level.
21. **Rules in the submit flow** (collapsed `RulesPanel` for the selected category); `requireVideo` makes the field actually required, dropping the contradictory "(optional)".
22. **Focus management sweep**: filters popover + variable pills get focus-move/trap/restore + `aria-expanded`/Escape; pane switches announce via `aria-live`; roster auto-loads; touch targets ≥44 px at `(pointer: coarse)`.
23. **Non-mod console page**: replace bare `notFound()` with "You're not a moderator of this board — apply here", wired to the existing application flow; unify the run-manage capability gate with `canModerateGame`.

---

## Status

- [ ] Phase 1 — Trust & dead ends
- [ ] Phase 2 — Triage loop
- [ ] Phase 3 — Language
- [ ] Phase 4 — One vocabulary
- [ ] Phase 5 — Polish

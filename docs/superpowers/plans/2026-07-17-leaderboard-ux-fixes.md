# Leaderboard UX Fixes — Implementation Plan

Executes every finding in `docs/superpowers/specs/2026-07-17-leaderboard-ux-audit.md`.
Branch: `leaderboard-ux-fixes` (stacked on `leaderboard-user-meta`). Base: f19a9fc9.

## Global constraints (binding for every task)

- **Design system:** follow `.interface-design/system.md`. Compose `_board.scss` / `_design-tokens.scss` / `_mixins.scss` — no new raw hex colors, no off-grid spacing literals, borders+tint depth (shadow only for overlays/hover), no emoji glyphs in UI (inline SVG icons, stroke 1.5, currentColor).
- **Paths:** app code under `app/(new-layout)/games-v2/[game]/`. Aliases `~src/*`, `~app/*`.
- **Caching:** any new server-side fetch uses `'use cache'` + `cacheLife()` + `cacheTag()`. Never `{ next: { revalidate } }`. `revalidateTag(tag, profile)` takes 2 args; use `updateTag` for read-your-writes flows.
- **Auth:** `getSession()` returns the User directly (`session.id` is the bearer token); pass `session` straight to permission helpers.
- **Frontend lane only:** never edit `../therun` (backend). If a fix needs data/endpoints the API doesn't provide, implement the gracefully-degrading frontend version and document the needed backend change in your report under "Backend handoff".
- **Verification gate per task:** `npm run typecheck` and `npm run lint` introduce **no NEW errors** (the repo has pre-existing typecheck errors in userform/victory/rbac/use-navigation-event — those don't count). `npx vitest run <touched test files>` passes. New pure logic gets vitest tests (TDD).
- **Commits:** conventional style (`feat(board): …`, `fix(console): …`). Do NOT add a Co-Authored-By trailer.
- **User-facing copy:** plain task language, sentence case, no internal system vocabulary, no raw enum/machine strings.

---

## Task 1: Shared dialog primitive with real focus management

**Goal:** One accessible dialog primitive, extracted from the moderation dialog's chrome, that every confirm/prompt/modal in games-v2 can use.

**Files:** new `app/(new-layout)/games-v2/[game]/shared/board-dialog.tsx` (+ `board-dialog.module.scss`), refactor `manage/moderation/shared/run-action-dialog.tsx` (+ its module.scss), `manage/moderation/configure/history-drawer.tsx`.

**Requirements:**
1. `BoardDialog` component: overlay + panel using the existing `run-action-dialog.module.scss` visual chrome (backdrop scrim, board-surface panel, same radii/spacing tokens). Props: `open`, `onClose`, `labelledBy`/`title`, `size?`, `children`, `initialFocusRef?`.
2. Accessibility, all of it: `role="dialog"` + `aria-modal` + `aria-labelledby`; focus moves into the dialog on open (initialFocusRef or first focusable); Tab/Shift-Tab trapped inside; Escape closes (listener works regardless of where focus sits); focus returns to the trigger element on close; background scroll locked while open; backdrop click closes (prop to disable for destructive flows).
3. Refactor `run-action-dialog.tsx` to render through `BoardDialog` — zero visual change, but it gains the trap/autofocus/restore it currently lacks (audit finding 15: Escape only works when focus is inside; no trap; background tabbable).
4. `history-drawer.tsx` gets the same treatment (it's an overlay drawer — trap + restore + Escape; keep its slide-in presentation).
5. Extract the byte-identical `errorAlert` styles later (Task 23) — do not do SCSS dedup here.

**Verify:** typecheck/lint gates; add a vitest test for any extracted pure focus-order helper if you write one (DOM behavior itself is exempt from unit tests).

---

## Task 2: Label helpers — kill raw machine strings (viewing surfaces)

**Goal:** Users never see `platform=pc|patch=1.0`, raw timing enums, or normalized keys.

**Files:** new `app/(new-layout)/games-v2/[game]/labels.ts` + `labels.test.ts`; apply in `run-view/run-view.tsx` (~line 85 subcategory badge), `run-view/run-badges.tsx` (`VariablesLine`), `game-page.tsx` (`InvalidCombinationNotice` suggestion pills), `drawers/wr-history-drawer.tsx` (Timing column).

**Requirements:**
1. TDD a pure `formatSubcategoryKey(key: string, defs?: { name: string; nameNormalized: string; values?: { value: string; label?: string }[] }[]): string` — parses `name=value|name=value`, maps normalized names/values to display names via defs when provided, falls back to humanized title case, joins with ` · `. `platform=pc|patch=1.0` → `PC · Patch 1.0` (with defs) / `Pc · Patch 1.0` (without). Empty/blank key → `''`.
2. `timingMethodLabel(method: string): string` — `realTime`/`RTA`-family → `Real time`, `gameTime`/`IGT`-family → `Game time`, unknown → humanized fallback (never the raw enum). Check `types.ts` for the actual enum values first.
3. `formatVariableList(vars)` for `VariablesLine` — display names, no `=` signs, ` · ` separator.
4. Apply at the four viewing call sites above. Variable defs are available in the page data (`data.ts` / `types.ts`) — thread them where cheap; fallback path is acceptable where defs aren't in scope.
5. Moderation call sites are Task 19 — don't touch them here.

**Verify:** vitest for labels.test.ts (write tests first); typecheck/lint gates.

---

## Task 3: Honest degraded states

**Goal:** A backend failure must never render as success.

**Files:** `manage/console/load-chrome.ts`, `manage/page.tsx`, `manage/moderation/page.tsx`, `manage/moderation/attention/needs-attention.tsx` (+ its module.scss), `leaderboard/leaderboard-pager.tsx`.

**Requirements:**
1. The attention sources (`listQueue`, `listGameReports`, `listManualTimes`, and any other `.catch(() => null)` inbox feed) resolve to `{ ok: true, data } | { ok: false, source }` instead of silently nulling. Collect failed source names into `degradedSources: string[]` passed to `NeedsAttention`.
2. In `NeedsAttention`: if `degradedSources` non-empty and no items → replace the "All clear" empty state with a warning state: "Couldn't load {sources} — the queue may not be empty." + Retry button (`router.refresh()`). If items exist but a source failed → warning banner above the list, same copy, list still shown. Style with existing board alert/amber patterns.
3. The celebratory "All clear" renders only when every source loaded.
4. `leaderboard-pager.tsx`: the silent `if (!res) return;` becomes an inline error under the pager buttons ("Couldn't load more runs." + Retry) that clears on success; "Show previous" gets the same "Loading…" pending label "Show more" already has.

**Verify:** typecheck/lint gates. If `mergeAttention` gains logic, cover it in the existing test file if one exists (check `attention/`).

---

## Task 4: Row actions reachable on touch + hide/restore on run page

**Goal:** No action is desktop-only.

**Files:** `leaderboard/leaderboard.module.scss`, `leaderboard/leaderboard-row.tsx`, `leaderboard/row-actions-menu.tsx`, `run-view/run-actions.tsx`.

**Requirements:**
1. Remove the `@media (pointer: coarse) { .reveal { display: none; } }` rule. On coarse pointers the actions trigger renders always-visible as a kebab with a ≥44px hit area (padding, not font-size). On fine pointers keep the current hover/focus-within reveal.
2. The trigger must not fight the row click: it already stops propagation — keep that; verify tapping the kebab never navigates.
3. Add "Hide my run" / "Restore my run" to `RunActions` on the run detail page for the session user's own run, reusing the exact same server action + confirmation the row menu uses (extract a small shared hook/module so the logic isn't duplicated). Confirmation via `BoardDialog` (Task 1) explaining the consequence ("Your run is hidden from the leaderboard. You can restore it any time.") — do NOT use `window.confirm` (the row menu's `confirm()` gets replaced in Task 7; if trivial, you may switch it to the shared dialog here instead and Task 7 skips it).

**Verify:** typecheck/lint gates.

---

## Task 5: Submit is always reachable; hero decluttered

**Goal:** The most common visitor sees the core action.

**Files:** `header/game-hero.tsx`, `game-page.tsx`, `sidebar/sidebar.tsx`.

**Requirements:**
1. "Submit a run" renders for everyone (drop the `sessionUsername &&` gate) — `/games-v2/{game}/submit` already handles logged-out users with a Twitch gate.
2. The crown's empty-state "set the first record" text links to the submit page. The empty-game state in `game-page.tsx` ("No runs uploaded for this game yet.") gains a "Submit the first run" link/button.
3. Move "Apply to moderate" out of the hero action cluster: render it as a quiet link at the bottom of the sidebar. Hero keeps at most: claim CTA (unclaimed games), Submit a run, Moderate (for mods).
4. Do not remove the SelfClaimButton yet (Task 11 merges it into submit); leave it where it is.

**Verify:** typecheck/lint gates.

---

## Task 6: Crown honesty + ranked-column truth

**Goal:** The board never misrepresents who's fastest or by which clock.

**Files:** `header/game-hero.tsx`, `leaderboard/leaderboard-table.tsx`, `leaderboard/leaderboard.module.scss`, `game-page.tsx` (prop threading).

**Requirements:**
1. When the crowned entry (`entries[0]` on page 1) has `verificationStatus === 'pending'`, the crown shows a "Pending verification" pill (board-pill, amber family) adjacent to the time. Copy elsewhere stays consistent ("No verified runs yet" empty state is then honest).
2. `leaderboard-table.tsx`: column order follows `category.primaryTiming` — primary timing column first. The primary column header carries a subtle "ranked" marker (e.g. small board-pill or emphasized header + `aria-label="Game time — ranking column"`); the secondary time column renders dimmed (existing muted token).
3. Row cells reorder to match the headers (check `leaderboard-row.tsx` and `merge-entries.ts` for where RT/GT cells are emitted).
4. No layout jump between categories with different primary timing — same column count, just swapped order.

**Verify:** typecheck/lint gates; `npx vitest run` on `merge-entries.test.ts` if touched.

---

## Task 7: De-Bootstrap the public board

**Goal:** The flagship surface speaks the design system, not stock Bootstrap.

**Files:** `leaderboard/row-actions-menu.tsx`, `leaderboard/leaderboard-row.tsx`, `leaderboard/leaderboard-table.tsx`, `leaderboard/leaderboard.module.scss`, `claim/claim-cta.tsx`.

**Requirements:**
1. `row-actions-menu.tsx`: replace `Dropdown.Toggle variant="outline-secondary"` with a control-pill/kebab trigger (compose `_board.scss` control-pill; keep react-bootstrap Dropdown mechanics if convenient, restyle the toggle + menu). Menu items lose `className="text-danger"` — destructive items use `$accent-red` via a module class.
2. Replace the three stock `Modal`s (report / appeal / history) with `BoardDialog` (Task 1) using the run-action-dialog chrome vocabulary (eyebrow, title, reason textarea pattern, footer buttons right-aligned like the mod dialog).
3. Replace the native `confirm()` for hide/restore with a `BoardDialog` confirm (skip if Task 4 already did).
4. `leaderboard-row.tsx` "Manage" `btn btn-sm btn-outline-secondary` → control-pill styled link.
5. `leaderboard-table.tsx` empty state: replace `text-center py-4 text-muted` with the system's calm empty pattern (icon + title + optional hint, matching the console's `.empty`). Branch the copy: filters active → "No runs match these filters." + Clear filters; no filters → "No runs on this board yet." + "Submit the first run" link (fixes audit M2). "Any filters active" must be computed from the actual URL/filter state, threaded from `game-page.tsx`.
6. `claim-cta.tsx`: replace the hand-rolled `modal d-block` div with `BoardDialog`.

**Verify:** typecheck/lint gates.

---

## Task 8: Deep-page context — find me, range, real WR

**Goal:** Page-3 deep links and long boards stay oriented.

**Files:** `leaderboard/leaderboard-pager.tsx`, `header/game-hero.tsx`, `game-page.tsx`, `data.ts`, `actions/fetch-page.action.ts`.

**Requirements:**
1. Persistent range indicator near the table: "Showing {first}–{last} of {total}" whenever total is known — including after all pages are loaded (currently the "X of Y" meta disappears; fix that).
2. Crown on deep links (`?page=N`, N>1): fetch page 1 (server-side, same cached path as normal load) so the crown always shows the actual record instead of "—".
3. "Find me": when `sessionUsername` is set and their entry isn't in the loaded rows, show a "Find me" control near the pager. Implementation: check whether the page/list API can return the user's rank or filter by user (read `fetch-page.action.ts` + `src/lib` board fetchers). If yes: jump straight to that page, scroll to and flash-highlight the `.youRow`. If no: iteratively fetch forward up to 10 pages looking for the user; found → scroll+highlight; not found → quiet "Not on this board yet" inline note. Document a rank-lookup endpoint in Backend handoff if you had to iterate.

**Verify:** typecheck/lint gates.

---

## Task 9: Filter visibility + filter a11y

**Goal:** Active filters are always visible; filter controls are keyboard-first.

**Files:** `filters/filter-bar.tsx`, `filters/filters-popover.tsx`, `filters/variable-pill.tsx`, `filters/verified-toggle.tsx`, `game-page.module.scss`.

**Requirements:**
1. Active variable filters echo as removable chips in the sub-band row (next to subcategory pills): "{Variable}: {Value} ×". Removing a chip clears that filter (same URL mechanics as the popover).
2. Move the "Verified runs only" toggle out of the popover into the band as a control-pill toggle (visible state, `aria-pressed`). The popover keeps only variable filters; its count badge now counts only those.
3. `filters-popover.tsx`: on open, move focus into the panel; trap Tab; restore focus to the trigger on close (reuse the focus utilities from Task 1's primitive if extractable, else local implementation).
4. `variable-pill.tsx` dropdown: `aria-haspopup="listbox"` + `aria-expanded` on the trigger; Escape closes and restores focus; closing on outside interaction also handles focus leaving via keyboard (`focusout` when focus exits the container).
5. `category-pills.tsx`: move the `aria-label` onto the actual `<nav>` element (it currently sits on a plain div and is ignored).

**Verify:** typecheck/lint gates.

---

## Task 10: Rules inside the submit journey

**Goal:** A submitter can read the rules they're submitting under, and required means required.

**Files:** `submit/submit-form.tsx`, `submit/page.tsx`, `rules/rules-panel.tsx` (reuse).

**Requirements:**
1. When a category is selected in the submit form, render that category's rules in a collapsed disclosure ("Category rules") using the existing `RulesPanel` presentation. Rules data: reuse whatever the board page fetches (check `data.ts` / `load-variables.action.ts` for where rules live; add a lightweight server action only if nothing loads them client-side).
2. When the selected category has `requireVideo`: the video field label drops "(optional)", gains "required", and client-side validation blocks submit with an inline error if empty. The passive hint ("This category requires video for verification") stays as the explanation.
3. No rules configured → no empty disclosure (omit entirely).

**Verify:** typecheck/lint gates.

---

## Task 11: Merge self-claim into the submit flow

**Goal:** One "get on the board" entry point; nobody ever types a machine key.

**Files:** `submit/submit-form.tsx`, `submit/page.tsx`, `self-claim-button.tsx`, `header/game-hero.tsx`, `claim/actions/submit-claim.action.ts` (read-only), `types.ts`.

**Requirements:**
1. Remove the "Submit / correct my time" SelfClaimButton from the hero.
2. The submit page gains a mode switch at the top: "Submit a run" (default, current form) vs "Claim an existing time" (the self-claim path — assert a time without video/splits, e.g. correcting an imported time). Use task-language copy explaining when to pick each (one sentence per mode).
3. The claim mode reuses the submit form's category + subcategory `<select>`s and time inputs; it builds the canonical subcategory key programmatically (the exact `name=value|name=value` fragment the action expects — read how `submit-form.tsx` builds `canonicalSubcategoryFragment` and reuse that code path). The free-text "Subcategory key" input is deleted.
4. Submission goes through the existing `submit-claim.action.ts` unchanged. Post-submit status line mirrors the run-submit pattern (honest pending/verification messaging).
5. `self-claim-button.tsx` is deleted or reduced to a thin link to `/submit?mode=claim` if anything still references it.
6. Deep link support: `/submit?mode=claim` preselects the claim mode.

**Verify:** typecheck/lint gates; vitest on any extracted key-building helper (extract + test it if it isn't already pure).

---

## Task 12: One moderation home

**Goal:** Exactly one moderation surface; no links that teleport between two UIs.

**Files:** `manage/moderation/page.tsx`, `manage/moderation/moderation-tabs.tsx` (delete), `manage/moderation/roster/roster-view.tsx`, `manage/moderation/runner/[userId]/runner-view.tsx` (check exact path), legacy redirect routes under `manage/moderation/{queue,reports,manual-times,policies,log,rules}`.

**Requirements:**
1. `/manage/moderation` becomes a server redirect to `/games-v2/{game}/manage?pane=attention`. Delete `ModerationTabs` and any now-dead code (the emoji 🕘 History button dies with it).
2. The legacy sub-route redirects (`queue`, `reports`, `manual-times`, `policies`, `log`, `rules`) point to `/manage?pane=attention` (rules → `/manage?pane=rules` if that pane id exists in `nav-model.ts` — check).
3. Real sub-routes stay: `roster`, `runner/[id]`, `run/[runId]`.
4. Every "Back to moderation" link in roster-view/runner-view (and anywhere else `grep -rn "Back to moderation"` hits) targets `/manage?pane=attention` with copy "Back to console".
5. Verify no remaining imports/routes reference the deleted tabs component (`grep -rn "ModerationTabs\|moderation-tabs"`).

**Verify:** typecheck/lint gates; `grep` evidence in report that no references remain.

---

## Task 13: Console nav tells the truth (URL sync, live badge, real destinations)

**Goal:** Refresh keeps your place; the sidebar never lies or dead-ends.

**Files:** `manage/console/console-shell.tsx`, `manage/console/console-sidebar.tsx`, `manage/console/content-router.tsx`, `manage/console/subroute-chrome.tsx`, `manage/console/nav-model.ts`, `manage/moderation/attention/needs-attention.tsx`, `manage/moderation/roster/roster-view.tsx`.

**Requirements:**
1. `handleNavigate` writes `router.replace('?pane=' + id, { scroll: false })` (the `?pane=` reader already exists on mount — keep them symmetric). Browser Back walks pane history sensibly (replace, not push, is intended — verify the mount reader handles popstate via Next's searchParams).
2. Sidebar "Roster" item navigates directly to the roster route from the console (same behavior it already has from sub-routes) — the placeholder pane dies.
3. "Reports" item: navigate to the attention pane pre-filtered to reports (`?pane=attention&kind=report`; `NeedsAttention` gains a `kind` filter it applies to the merged items and shows as a dismissible filter chip). The "Reports move here in a later phase." placeholder dies.
4. "History" from anywhere: `?pane=history` opens the console with the history drawer open (sub-route sidebar already pushes to base — now with the param so the drawer opens on arrival).
5. Live badge: `NeedsAttention` reports its current item count upward (`onCountChange`) and the sidebar badge uses that state, so triaging decrements the badge in real time.
6. Pane switches move focus to the pane heading and announce via an `aria-live=polite` region (pane title).
7. `roster-view.tsx`: auto-load on mount for the selected category and re-query on filter change (debounced select changes are fine); keep the manual "Load" button as "Refresh".

**Verify:** typecheck/lint gates.

---

## Task 14: Run manage page can actually moderate

**Goal:** The blessed deep-link destination supports the #1 action.

**Files:** `manage/run/[runId]/run-card.tsx`, `manage/run/[runId]/page.tsx`, `manage/run/[runId]/data.ts`, `leaderboard/row-actions-menu.tsx` (reference only).

**Requirements:**
1. Add "Approve run" to `run-card.tsx` for runs not already verified, using the same `RunActionDialog` verb the board row menu uses ("Approve run" at `row-actions-menu.tsx` — reuse the action/dialog, don't fork it).
2. Unify the capability gate: `page.tsx` currently gates on `edit leaderboard`; switch to the same `canModerateGame`/`canModerate` check the console uses (read `src/lib/moderation/can-moderate.ts` and `manage/page.tsx` for the canonical check).
3. Remove the duplicate "Back to leaderboard" from inside the action row (`run-card.tsx`) — the header back link stays and reads "Back to console" or "Back to leaderboard" per its actual target.

**Verify:** typecheck/lint gates.

---

## Task 15: Fast triage — optional approve reason + keyboard

**Goal:** Approving a clean run costs one keystroke, not a typed essay.

**Files:** `manage/moderation/shared/run-action-dialog.tsx`, `manage/moderation/shared/action-model.ts` (check), `manage/moderation/attention/needs-attention.tsx`.

**Requirements:**
1. Reason becomes optional for `approve` and `restore` (label: "Note — optional, audit-logged"; Confirm enabled immediately). It stays required ≥10 chars for `remove`, `ban`, and any bulk-remove verbs. If the backend rejects empty reasons, send a sensible default ("Approved") — check `src/lib/moderation/verdicts.ts` for what the API accepts and note in the report.
2. Keyboard triage on the attention pane: `j`/`k` (and ArrowDown/Up) move a visible selection ring between cards (roving tabindex or focus on the card element); `v` opens the approve dialog for the selected card with Confirm focused (Enter confirms immediately); `r` opens remove (focus lands in the reason field). Escape closes. Keys are inert while focus is in an input/textarea/select or a dialog is open. A subtle inline hint row above the list documents the keys ("j/k navigate · v approve · r remove").
3. With reason optional and Confirm auto-focused, the approve flow is: `v`, Enter. Verify that's true end-to-end.

**Verify:** typecheck/lint gates; vitest any extracted pure keyboard/selection reducer.

---

## Task 16: Batch verify

**Goal:** Ten clean runs from one event don't cost ten dialogs.

**Files:** `manage/moderation/attention/needs-attention.tsx` (+ module.scss), `manage/moderation/shared/run-action-dialog.tsx`, `src/lib/moderation/verdicts.ts` / `mass-mgmt.ts` (read).

**Requirements:**
1. Each actionable card gets a checkbox (and `x` toggles selection on the keyboard-selected card); a select-all per runner group. Selection state shows a sticky bulk bar: "{n} selected — Approve selected · Remove selected… · Clear".
2. "Approve selected": one confirm dialog listing count + sample rows (reuse the preview pattern), then execute — batch endpoint if `mass-mgmt.ts`/`verdicts.ts` exposes one, else sequential calls with a progress count in the dialog and per-item failure surfaced at the end ("2 of 10 failed — retry failed").
3. "Remove selected…" uses the existing remove dialog once (single reason applies to all), same execution strategy.
4. Cards leave the list as they succeed; badge count (Task 13) stays live.

**Verify:** typecheck/lint gates.

---

## Task 17: Undo where a true inverse exists

**Goal:** One mis-click is never a support ticket.

**Files:** `manage/moderation/shared/run-action-dialog.tsx` (toast emission), `src/lib/moderation/*` (read), wherever toasts are configured.

**Requirements:**
1. Inventory the verb inverses in `src/lib/moderation/` (verdicts/runs/self-service): remove→restore and restore→remove are true inverses; exclusions already have undo. Determine whether approve has an inverse (un-verify / back-to-pending). Implement Undo only for verbs with a real inverse.
2. Success toasts for those verbs carry an "Undo" action button, 10s duration; clicking it fires the inverse with the audit note "Undo of {action}" and restores the card/list state (router.refresh or local re-insert — match how the pane already updates).
3. Verbs without an inverse (likely approve, ban): no fake undo. If approve has no inverse endpoint, add it to Backend handoff in the report ("unverify verb for undo").

**Verify:** typecheck/lint gates.

---

## Task 18: Runner context on attention cards

**Goal:** Triage decisions without a round-trip to the runner page.

**Files:** `manage/moderation/attention/attention-model.ts`, `manage/moderation/attention/needs-attention.tsx`, payload types in `src/lib/moderation/` (read).

**Requirements:**
1. Inspect what the queue/report payloads already carry about the runner (verified-run count, prior rejections, account age, anything trust-related). Render what exists on the runner group header: e.g. "3 verified runs · first seen Mar 2026". Do not add per-card N+1 fetches.
2. If the payload carries nothing usable, render nothing and write the exact desired fields into Backend handoff ("runner trust summary on queue items: verifiedCount, rejectedCount, accountCreatedAt").
3. Keep "View runner ↗" as the deep-dive path either way.

**Verify:** typecheck/lint gates; update attention-model tests if they exist.

---

## Task 19: Moderation speaks human

**Goal:** Every label names the task, not the system.

**Files:** `manage/console/nav-model.ts`, pane headings in `manage/moderation/configure/standards.tsx`, `manage/identifiers/identifiers-section.tsx`, `manage/variables/combinations-section.tsx`, `manage/moderation/roster/roster-view.tsx`, `manage/reassignments/reassign-pane.tsx`, `manage/moderation/attention/needs-attention.tsx` + `attention-model.ts`, `manage/moderation/configure/history-drawer.tsx`, `run-view/mod-provenance-panel.tsx`, `run-view/origin-panel.tsx`, `drawers/wr-history-drawer.tsx`, `leaderboard/leaderboard-row.tsx`.

**Requirements:**
1. Renames (nav item + pane heading + any breadcrumb, consistently): Standards → **Minimum time**; Identifiers → **URL & abbreviation**; Combinations → **Sub-boards**; Roster → **Browse runs**; Reassign → **Merge games & categories**. Grep each old name for stragglers in user-facing strings (internal ids/keys may keep their names).
2. Apply Task 2 helpers on moderation surfaces: attention cards' raw `subcategoryKey` and raw `verificationStatus` → formatted; flag detail `k: v` dumps → humanized labels; history drawer `<code>{row.action}</code>` → `historyActionLabel()` sentence (keep the code in a `title` for auditability); mod-provenance raw JSON variables → formatted list.
3. Board jargon gets visible explanations: the "set time" and "pending" pills open a small info popover on click/tap (accessible button, not title-attr) with the existing tooltip copy. `origin-panel.tsx` "Ingested {date}"/"Ingest date unknown" → "Added {date}"/"Added date unknown". `wr-history-drawer.tsx` "Superseded" column → "Held until". Submit form timing options gain one visible line under the selector explaining RTA vs IGT ("Real time (RTA) — wall-clock time. Game time (IGT) — the in-game timer.").
4. `combinations-section.tsx`: `open`/`managed` mode badges lose the `<code>` treatment — plain pills with task copy ("Open — runners can submit any combination" / "Managed — only listed sub-boards").

**Verify:** typecheck/lint gates; grep evidence for each rename.

---

## Task 20: Console pane conventions

**Goal:** Every pane behaves like its siblings.

**Files:** `manage/moderation/configure/standards.tsx`, `manage/console/nav-model.ts`, `manage/console/console-sidebar.tsx`, `manage/console/console-shell.tsx`, `manage/console/content-router.tsx`, `manage/game-tab/game-tab.tsx`, `manage/moderation/attention/needs-attention.tsx` (banAll), `manage/moderation/roster/roster-view.tsx` + `runner-view`.

**Requirements:**
1. Standards (now "Minimum time") consumes the shell's category picker like every other per-category pane: remove its internal selector and the nav-model/sidebar special-case that hides the rail picker.
2. GameTab triple-entry: the `groups`, `categories-visibility`, `identifiers` sidebar items scroll to their section (stable `id`s + scroll on pane mount/param change) instead of all landing at the top. Give the Cache section its own anchor + heading so it's discoverable.
3. Save conventions: config panes standardize on the bottom-left Save+Reset placement (`category-settings-section` is the reference); align Minimum time's lone right-aligned button. Async action results → toast; form validation errors → inline. Sweep the listed panes for violations.
4. Setup checklist card renders only on Game-group panes (and the console landing when that's the default), not above triage panes.
5. `banAll` default scope: when a runner group's items span multiple categories, default the ban dialog scope to "entire game" instead of an arbitrary first category.
6. Roster/runner "Verified" column: replace bare `'✓'`/empty with a small status pill with text (Verified / Pending / Rejected) — distinguishable and screen-reader readable.

**Verify:** typecheck/lint gates.

---

## Task 21: No more native prompts in the console

**Goal:** Zero `window.confirm` / `window.prompt` anywhere in games-v2.

**Files:** `manage/console/moderators-pane.tsx` (~line 71), `manage/variables/variables-section.tsx` (~148), `manage/game-tab/categories-table.tsx` (~114, ~203), `manage/moderation/attention/mod-applications-card.tsx` (~137).

**Requirements:**
1. Replace each with `BoardDialog` (Task 1): confirms get title + consequence sentence + Confirm/Cancel (destructive confirms use the red action style); `prompt()`s get a proper field — deny-application reason: textarea with the same optional/required semantics the API expects; group creation: text input with inline validation.
2. After this task, `grep -rn "window.confirm\|window.prompt\|[^.]confirm(" app/(new-layout)/games-v2` returns nothing (report the grep output).

**Verify:** typecheck/lint gates; grep evidence.

---

## Task 22: Non-mods get a door, not a wall

**Goal:** A shared console link recruits moderators instead of 404ing.

**Files:** `manage/page.tsx`, `manage/moderation/page.tsx` (post-Task-12 redirect — gate before redirect), possibly a small new component under `manage/`.

**Requirements:**
1. Valid game + signed-in user without mod rights: instead of `notFound()`, render a minimal board-surface page: game name, "You're not a moderator of this board.", and an "Apply to moderate" CTA wired to the existing application flow (the same one the game hero uses — find it via the hero's Moderate/apply button). If the user already has a pending application, say so instead of the CTA (check what the applications lib exposes; degrade to always-CTA if not queryable).
2. Signed-out: same page with a sign-in CTA (match how other gated pages prompt Twitch login).
3. Invalid game slug: still `notFound()`.

**Verify:** typecheck/lint gates.

---

## Task 23: Design-system sweep — compose, don't copy

**Goal:** One vocabulary in SCSS; the compliance audit's drift is gone.

**Files:** `app/(new-layout)/styles/_board.scss`, `app/(new-layout)/styles/_mixins.scss`, `.interface-design/system.md`, and the games-v2 modules: `console.module.scss`, `needs-attention.module.scss`, `reassignments.module.scss`, `active-bans.module.scss`, `run-action-dialog.module.scss` (or board-dialog's), `manual-time-verdict-row.module.scss`, `setup.module.scss`, `game-page.module.scss`, `run-badges.module.scss`, `leaderboard/row-actions-menu.tsx`.

**Requirements:**
1. New mixins in `_board.scss`: `board-empty` (icon + title + hint, from the console `.empty`), `board-stepper` (from setup's stepper), `board-error-alert` (from the triplicated errorAlert). Replace the hand-copied clones: console `.pill` block (≈lines 347-377) → `@include board-pill`; needs-attention pill/amber recipes; reassignments' board-surface/eyebrow/pill/stepper clones; the three errorAlert copies; both empty-state variants converge on `board-empty`.
2. One red: severity/destructive = `$accent-red` everywhere — console count badge drops `var(--bs-danger)`; any remaining `.text-danger` in games-v2 goes.
3. One green: verified/done/active = `--bs-primary` (per system.md's documented color world) — update `run-badges.module.scss` verified pill and reassignments done/success states off `$accent-green`; note the decision in `system.md`.
4. One mono: make `mx.monospace-value` delegate to (or be replaced by) `board.mono-time` so times render with one weight/tracking board-wide; pick the board version's spec.
5. Spacing: fix the off-grid literals listed in the audit (0.05/0.1/0.2/0.3/0.35/0.4/0.45/0.7rem instances) to the nearest token; delete reassignments' false `$xxs` shadow token (it *is* `$spacing-xs`). Unify popover shadows on `$shadow-md`; document the heroCover `$shadow-lg` exception in system.md.
6. Touch targets: at `(pointer: coarse)`, control-pills and subcategory pills get block padding reaching ≥44px hit area (padding or ::after hit-area extension), and quiet links (History etc.) get a padded hit area.
7. Focus ring consistency: one `outline-offset` value for pill-shaped controls (pick 1px, align the 2px stragglers).
8. Zero visual regressions intended beyond the listed unifications — this is a refactor + reconciliation pass, verify diffs are token swaps and mixin includes.

**Verify:** typecheck/lint gates; `npx vitest run` full suite once at the end of this task.

---

## Final

Whole-branch review (superpowers:requesting-code-review), fix wave if needed, then push `leaderboard-ux-fixes` (no PR — Joey opens PRs).

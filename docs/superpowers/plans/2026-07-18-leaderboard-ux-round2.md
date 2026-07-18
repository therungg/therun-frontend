# Leaderboard UX Round 2 — Implementation Plan

Executes every in-scope finding in `docs/superpowers/specs/2026-07-18-leaderboard-ux-round2-audit.md` (B/G/P refs below point there).
Branch: `leaderboard-ux-round2` (stacked on `leaderboard-ux-fixes`). Base: 96be2f75.

## Global constraints (binding for every task)

- **Design system:** follow `.interface-design/system.md`. Compose `_board.scss` / `_design-tokens.scss` / `_mixins.scss` — no new raw hex colors, no off-grid spacing literals, borders+tint depth (shadow only for overlays/hover), no emoji glyphs in UI (inline SVG icons, stroke 1.5, currentColor).
- **Paths:** app code under `app/(new-layout)/games-v2/[game]/`. Aliases `~src/*`, `~app/*`.
- **Caching:** any new server-side fetch uses `'use cache'` + `cacheLife()` + `cacheTag()`. Never `{ next: { revalidate } }`. `revalidateTag(tag, profile)` takes 2 args; use `updateTag` for read-your-writes flows.
- **Auth:** `getSession()` returns the User directly (`session.id` is the bearer token); pass `session` straight to permission helpers.
- **Frontend lane only:** never edit `../therun` (backend). If a fix needs data/endpoints the API doesn't provide, implement the gracefully-degrading frontend version and document the needed backend change in your report under "Backend handoff".
- **Verification gate per task:** `npm run typecheck` and `npm run lint` introduce **no NEW errors** (the repo has pre-existing typecheck errors in userform/victory/rbac/use-navigation-event — those don't count). `npx vitest run <touched test files>` passes. New pure logic gets vitest tests (TDD).
- **Commits:** conventional style (`feat(board): …`, `fix(console): …`). Do NOT add a Co-Authored-By trailer.
- **User-facing copy:** plain task language, sentence case, no internal system vocabulary, no raw enum/machine strings.

Round-2 additions:

- **Motion:** every new animation is wrapped in a `prefers-reduced-motion: reduce` guard that reduces it to an instant state change. Enter-only animation is the convention — no JS unmount choreography.
- **Backend handoffs:** append to the existing `docs/backend-handoffs-leaderboard-ux.md` (round-1 doc) under a "Round 2" heading, using the spec's W1–W12 list as the source text.

---

## Task 1: Case-insensitive runner identity checks (B1)

**Goal:** "This is you" never breaks on username casing.

**Files:** new `app/(new-layout)/games-v2/[game]/shared/is-same-runner.ts` + `is-same-runner.test.ts`; `leaderboard/leaderboard-table.tsx`, `leaderboard/leaderboard-pager.tsx`, `leaderboard/row-actions-menu.tsx`, `run-view/run-actions.tsx`.

**Requirements:**
1. TDD `isSameRunner(a: string | null | undefined, b: string | null | undefined): boolean` — `false` when either side is nullish or empty string; otherwise compares `a.toLowerCase() === b.toLowerCase()`. Tests: exact match, case divergence (`Joeys88` vs `joeys88`), null/undefined/empty on each side, both empty → false.
2. Replace the five exact comparisons: `leaderboard-table.tsx:116-117` (`isCurrentUser`), `leaderboard-pager.tsx:137` (find-me presence check) and `:183` (find-me scan match), `row-actions-menu.tsx:42` (`isOwn`), `run-actions.tsx:31` (`isOwnRun`).
3. `grep -rn "=== sessionUsername\|sessionUsername ===" 'app/(new-layout)/games-v2'` afterwards — any remaining *identity* comparison (not null checks like `sessionUsername !== null`) also converts. Report the grep output.
4. Backend handoff: W11 (numeric session userId for id-based checks; `LeaderboardEntry.userId` already exists).

**Verify:** vitest on `is-same-runner.test.ts` (written first); typecheck/lint gates; grep evidence.

---

## Task 2: Lossless run-time input for submit/claim (B2)

**Goal:** The most important field in the product never silently discards precision or misreads magnitude.

**Files:** new `src/lib/run-time-input.ts` + `run-time-input.test.ts`; `submit/submit-form.tsx` (parse call at :195, echo at :738, placeholder/help text near the TimeInput at :705-742). Do **not** modify `src/lib/time-input.ts` — it is the presenter target-time parser and its `'95' = minutes` convention is intentional there.

**Requirements:**
1. TDD `parseRunTimeInput(raw: string): number | undefined` returning milliseconds:
   - `h:mm:ss.mmm`, `mm:ss.mmm`, `ss.mmm`, and the same shapes without the fraction. Fractions of 1–3 digits scale correctly (`.6` = 600ms, `.67` = 670ms, `.678` = 678ms). Milliseconds are **kept**, never truncated.
   - A bare number (with or without a fraction) is **seconds**: `95` → 95_000, `45.678` → 45_678. Never minutes.
   - Courtesy shapes: `1h23m45s`, `23m45s`, `45s` (case-insensitive, optional `.mmm` on the seconds part).
   - Reject (return `undefined`): empty, negatives, non-numeric garbage, out-of-range components where a higher unit exists (`1:75:00`).
2. New `formatRunTimeEcho(ms: number): string` (same file) that always shows full precision — `1:23:45.678`, `9:05.000` renders `9:05` only when ms are zero (`ms % 1000 === 0` drops the fraction; otherwise 3-digit fraction always shown). Do not change `formatTimeMs` (`src/lib/run-view/time-format.ts`) — it serves titles/metadata.
3. `submit-form.tsx`: swap `parseTimeInput` → `parseRunTimeInput` for both submit and claim time fields; the echo line under the input uses `formatRunTimeEcho` and is styled as a visible confirmation, not fine print: "Will be submitted as **1:23:45.678**". Placeholder becomes `h:mm:ss.ms`; helper text states "A plain number is read as seconds."
4. Invalid input keeps the existing inline-error behavior (verify what exists at :189-197 and preserve it).

**Verify:** vitest on `run-time-input.test.ts` (written first, covering every bullet incl. the 45.678-seconds case and ms retention); typecheck/lint gates.

---

## Task 3: Calendar dates render as typed (B3)

**Goal:** The date the runner entered is the date everyone sees, in every timezone.

**Files:** new `src/lib/format-run-date.ts` + `format-run-date.test.ts`; call sites: `run-view/run-view.tsx:176-180`, `leaderboard/leaderboard-row.tsx:224-227` (the `title` attr on the relative date), `header/game-hero.tsx:188-191`, `app/(new-layout)/[username]/leaderboard-pbs.tsx:79`, `manage/run/[runId]/run-card.tsx:52`.

**Requirements:**
1. TDD `formatRunDate(iso: string): string` — when `iso` matches `/^\d{4}-\d{2}-\d{2}$/` (or a date-only prefix of a `T00:00:00` UTC-midnight timestamp — check what the API actually returns for `runDate` and cover it), format with `toLocaleDateString(undefined, { timeZone: 'UTC' })` so the calendar date is preserved; full timestamps fall back to plain `toLocaleDateString()`. Tests pin the off-by-one case: `'2026-07-18'` formats as July 18 regardless of TZ (use `timeZone`-forced assertions).
2. Apply at the five `runDate` call sites above. Leave true-timestamp call sites alone (`active-bans.tsx`, `moderators-pane.tsx` `createdAt`; `wr-history-drawer.tsx` `setAt`/`supersededAt` — verify these are timestamps, and if any turns out to be date-only, convert it too and say so in the report).
3. `relative-date.ts` is internally UTC-consistent — do not touch it.

**Verify:** vitest on `format-run-date.test.ts` (written first); typecheck/lint gates.

---

## Task 4: Dark-mode shadows actually exist (B4)

**Goal:** Floating surfaces keep their lift in dark mode.

**Files:** `app/(new-layout)/styles/_design-tokens.scss` (:80-92).

**Requirements:**
1. Replace the Sass-scoped dead block with CSS custom properties:
   ```scss
   :root {
       --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
       --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.1);
       --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.15);
       --shadow-xl: 0 6px 20px rgba(0, 0, 0, 0.2);
   }
   [data-bs-theme="dark"] {
       --shadow-sm: 0 1px 4px rgba(0, 0, 0, 0.35);
       --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.4);
       --shadow-lg: 0 4px 14px rgba(0, 0, 0, 0.45);
       --shadow-xl: 0 6px 24px rgba(0, 0, 0, 0.55);
   }
   ```
   and repoint the Sass tokens: `$shadow-sm: var(--shadow-sm);` etc., so every consumer updates with zero call-site changes.
2. Delete the dead `[data-bs-theme="dark"] { $shadow-*: … }` block entirely.
3. Confirm no consumer does Sass math on `$shadow-*` (grep `$shadow-` across `app/(new-layout)`); if one does, adapt it. Run a production-style build of the styles (`npm run build` or a targeted sass compile) to prove the tokens emit.

**Verify:** typecheck/lint gates; build/compile succeeds; grep evidence that the dead block is gone.

---

## Task 5: Notifications link to the thing they're about (B5)

**Goal:** "Your run was rejected" takes the runner to the run, the reason, and the appeal button.

**Files:** `src/components/Topbar/NotificationsBell.tsx`.

**Requirements:**
1. Extend `linkFor()` (payload fields are `unknown` — every read is `typeof`-guarded, link only when the needed fields are present):
   - `verdict_applied`: `runId` + `gameSlug` → `/games-v2/{gameSlug}/run/{runId}`.
   - `manual_time_verdict`, `manual_time_created`, `manual_time_deleted`: `manualTimeId` + `gameSlug` → `/games-v2/{gameSlug}/manual/{manualTimeId}`.
   - `board_claim_denied`: `gameSlug` → `/games-v2/{gameSlug}`.
2. Enrich `describe()` when payload fields exist: include `gameDisplay` and `categoryDisplay` — e.g. "Your Any% run of Celeste was verified." falling back to the current generic copy when absent. No raw machine strings.
3. The whole notification row becomes the interactive element when a link exists: clicking navigates **and** marks read (call `handleRead` before navigation). Rows without links keep the current mark-read-on-click. Keyboard: the row's link must be a real `<Link>` (it already is when present) — ensure the mark-read handler doesn't swallow modifier-key clicks.
4. This component lives in the shared Topbar (old-layout register) — functional fix only; do not restyle it in this task.
5. Backend handoff: W4 (guarantee the payload fields; the frontend now uses them opportunistically).

**Verify:** typecheck/lint gates. Extract `describe`/`linkFor` into pure exported functions and add a small vitest for the payload-guard branches (present, missing, wrong-typed fields).

---

## Task 6: Board precision & honesty (B6, B7, B10, P1, P2, P3)

**Goal:** Times show the precision the board is configured for, and every label on the board claims exactly what it knows.

**Files:** `game-page.tsx`, `leaderboard/leaderboard-pager.tsx`, `leaderboard/leaderboard-table.tsx`, `leaderboard/leaderboard-row.tsx`, `header/game-hero.tsx`, `run-view/run-view.tsx` (+ `run/[runId]/page.tsx` if the flag must be fetched there), `labels.ts` (reuse `formatSubcategoryKey`), `merge-entries.ts` (read).

**Requirements:**
1. **Milliseconds plumbing:** thread `showMilliseconds = selectedCategory.showMilliseconds ?? true` from `GamePage` → `LeaderboardPager` → `LeaderboardTable` → `LeaderboardRow`, and into `GameHero` for the crown. Every `DurationToFormatted` on the board rows (`leaderboard-row.tsx:172-186`, both timing cells) and the crown time (`game-hero.tsx:160-167`) gets `withMillis={showMilliseconds}`. The run detail page's main time gets the same treatment when the category flag is available in its data (check `run/[runId]/page.tsx` + `data.ts`; if the flag isn't fetchable there without a new call, default to `withMillis` on the run page — a run page showing ms is never wrong — and note it).
2. **Crown eyebrow scope:** append the formatted subcategory when one is active: `World record — Any% · PC` via `formatSubcategoryKey(subcategoryKey, defs)` (`game-hero.tsx:140-142`; `subcategoryKey` is already a prop at :38 — thread the variable defs from `GamePage` or pre-format the string there). Truncate with ellipsis via CSS, full text in `title`.
3. **Crown eyebrow honesty while pending:** when the crowned entry is pending (the round-1 pending pill condition), the eyebrow reads `Fastest time — {category · subcat}` instead of `World record — …`. Pill stays.
4. **Ties:** in `LeaderboardTable`, when an entry's primary time equals the previous entry's primary time, render the shared rank with a muted `=` prefix (e.g. `=1`) instead of `entry.rank` (`leaderboard-row.tsx:205` renders it; compute the display rank in the table over the merged entries so it's correct within the loaded window). Backend handoff: W10.
5. **All-dash secondary column:** in `LeaderboardTable`, when every merged entry's secondary timing value is null, hide the secondary column (header + cells). Category config `hideRealTime`/`hideGameTime` still hides unconditionally. A later page introducing data may re-show the column — acceptable.
6. **When-cell:** `leaderboard-row.tsx:229` renders `—` (same muted treatment as the timing cells' null convention) instead of `''` when `runDate` is absent.
7. **Deep empty pages:** `game-page.tsx:83-88` — `filtersActive` also counts `page > 1` (parse the same source the pager uses for the initial page). The empty-board state on `?page=99` then reads "No runs match these filters." with Clear filters (which already clears `page` — verified `clear-filters-button.tsx:19`), never "No runs on this board yet."

**Verify:** typecheck/lint gates; vitest on any pure rank/tie computation you extract (extract it — table-level display-rank derivation is pure); `npx vitest run` on `merge-entries.test.ts` if touched.

---

## Task 7: Overlay motion system + elevation scale + mobile console drawer (P4, B8, G22)

**Goal:** Overlays enter like they came from their trigger; stacking order is a decision made once; the mobile console nav stops teleporting content.

**Files:** `app/(new-layout)/styles/_board.scss`, `app/(new-layout)/styles/_design-tokens.scss`, `shared/board-dialog.module.scss` (+ `board-dialog.tsx` read), `game-page.module.scss` (`.popoverPanel` ~:41-53, `.dropdownPanel` ~:110-118, `.band` ~:16-27), `leaderboard/leaderboard.module.scss` (`.infoPopoverPanel` ~:275, row-actions menu styles), `leaderboard/row-actions-menu.tsx` (menu class location), `manage/moderation/configure/history-drawer.tsx` (+ its styles at :118-147), `manage/console/console.module.scss` (:470-480), `manage/console/console-chrome.tsx` (:91-108), `.interface-design/system.md`.

**Requirements:**
1. New `_board.scss` mixin `board-overlay-enter($mode: rise)` — `rise`: fade from 0 + translateY(4px→0); `scale`: fade + scale(0.98→1); `slide-right`: translateX(100%→0). 160ms `cubic-bezier(0.4, 0, 0.2, 1)` (200ms for `slide-right`), animation on mount only (enter-only; exit stays instant). The `prefers-reduced-motion: reduce` guard lives **inside the mixin** (animation: none), written once.
2. Apply: BoardDialog `.content` (`scale`) and `.backdrop` (fade-only), filters `.popoverPanel` (`rise`), variable `.dropdownPanel` (`rise`), row-actions menu (`rise`), `.infoPopoverPanel` (`rise`), history drawer panel (`slide-right`).
3. Elevation tokens in `_design-tokens.scss`: `$z-sticky: 20; $z-popover: 30; $z-drawer: 40; $z-dialog: 1055;`. Apply: band → `$z-sticky`; `.popoverPanel`, `.dropdownPanel`, `.infoPopoverPanel` → `$z-popover` (this fixes the band painting over an open variable dropdown — `.dropdownPanel` is currently z 10 under the band's 20); history drawer → `$z-drawer`; BoardDialog keeps 1055 via `$z-dialog`. No other magic z-index numbers remain in games-v2 modules (grep and report).
4. Mobile console sidebar (<768px) becomes an overlay drawer instead of an in-flow `display: none` flip: `position: fixed; inset-block: 0; left: 0; width: min(20rem, 85vw);` opaque body-bg surface, `slide-right`-mirrored entry (slide from left), scrim behind it (fade, click dismisses), Escape dismisses and focus is contained — reuse `useDialogBehavior` from `shared/board-dialog.tsx` (it is presentation-agnostic). Content underneath does not move. Desktop layout unchanged.
5. Document the motion rule + elevation scale in `system.md` (short: "overlays enter in 160ms, enter-only, reduced-motion instant; z-scale tokens").

**Verify:** typecheck/lint gates; grep evidence for zero remaining raw z-index numbers in games-v2 (allow `$z-*` usages).

---

## Task 8: Route boundaries — loading, not-found, error (G3)

**Goal:** Navigation acknowledges the click, dead URLs are styled rooms, render errors don't eject the layout.

**Files:** new `app/(new-layout)/games-v2/[game]/loading.tsx`, `[game]/manage/loading.tsx`, `[game]/run/[runId]/loading.tsx`, `[game]/not-found.tsx`, `[game]/error.tsx`; `_board.scss` (skeleton mixin); `manage/page.tsx` (the `fallback={null}` Suspense at ~:186).

**Requirements:**
1. `_board.scss` gains `board-skeleton` — surface-tint block with a shimmer keyframe, `prefers-reduced-motion` → static tint (no shimmer). No data dependencies in any boundary file — pure static markup composing existing tokens.
2. `[game]/loading.tsx`: predicts the board geometry — hero-shaped surface (`$radius-xl`, title bar + 3:4 cover rectangle + crown block), a band strip at the band's height, and a `board-table`-shaped skeleton of ~10 rows at the real row height.
3. `[game]/manage/loading.tsx`: console shell geometry — 16rem sidebar column + content surface block (match `console.module.scss` grid).
4. `[game]/run/[runId]/loading.tsx`: header row + 16:9 video box + side column, matching the run page's layout.
5. `[game]/not-found.tsx`: board-empty vocabulary — icon (inline SVG, stroke 1.5), "There's no board here." hint "The game or run you're looking for doesn't exist or was removed.", links to `/games` ("Browse games") and `/` ("Home"). It inherits the layout, so site chrome survives. This catches every `notFound()` thrown under `[game]` (page, run, manual, submit).
6. `[game]/error.tsx`: `'use client'`, board-error-alert styling, copy "Something went wrong loading this page.", a "Try again" button calling `reset()`, and a quiet link to the game root.
7. `manage/page.tsx`: the `fallback={null}` becomes a minimal surface-block skeleton (reuse `board-skeleton`).

**Verify:** typecheck/lint gates; `npm run build` compiles the new route files.

---

## Task 9: Primary-button + back-link primitives (P5, G14 part)

**Goal:** One answer to "what does a primary action look like" and one up-navigation pattern, everywhere outside the documented carve-outs.

**Files:** `_board.scss`, `.interface-design/system.md`, new `app/(new-layout)/games-v2/[game]/shared/back-link.tsx` (+ module.scss or mixin), `header/game-hero.tsx` (:117-122), `setup/wizard-shell.tsx` (:65-84 header, :129-149 nav buttons + the steps' own Continue buttons — grep `btn-primary` under `setup/`), `manage/console/console-chrome.tsx` (:81-88), `manage/run/[runId]/manage-run-page.tsx` (:47-52), `manage/moderation/runner/[userId]/runner-view.tsx` (:194), `manage/moderation/roster/roster-view.tsx` (:209), `submit/page.tsx` (:68-73), `game-page.tsx` + `leaderboard-table.tsx` empty-state CTAs.

**Requirements:**
1. `board-btn-primary` mixin in `_board.scss`: brand green fill (the system's `--bs-primary` green world — no new hex), radius and focus-ring anatomy mirroring `board-dialog-btn-danger`, `$transition-fast`, ≥44px hit area under `(pointer: coarse)`. Document in `system.md` as the primary tier: primary = `board-btn-primary`, secondary = control-pill, tertiary = quiet link.
2. Sweep by rank: hero "Submit a run" → primary; wizard step Continue buttons → primary; wizard Back → control-pill; wizard Skip → quiet link; board/table empty-state CTAs ("Submit the first run") → primary. Carve-out surfaces documented in system.md stay untouched.
3. `BackLink` shared component (`href`, `label`): quiet link + leading ArrowLeft inline SVG (stroke 1.5, currentColor), `board-eyebrow`-adjacent sizing, consistent top-left placement. Replace the five raw `btn btn-sm btn-outline-secondary` back links listed in Files. Copy standard: **"Back to leaderboard"** on public surfaces (submit, manage-run header), **"Back to console"** on console sub-routes. Destination fixes for roster/runner are Task 15 — here they keep their current hrefs.
4. Wizard header (`wizard-shell.tsx:65-84`) gains a `BackLink` "Back to console" → `/games-v2/{slug}/manage` in its right edge; the finish step's primary CTA lands on `/games-v2/{slug}/manage?pane=attention`.

**Verify:** typecheck/lint gates; grep evidence: no `btn-outline-secondary` back links remain in games-v2; hero/wizard/empty-state `btn-primary` occurrences replaced.

---

## Task 10: Submit funnel — context flows in, the board link flows out (G5, G6, G21, P7 parts)

**Goal:** Every path into submission carries the board you were on; the success card answers "where am I now"; titles reflect URL state.

**Files:** `submit/page.tsx`, `submit/submit-form.tsx`, `header/game-hero.tsx` (:117-122, :199-205), `game-page.tsx` (empty-state links ~:58-68), `leaderboard/leaderboard-table.tsx` (empty-state link), `leaderboard/row-actions-menu.tsx`, `run-view/run-actions.tsx`, `[game]/page.tsx` (generateMetadata ~:74-85), `manage/page.tsx`, `setup/page.tsx`, `manage/moderation/roster/page.tsx`, `manage/moderation/runner/[userId]/page.tsx`, `manage/run/[runId]/page.tsx`, `src/lib/leaderboards-v1.ts` (read), `labels.ts` (read).

**Requirements:**
1. `submit/page.tsx` `searchParams` accepts `category` (slug) and subcategory variable params (same param names the board URL uses — read how `game-page.tsx`/`data.ts` parse them). Resolve server-side and pass `initialCategorySlug` / `initialSubcategoryValues` to `SubmitForm`, which preselects the category `<select>` and, once `load-variables.action.ts` resolves, the variable selects. Invalid/unknown values are ignored silently (blank form, no error).
2. Entry links carry the current board context: hero "Submit a run" (:118), crown "set the first record" (:201), game-page and table empty-state CTAs. Each appends the currently selected `category` slug + active subcategory params (available in `GamePage`'s data/props — thread as needed). The signed-out Twitch round-trip URL (`submit/page.tsx` TwitchLoginButton) preserves the full query string.
3. **Claim discoverability:** own-row actions menu (`row-actions-menu.tsx`, own section) and own-run page actions (`run-actions.tsx`) gain "Correct this time…" linking to `/games-v2/{game}/submit?mode=claim&category={categorySlug}&{subcat params}` (build from the entry/run's own category/subcategory; where the slug isn't on the model, link `?mode=claim` alone — check what `LeaderboardEntry`/`RunDetail` carry and report).
4. **Post-submit success cards** (run at `submit-form.tsx:313-350`, claim at :352-379): add a primary "See it on the board" link built from the selected category + `runResult.subcategoryKey` (`SubmitRunResult.subcategoryKey`, `types/leaderboards.types.ts:256`) using the same URL machinery as requirement 2. Add the sentence: "You'll get a notification here when a moderator reviews it." to both pending cards. Backend handoff: W5 (queue position / median wait).
5. **Current standing:** when the signed-in user picks a category (+subcategory), fetch their standing via a small server action wrapping `getUserRankingsByName` (`src/lib/leaderboards-v1.ts:202` — already `'use cache'`), match on `gameSlug` + `categorySlug` + `subcategoryKey`, and render a quiet context line: "Your current best on this board: **1:24:10** (#14 of 92). A faster time replaces it." When the entered time parses slower than that best: "This is slower than your current best — it won't replace your board entry." No standing → no line.
6. **Claim-mode honesty (round-1 ledger):** in claim mode the page H1 and `generateMetadata` title read "Claim an existing time" (not "Submit a run"); the `varsError` alert copy is mode-aware (claim wording, not run wording — read the current copy at the varsError site and adjust).
7. **Extraction (round-1 ledger):** split `submit-form.tsx` (777 lines) into `RunFields` and `ClaimFields` child components (same directory). Pure refactor — zero behavior change beyond this task's additions; keep shared state in the parent.
8. **Titles (G21):** `[game]/page.tsx` `generateMetadata` receives `searchParams`, resolves the game display name (cached `resolveGame`) and the selected category display: title `` `${display} ${categoryDisplay} — Leaderboard` `` falling back to `` `${display} — Leaderboards` ``. One-line `generateMetadata` additions: manage → "Manage — {display}", setup → "Set up — {display}", roster → "Runs — {display}", runner page → "Runner — {display}", manage-run → "Run — {display}".

**Verify:** typecheck/lint gates; vitest on any extracted pure URL-building helper (extract one — board-URL-from-category+subcategoryKey is shared by reqs 2, 3, 4 and must be a tested pure function).

---

## Task 11: Run page as a destination (G1, G19 part, P7 part)

**Goal:** The most-shared URL in the product looks like the board that produced it, says where the run stands, and always offers a way back.

**Files:** `run-view/run-view.tsx`, new `run-view/run-view.module.scss`, `run-view/run-badges.tsx`, `run/[runId]/page.tsx`, `manual/[manualTimeId]/page.tsx`, `src/lib/leaderboards-v1.ts` (read), `labels.ts` (read), leaderboard row components (read, for RunnerAvatar/CountryFlag usage).

**Requirements:**
1. **Rank + deep link, frontend-only:** in `run/[runId]/page.tsx`, after loading the run, call `getUserRankingsByName(run.runnerName)` (cached) and match `runId`. On match, pass `{ categorySlug, subcategoryKey, rank, totalRunners }` to `RunView`. Render "**#N of M** on this board" linking to `/games-v2/{game}?category={categorySlug}&{subcat params}&page={ceil(rank/25)}` (reuse Task 10's URL helper; confirm 25 is the page size in `data.ts`). No match (run isn't the runner's current board entry) → omit the rank line; the breadcrumb still links. Backend handoff: W1.
2. **Breadcrumb header:** game cover art + game display name link to `/games-v2/{game.name}`; the category/subcategory render as `board-pill` **links** to the board (category deep link from req 1's `categorySlug` when matched; otherwise the plain game URL — round-1 handoff already records that `RunDetail` lacks `categorySlug`). One quiet eyebrow line: `{Game} · {Category} · {Subcat}`.
3. **Full restyle in board vocabulary** (`run-view.module.scss`, composing existing mixins — this surface is not in the carve-out list): the run's time is the star — `mono-time` at display size, gold treatment when rank 1; `badge text-bg-secondary` (:84, :88) → `board-pill`; `alert alert-warning` rejected notice (:103) → `board-error-alert` amber family; side card `border rounded p-3` → `board-surface`; runner line gains `RunnerAvatar` + `CountryFlag` (same components the leaderboard row uses — locate and reuse); `withMillis` per Task 6. Kill inline `style=` layout in favor of the module.
4. **Copy link** stays (it exists in `run-actions.tsx`); ensure it sits with the new header as the share affordance.
5. **Rejected manual claims (G19 degraded):** on `manual/[manualTimeId]` for the owner with a rejected claim, render a "What now?" line: "You can submit a corrected claim." linking to `/games-v2/{game}/submit?mode=claim` (+category params when available). `rejectionReason` stays absent — backend handoff W6.
6. **Metadata:** the run page already has `generateMetadata` (:29) — verify the title carries runner + time + category + game (e.g. "{runner} — 1:23:45 — Any% · Celeste"); upgrade if it's thinner than that.

**Verify:** typecheck/lint gates; grep evidence: no `text-bg-secondary` / `alert-warning` / `border rounded` remain under `run-view/`.

---

## Task 12: WR history tells the story of a record falling (G2)

**Goal:** The crown's History drawer becomes the board's flagship narrative, not a Bootstrap table.

**Files:** `drawers/wr-history-drawer.tsx`, new `drawers/wr-history-drawer.module.scss`, `shared/board-dialog.tsx` (reuse), `_board.scss` (`board-dialog-chrome` mixin from round-1 T23 — reuse), `types/leaderboards.types.ts` (read `WrHistoryEntry`).

**Requirements:**
1. Replace the react-bootstrap `Modal` + `<Table hover responsive>` (:4, :54, :73) with `BoardDialog` and a custom list layout styled via `board-dialog-chrome` + board vocabulary. Task 7's enter motion applies automatically through BoardDialog.
2. Entries render newest-first; the **current record row is pinned first with gold treatment** and a "Current" pill. Each row: runner name, time in `mono-time` (`withMillis` per the category's flag — thread it from the opener), **improvement vs the previous record** (`−3.2s` in the system's green; first-ever record shows `—`), "Held for {duration}" as the strongest secondary signal (`heldMs` already computed at :90 — surface it as emphasized text; current record shows "Held for {duration} — and counting"), relative date with absolute date in `title` (use `formatRunDate`/`relative-date` conventions from Task 3).
3. Loading state: 4–5 skeleton rows (`board-skeleton` from Task 8), not "Loading…" text. Error state: board-error styling with `$accent-red` via the module — the `text-danger` at :62 goes.
4. Timing column label keeps the round-1 "Held until" language where a column survives; prefer the per-row narrative layout over a 6-column grid.
5. Run-page links per entry and country flags: `WrHistoryEntry` has neither `runId` nor `country` — degrade (no link, no flag) and record backend handoff W2.
6. Compute the improvement deltas in a pure exported helper (entries → display rows with `deltaMs`/`heldMs`/`isCurrent`) and TDD it.

**Verify:** vitest on the delta/held helper (written first); typecheck/lint gates; grep: no `react-bootstrap` `Modal`/`Table` import remains in `drawers/`.

---

## Task 13: Board interaction feel (G4, G15, G16, G17, G20)

**Goal:** Every board interaction acknowledges the click instantly, honors browser conventions, and closes the explore loop.

**Files:** new `app/(new-layout)/games-v2/[game]/filters/use-board-nav.ts`, `header/category-pills.tsx`, `filters/subcategory-pills.tsx`, `filters/verified-toggle.tsx`, `filters/use-filter-nav.ts` (fold in or delegate — read it first), `game-page.tsx` + `game-page.module.scss`, `leaderboard/leaderboard-row.tsx`, `leaderboard/leaderboard.module.scss`, `leaderboard/leaderboard-pager.tsx`, `sidebar/recent-pbs-panel.tsx`, `data.ts` (read, for RecentPb id semantics).

**Requirements:**
1. **Shared `useBoardNav` hook:** one place owning the URL-push `useTransition` used by category pills, subcategory pills, and the verified toggle (and `use-filter-nav` if it's the same shape). Exposes `navigate(url)`, `isPending`, and `pendingKey` (identifier of the clicked control).
2. **Optimistic selection:** the clicked pill renders active immediately (keyed off `pendingKey` or `useOptimistic`); the previous active pill drops to rest. Remove `disabled={isPending}` from all sibling pills (`category-pills.tsx:49`, `subcategory-pills.tsx:60`, `verified-toggle.tsx:33`) — re-clicks while pending are ignored in the handler instead; the containing nav gets `aria-busy="true"` while pending.
3. **Stale-board dim:** while any board nav is pending, the board area (`.colMain`'s table region) gets `opacity: 0.55; pointer-events: none; transition: opacity $transition-fast` (lift `isPending` from the shared hook via context or prop threading through `GamePage`).
4. **Stretched row link (G15):** the primary time anchor in each row becomes a stretched link (`position: relative` on the row, `::after` with `inset: 0` on the anchor), so the whole row is a real link — status-bar preview, cmd/ctrl-click, middle-click, long-press all work. Other interactive children (kebab, runner link, video link) sit above via z-index. Remove the `onRowClick`/`router.push` handler and the `cursor: pointer` hack (`leaderboard-row.tsx:163-170`, `leaderboard.module.scss:28-30`).
5. **Deep-link scroll anchor (G17):** on mount with `initial.page > 1`, scroll the board's top edge into view (one small effect in the pager) so browser scroll restoration never lands in absent rows; the existing range indicator orients the rest.
6. **Find-me honesty (G20):** in the pager's miss note (:301-310), when `query.verified` is active and the scan found nothing: "Not on this board — pending runs are hidden by the Verified filter." Otherwise keep the current copy.
7. **Owner-aware pending pill (G20):** `leaderboard-row.tsx:238-244` — when `isCurrentUser`, the pending pill's explanation reads "Your run is awaiting verification — you'll be notified." (third-person copy stays for everyone else).
8. **Recent PBs close the loop (G16):** each row gains `relativeDate(p.endedAt)` as quiet meta; the time links to `/games-v2/{game}/run/{p.id}` — first verify `RecentPb.id` is the finished-run id `getRunById` serves (read `data.ts`'s `getRecentPbs` source / `src/lib`); if it isn't, link to the runner profile instead and say so in the report.

**Verify:** typecheck/lint gates; vitest on any pure helper extracted from `useBoardNav`.

---

## Task 14: "Your runs" — the degraded my-submissions surface (G7)

**Goal:** The system remembers the signed-in runner: their standing on this game is one glance away, with status.

**Files:** new `sidebar/your-runs-panel.tsx` (+ styles in `sidebar/sidebar.module.scss`), `game-page.tsx`, `data.ts`, `app/(new-layout)/[username]/leaderboard-pbs.tsx`, `src/lib/leaderboards-v1.ts` (read).

**Requirements:**
1. On the game page, for a signed-in user, fetch `getUserRankingsByName(sessionUsername)` server-side in `data.ts` (already cached `'use cache'`/minutes) and filter to `gameSlug === current game`. Non-empty → render a sidebar panel "Your runs" above/below Recent PBs (match sidebar panel vocabulary): per row — category display, `mono-time` time, `#rank` when non-null, a status pill (Verified / Pending / Rejected — reuse `VerificationBadge` from `run-view/run-badges.tsx` or the board's pill vocabulary), linking to `/games-v2/{game}/run/{runId}`. Empty → no panel.
2. Profile tab: `leaderboard-pbs.tsx` rows gain the same status pill from `verificationStatus` (the field is already on `UserRanking`; check what the row currently shows and add the pill only if absent). Pending/rejected entries are visibly distinct, not silently mixed with verified.
3. Honest scope: this surface shows the runner's **best entry per board** — pending non-PBs, hidden runs, and claims are invisible to it. State that limitation in the report and record backend handoff W3 (`GET /v1/me/submissions`) as the full-fidelity path. Do not fake completeness in UI copy (panel title is "Your runs", no "all").

**Verify:** typecheck/lint gates.

---

## Task 15: Console session continuity + honest Back (B9, G14 rest)

**Goal:** The console is fully addressable (pane **and** category), Back retraces panes, and "back" links return to where you actually came from.

**Files:** `manage/console/console-shell.tsx`, `manage/console/subroute-chrome.tsx` (read — it already pushes), `manage/page.tsx` (:79-80 initialCategory), `manage/moderation/roster/roster-view.tsx` (:45), `manage/moderation/runner/[userId]/runner-view.tsx` (:73) + its page.

**Requirements:**
1. **Category in the URL:** category-scoped pane navigation writes `&cat=<id>` alongside `?pane=` (in `handleNavigate`/`onSelectCategory`/`onEditCategory` — the writes at `console-shell.tsx:183`, `:295`, `:311`). On mount, validate `?cat=` against `categories` in the same memo pattern that validates `pane`; valid → seed `selectedCategoryId`; invalid/absent → existing `initialCategoryId` fallback. Refresh while editing "Rules — 100%" now returns to 100%; pane deep links are shareable at full address.
2. **Back walks panes:** `handleNavigate`'s pane write switches from `router.replace` to `router.push(…, { scroll: false })`. Keep `replace` for the normalizations only: `reports → attention&kind=report` (:112, :166), roster redirect (:110), and the history-drawer close/restore path (read :135-183 carefully — the drawer's URL dance must not double-push). Verify the mount-time `?pane=`/`?cat=` readers keep state in sync when Back/Forward fire (Next re-renders on searchParams change — the existing popstate note at :96-99 describes the mechanism).
3. **Last-pane memory:** per-game `localStorage` key `console:<gameId>:lastPane` written on pane change; consulted only when the URL carries no `?pane=` (deep links always win). Invalid stored ids fall back to the default pane.
4. **Origin-honest back links:** roster passes `?from=roster` (plus its current `categoryId` param) when linking to runner pages; the runner page's `BackLink` targets the roster URL (with the category restored) when `from=roster` is present, else `/manage?pane=attention`. The roster page's own back link stays `?pane=attention` (that is its true parent). Labels always name the destination ("Back to Browse runs" / "Back to console").

**Verify:** typecheck/lint gates.

---

## Task 16: Console triage throughput (G10, G11, G12, G13)

**Goal:** The keyboard fast path never waits on a read; positive verdicts are cheap; the queue shows progress and ends somewhere.

**Files:** `manage/moderation/shared/run-action-dialog.tsx` (:242-260 preview-on-open, :253 busy, :593 Confirm disable, :115-129 REASON_REQUIRED/DEFAULT_REASON), `manage/moderation/attention/manual-time-verdict-row.tsx` (:8, :27, :117), `manage/moderation/attention/needs-attention.tsx` (:402-404 toolbar, :430-441 empty state, :466-468 hint line, keydown handler), `manage/moderation/roster/roster-view.tsx` (:126-133 debounce, table :364-514).

**Requirements:**
1. **Approve/restore don't gate on preview:** Confirm's disabled condition drops `isPreviewing` for the `approve` and `restore` verbs (the preview keeps streaming into the body as supporting detail with its "Loading preview…" placeholder). `remove` and `ban` keep the gate — the affected-boards preview is their safety mechanism. Add a one-line comment stating the asymmetry and why. The `v` → Enter fast path must complete with zero forced waits (verify the focus flow end-to-end).
2. **Self-claim verify parity:** in `manual-time-verdict-row.tsx`, the verify verdict's reason becomes optional with fallback `DEFAULT_REASON` "Verified — evidence checks out." mirroring the dialog's approve pattern; reject keeps `MIN_REASON = 10`. Field label switches per verdict: "Note — optional, audit-logged" (verify) / "Reject reason — required, shown to the runner" (reject). Button labels: "Verify claim" / "Reject claim".
3. **Queue position:** when a card is keyboard-selected, render "{n} of {m}" beside the shortcut hint (lift the ordered `[data-triage-card]` keys array out of the keydown handler into a memo shared with the toolbar).
4. **Empty state goes somewhere:** the "All clear" state gains two quiet links — "Review history" (navigates `?pane=history`, which already opens the drawer) and "Browse runs" (the roster route). When Task 17's hub exists, also "All your games" → `/games-v2/manage`.
5. **Roster responsiveness:** split the uniform 350ms debounce — `<select>` and category changes call `handleLoad()` immediately; only the free-text inputs (runner name, subcategory key) stay debounced. Render "{n} runs" above the table. Add client-side column sorting (RT, GT, runner, status) over the loaded rows with `aria-sort` on the active header; default order unchanged.

**Verify:** typecheck/lint gates; vitest on any extracted sort comparator.

---

## Task 17: Moderation liveness — cross-game hub + live badge (G8, G9)

**Goal:** One place answers "which of my games has work?", and an open console learns about new work without a manual reload.

**Files:** new `app/(new-layout)/games-v2/manage/page.tsx` (+ components/module.scss beside it), new `src/actions/` server action (attention count), `src/lib/get-session-data.ts` (read), `src/lib/moderation/*` (read — `listQueue`, `listGameReports`, `listManualTimes` and the console's `resolveSource` degradation pattern in `manage/page.tsx:82-96` / `load-chrome.ts`), `manage/console/console-shell.tsx` (:123-133 liveAttentionCount), `manage/console/console-chrome.tsx` (hub link).

**Requirements:**
1. **Hub route `/games-v2/manage`:** server page gated on session; reads `moderatedGames` (`get-session-data.ts:15`, game slugs). Empty → calm board-empty state ("You don't moderate any games yet."); signed-out → the standard Twitch sign-in gate pattern. Note: the static `manage` segment must win over `[game]` — verify Next routes it correctly (static segments take precedence) and that no game is slugged "manage".
2. Each moderated game renders a row: cover art (36×48, 3:4), display name, open-items count badge, "Open console" link → `/games-v2/{slug}/manage?pane=attention`. Counts come from a cached per-game helper (`'use cache'`, `cacheLife('minutes')`, `cacheTag('mod-summary:{slug}')`) fanning out `listQueue`/`listGameReports`/`listManualTimes` with the same degraded-source tolerance the console uses; failed sources mark the row's badge with the degraded treatment (count+ with a "some sources failed" title — reuse the round-1 degraded convention, honoring the "0+" fix from Task 18). Bound concurrency across games (e.g. batches of 4). Backend handoff: W8 (single summary endpoint).
3. **Discoverability:** console chrome gains a quiet "All your games" link (visible when `moderatedGames.length > 1`) next to the existing header actions.
4. **Live count in the console:** new server action `countAttentionAction(gameSlug)` returning `{ count, degraded }` (server-side reuse of the three list calls). `console-shell.tsx` polls it every 90s — skipping when `document.hidden` (mirror `NotificationsBell`'s pattern) — and revalidates on window `focus`. When the fetched count exceeds `liveAttentionCount`, do **not** mutate the list mid-triage: show a quiet inline banner/toast "New items — refresh to load" whose button calls `router.refresh()`. Counts lower than current (own triage) just update the badge.
5. **Tab title:** while the console is mounted, `document.title` mirrors the live count: "(3) Manage — {game display}" (no prefix at 0); restore the original title on unmount.

**Verify:** typecheck/lint gates; `npm run build` compiles the new route.

---

## Task 18: Final sweep — console polish, Bootstrap carve-outs, hygiene (P6, P7, G18)

**Goal:** The round-1 ledger's deferred residue and the remaining Bootstrap islands are gone; the console's small frictions are sanded off.

**Files:** `manage/run/[runId]/run-card.tsx`, `filters/clear-filters-button.tsx`, `manage/moderation/shared/run-action-dialog.tsx` (undo-toast button), `manage/game-tab/groups-section.tsx`, `manage/game-tab/categories-table.tsx` (:92-124), `manage/game-tab/game-tab.tsx` + `manage/console/console-shell.tsx` (rAF), `manage/console/console-sidebar.tsx` (degraded badge), `manage/moderation/attention/needs-attention.tsx`, `manage/moderation/configure/history-drawer.tsx` (:68-228), `submit/page.tsx` (page shell), `labels.ts` / humanize helpers, the two pages re-deriving canModerate (grep `canModerate` under games-v2 pages), `.interface-design/system.md` (carve-out list update).

**Requirements:**
1. **run-card restyle:** `manage/run/[runId]/run-card.tsx` drops raw Bootstrap (`border rounded`, stock badges) for `board-surface` + `board-pill` + `mono-time`, matching the console's vocabulary. Update the system.md carve-out list (this was its last entry besides the 4 configure forms — check and edit the list accordingly).
2. **ClearFiltersButton** (`btn btn-sm btn-outline-secondary`) → control-pill styling, same behavior.
3. **Undo-toast button** in the run-action-dialog toast drops `btn-outline-secondary` for the board's quiet-action styling.
4. **groups-section delete trigger** (`btn-link text-danger`) → quiet destructive pattern (`$accent-red` module class).
5. **Submit page shell (C6):** `submit/page.tsx` replaces `container py-4` + inline `maxWidth` + `border rounded p-4` with the wizard's header pattern (cover art + eyebrow + title — `setup.module.scss` has it) and `board-surface` for the form shell and the signed-out card.
6. **Degraded badge "0+":** in the console sidebar, a degraded source set with count 0 renders a `!` badge (title "Some sources failed to load — counts may be incomplete"), never "0+".
7. **Triage residue:** self-claim cards — `v`/`r` currently no-op silently; scope the shortcut hint per selected card type (hide "v approve · r remove" wording when the selected card only supports verify/reject row buttons, or wire `v`/`r` to that row's verify/reject — pick wiring if the row's actions map cleanly, else scoped hint; state the choice). Selection ring persists after a keyboard-triggered action completes (reselect the next `[data-triage-card]`). Bulk-bar count gets `aria-live="polite"`.
8. **Archive/Featured undo (P6):** `categories-table.tsx` visibility toggles fire the round-1 `UndoToast` pattern — "Any% archived — Undo" invoking the inverse `updateVisibilityAction`. The Featured/Archived tip gains: "Archived categories are hidden from the public page along with their boards; runs are kept."
9. **GameTab rAF (ledger):** replace the cross-file rAF scroll coupling with `focus({ preventScroll: true })` in `console-shell` per the round-1 note, so section anchors stop snapping to top after the first navigation.
10. **History drawer review mode (G18):** compact filter row inside the drawer — actor `<select>` (distinct `actorName`s from loaded rows) + action-type `<select>` (reuse `historyActionLabel` buckets), client-side over the already-loaded 90 days. Widen to `min(36rem, 100%)`. Link `row.target` to `/games-v2/{game}/manage/run/{id}` when `row.data` carries a run id (inspect the undo payload shape; degrade to text).
11. **Hygiene (ledger):** collapse `humanizeAction`/`humanizeWord` onto one sentence-case primitive; extract the inline canModerate/canConfigure predicate duplicated across two pages into a shared helper in `src/lib/moderation/` (or the existing can-moderate module) and use it in both.
12. Grep sweep: report `btn-outline-secondary`, `text-danger`, `btn-link` occurrences remaining under games-v2 — each survivor must be a documented carve-out.

**Verify:** typecheck/lint gates; `npx vitest run` full suite once at the end of this task; grep evidence per requirement 12.

---

## Final

Whole-branch review (superpowers:requesting-code-review), fix wave if needed. Append the W1–W12 wishlist to `docs/backend-handoffs-leaderboard-ux.md` under "Round 2" if any task hasn't already. Clear build cache (`rm -rf .next`) after significant changes, verify all commits, then push `leaderboard-ux-round2` (no PR — Joey opens PRs). End with a review summary for Joey covering: what shipped, the degraded-version caveats (rank approximation, my-submissions scope, notification payload assumption), and the browser-pass checklist (overlay motion, mobile console drawer, sticky-band z-order, optimistic pills).

# Board Masthead Round 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress the games-v2 board masthead so the leaderboard is visible above the fold, remove the per-row "pending" pill wall, and fix the small trust/clarity issues found in the 2026-07-29 UX audit.

**Architecture:** All changes live in `app/(new-layout)/games-v2/[game]/`. Pure-logic changes (tie marks, dates) are TDD'd against existing vitest suites. Component changes (control relocation, pill removal) are verified by typecheck + static-render screenshots — there is no TSX test infra in this repo. The plate keeps its anatomy (hero → board line → rail) but each tier gets flatter and shorter; board view-controls (verified toggle, filters) move to the table's meta bar and exist in exactly one place.

**Tech Stack:** Next.js 16 App Router, React 19, SCSS modules with `design-tokens`/`board` mixins, vitest for pure logic.

## Global Constraints

- Never push to main in this repo; branch is `worktree-board-masthead`, user opens the PR.
- Biome formatting via husky pre-commit (node_modules is symlinked into the worktree — hooks work).
- Typecheck baseline is NOT clean on main (~356 pre-existing errors): gate on diff vs baseline, not exit 0. Capture baseline before Task 1: `npx tsc --noEmit 2>&1 | wc -l`.
- No gradient washes anywhere (user rule: imposing = scale/type/spacing).
- Unused variables must be prefixed `_`.
- Do not add co-author lines to commits.
- Per-row "pending" pills are removed **permanently** (user decision) — do not add any per-row verification pill back under any condition. The "set time" pill (manual times) stays.
- `LeaderboardResponse` has no verified/pending counts (`types/leaderboards.types.ts:155`) — the board-level note must not claim a count. Backend count endpoint is a future handoff, not part of this plan.

---

### Task 1: Tie marks on every tied row

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/display-rank.ts`
- Test: `app/(new-layout)/games-v2/[game]/leaderboard/display-rank.test.ts`

**Interfaces:**
- Produces: `computeDisplayRanks(entries, primaryTiming): DisplayRank[]` — unchanged signature; now the FIRST row of a tie group also gets `tied: true` and label `=N`. `leaderboard-row.tsx` already renders `label.replace(/^=/, '')` plus a `=` tie mark when `tied` — no row change needed.

- [ ] **Step 1: Update the three tie tests to expect symmetric marks**

In `display-rank.test.ts` change the expectations (test names updated to match):

```ts
    it('two-way tie: both entries share the rank with a "=" mark', () => {
        const entries = [entry(1, 1000), entry(2, 1000), entry(3, 3000)];
        const ranks = computeDisplayRanks(entries, 'rt');
        expect(ranks).toEqual([
            { label: '=1', tied: true },
            { label: '=1', tied: true },
            { label: '3', tied: false },
        ]);
    });

    it('three-way tie: all tied entries share the first rank in the group', () => {
        const entries = [
            entry(1, 1000),
            entry(2, 1000),
            entry(3, 1000),
            entry(4, 4000),
        ];
        const ranks = computeDisplayRanks(entries, 'rt');
        expect(ranks).toEqual([
            { label: '=1', tied: true },
            { label: '=1', tied: true },
            { label: '=1', tied: true },
            { label: '4', tied: false },
        ]);
    });

    it('two separate tie groups do not bleed into each other', () => {
        const entries = [
            entry(1, 1000),
            entry(2, 1000),
            entry(3, 3000),
            entry(4, 3000),
        ];
        const ranks = computeDisplayRanks(entries, 'rt');
        expect(ranks).toEqual([
            { label: '=1', tied: true },
            { label: '=1', tied: true },
            { label: '=3', tied: true },
            { label: '=3', tied: true },
        ]);
    });
```

The no-ties test, the null-times test, and the gt-timing test keep their current expectations, EXCEPT the gt test's two entries tie, so both become `{ label: '=1', tied: true }`.

- [ ] **Step 2: Run to verify the updated tests fail**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/leaderboard/display-rank.test.ts"`
Expected: FAIL — first-of-group rows still `tied: false`.

- [ ] **Step 3: Implement lookahead in computeDisplayRanks**

Replace the loop body in `display-rank.ts`:

```ts
export function computeDisplayRanks(
    entries: LeaderboardEntry[],
    primaryTiming: TimingKey,
): DisplayRank[] {
    const out: DisplayRank[] = [];
    let groupRank = 0;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const prev = i > 0 ? entries[i - 1] : null;
        const next = i < entries.length - 1 ? entries[i + 1] : null;
        const value = timingValue(entry, primaryTiming);
        const tiedWithPrev =
            prev != null &&
            value != null &&
            timingValue(prev, primaryTiming) === value;
        const tiedWithNext =
            next != null &&
            value != null &&
            timingValue(next, primaryTiming) === value;
        if (!tiedWithPrev) groupRank = entry.rank;
        const tied = tiedWithPrev || tiedWithNext;
        out.push({ label: tied ? `=${groupRank}` : `${groupRank}`, tied });
    }
    return out;
}
```

Update the `DisplayRank.tied` doc comment to: `/** True when this entry shares its primary time with an adjacent entry. */`

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/leaderboard/display-rank.test.ts"`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard/display-rank.ts" "app/(new-layout)/games-v2/[game]/leaderboard/display-rank.test.ts"
git commit -m "fix(board): mark every row of a tie group, not just followers"
```

### Task 2: Absolute dates for runs older than a year

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/relative-date.ts`
- Test: `app/(new-layout)/games-v2/[game]/leaderboard/relative-date.test.ts`

**Interfaces:**
- Produces: `relativeDate(iso, now?): string` — unchanged signature; ≥365 days now returns `"Mar 2023"` (short month + year, UTC) instead of `"3 yr ago"`. The `title` tooltip with the exact date on the WHEN cell (`leaderboard-row.tsx:266`) is unchanged.

- [ ] **Step 1: Add/adjust tests**

Read `relative-date.test.ts` first and update any `yr ago` expectation. Add:

```ts
    it('runs a year or more old get an absolute month + year', () => {
        expect(
            relativeDate('2023-03-12T10:00:00Z', new Date('2026-07-29T10:00:00Z')),
        ).toBe('Mar 2023');
        expect(
            relativeDate('2025-07-29T10:00:00Z', new Date('2026-07-29T10:00:00Z')),
        ).toBe('Jul 2025');
    });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/leaderboard/relative-date.test.ts"`
Expected: FAIL — returns `"3 yr ago"` / `"1 yr ago"`.

- [ ] **Step 3: Implement**

Replace the final line of `relativeDate` (`return \`${Math.floor(days / 365)} yr ago\`;`) with:

```ts
    return then.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/leaderboard/relative-date.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard/relative-date.ts" "app/(new-layout)/games-v2/[game]/leaderboard/relative-date.test.ts"
git commit -m "feat(board): absolute month+year for runs older than a year"
```

### Task 3: Remove the pending-pill wall; add a board-level note

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-pager.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard.module.scss`

**Interfaces:**
- Consumes: `LeaderboardEntry.verificationStatus` (`types/leaderboards.types.ts:142`).
- Produces: no per-row pending pill anywhere. `InfoPill` component stays (still used for `set time`). WR chip on the rank-1 row no longer requires `verificationStatus === 'verified'`.

- [ ] **Step 1: Remove the pending InfoPill from rows**

In `leaderboard-row.tsx` delete the entire block (lines ~277–287):

```tsx
                {entry.source !== 'manual' &&
                    entry.verificationStatus === 'pending' && (
                        <InfoPill ... />
                    )}
```

- [ ] **Step 2: WR chip follows the plate's definition of record**

In the same file change the WR chip condition from
`{entry.rank === 1 && entry.verificationStatus === 'verified' && (` to
`{entry.rank === 1 && (`.
Update the comment above `.wrChip` in `leaderboard.module.scss` (currently "crown honesty rule…") to: `// "WR" chip on the rank-1 row. Verification caveats are carried by the board-level note in the meta bar, not per-row.`

- [ ] **Step 3: Board-level note in the pager's meta bar**

In `leaderboard-pager.tsx`, after `const merged = mergeEntries(pages);` add:

```ts
    // No verified/pending counts exist on LeaderboardResponse, so this is
    // derived from the loaded window: honest ("includes"), never a count.
    const hasPendingLoaded =
        !query.verified &&
        merged.some(
            (e) => e.source !== 'manual' && e.verificationStatus === 'pending',
        );
```

Include it in the meta-bar render condition and content:

```tsx
            {(range ||
                hasPendingLoaded ||
                showFindMe ||
                findMeStatus === 'not-found' ||
                findMeStatus === 'partial-miss') && (
                <div className={styles.boardMetaBar}>
                    {range && ( ...unchanged... )}
                    {hasPendingLoaded && (
                        <span className={styles.pendingNote}>
                            Includes runs awaiting verification
                        </span>
                    )}
                    ...rest unchanged...
```

- [ ] **Step 4: Style the note**

In `leaderboard.module.scss` next to `.notFoundNote`:

```scss
.pendingNote {
    font-size: dt.$font-size-xs;
    color: var(--bs-tertiary-color);
}
```

- [ ] **Step 5: Verify**

Run: `npx vitest run "app/(new-layout)/games-v2"` (all still pass) and `npx tsc --noEmit 2>&1 | wc -l` (no growth vs baseline).

- [ ] **Step 6: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard/"
git commit -m "feat(board): replace per-row pending pills with one board-level note"
```

### Task 4: View controls move to the table meta bar (single instance)

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/board-masthead.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/header/sticky-board-bar.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-pager.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/header/masthead.module.scss`

**Interfaces:**
- Consumes: `VerifiedToggle({verified})`, `FiltersPopover({defs, selectedVarFilters})`, `RulesPanel({rules, open, onToggle})` — all unchanged components.
- Produces: `LeaderboardPager` gains props `variableDefs: VariableDef[]` and `selectedVarFilters: Record<string, string>` (import `VariableDef` from `types/leaderboards.types`). `StickyBoardBar` loses props `verified`, `defs`, `selectedVarFilters`. `BoardMasthead` keeps its prop shape.

Rationale: each control exists in exactly ONE live DOM location. This dissolves the plate/sticky duplicate-copy machinery for these controls (the `inert` + re-key on `.utilities`) — the rail zone's `inert={stuck}` stays for CategoryRail/FilterBar.

- [ ] **Step 1: Strip the utilities row from the plate**

In `board-masthead.tsx`:
- Delete the whole `<div key={stuck ? 'stuck' : 'top'} className={styles.utilities}>…</div>` block (VerifiedToggle, seps, FiltersPopover, RulesPanel, WR history button).
- Move `RulesPanel` to `plateTop`, directly after the `boardLine` div closes:

```tsx
                    <RulesPanel
                        rules={category.rules}
                        open={rulesOpen}
                        onToggle={onToggleRules}
                    />
```

- Move the WR history button into the record block, after `recordHolder`:

```tsx
                                <button
                                    type="button"
                                    className={styles.recordHistoryLink}
                                    onClick={onOpenHistory}
                                >
                                    WR history
                                </button>
```

- Remove the now-unused `VerifiedToggle`/`FiltersPopover` imports and the `gamePageStyles` import if nothing else uses it. Trim the long `inert` comment on `.railZone` to drop the sentences about `.utilities` re-keying (keep the CategoryRail/FilterBar rationale).

- [ ] **Step 2: Record-block link style**

In `masthead.module.scss`, next to `.recordHolder`, add (and delete the `.utilities` and `.utilitySep` rules):

```scss
.recordHistoryLink {
    @include board.board-quiet-link;
    display: block;
    margin-left: auto;
    margin-top: dt.$spacing-xs;
    font-size: dt.$font-size-xs;
}
```

- [ ] **Step 3: Slim the sticky bar**

In `sticky-board-bar.tsx` remove `VerifiedToggle` and `FiltersPopover` (imports, props `verified`/`defs`/`selectedVarFilters`, JSX) — `stickyEnd` keeps only the WR history button. Update the doc comment: the duplicate-instances paragraph now applies only to `SwitchBoardPopover`/WR-history. In `board-masthead.tsx` drop the corresponding props from the `<StickyBoardBar>` call.

- [ ] **Step 4: Mount controls in the pager meta bar**

In `leaderboard-pager.tsx`:

```tsx
import type { VariableDef } from '../../../../../types/leaderboards.types';
import { FiltersPopover } from '../filters/filters-popover';
import { VerifiedToggle } from '../filters/verified-toggle';
```

Add to `Props`: `variableDefs: VariableDef[];` and `selectedVarFilters: Record<string, string>;`.

Render the meta bar unconditionally whenever the board has content or filters (the controls must stay reachable), with controls grouped right:

```tsx
            <div className={styles.boardMetaBar}>
                <span className={styles.metaLead}>
                    {range && ( ...existing range span... )}
                    {hasPendingLoaded && ( ...existing pendingNote... )}
                    {findMeStatus === 'not-found' && ( ...existing... )}
                    {findMeStatus === 'partial-miss' && ( ...existing... )}
                </span>
                <span className={styles.metaControls}>
                    {showFindMe && ( ...existing Find me button... )}
                    <VerifiedToggle verified={query.verified ?? false} />
                    <FiltersPopover
                        defs={variableDefs}
                        selectedVarFilters={selectedVarFilters}
                    />
                </span>
            </div>
```

(The outer conditional wrapper is removed entirely.) In `leaderboard.module.scss` add:

```scss
.metaLead {
    display: inline-flex;
    align-items: center;
    gap: dt.$spacing-sm;
    flex-wrap: wrap;
}

.metaControls {
    display: inline-flex;
    align-items: center;
    gap: dt.$spacing-sm;
    margin-left: auto;
    position: relative;
}
```

- [ ] **Step 5: Thread the new props**

In `game-page.tsx` pass to `<LeaderboardPager>`:

```tsx
                                variableDefs={data.variables}
                                selectedVarFilters={data.activeFilters.varFilters}
```

- [ ] **Step 6: Verify + commit**

`npx tsc --noEmit 2>&1 | wc -l` (no growth), `npx vitest run "app/(new-layout)/games-v2"`.

```bash
git add "app/(new-layout)/games-v2/[game]/"
git commit -m "feat(board): single-instance view controls in the table meta bar"
```

### Task 5: Flatten the rail into one band

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/masthead.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/header/board-masthead.tsx`

**Interfaces:**
- Consumes: `.block`/`.endcap`/`.well` class hooks in `category-rail.tsx` (markup unchanged) and the `board.*` mixins in `app/(new-layout)/styles/_board.scss` — read that file first to see what `board-rail-block`/`board-rail-endcap`/`board-rail-well` currently paint.
- Produces: same class names, flatter paint: the railZone is the only surface; group rows are label + chips with no nested boxes.

- [ ] **Step 1: Read the mixins**

Read `app/(new-layout)/styles/_board.scss` (or wherever `@use '../../../styles/board'` resolves — check `app/(new-layout)/styles/`). Note what `board-rail-block`, `board-rail-endcap`, `board-rail-well`, `board-rail-well-solo` paint. Do NOT edit the mixin file — the manage console uses it; override locally in `masthead.module.scss`.

- [ ] **Step 2: Flatten locally**

In `masthead.module.scss` replace the `.block`/`.endcap`/`.well`/`.wellSolo` rules with a flat row treatment (keep the mixin include only if Step 1 shows it's mostly layout; otherwise drop it):

```scss
// Flat rail rows: the railZone is the only surface. A group is one row —
// eyebrow label + chips — separated by hairlines, no nested boxes.
.block {
    display: flex;
    align-items: flex-start;
    gap: dt.$spacing-lg;

    & + & {
        margin-top: dt.$spacing-sm;
        padding-top: dt.$spacing-sm;
        border-top: 1px solid rgba(var(--bs-border-color-rgb), 0.35);
    }
}

.endcap {
    @include board.board-eyebrow;
    flex-shrink: 0;
    padding-top: dt.$spacing-xs;
    min-width: 7.5rem;
}

.well {
    flex: 1;
    min-width: 0;
}

.wellSolo {
    // No label column — chips span the full row.
}
```

Check the rendered result against the screenshot pipeline (Task 7) — if chips misalign, adjust `.endcap` `padding-top` so the label baseline sits on the first chip row.

- [ ] **Step 3: Tighten the railZone + drop the duplicate eyebrow**

- `.railZone` padding: `dt.$spacing-md dt.$spacing-xl` → `dt.$spacing-sm dt.$spacing-xl`.
- In `board-masthead.tsx` delete the `groupEyebrow` span above `boardTitle` (lines ~91–95: `{category.groupName && (<span className={styles.groupEyebrow}>…)}`) — the rail's endcap already names the group. Keep `.groupEyebrow` class (record block uses it).

- [ ] **Step 4: Verify + commit**

Typecheck diff + tests as before.

```bash
git add "app/(new-layout)/games-v2/[game]/header/"
git commit -m "feat(board): flatten the category rail into one surface"
```

### Task 6: Compress the condensed hero

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/game-page.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/header/game-hero.tsx`

**Interfaces:**
- Consumes: `GameHero` `variant="condensed"` path (board pages only; the full variant — category wall, standings — must not change).
- Produces: new class `heroTitleCondensed` in `game-page.module.scss`; condensed cover fixed at 40×53.

- [ ] **Step 1: Condensed title class**

In `game-page.module.scss` after `.heroTitle`:

```scss
// Board pages: the game is context, not the subject — one visual rank
// above body text, well under the category h1's 2xl.
.heroTitleCondensed {
    font-size: dt.$font-size-lg;
    font-weight: 650;
    letter-spacing: -0.01em;
    line-height: 1.2;
    margin: 0;
}
```

In `game-hero.tsx` change the condensed branch `<p className={styles.heroTitle}>` to `<p className={styles.heroTitleCondensed}>` and update its comment (drop the "Same class as the full variant's h1" sentence — that's no longer true; the game line is deliberately smaller on board pages).

- [ ] **Step 2: Smaller cover + tighter padding**

- `game-hero.tsx`: condensed `width`/`height` `56/75` → `40/53`.
- `game-page.module.scss` `.heroCoverSm`: base size `56×75` → `40×53`; delete the now-redundant `max-width: 991.98px` override inside it (both sizes would be identical). Keep the "Decision 8" comment but rewrite: `// Board pages always use the 40px cover — the game line is context at every viewport.`
- `.heroCondensed`: `padding: dt.$spacing-lg 0 dt.$spacing-md` → `padding: dt.$spacing-md 0 dt.$spacing-sm`.

- [ ] **Step 3: Verify + commit**

Typecheck diff; visual check happens in Task 7.

```bash
git add "app/(new-layout)/games-v2/[game]/header/game-hero.tsx" "app/(new-layout)/games-v2/[game]/game-page.module.scss"
git commit -m "feat(board): demote the game line on board pages"
```

### Task 7: Small clarity fixes + visual verification

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-table.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/header/category-rail.tsx`

**Interfaces:** none new.

- [ ] **Step 1: RANKED tag only when there are two time columns**

In `leaderboard-table.tsx` the ranked-header block: wrap the `rankedTag` span in `{!hidden(secondary.key) && (…)}` — with a single time column there is nothing to disambiguate. Keep the `aria-label` as is.

- [ ] **Step 2: Name the chip-count unit on hover**

In `category-rail.tsx`, on the category pill `<button>`, add a `title` mirroring the existing aria-label:

```tsx
                                                title={
                                                    runners == null
                                                        ? undefined
                                                        : `${runners.toLocaleString()} runners`
                                                }
```

(The plate's "544 runs on this board" and the pill's "681" are different units — runners vs runs; the hover makes the pill's unit explicit without widening the chip.)

- [ ] **Step 3: Static-render screenshot pass**

The auth gate (`page.tsx:32` admin check) blocks headless capture. Use the established pipeline against a worktree dev server:

1. `PORT=3001 npm run dev` in the worktree (background). Main checkout's server on 3000 is untouched; the worktree has its own `.next`. Copy `.env.local` from the main checkout first: `cp /home/joey/therun/therun-fr/.env.local .env.local`.
2. Temporarily comment the admin gate in the worktree's `page.tsx` (do NOT commit this), `curl` `http://localhost:3001/games-v2/supermario64?category=120star` to a file, then revert the gate edit immediately.
3. Post-process the saved HTML: inject `<base href="http://localhost:3001/">`, strip only `<script … src=…>` tags (keep inline `$RC` movers), screenshot `file://` at 1440×900 (light + `data-bs-theme="dark"`) and 390×844 with the scratchpad playwright-core setup.
4. Check against the audit targets: first table row visibly higher (target ≈ y<450 at 1440×900, was ~620); no pending pills; note present in meta bar; verified toggle + filters next to "Showing 1–25"; rail one surface; no "MAIN CATEGORIES" duplication; ties marked on both rows.
5. **Kill the port-3001 dev server** (match its exact pid, not `pkill -f`).

- [ ] **Step 4: Full verification + commit**

`npx vitest run "app/(new-layout)/games-v2"` (all pass), `npx tsc --noEmit 2>&1 | wc -l` vs baseline, `npx @biomejs/biome check "app/(new-layout)/games-v2/[game]"`.

```bash
git add "app/(new-layout)/games-v2/[game]/"
git commit -m "fix(board): ranked tag only with two time columns; runner-count hover"
```

### Task 8: Push and hand off

- [ ] **Step 1: Push the branch**

```bash
git push -u origin worktree-board-masthead
```

- [ ] **Step 2: Do NOT open a PR** (user does that). Report: branch name, commits, screenshot comparison, and the two follow-ups this round deliberately did not touch: mobile column-priority layout (Round 2) and the backend pending-count handoff.

## Self-Review Notes

- Spec coverage vs audit Round 1 scope: masthead compression (T5, T6), rail merge (T5), duplicate vocabulary (T5), verified-toggle/WR-history/rules relocation (T4), 681-vs-544 (T7), tie marks (T1), RANKED pill (T7), absolute dates (T2), pending pills + WR honesty (T3). Mobile table and identity accents are explicitly out (Rounds 2/4).
- The sticky bar keeps SwitchBoardPopover + WR history only; its `verified`/`defs`/`selectedVarFilters` props are removed in the same commit that removes their use (T4 Step 3) — no dangling props.
- `query.verified ?? false`: `LeaderboardQuery['verified']` may be optional — check the type in `~src/lib/leaderboards-v1` during T4; if it's `boolean`, drop the `?? false`.

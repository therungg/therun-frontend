# Board Coherence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every public view under `/games-v2/[game]` (overview, board, standings) read as one visual system — one surface recipe, two border weights, three control roles, one heading system, one grid — and visibly denser.

**Architecture:** `app/(new-layout)/styles/_board.scss` is the single vocabulary; every page module consumes its mixins instead of hand-rolling. Component (`.tsx`) changes are limited to: merging the masthead's two cards into one, giving standings the shared grid + sidebar, and folding the hero stat band into the facts line.

**Tech Stack:** Next.js 16 App Router, SCSS modules, vitest. No new dependencies.

**Spec:** `docs/plans/2026-07-31-board-coherence-design.md` (approved).

## Global Constraints

- Branch: `board-coherence` (off origin/main). Never push to main. No PRs — Joey opens them.
- **Border opacity contract:** `0.5` = surface outlines; `0.35` = internal dividers; `0.2` = table/list *row* hairlines only (already in `board-table`, sidebar pbRow). No other alpha values on border-color anywhere under `games-v2/[game]` public views (`0.4` inside the `board-glass` mixin is part of that material and stays).
- **Radius contract:** `dt.$radius-lg` = surfaces only; `dt.$radius-md` = ALL cover art + emblems at every size, buttons/inputs; `999px` = pills. No `radius-sm` in public-view modules after this plan.
- **Control roles:** `board-chip` (category rail only) · `control-pill` (every filter/utility control) · underline view-tabs (unchanged). `board-pill` = tags (WR/Ranked) only.
- No gradients, no new glass. The flat `--board-accent-soft` tint stays as-is.
- Scope: `app/(new-layout)/games-v2/[game]/` public views only — NOT `manage/`, `setup/`, `submit/`, `run/`. Shared-mixin edits must not change console/wizard appearance (additive mixins only in `_board.scss`).
- Verification per task: `npm run typecheck` (gate on *no new* errors — baseline is ~356 dirty), targeted `npx vitest run`, and SCSS compile via the check script from Task 0.
- Biome formats on commit (husky). 4-space indent, single quotes.
- Commit after every task; message style `feat(board): …` / `refactor(board): …`.

---

### Task 0: Baseline screenshots + SCSS compile harness

**Files:**
- Create: `scripts/check-scss.mjs` (throwaway-quality is fine; it may be deleted before PR)
- Baseline captures into `/tmp/claude-1000/-home-joey-therun-therun-fr/db9384c5-fbf0-4214-b7de-2b0eec01b959/scratchpad/board-before/`

**Interfaces:**
- Produces: `node scripts/check-scss.mjs` — exits 0 iff every `*.module.scss` under `app/(new-layout)/games-v2/[game]` (excluding `manage/`, `setup/`) compiles with `sass`.

- [ ] **Step 1: Write the compile checker**

```js
// scripts/check-scss.mjs — compile every public board SCSS module.
import { execFileSync } from 'node:child_process';
import { globSync } from 'glob';

const files = globSync('app/(new-layout)/games-v2/[[]game[]]/**/*.module.scss', {
    ignore: ['**/manage/**', '**/setup/**'],
});
let failed = 0;
for (const f of files) {
    try {
        execFileSync('npx', ['sass', '--no-source-map', '--style=compressed', f, '/dev/null'], { stdio: 'pipe' });
    } catch (e) {
        failed++;
        console.error(`FAIL ${f}\n${e.stderr}`);
    }
}
console.log(`${files.length - failed}/${files.length} compiled`);
process.exit(failed ? 1 : 0);
```

If `sass` or `glob` are not installable/available, fall back to `npm run build` once per task batch instead — do not skip compile verification entirely.

- [ ] **Step 2: Run it — expect PASS on the untouched tree** (proves the harness, not the change)

- [ ] **Step 3: Capture baseline screenshots.** Recipe (from the masthead-round1 sessions): temporarily comment the admin gate in `app/(new-layout)/games-v2/[game]/page.tsx` (the `notFound()` unless-admin block near the top), run `npm run dev`, `curl` the rendered HTML for three URLs — game root (overview, use a 2+-category game e.g. `Super%20Mario%2064`), one `?category=` board view, `/standings` — save into the scratchpad `board-before/` dir, then **revert the gate comment and kill the dev server**. Render the saved HTML with the scratchpad playwright-core setup if present; if that toolchain is missing, keep the raw HTML files — DOM diffing before/after is an acceptable fallback.

- [ ] **Step 4: Commit the checker script only** (screenshots stay in scratchpad):

```bash
git add scripts/check-scss.mjs
git commit -m "chore(board): scss compile checker for the coherence pass"
```

---

### Task 1: Vocabulary — `board-section-head` mixin family

**Files:**
- Modify: `app/(new-layout)/styles/_board.scss` (append after the Typography section)

**Interfaces:**
- Produces (consumed by Tasks 3, 4, 5): `board-section-head` (the flex head row), `board-section-count` (mono count). Eyebrow text inside the head keeps using the existing `board-eyebrow`.

- [ ] **Step 1: Append to `_board.scss`:**

```scss
// ---- Section head -------------------------------------------
// The one heading anatomy for every content section on the public
// board pages: overview groups, sidebar panels, standings. Eyebrow
// (board-eyebrow) left, optional mono count / quiet action right,
// hairline under. Nothing else may invent a section heading.
@mixin board-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: dt.$spacing-md;
    padding-bottom: dt.$spacing-xs;
    border-bottom: 1px solid rgba(var(--bs-border-color-rgb), 0.35);
    margin-bottom: dt.$spacing-sm;
}

@mixin board-section-count {
    font-family: dt.$font-mono;
    font-variant-numeric: tabular-nums;
    font-size: dt.$font-size-2xs;
    color: var(--bs-tertiary-color);
}
```

- [ ] **Step 2: Verify:** `node scripts/check-scss.mjs` → PASS (mixins are additive; nothing consumes them yet).

- [ ] **Step 3: Commit** — `git commit -m "feat(board): shared section-head vocabulary"`

---

### Task 2: Surfaces, borders, radii sweep

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/sidebar.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/overview/overview.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/header/masthead.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/header/view-tabs.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/standings/standings.module.scss`

**Interfaces:**
- Consumes: existing `board.board-surface($padding)`.
- Produces: every card on the page is `board-surface`; all border alphas conform to the Global Constraints contract; all cover art/emblems are `radius-md`.

- [ ] **Step 1: sidebar `.panel` → surface.** Replace its three hand-rolled declarations:

```scss
.panel {
    @include board.board-surface(dt.$spacing-lg);
    margin-bottom: dt.$spacing-lg;
}
```

(Delete the `background: var(--bs-tertiary-bg)`, `border: 1px solid var(--bs-border-color)`, `border-radius` lines and the stale "Same surface as the record-wall plaques" comment — after this task it finally is.)

- [ ] **Step 2: overview `.plaque` → surface.** In `overview.module.scss`, the plaque currently hand-rolls `background: var(--bs-tertiary-bg)` with `rgba(var(--bs-border-color-rgb), 0.7)` border. Replace background/border/radius with `@include board.board-surface(0);` keeping its own internal padding structure and any `overflow` it needs. Any other `0.6`/`0.7` border alphas in this file: outlines → `0.5`, internal dividers (e.g. `sectionRule`, podium separators) → `0.35` (row hairlines inside podium lists may use `0.2`).

- [ ] **Step 3: alpha sweep.** In all six files, `grep -n "border-color-rgb),"` and normalize every alpha to the contract: outlines `0.5`, dividers `0.35`, row hairlines `0.2`. Known offenders from the audit: hero stat divider + `sectionRule` + view-tabs rail (`0.6`), standings toggle band (`0.6`) and pills (`0.7`), plaque (`0.7`), sidebar panel (`1.0`, removed in Step 1). Do NOT touch the `board-glass` mixin or `_board.scss` values other than those named in this plan.

- [ ] **Step 4: radius sweep.** `heroCover` (game-page.module.scss, currently `radius-lg`) → `radius-md`; masthead `stickyArt` and `chipEmblem` (`radius-sm`) → `radius-md`; overview `emblem` if not already `radius-md` → `radius-md`. No `radius-sm` remains in these six files (`grep -rn "radius-sm"` over them → only hits allowed are none).

- [ ] **Step 5: Verify:** `node scripts/check-scss.mjs` → PASS. `npm run typecheck` → no new errors. Contract greps from steps 3–4 are clean.

- [ ] **Step 6: Commit** — `git commit -m "refactor(board): one surface recipe, two border weights, one art radius"`

---

### Task 3: Controls — converge on three roles

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/masthead.module.scss` (delete `.tier .chip` / `.tier .chipActive` overrides)
- Modify: `app/(new-layout)/games-v2/[game]/filters/subcategory-pills.tsx` (class swap only, if it referenced the overridden classes)
- Modify: `app/(new-layout)/games-v2/[game]/game-page.module.scss` + the hero/actions component using `.quietChip` (`header/game-hero.tsx`) — quietChip becomes a control-pill
- Verify-only: `filters/filter-bar.tsx`, `standings/category-toggles.tsx` (already `control-pill`)

**Interfaces:**
- Consumes: `board.control-pill`, `board.control-pill-active`.
- Produces: subcategory filter pills, Discord/link/Manage chips, Find me, Show more/previous, rules toggle, standings toggles — all `control-pill`. Category rail chips stay `board-chip`.

- [ ] **Step 1: masthead tier.** In `masthead.module.scss` delete the `.tier .chip { … }` and `.tier .chipActive { … }` override blocks (the squarer/outlined variants). Add tier-scoped pill classes instead:

```scss
.tier {
    // (existing layout rules stay)

    .pill {
        @include board.control-pill;
        font-size: dt.$font-size-xs;
    }

    .pillActive {
        @include board.control-pill-active;
    }
}
```

Then point the subcategory pill component (whichever of `filters/subcategory-pills.tsx` / `filters/filter-bar.tsx` renders `styles.chip` inside the tier) at `styles.pill` / `styles.pillActive`. The `.tier .endcap` block is Task 4's problem — leave it here.

- [ ] **Step 2: quietChip.** In `game-page.module.scss`, replace the `.quietChip` rules (badge-radius hand-roll) with `@include board.control-pill;` and, if it has an active/link variant, `control-pill-active`. Keep the class name (`quietChip`) so `game-hero.tsx` needs no edit unless it styles inline.

- [ ] **Step 3: Confirm the already-correct consumers** still render: `grep -rn "control-pill" app/\(new-layout\)/games-v2/\[game\]` — Find me / Show more / rules toggle / standings toggles unchanged.

- [ ] **Step 4: Verify:** `node scripts/check-scss.mjs`; `npm run typecheck`; `npx vitest run app/\(new-layout\)/games-v2/\[game\]` (labels/root-view/category-sort/game-facts suites) → all green.

- [ ] **Step 5: Commit** — `git commit -m "refactor(board): three control roles — chip, pill, tab"`

---

### Task 4: One heading system

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/overview/overview.module.scss` (+ the section-head JSX in `overview/overview-page.tsx` / `overview/collapsible-section.tsx` if class names change)
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/sidebar.module.scss` (`.panelHead`)
- Modify: `app/(new-layout)/games-v2/[game]/standings/standings.module.scss` + `standings/standings-view.tsx` (`.title`)
- Modify: `app/(new-layout)/games-v2/[game]/header/masthead.module.scss` (`.tier .endcap`)
- Modify: `app/(new-layout)/games-v2/[game]/game-page.module.scss` (`heroTitleCondensed`)

**Interfaces:**
- Consumes: `board.board-section-head`, `board.board-section-count` (Task 1), `board.board-eyebrow`.
- Produces: every section heading = eyebrow + optional mono count over a 0.35 hairline; board-view h1 at `font-size-xl`/700.

- [ ] **Step 1: overview sections.** Replace the current eyebrow+rule+count trio with one head row: container gets `@include board.board-section-head;`, label keeps `board-eyebrow`, count gets `@include board.board-section-count;`. Collapsible sections keep their toggle button inside the head row (right side, `board-quiet-link`).

- [ ] **Step 2: sidebar `.panelHead`** gets `@include board.board-section-head;` (replacing its bare flex rules) — sidebar panels gain the same hairline. Counts/links inside keep `quietLink` / gain `board-section-count` as appropriate.

- [ ] **Step 3: standings title.** Replace the `.title { font-size: xl; … }` heading with the shared anatomy: eyebrow "Standings" + explainer moved under the head. Visible h-level stays an `<h2>` for a11y — only the visual treatment changes.

- [ ] **Step 4: masthead `.tier .endcap`.** Delete the un-eyebrow override (`text-transform: none; letter-spacing: 0.02em;`) so tier labels render as standard eyebrows; keep `color: var(--bs-tertiary-color)` as the one permitted softening.

- [ ] **Step 5: board h1.** In `game-page.module.scss`, `heroTitleCondensed`: `font-size: dt.$font-size-xl; font-weight: 700; letter-spacing: -0.01em;` (was 1.25rem/650).

- [ ] **Step 6: Verify:** compile checker, typecheck, vitest as in Task 3. Then eyeball the rendered HTML (gate-comment recipe) for overview + board: every section heading shows the same anatomy.

- [ ] **Step 7: Commit** — `git commit -m "refactor(board): one section-heading system"`

---

### Task 5: Layout spine — one grid everywhere, one masthead surface

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/board-masthead.tsx` + `header/masthead.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/standings/page.tsx` + `standings/standings-view.tsx` + `standings/standings.module.scss`
- Verify-only: `game-page.tsx`, `overview/overview-page.tsx` (already on `.grid`)

**Interfaces:**
- Consumes: `gamePageStyles.grid` / `.colMain` / `.colAside` (existing), `sidebar/sidebar.tsx` props as used by `overview/overview-page.tsx`.
- Produces: all three views mount the same `.grid`; masthead renders ONE `.plate` containing hero / category rail / filter tier / rules toggle as hairline-divided internal sections.

- [ ] **Step 1: merge the masthead.** In `board-masthead.tsx`, move the railCard's children (category rail, filter tier, rules toggle row) inside the `.plate`, each wrapped in a `.plateSection`. Delete `.railCard` from the SCSS and add:

```scss
.plateSection {
    padding: dt.$spacing-sm dt.$spacing-xl;
    border-top: 1px solid rgba(var(--bs-border-color-rgb), 0.35);
}
```

`.plateTop` (hero + accent tint) stays the first child and keeps its own padding; the plate keeps `board-surface(0)` + `overflow: hidden` + its existing `margin-bottom` (use the railCard's old `spacing-lg` so the gap to the table is unchanged). Sticky-bar sentinel/behavior untouched.

- [ ] **Step 2: standings joins the grid.** In `standings/page.tsx`, fetch/pass whatever `overview/page.tsx` passes its `Sidebar` (reuse the same loader calls — compare the two `page.tsx` files and mirror; do not invent new fetchers). In `standings-view.tsx`, wrap: `<div className={gamePageStyles.grid}><div className={gamePageStyles.colMain}>…existing content…</div><aside className={gamePageStyles.colAside}><Sidebar …/></aside></div>`, matching `overview-page.tsx`'s structure exactly.

- [ ] **Step 3: Verify:** compile checker; typecheck; `npx vitest run app/\(new-layout\)/games-v2/\[game\]`; gate-comment recipe → all three URLs: main column left edge and right rail align across views (compare computed widths in the captured DOM). Interactive smoke: category chip click still swaps board, subcategory pill still filters, rules toggle still opens.

- [ ] **Step 4: Commit** — `git commit -m "feat(board): one grid, one masthead surface"`

---

### Task 6: Density pass

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.module.scss` + `header/game-hero.tsx` (stat band)
- Modify: `app/(new-layout)/games-v2/[game]/overview/overview.module.scss` (plaque paddings)
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/sidebar.module.scss` (only if Task 2 left `spacing-lg`; target `spacing-md dt.$spacing-lg` vertical/horizontal)

**Interfaces:**
- Consumes: everything above.
- Produces: ≥25% more table rows above the fold at 1080p on the board view vs the Task 0 baseline.

- [ ] **Step 1: table rows.** In `leaderboard.module.scss`, find the row cell padding (local override of `board-table`'s `td` or its own row class) and take the block padding down one token step (e.g. `spacing-md → spacing-sm`, `spacing-sm → spacing-xs`). Narrow the "When" column (`white-space: nowrap; width: 1%` pattern) if not already.

- [ ] **Step 2: hero stat band.** In `game-hero.tsx` full variant, remove the three-stat band block and append its data to the facts line as `· N runners · M runs · X h played` (reuse the existing `formatCount`/`formatHours` utils from `~src/utils/format-stats` — same formatting the band used). Delete the band's SCSS block and its `0.6`-alpha divider. Reduce full-hero vertical padding one step.

- [ ] **Step 3: plaque + sidebar padding** down one step (plaque body `spacing-lg → spacing-md`, podium `spacing-md lg lg → spacing-sm md md`; sidebar per Files note).

- [ ] **Step 4: Verify:** compile checker; typecheck; capture after-screenshots (same recipe, same three URLs) into scratchpad `board-after/`; count visible table rows at 1080p before vs after → target ≥ +25%. Diff the facts line renders correctly for a game missing stats (0 runners edge: `game-facts.ts` handles missing parts — extend its test if the facts builder changes: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/header/game-facts.test.ts`).

- [ ] **Step 5: Commit** — `git commit -m "feat(board): density pass — more board per screen"`

---

### Task 7: Final verification + handoff

**Files:**
- Modify: `docs/plans/2026-07-31-board-coherence-design.md` (status → implemented)
- Possibly delete: `scripts/check-scss.mjs` (Joey's call — ask in handoff, default keep)

- [ ] **Step 1: full gates.** `npm run typecheck` (no new errors vs main baseline), `npx vitest run` (full suite — anything red must be red on main too, verify with `git stash` if in doubt), `node scripts/check-scss.mjs`.
- [ ] **Step 2: contract greps** across the six public modules: no `radius-sm`; border alphas ∈ {0.2, 0.35, 0.5}; no `--bs-tertiary-bg` backgrounds on cards; `grep -c "board-surface"` covers plate/table wrapper/notices/plaque/panel/popovers.
- [ ] **Step 3: side-by-side** before/after screenshots for the three views; confirm each design-spec bullet (§1–5) is visibly true; list any deliberate deviations.
- [ ] **Step 4: commit docs, push branch** (`git push -u origin board-coherence`), report to Joey with the before/after captures and the deviation list. Joey does the browser pass and opens the PR.

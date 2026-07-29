# Board Rounds 2–5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the 2026-07-29 audit's remaining rounds on the games-v2 board: mobile column priority (R2), game-identity accent (R4), live-run strip (R5), and the three cheap backlog items (standings link, recent-PBs labeling, moderators panel).

**Architecture:** All in `app/(new-layout)/games-v2/[game]/`. R2 is CSS-only column hiding at narrow widths. R4 is client-side dominant-hue extraction from the cover image (canvas, CORS-guarded, silent fallback to today's look) feeding one CSS custom property. R5 reuses LivePanel's SWR key so the strip costs zero extra requests. Moderators data rides the existing `listGameModerators` lib through page.tsx → Sidebar.

**Tech Stack:** Next.js 16, React 19, SWR (already used by LivePanel), SCSS modules, vitest for pure logic.

## Global Constraints

- Never push to main; user merges. Branch: `worktree-board-rounds-2-5`.
- Typecheck baseline 573 lines — gate on no growth.
- No gradient washes; flat tints only. Accent must fall back to the current look when extraction fails.
- Per-row pending pills stay dead (R1 decision).
- Tests are pure .ts only (no TSX test infra); components verify via typecheck + static-render screenshots (gate-off-curl-revert recipe from R1, port 3001, kill server after).

---

### Task 1 (R2): Mobile column priority

**Files:**
- Modify: `leaderboard/leaderboard-table.tsx` (add `styles.when` to the When `<th>`)
- Modify: `leaderboard/leaderboard.module.scss`

**Change:** Below 576px the When column disappears (its data lives on the run detail page and in the row `title`); rank/runner/time/actions always fit. The runner name gets ellipsis so the time cell never clips.

- [ ] Step 1: In `leaderboard-table.tsx` change `<th>When</th>` to `<th className={styles.when}>When</th>`.
- [ ] Step 2: In `leaderboard.module.scss`:

```scss
@media (max-width: 575.98px) {
    .when {
        display: none;
    }
}

.runnerCell {
    // existing rules …
    min-width: 0;

    a {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.runner {
    max-width: 0; // table-cell trick: cell shrinks to available space, name ellipsizes
    width: 100%;
}
```

(Exact selector layering decided against the rendered result — the invariant to verify on the 390px screenshot: full time string visible, no horizontal scroll.)

- [ ] Step 3: Screenshot 390px, verify, commit `fix(board): mobile column priority — time always visible`.

### Task 2 (R4): Cover-accent identity

**Files:**
- Create: `header/accent-from-cover.tsx` (client)
- Create: `header/accent-hue.ts` + `header/accent-hue.test.ts` (pure: pixel array → accent hsl string or null)
- Modify: `header/board-masthead.tsx`, `header/masthead.module.scss`

**Contract:** `computeAccent(data: Uint8ClampedArray): { h: number; s: number } | null` — average hue of sufficiently-saturated, mid-lightness pixels; null when the cover is effectively monochrome (< 8% qualifying pixels). Component draws the cover into a 24×32 canvas (`crossOrigin='anonymous'`, try/catch — tainted canvas or load error → no-op) and sets `--board-accent: hsl(H S% 45%)` and `--board-accent-soft: hsl(H S% 45% / 0.05)` on the plate via a ref callback prop.

**Paint (flat, no gradients):**

```scss
.plate {
    // existing rules …
    border-top: 3px solid var(--board-accent, transparent);
}
.plateTop {
    background: var(--board-accent-soft, transparent);
}
```

- [ ] Step 1: TDD `computeAccent` (cases: saturated red image → h≈0; grey image → null; mixed → dominant bucket). Hue via max-count 30° bucket, saturation = median of bucket members, clamp s to [35, 70].
- [ ] Step 2: `AccentFromCover` component; mount inside `BoardMasthead`'s plate div; plate gets `ref`/`style` wiring.
- [ ] Step 3: Screenshot light+dark; verify the bar reads as identity, not decoration; commit `feat(board): per-game accent from cover art`.

### Task 3 (R5): Live-run strip above the table

**Files:**
- Create: `leaderboard/live-strip.tsx` (client)
- Modify: `game-page.tsx` (render strip above `LeaderboardPager` inside `colMain`), `leaderboard/leaderboard.module.scss`

**Contract:** Same SWR key as LivePanel (`/api/live?game=<display>` — SWR dedupes, zero extra requests). Filter `r.category` case-insensitive equal to the selected category display. Render nothing when no match, loading, or error. One row: live dot + "<user> is running <categoryDisplay> right now" (link to `r.url`) + "+N more" quiet button opening the existing `LiveDrawer` when N ≥ 1.

```scss
.liveStrip {
    display: flex;
    align-items: center;
    gap: dt.$spacing-sm;
    padding: dt.$spacing-sm dt.$spacing-lg;
    margin-block-end: dt.$spacing-sm;
    border: 1px solid rgba(var(--bs-border-color-rgb), 0.5);
    border-radius: dt.$radius-lg;
    font-size: dt.$font-size-sm;
}
```

Reuse `sidebar.module.scss`'s `.liveDot` treatment by replicating the class locally (cross-module composition is nondeterministic — R1 precedent).

- [ ] Step 1: Build strip, wire into game-page (needs `gameDisplay` + `selectedCategory.display` — both on `data`).
- [ ] Step 2: Typecheck; commit `feat(board): live-run strip when someone runs this board now`.

### Task 4 (backlog): Standings link on board pages

**Files:** `header/game-hero.tsx`, `game-page.tsx`, `game-page.module.scss`

`GameHero` gains optional `standingsHref?: string`; rendered in `.heroBack` next to the back link as a quiet link "Cross-category standings". `game-page.tsx` passes it when `data.categories.length > 1` (mirrors ViewTabs' own suppression rule). `.heroBack` becomes a flex row with `justify-content: space-between`.

- [ ] Implement, typecheck, commit `feat(board): standings reachable from any board`.

### Task 5 (backlog): Recent-PBs scope label + moderators panel

**Files:** `sidebar/recent-pbs-panel.tsx` (read first), `sidebar/about-panel.tsx` (read first), `sidebar/sidebar.tsx`, `page.tsx`, `sidebar/sidebar.module.scss`

- Recent PBs: eyebrow becomes "Recent PBs · all boards" (aria-friendly plain text) — one-line change once the file is read.
- Moderators: `page.tsx` already imports `listGameModerators`; fetch it unconditionally (it's the existing lib call, cached server-side), pass `moderators` (name list) through `GamePage` → `Sidebar`; new panel between RecentPbs and About: eyebrow "Moderators", `UserLink` per name, capped at 8 + "+N more" plain text. Empty list → panel not rendered.

- [ ] Implement both, typecheck, commit `feat(board): moderators panel + recent-PBs scope label`.

### Task 6: Verification + handoff

- [ ] Full: vitest games-v2, tsc line-count vs 573, biome on `[game]`.
- [ ] Screenshot pass (gate-off-curl-revert on port 3001; light/dark 1440×900 + 390px full; **kill the server by exact pid**).
- [ ] Push `worktree-board-rounds-2-5`, open PR (user merges — gh pr merge is classifier-blocked).
- [ ] Report with: what shipped per round, accent fallback behavior, live-strip match rule, sparkline/per-row stat hooks explicitly NOT built (needs backend per-runner attempt data — handoff).

## Self-Review Notes

- R5 "per-row stat hooks" from the audit is deliberately out: no per-runner attempt/history data on `LeaderboardEntry`; backend handoff documented in the final report instead of a half-fake hover.
- Accent contrast: text never sits on the accent — it's a 3px bar and a 5% tint, so no WCAG risk; podium gold/silver/bronze and WR gold stay semantic and untouched.
- LiveRun shape check needed at impl time (`user`, `login`, `url`, `picture`, `category` — from `~app/(new-layout)/live/live.types`).

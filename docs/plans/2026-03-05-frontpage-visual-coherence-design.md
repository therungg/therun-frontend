# Frontpage Visual Coherence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify the frontpage's visual language by consolidating hardcoded colors, font sizes, shadows, spacing, and interaction patterns into shared design tokens and mixins.

**Architecture:** Extend existing `_design-tokens.scss` with accent colors, font-size scale, monospace font, game art sizes, and card elevation tokens. Create `_frontpage-utilities.scss` with reusable mixins. Refactor all 10 frontpage SCSS files to import and use them. CSS-only changes — no React component modifications.

**Tech Stack:** SCSS modules, CSS custom properties, SCSS mixins

---

### Task 1: Extend design tokens

**Files:**
- Modify: `app/(new-layout)/styles/_design-tokens.scss`

**Step 1: Add accent color tokens**

After the existing `$status-finished-color` line (line 31), add:

```scss
// Accent Colors
$accent-amber: #f59e0b;
$accent-green: #4caf50;
$accent-green-bright: #66bb6a;
$accent-gold: #d4af37;
$accent-red: #ef4444;
$accent-red-light: #f87171;
```

**Step 2: Add font-size scale and monospace font**

After the existing Typography section (after line 42), add:

```scss
// Font Size Scale
$font-size-2xs: 0.65rem;   // tiny labels, badges
$font-size-xs: 0.72rem;    // small labels
$font-size-sm: 0.8rem;     // secondary text
$font-size-base: 0.9rem;   // body text
$font-size-md: 1rem;       // card titles
$font-size-lg: 1.15rem;    // stat values
$font-size-xl: 1.3rem;     // section headings
$font-size-2xl: 1.5rem;    // panel titles
$font-size-display: 2.5rem; // hero timer

// Monospace Font
$font-mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;
```

**Step 3: Add game art size tokens**

After the new font tokens, add:

```scss
// Game Art Sizes (3:4 aspect ratio)
$art-width-sm: 36px;   // 1× — list items, activity feeds
$art-width-md: 48px;   // 1.33× — mobile cards
$art-width-lg: 60px;   // 1.67× — game cards
$art-width-xl: 72px;   // 2× — top/featured cards
```

**Step 4: Add card elevation tokens**

After the existing `$active-lift` line (line 71), add:

```scss
// Card Elevation
$card-shadow-flat: $shadow-sm;
$card-shadow-raised: $shadow-md;
$card-shadow-prominent: $shadow-lg;
$card-hover-translate: -2px;
```

**Step 5: Verify no syntax errors**

Run: `npx sass --no-source-map --style=compressed app/\(new-layout\)/styles/_design-tokens.scss /dev/null 2>&1 || echo "Syntax error"`
Expected: No output (clean compile) or "Syntax error" if issue

**Step 6: Commit**

```bash
git add app/\(new-layout\)/styles/_design-tokens.scss
git commit -m "feat: extend design tokens with accent colors, font scale, art sizes, and card elevation"
```

---

### Task 2: Create frontpage utilities mixin file

**Files:**
- Create: `app/(new-layout)/styles/_frontpage-utilities.scss`

**Step 1: Create the mixin file**

```scss
@use 'design-tokens' as *;

// ── Card Elevation ──

@mixin card-elevation($level: flat) {
    @if $level == flat {
        box-shadow: $card-shadow-flat;
    } @else if $level == raised {
        box-shadow: $card-shadow-raised;
    } @else if $level == prominent {
        box-shadow: $card-shadow-prominent;
    }
    transition: transform $transition-fast, box-shadow $transition-fast;
}

@mixin card-hover {
    transform: translateY($card-hover-translate);
    box-shadow: $card-shadow-raised;
}

// ── Live Indicator ──

@mixin live-dot($size: 7px, $color: $accent-amber) {
    display: inline-block;
    width: $size;
    height: $size;
    border-radius: 50%;
    background: $color;
    box-shadow: 0 0 6px rgba($color, 0.5), 0 0 12px rgba($color, 0.3);
    animation: livePulse 2.5s ease-in-out infinite;
    flex-shrink: 0;
}

@keyframes livePulse {
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.4;
        transform: scale(0.7);
    }
}

// ── Badge / Pill ──

@mixin pill {
    display: inline-flex;
    align-items: center;
    padding: $badge-padding;
    border-radius: $badge-radius;
    font-size: $badge-font-size;
    font-weight: $badge-font-weight;
    background: $badge-bg;
    color: $badge-color;
    white-space: nowrap;
    transition: background $transition-fast;

    &:hover {
        background: $badge-bg-hover;
    }
}

// ── Stat Cell ──

@mixin stat-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: $spacing-sm $spacing-md;
}

@mixin stat-label {
    font-size: $font-size-2xs;
    font-weight: $label-font-weight;
    letter-spacing: $label-letter-spacing;
    text-transform: uppercase;
    color: var(--bs-secondary-color);
}

@mixin stat-value {
    font-family: $font-mono;
    font-size: $font-size-lg;
    font-weight: 700;
    color: var(--bs-body-color);
}

// ── Game Art ──

@mixin game-art($size: sm) {
    aspect-ratio: 3 / 4;
    object-fit: cover;
    border-radius: $radius-sm;
    flex-shrink: 0;

    @if $size == sm {
        width: $art-width-sm;
    } @else if $size == md {
        width: $art-width-md;
    } @else if $size == lg {
        width: $art-width-lg;
    } @else if $size == xl {
        width: $art-width-xl;
    }
}

// ── Section Header (inside panels) ──

@mixin section-header {
    font-size: $font-size-sm;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--bs-secondary-color);
    margin-bottom: $spacing-sm;
}
```

**Step 2: Verify the file compiles**

Run: `npx sass --no-source-map --style=compressed --load-path=app/\(new-layout\)/styles app/\(new-layout\)/styles/_frontpage-utilities.scss /dev/null 2>&1 || echo "Syntax error"`

**Step 3: Commit**

```bash
git add app/\(new-layout\)/styles/_frontpage-utilities.scss
git commit -m "feat: add shared frontpage utility mixins for cards, pills, stats, live dots, game art"
```

---

### Task 3: Refactor hero-content.module.scss

**Files:**
- Modify: `app/(new-layout)/frontpage/components/hero-content.module.scss`

**Changes:**
1. Add import at top: `@use '../../../styles/design-tokens' as *;`
2. Replace all `'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace` with `$font-mono` (5 occurrences: `.mainTimer`, `.segmentTimer`, `.statValue`, `.sidebarTimerText`, `.sidebarDelta`)
3. Replace `.statLabel` font-size `0.75rem` with `$font-size-xs` (line 279)
4. Replace `.statValue` font-size `1.15rem` with `$font-size-lg` (line 287)
5. Replace `.liveDot` animation to use shared keyframe name — keep existing `livePulse` keyframe as-is since it has white color variant for the hero badge context
6. Replace `.sidebarCard:hover` box-shadow `0 2px 8px rgba(0, 0, 0, 0.08)` with `$card-shadow-raised`
7. Replace `.sidebarCard:hover` transform `translateY(-1px)` with `translateY($card-hover-translate)`
8. Replace `.viewAllLink:hover` box-shadow with `$card-shadow-raised`
9. Replace `.progressMeta` font-size `0.8rem` with `$font-size-sm`
10. Replace `.gameLabelText` font-size `0.85rem` with `$font-size-sm` (close enough — 0.85 → 0.8 is a minor tightening)
11. Replace `.sidebarGame` font-size `0.8rem` with `$font-size-sm`
12. Replace `.sidebarRunner` font-size `0.9rem` with `$font-size-base`

**Step: Commit**

```bash
git add app/\(new-layout\)/frontpage/components/hero-content.module.scss
git commit -m "refactor: hero-content uses shared design tokens for fonts, shadows, spacing"
```

---

### Task 4: Refactor trending-section.module.scss

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/trending-section.module.scss`

**Changes:**
1. Replace `$mono` declaration (line 1) with import: `@use '../../../styles/design-tokens' as *;`
2. Replace `$amber` declaration (line 2) — remove, use `$accent-amber` from tokens
3. Replace all `$mono` references with `$font-mono`
4. Replace all `$amber` references with `$accent-amber`
5. Replace `.gameArt` width/height `60px`/`80px` with `width: $art-width-lg;` and remove explicit height (use `aspect-ratio: 3 / 4` instead)
6. Replace `.gameArtTop` width/height `72px`/`96px` with `width: $art-width-xl;`
7. Replace `.gameCard` box-shadow `0 1px 4px rgba(0, 0, 0, 0.06)` with `$card-shadow-flat`
8. Replace `.gameCard:hover` box-shadow `0 4px 20px rgba(0, 0, 0, 0.15)` with `$card-shadow-prominent`
9. Replace `.gameCard:hover` transform `translateY(-1px)` with `translateY($card-hover-translate)`
10. Replace `.statLabel` font-size `0.65rem` with `$font-size-2xs`
11. Replace `.statValue` font-size `0.9rem` with `$font-size-base`
12. Replace `.gameName` font-size `1rem` with `$font-size-md`
13. Replace `.category` font-size `0.75rem` with `$font-size-xs`
14. In mobile `@media (max-width: 768px)`, replace `.gameArt` `48px`/`64px` with `width: $art-width-md; aspect-ratio: 3 / 4;` (remove height)

**Step: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/trending-section.module.scss
git commit -m "refactor: trending section uses shared tokens for colors, fonts, art sizes, elevation"
```

---

### Task 5: Refactor pb-feed.module.scss

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/pb-feed.module.scss`

**Changes:**
1. Replace `$mono` and `$green`/`$green-bright` declarations (lines 1-3) with: `@use '../../../styles/design-tokens' as *;`
2. Replace all `$mono` → `$font-mono`
3. Replace all `$green` → `$accent-green`, `$green-bright` → `$accent-green-bright`
4. Replace `#f59e0b` hardcoded references → `$accent-amber` (lines 249, 251, 468-469)
5. Replace `.listGameThumb` and `.listThumbWrap` width/height `36px`/`48px` with `width: $art-width-sm;` and `aspect-ratio: 3 / 4;`
6. Replace `.listGameThumbFallback` `36px`/`48px` same approach
7. Replace `.featuredStatLabel` font-size `0.7rem` with `$font-size-xs` (close: 0.72)
8. Replace `.listGameCategory` font-size `0.8rem` with `$font-size-sm`
9. Replace `.listTime` font-size `0.95rem` with `$font-size-base` (close: 0.9, minor bump is acceptable)
10. Replace `.featuredTime` font-size `2.5rem` with `$font-size-display`

**Step: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/pb-feed.module.scss
git commit -m "refactor: pb-feed uses shared tokens for colors, fonts, art sizes"
```

---

### Task 6: Refactor races-section.module.scss

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/races-section.module.scss`

**Changes:**
1. Replace `$mono`, `$amber`, `$green` declarations (lines 1-3) with: `@use '../../../styles/design-tokens' as *;`
2. Replace all `$mono` → `$font-mono`
3. Replace all `$amber` → `$accent-amber`
4. Replace `$green: #608c59` → `$accent-green` (this is the key green unification — races used #608c59 while others use #4caf50)
5. Replace `#d4af37` → `$accent-gold` (line 344)
6. Replace `.raceArt` width/height `36px`/`48px` → `width: $art-width-sm; aspect-ratio: 3 / 4;` (remove explicit height)
7. Replace `.statusDot` dimensions to use standardized live dot pattern
8. Replace `.liveDot` definition (lines 384-392) to use `@include live-dot(7px, $accent-amber)` — need to import frontpage-utilities
9. Replace `.groupHeader` font-size `0.75rem` with `$font-size-xs`
10. Replace `.cardStatLabel` font-size `0.7rem` with `$font-size-xs`
11. Replace `@keyframes pulse` — remove duplicate, it'll come from the utilities import

**Step: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/races-section.module.scss
git commit -m "refactor: races section uses shared tokens — unifies green shade from #608c59 to #4caf50"
```

---

### Task 7: Refactor your-stats.module.scss

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats.module.scss`

**Changes:**
1. Replace `$mono`, `$green`, `$amber`, `$gold`, `$silver`, `$bronze`, `$red` declarations (lines 1-7) with: `@use '../../../styles/design-tokens' as *;`
2. Add additional needed variables not in tokens: `$silver: #c0c0c0; $bronze: #cd7f32;` (keep these local — they're unique to this component)
3. Replace all `$mono` → `$font-mono`
4. Replace `$green: #66bb6a` → `$accent-green-bright`
5. Replace `$amber` → `$accent-amber`
6. Replace `$gold: #ffd700` → `$accent-gold`
7. Replace `$red: #ef5350` → `$accent-red` (close enough: #ef5350 → #ef4444)
8. Replace `.statValue` font-size `1.1rem` → `$font-size-lg`
9. Replace `.statLabel` font-size `0.65rem` → `$font-size-2xs`
10. Replace `.streakNumber` font-size `2.8rem` — keep as-is (unique to streak, larger than display)
11. Replace `.sectionLabel` font-size `0.72rem` → `$font-size-xs`
12. Replace `.topGameImage` width/height `36px`/`48px` → `width: $art-width-sm; aspect-ratio: 3 / 4;` (remove explicit height)
13. Replace `.topGameName` font-size `0.88rem` → `$font-size-base`
14. Increase `.content` padding from `1rem 1.25rem` → `$spacing-lg $spacing-2xl` (using tokens, same values)

**Step: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/your-stats.module.scss
git commit -m "refactor: your-stats uses shared tokens — unifies green, amber, gold, font scale"
```

---

### Task 8: Refactor community-pulse.module.scss

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/community-pulse.module.scss`

**Changes:**
1. Replace `$mono`, `$amber` declarations (lines 1-2) with: `@use '../../../styles/design-tokens' as *;`
2. Replace all `$mono` → `$font-mono`
3. Replace all `$amber` → `$accent-amber`
4. Replace `.liveDot` definition (lines 28-37) — simplify using shared pattern (same values but now from tokens)
5. Replace `.number` font-size `1.75rem` — keep as-is (unique display size for pulse)
6. Replace `.label` font-size `0.75rem` → `$font-size-xs`
7. Replace `.liveCount` font-size `0.8rem` → `$font-size-sm`
8. Replace `.liveLabel` font-size `0.75rem` → `$font-size-xs`
9. Remove duplicate `@keyframes pulse` definition — use shared one from utilities
10. Increase `.content` padding from `1rem 1.25rem` → `$spacing-lg $spacing-2xl` (same values via tokens)

**Step: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/community-pulse.module.scss
git commit -m "refactor: community-pulse uses shared tokens for colors, fonts, live indicator"
```

---

### Task 9: Refactor quick-links.module.scss and patreon-panel.module.scss

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/quick-links.module.scss`
- Modify: `app/(new-layout)/frontpage/panels/patreon-panel/patreon-panel.module.scss`

**Changes for quick-links:**
1. Add import: `@use '../../../styles/design-tokens' as *;`
2. Increase `.content` padding from `0.75rem 1rem` → `$spacing-lg $spacing-2xl` (sidebar density alignment)
3. Replace `.groupLabel` font-size `0.75rem` → `$font-size-xs`
4. Replace `.linkItem` font-size `0.9rem` → `$font-size-base`

**Changes for patreon-panel:**
1. Add import: `@use '../../../../styles/design-tokens' as *;`
2. Replace `.heading` font-size `1.05rem` → `$font-size-md`
3. Replace `.description` font-size `0.9rem` → `$font-size-base`
4. Replace `.patronLabel` font-size `0.8rem` → `$font-size-sm`
5. Replace `.patronItem` font-size `0.9rem` → `$font-size-base`

**Step: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/quick-links.module.scss app/\(new-layout\)/frontpage/panels/patreon-panel/patreon-panel.module.scss
git commit -m "refactor: quick-links and patreon-panel use shared tokens, improved sidebar density"
```

---

### Task 10: Add page background and refactor panel component

**Files:**
- Modify: `app/(new-layout)/frontpage/frontpage.module.scss`
- Modify: `app/(new-layout)/components/styles/panel.component.module.scss`

**Changes for frontpage.module.scss:**

Add at line 1:
```scss
@use '../../styles/design-tokens' as *;
```

Add a new wrapper class for the page background:
```scss
.frontpageBackground {
    background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--bs-body-bg) 95%, var(--bs-primary) 5%) 0%,
        var(--bs-body-bg) 400px
    );
    min-height: 100vh;
}
```

**Changes for panel.component.module.scss:**
1. Add import: `@use '../../styles/design-tokens' as *;`
2. Replace `.title` font-size `1.5rem` → `$font-size-2xl`
3. Replace `.subtitle` font-size `0.75rem` → `$font-size-xs`
4. Replace hardcoded `rgba(96, 140, 89, ...)` shadow values with `rgba($accent-green, ...)` variants where possible, or keep as-is if SCSS compilation doesn't support it in this context (the panel uses CSS custom properties)

**Step: Commit**

```bash
git add app/\(new-layout\)/frontpage/frontpage.module.scss app/\(new-layout\)/components/styles/panel.component.module.scss
git commit -m "feat: add subtle page background gradient, panel component uses shared font tokens"
```

---

### Task 11: Apply page background class in frontpage component

**Files:**
- Modify: `app/(new-layout)/frontpage/frontpage.tsx`

**Changes:**
1. Import the frontpage module styles
2. Wrap the frontpage content in a div with the `frontpageBackground` class

**Step: Commit**

```bash
git add app/\(new-layout\)/frontpage/frontpage.tsx
git commit -m "feat: apply page background gradient wrapper to frontpage"
```

---

### Task 12: Visual verification

**Step 1: Build to catch any compilation errors**

Run: `npm run build`
Expected: Clean build with no SCSS errors

**Step 2: Visual check**

Run: `npm run dev`

Check the frontpage at localhost:3000 and verify:
- All sections render correctly
- Colors are unified (no jarring mismatches)
- Card hovers feel consistent across sections
- Live dots pulse at same rate everywhere
- Font sizes look proportional
- Game art maintains 3:4 ratio
- Sidebar density matches main column better
- Page background gradient is subtle, not distracting
- Dark mode still works correctly

**Step 3: Final commit if any tweaks needed**

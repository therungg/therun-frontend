# Trending Games Glassmorphism Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the trending games section from flat rows into frosted-glass cards with game-art backgrounds, visual hierarchy by rank, and polished hover states.

**Architecture:** Pure CSS/SCSS changes to `.gameCard` styling (glass surface, backdrop-filter, pseudo-element background art) plus minor TSX changes to pass the game image URL as a CSS custom property and apply rank-based class names. No data changes, no new components.

**Tech Stack:** SCSS modules, CSS backdrop-filter, CSS custom properties, Next.js Image (existing)

**Design doc:** `docs/plans/2026-03-05-trending-glassmorphism-design.md`

---

### Task 1: Glass card surface and card gap

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/trending-section.module.scss:56-85`

**Step 1: Update `.games` gap**

Change the gap from `2px` to `6px` so glass card edges are visible between cards.

```scss
.games {
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: opacity 0.15s ease;
}
```

**Step 2: Update `.gameCard` to glass surface**

Replace the current flat card styles with glass surface:

```scss
.gameCard {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 0.75rem;
    border-radius: 0.5rem;
    text-decoration: none;
    color: inherit;
    overflow: hidden;

    background: color-mix(in srgb, var(--bs-body-bg) 55%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid color-mix(in srgb, var(--bs-border-color) 20%, transparent);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

    transition:
        background-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease,
        backdrop-filter 0.2s ease;

    &:hover {
        background: color-mix(in srgb, var(--bs-body-bg) 65%, transparent);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
        text-decoration: none;
        color: inherit;
        border-color: color-mix(in srgb, var(--bs-border-color) 40%, transparent);
    }
}
```

**Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS (no TS changes yet)

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/sections/trending-section.module.scss
git commit -m "feat(trending): glass card surface with backdrop-filter"
```

---

### Task 2: Game art background pseudo-element

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/trending-section.module.scss:70` (add `::before` to `.gameCard`)
- Modify: `app/(new-layout)/frontpage/sections/trending-section-client.tsx:239-241`

**Step 1: Add `::before` pseudo-element for background art in SCSS**

Add this inside the `.gameCard` block, after the existing styles but before `&:hover`:

```scss
&::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--bg-image) right center / cover no-repeat;
    opacity: 0.1;
    filter: blur(2px);
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 0;
}

// Ensure children stack above the pseudo-element
> * {
    position: relative;
    z-index: 1;
}
```

Update the hover block to also bump art opacity:

```scss
&:hover::before {
    opacity: 0.18;
}
```

**Step 2: Pass `--bg-image` as inline style in TSX**

In `trending-section-client.tsx`, update the `<Link>` in `HotGameCard` to pass the CSS custom property:

Change:
```tsx
<Link
    href={`/${safeEncodeURI(game.gameDisplay)}`}
    className={styles.gameCard}
>
```

To:
```tsx
<Link
    href={`/${safeEncodeURI(game.gameDisplay)}`}
    className={styles.gameCard}
    style={{ '--bg-image': `url(${imageUrl})` } as React.CSSProperties}
>
```

**Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/sections/trending-section.module.scss app/(new-layout)/frontpage/sections/trending-section-client.tsx
git commit -m "feat(trending): game art background via pseudo-element"
```

---

### Task 3: Rank-based visual hierarchy

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/trending-section.module.scss` (add new classes)
- Modify: `app/(new-layout)/frontpage/sections/trending-section-client.tsx:239-242`

**Step 1: Add rank-based card classes in SCSS**

Add after the `.gameCard` block:

```scss
// #1 game gets green glow
.gameCardTop {
    border-color: rgba(0, 124, 0, 0.4);
    box-shadow:
        0 0 20px rgba(0, 124, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);

    &:hover {
        border-color: rgba(0, 124, 0, 0.6);
        box-shadow:
            0 0 24px rgba(0, 124, 0, 0.2),
            0 4px 20px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
}

// #4-5 games fade slightly
.gameCardFaded {
    .statValue {
        color: var(--bs-secondary-color);
    }

    .statHighlight .statValue {
        color: color-mix(in srgb, $amber 70%, var(--bs-secondary-color) 30%);
    }
}
```

**Step 2: Apply rank-based classes in TSX**

Update the `<Link>` className in `HotGameCard` from:
```tsx
className={styles.gameCard}
```

To:
```tsx
className={`${styles.gameCard} ${isTop ? styles.gameCardTop : ''} ${rank >= 4 ? styles.gameCardFaded : ''}`}
```

**Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/sections/trending-section.module.scss app/(new-layout)/frontpage/sections/trending-section-client.tsx
git commit -m "feat(trending): rank-based visual hierarchy (#1 glow, #4-5 fade)"
```

---

### Task 4: Refined category pills

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/trending-section.module.scss:151-164`

**Step 1: Update `.category` styling**

Replace the existing `.category` styles:

```scss
.category {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    background: color-mix(in srgb, var(--bs-secondary-bg) 60%, transparent);
    border: 1px solid color-mix(in srgb, var(--bs-border-color) 20%, transparent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    transition: background-color 0.15s ease;
}
```

Add a hover brightening effect via the parent card:

```scss
.gameCard:hover .category {
    background: color-mix(in srgb, var(--bs-secondary-bg) 80%, transparent);
}
```

**Step 2: Commit**

```bash
git add app/(new-layout)/frontpage/sections/trending-section.module.scss
git commit -m "feat(trending): refined category pill styling"
```

---

### Task 5: Reduced-motion and mobile responsive

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/trending-section.module.scss` (media queries)

**Step 1: Add reduced-motion media query**

Add before the existing `@media (max-width: 768px)` block:

```scss
@media (prefers-reduced-motion: reduce) {
    .gameCard {
        transition: none;

        &::before {
            transition: none;
        }
    }
}
```

**Step 2: Update mobile responsive block**

The existing `@media (max-width: 768px)` already handles art sizing and stat collapsing. Add glass simplification:

```scss
@media (max-width: 768px) {
    .gameCard {
        padding: 0.5rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

        &:hover {
            transform: none;
        }
    }

    // ... keep existing mobile rules ...
}
```

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/sections/trending-section.module.scss
git commit -m "feat(trending): reduced-motion support and mobile glass adjustments"
```

---

### Task 6: Visual verification and cleanup

**Step 1: Run linting**

Run: `npm run lint`
Expected: PASS

**Step 2: Run type check**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Start dev server and visually verify**

Run: `npm run dev`

Check:
- Cards have visible glass effect with blurred backgrounds
- #1 card has green glow border
- #4-5 cards have slightly faded stats
- Hover lifts card and deepens shadow
- Category pills brighten on card hover
- Mobile layout still works (resize browser)
- Light/dark mode both look correct

**Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore(trending): cleanup after glassmorphism redesign"
```

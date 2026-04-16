# Patron-Styled Live Run Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `LiveUserRun` cards on the live page visually reflect each patron's color/gradient/animation, with progressive treatment across tiers 1-3.

**Architecture:** CSS custom properties (`--patron-primary`, `--patron-gradient`) set on the card element, combined with tier/modifier CSS classes (`.patronTier1`-`.patronTier3`, `.patronGradient`, `.patronAnimated`). A `::before` pseudo-element renders the background tint/gradient at varying opacities per tier. All visual logic lives in SCSS; the component only computes and passes the data.

**Tech Stack:** SCSS modules, React (existing component), CSS custom properties, `clsx`

**Spec:** `docs/superpowers/specs/2026-04-17-patron-live-card-styling-design.md`

---

### Task 1: Add patron tier SCSS styles

**Files:**
- Modify: `src/components/css/LiveRun.module.scss:33-34` (insert after `.liveRunActive` block)
- Modify: `src/components/css/LiveRun.module.scss:846-863` (extend reduced motion block)

- [ ] **Step 1: Add patron tier base and tier-specific styles**

Insert the following block between the `.liveRunActive` closing brace (line 33) and the `// Flash animations` comment (line 35) in `src/components/css/LiveRun.module.scss`:

```scss
// ============================================
// Patron Tier Styles
// ============================================

// Shared base — ::before overlay for background tint/gradient
.patronTier1,
.patronTier2,
.patronTier3 {
    position: relative;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        border-radius: inherit;
        background: var(--patron-primary);
        opacity: 0.08;
    }

    > * {
        position: relative;
        z-index: 1;
    }
}

// Tier 2 — Washed
.patronTier2 {
    &::before {
        opacity: 0.12;
    }

    &.patronGradient::before {
        background: none;
        background-image: var(--patron-gradient);
        opacity: 0.10;
    }
}

// Tier 3 — Full Canvas
.patronTier3 {
    &::before {
        opacity: 0.15;
    }

    &.patronGradient::before {
        background: none;
        background-image: var(--patron-gradient);
        opacity: 0.18;
    }

    &.patronAnimated::before {
        background-size: 200% 100%;
        animation: patronSweep 8s linear infinite;
    }
}

@keyframes patronSweep {
    0% {
        background-position: 0% 50%;
    }
    100% {
        background-position: 100% 50%;
    }
}

// Game image vignette (tier 3)
.patronTier3 .liveRunArt {
    position: relative;

    &::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 40%;
        background: linear-gradient(to right, transparent, var(--patron-primary));
        opacity: 0.2;
        pointer-events: none;
    }
}

// Avatar ring glow (tier 2+)
.patronTier2 .liveRunAvatar,
.patronTier3 .liveRunAvatar {
    border-color: var(--patron-primary);
    box-shadow: 0 0 6px color-mix(in srgb, var(--patron-primary) 40%, transparent);
}

// Split timeline current segment in patron color (tier 2+)
.patronTier2 .splitSegmentCurrent,
.patronTier3 .splitSegmentCurrent {
    background: var(--patron-primary);
    box-shadow: 0 0 4px color-mix(in srgb, var(--patron-primary) 50%, transparent);
    animation: none;
}
```

- [ ] **Step 2: Extend reduced motion block**

Inside the existing `@media (prefers-reduced-motion: reduce)` block at the bottom of the file, add after the `.liveRunContainer { transition: none; }` rule:

```scss
    .patronAnimated::before {
        animation: none;
    }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/css/LiveRun.module.scss
git commit -m "feat(patron): add progressive tier styles for live run cards"
```

---

### Task 2: Extend LiveUserRun component with patron tier data

**Files:**
- Modify: `src/components/live/live-user-run.tsx:81-84` (extend state type)
- Modify: `src/components/live/live-user-run.tsx:93-116` (extend useEffect)
- Modify: `src/components/live/live-user-run.tsx:148-173` (apply classes and custom properties)

- [ ] **Step 1: Extend the state type**

Replace the `liveUserStyles` state declaration at lines 81-84:

```tsx
// Old
const [liveUserStyles, setLiveUserStyles] = useState<{
    borderColor: string;
    gradient: string;
}>({ borderColor: '', gradient: '' });
```

With:

```tsx
const [liveUserStyles, setLiveUserStyles] = useState<{
    borderColor: string;
    gradient: string;
    patronPrimary: string;
    patronGradient: string;
    patronTier: number;
    isGradient: boolean;
    isAnimated: boolean;
}>({
    borderColor: '',
    gradient: '',
    patronPrimary: '',
    patronGradient: '',
    patronTier: 0,
    isGradient: false,
    isAnimated: false,
});
```

- [ ] **Step 2: Extend the useEffect to compute patron flair data**

Replace the useEffect at lines 93-116:

```tsx
// Old
useEffect(() => {
    if (!isLoading && patreons && patreons[liveRun.user]) {
        const patreonData = patreons[liveRun.user];
        let borderColor = '';
        let gradient = '';

        if (!patreonData.preferences || !patreonData.preferences.hide) {
            const fill = resolveFill(
                patreonData.preferences,
                patreonData.tier,
                dark ? 'dark' : 'light',
            );
            if (fill.kind === 'gradient') {
                gradient = `-webkit-linear-gradient(left, ${fill.value.join(',')})`;
                borderColor = fill.value[0];
            } else {
                borderColor = fill.value;
            }
        } else {
            borderColor = 'var(--bs-link-color)';
        }
        setLiveUserStyles({ borderColor, gradient });
    }
}, [patreons, isLoading, liveRun.user, dark]);
```

With:

```tsx
useEffect(() => {
    if (!isLoading && patreons && patreons[liveRun.user]) {
        const patreonData = patreons[liveRun.user];
        let borderColor = '';
        let gradient = '';
        let patronPrimary = '';
        let patronGradient = '';
        let patronTier = 0;
        let isGradient = false;
        let isAnimated = false;

        if (!patreonData.preferences || !patreonData.preferences.hide) {
            const fill = resolveFill(
                patreonData.preferences,
                patreonData.tier,
                dark ? 'dark' : 'light',
            );
            patronTier = Math.min(patreonData.tier, 3);

            if (fill.kind === 'gradient') {
                gradient = `-webkit-linear-gradient(left, ${fill.value.join(',')})`;
                borderColor = fill.value[0];
                patronPrimary = fill.value[0];
                const angle =
                    patreonData.preferences?.gradientAngle?.[
                        dark ? 'dark' : 'light'
                    ] ?? 90;
                patronGradient = `linear-gradient(${angle}deg, ${fill.value.join(', ')})`;
                isGradient = true;
                isAnimated = !!patreonData.preferences?.gradientAnimated;
            } else {
                borderColor = fill.value;
                patronPrimary = fill.value;
            }
        } else {
            borderColor = 'var(--bs-link-color)';
        }
        setLiveUserStyles({
            borderColor,
            gradient,
            patronPrimary,
            patronGradient,
            patronTier,
            isGradient,
            isAnimated,
        });
    }
}, [patreons, isLoading, liveRun.user, dark]);
```

- [ ] **Step 3: Apply patron classes and custom properties to the card**

Replace the card div's `className` and `style` props (lines 149-173).

Old `className` (lines 150-157):

```tsx
className={clsx(
    'card',
    styles.liveRunContainer,
    liveRun.user === currentlyActive && styles.liveRunActive,
    flash === 'gold' && styles.liveRunGold,
    flash === 'ahead' && styles.liveRunGreen,
    flash === 'behind' && styles.liveRunRed,
)}
```

New `className`:

```tsx
className={clsx(
    'card',
    styles.liveRunContainer,
    liveRun.user === currentlyActive && styles.liveRunActive,
    flash === 'gold' && styles.liveRunGold,
    flash === 'ahead' && styles.liveRunGreen,
    flash === 'behind' && styles.liveRunRed,
    liveUserStyles.patronTier === 1 && styles.patronTier1,
    liveUserStyles.patronTier === 2 && styles.patronTier2,
    liveUserStyles.patronTier >= 3 && styles.patronTier3,
    liveUserStyles.isGradient && styles.patronGradient,
    liveUserStyles.isAnimated && styles.patronAnimated,
)}
```

Old `style` (lines 158-173):

```tsx
style={
    liveUserStyles.gradient
        ? {
              borderImageSource: liveUserStyles.gradient,
              borderImageSlice: 1,
              borderWidth: '2px',
          }
        : {
              borderColor: liveUserStyles.borderColor || undefined,
              borderWidth:
                  liveUserStyles.gradient ||
                  liveUserStyles.borderColor
                      ? '2px'
                      : undefined,
          }
}
```

New `style`:

```tsx
style={
    {
        ...(liveUserStyles.gradient
            ? {
                  borderImageSource: liveUserStyles.gradient,
                  borderImageSlice: 1,
                  borderWidth: '2px',
              }
            : {
                  borderColor:
                      liveUserStyles.borderColor || undefined,
                  borderWidth:
                      liveUserStyles.gradient ||
                      liveUserStyles.borderColor
                          ? '2px'
                          : undefined,
              }),
        ...(liveUserStyles.patronPrimary && {
            '--patron-primary': liveUserStyles.patronPrimary,
        }),
        ...(liveUserStyles.patronGradient && {
            '--patron-gradient': liveUserStyles.patronGradient,
        }),
    } as React.CSSProperties
}
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors related to `live-user-run.tsx` or `LiveRun.module.scss`.

- [ ] **Step 5: Commit**

```bash
git add src/components/live/live-user-run.tsx
git commit -m "feat(patron): apply tier classes and custom properties to live run cards"
```

---

### Task 3: Verify build

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: no new errors.

- [ ] **Step 2: Run production build**

```bash
rm -rf .next && npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Visual verification**

Start the dev server (`npm run dev`) and navigate to the live page. Verify:

1. **Non-patron cards**: unchanged appearance — no tint, no extra classes.
2. **Tier 1 patron**: subtle colored background tint visible behind card content. Colored border (pre-existing).
3. **Tier 2 patron**: stronger tint (or gradient wash for gradient patrons). Avatar has colored ring with glow. Current split timeline segment is patron-colored (no pulse animation).
4. **Tier 3 patron**: strongest tint. Game image has a colored vignette on its right edge blending into the card. Animated gradient patrons show the background slowly sweeping.
5. **`prefers-reduced-motion`**: animated sweep is disabled (use browser devtools to emulate).
6. **Flash animations**: gold/green/red flashes still fire normally on patron cards — the tint overlay coexists.

- [ ] **Step 4: Commit any fixes, push**

```bash
git push
```

# Patron Name Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a full patron name customizer (per-mode solid/gradient colors, bold/italic, shadow, outline, gradient angle & animation) behind a new settings page, plus a single shared `<PatronName>` renderer used by every call site.

**Architecture:** One pure style builder (`buildPatronStyle`) powers both the render component and the settings-page preview. Settings page is two-column with a sticky dual-theme preview. Legacy `colorPreference` still renders via a preset map and is auto-migrated on the user's next save.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, SCSS modules, Bootstrap (existing), `react-switch` (existing), `react-bootstrap` (existing).

**Testing note:** This project has no unit test framework installed (no vitest/jest). This plan deliberately does not introduce one — that would be scope creep. Verification uses `npm run typecheck`, `npm run lint`, and manual browser testing via `npm run dev`. Each task includes explicit verification steps.

**Spec:** `docs/superpowers/specs/2026-04-15-patron-name-customization-design.md`

---

## File Structure

**New files:**
- `src/components/patreon/patron-style.ts` — pure `buildPatronStyle` + `resolveFill` + `defaultTierColor`
- `src/components/patreon/legacy-preset-map.ts` — `legacyPresetMap(id)` returning typed solid/gradient entries
- `app/(new-layout)/change-appearance/customization/preset-shortcuts.tsx`
- `app/(new-layout)/change-appearance/customization/fill-section.tsx`
- `app/(new-layout)/change-appearance/customization/solid-picker.tsx`
- `app/(new-layout)/change-appearance/customization/gradient-picker.tsx`
- `app/(new-layout)/change-appearance/customization/font-section.tsx`
- `app/(new-layout)/change-appearance/customization/effects-section.tsx`
- `app/(new-layout)/change-appearance/customization/display-section.tsx`
- `app/(new-layout)/change-appearance/customization/preview-pane.tsx`
- `app/(new-layout)/change-appearance/customization/contrast-warning.tsx`
- `app/(new-layout)/change-appearance/customization/customization.module.scss`
- `app/(new-layout)/change-appearance/customization/validation.ts`

**Modified files:**
- `types/patreon.types.ts` — extend `PatronPreferences`
- `src/components/patreon/patreon-name.tsx` — new props shape, uses `buildPatronStyle`
- `src/components/patreon/patreon-styles.ts` — kept; exported data stays as source for legacy map
- `app/(new-layout)/change-appearance/patreon-section.tsx` — full rewrite
- `app/(new-layout)/styles/_globals.scss` — add `@keyframes patron-gradient`
- `src/components/live/live-user-run.tsx` — migrate to `<PatronName>` / `buildPatronStyle`
- `src/components/live/recommended-stream.tsx` — same
- `src/components/links/links.tsx` — same
- `src/components/Topbar/MobileMenu.tsx` — same (local `PatronDisplayName`)
- `src/components/Topbar/PatronCta.tsx` — same
- `app/(new-layout)/frontpage/panels/patreon-panel/patreon-panel.tsx` — pass full `preferences` instead of just `colorPreference`
- `app/(new-layout)/frontpage/panels/patreon-panel/patreon-panel-view.tsx` — same

---

## Task 1: Extend PatronPreferences types

**Files:**
- Modify: `types/patreon.types.ts`

- [ ] **Step 1: Replace file contents**

```ts
export interface PerMode<T> {
    dark: T;
    light: T;
}

export interface TextShadowSpec {
    color: string;
    blur: number;
}

export interface OutlineSpec {
    color: string;
    width: number;
}

export interface PatronPreferences {
    hide: boolean;
    featureInScrollbar: boolean;
    featureOnOverview: boolean;
    showIcon: boolean;

    /** @deprecated Legacy preset id. Read for rendering; never written by new UI. */
    colorPreference?: number;

    customColor?: PerMode<string> | null;
    customGradient?: PerMode<string[]> | null;

    bold?: boolean;
    italic?: boolean;

    textShadow?: PerMode<TextShadowSpec> | null;
    outline?: PerMode<OutlineSpec> | null;

    gradientAngle?: PerMode<number> | null;
    gradientAnimated?: boolean;
}

export interface Patron {
    preferences: PatronPreferences;
    tier: number;
}

export interface PatronMap {
    [PatronName: string]: Patron;
}

export interface FeaturedPatron {
    patronId: number;
    patreonName: string;
    tier: number;
    username: string | null;
    preferences: PatronPreferences | null;
    picture: string | null;
}

export interface FeaturedPatronsResponse {
    supporterOfTheDay: FeaturedPatron | null;
    latestPatron: FeaturedPatron | null;
}
```

- [ ] **Step 2: Run typecheck — expect failures in consumer sites**

Run: `npm run typecheck`
Expected: Type errors in `patreon-section.tsx`, `PatronCta.tsx`, `MobileMenu.tsx`, `patreon-panel*.tsx`, and any other code that relied on `colorPreference: number` as required. This is expected — later tasks fix them.

- [ ] **Step 3: Commit**

```bash
git add types/patreon.types.ts
git commit -m "feat(patron): extend PatronPreferences type for custom styling"
```

---

## Task 2: Add legacy preset map

**Files:**
- Create: `src/components/patreon/legacy-preset-map.ts`

- [ ] **Step 1: Create file**

```ts
import type { PerMode } from '../../../types/patreon.types';
import patreonStyles from './patreon-styles';

export type LegacyPresetEntry =
    | { kind: 'solid'; value: PerMode<string>; tier: number }
    | { kind: 'gradient'; value: PerMode<string[]>; tier: number };

interface RawColor {
    colorset1: string | string[];
    colorset2: string | string[];
    tier: number;
    id: number;
}

// Re-derive raw data from patreon-styles (it already builds style objects;
// we want the underlying color values). Duplicate the table here rather than
// refactor patreon-styles.ts — the old file is kept as-is for continuity.
const RAW_PRESETS: RawColor[] = [
    { colorset1: '#27A11B', colorset2: '#007c00', tier: 1, id: 0 },
    { colorset1: '#fdc544', colorset2: '#a3850e', tier: 2, id: 100 },
    { colorset1: 'white', colorset2: 'black', tier: 2, id: 101 },
    { colorset1: 'HOTPINK', colorset2: 'purple', tier: 2, id: 102 },
    { colorset1: 'lightgrey', colorset2: 'grey', tier: 2, id: 103 },
    { colorset1: 'red', colorset2: 'darkred', tier: 2, id: 104 },
    { colorset1: 'lightblue', colorset2: 'blue', tier: 2, id: 105 },
    { colorset1: '#9400D3', colorset2: 'purple', tier: 2, id: 106 },
    { colorset1: '#946DE3', colorset2: '#946DE3', tier: 2, id: 107 },
    { colorset1: ['red', 'lightblue'], colorset2: ['red', 'blue'], tier: 3, id: 200 },
    { colorset1: ['#fdc544', 'white'], colorset2: ['#a3850e', 'black'], tier: 3, id: 201 },
    { colorset1: ['#007c00', 'hotpink'], colorset2: ['#27A11B', 'purple'], tier: 3, id: 202 },
    { colorset1: ['hotpink', 'lightgrey'], colorset2: ['purple', 'grey'], tier: 3, id: 203 },
    { colorset1: ['lightblue', 'white'], colorset2: ['blue', 'black'], tier: 3, id: 204 },
    { colorset1: ['#E40303', '#FFED00'], colorset2: ['#E40303', '#FFED00'], tier: 3, id: 205 },
    {
        colorset1: ['#E40303', '#FF8C00', '#FFED00', '#008026', '#24408E', '#732982'],
        colorset2: ['#E40303', '#FF8C00', '#FFED00', '#008026', '#24408E', '#732982'],
        tier: 3,
        id: 207,
    },
    {
        colorset1: ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA'],
        colorset2: ['#5BCEFA', '#F5A9B8', '#FFFFFF', '#F5A9B8', '#5BCEFA'],
        tier: 3,
        id: 208,
    },
    { colorset1: ['#FCA11E', '#FF726E', '#FF726E'], colorset2: ['#FCA11E', '#FF726E', '#FF726E'], tier: 3, id: 209 },
    { colorset1: ['#1ede3e', '#18adf2'], colorset2: ['#1ede3e', '#18adf2'], tier: 3, id: 210 },
    { colorset1: ['#DBB4FF', '#B1F4CF'], colorset2: ['#DBB4FF', '#B1F4CF'], tier: 3, id: 211 },
    {
        colorset1: ['#00B0F0', '#93E3FF', '#93E3FF', '#00B0F0'],
        colorset2: ['#00B0F0', '#93E3FF', '#93E3FF', '#00B0F0'],
        tier: 3,
        id: 212,
    },
];

const MAP: Record<number, LegacyPresetEntry> = Object.fromEntries(
    RAW_PRESETS.map((p) => {
        if (Array.isArray(p.colorset1) && Array.isArray(p.colorset2)) {
            return [
                p.id,
                {
                    kind: 'gradient',
                    value: { dark: p.colorset1, light: p.colorset2 },
                    tier: p.tier,
                } satisfies LegacyPresetEntry,
            ];
        }
        return [
            p.id,
            {
                kind: 'solid',
                value: { dark: p.colorset1 as string, light: p.colorset2 as string },
                tier: p.tier,
            } satisfies LegacyPresetEntry,
        ];
    }),
);

export function legacyPresetMap(id: number | undefined | null): LegacyPresetEntry | null {
    if (id === undefined || id === null) return null;
    return MAP[id] ?? null;
}

/** Surface the full list for preset-shortcut rendering. */
export const LEGACY_PRESETS: ReadonlyArray<{ id: number } & LegacyPresetEntry> =
    RAW_PRESETS.map((p) => {
        const entry = legacyPresetMap(p.id)!;
        return { id: p.id, ...entry };
    });

// Reference patreonStyles once to keep the dependency explicit —
// the raw table is intentionally duplicated above, but we want build-time
// coupling so removals of patreonStyles get noticed.
void patreonStyles;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: No new errors from this file (existing consumer errors from Task 1 still present).

- [ ] **Step 3: Commit**

```bash
git add src/components/patreon/legacy-preset-map.ts
git commit -m "feat(patron): add legacy preset map for custom styling migration"
```

---

## Task 3: Add buildPatronStyle and keyframes

**Files:**
- Create: `src/components/patreon/patron-style.ts`
- Modify: `app/(new-layout)/styles/_globals.scss`

- [ ] **Step 1: Create `patron-style.ts`**

```ts
import type { CSSProperties } from 'react';
import type { PatronPreferences } from '../../../types/patreon.types';
import { legacyPresetMap } from './legacy-preset-map';

export type Theme = 'dark' | 'light';

type ResolvedFill =
    | { kind: 'solid'; value: string }
    | { kind: 'gradient'; value: string[] };

export function defaultTierColor(_tier: number, theme: Theme): string {
    // Tiers 1-3 all default to the existing tier-1 preset color.
    return theme === 'dark' ? '#27A11B' : '#007c00';
}

export function resolveFill(
    prefs: PatronPreferences | null | undefined,
    tier: number,
    theme: Theme,
): ResolvedFill {
    if (prefs?.customGradient) {
        return { kind: 'gradient', value: prefs.customGradient[theme] };
    }
    if (prefs?.customColor) {
        return { kind: 'solid', value: prefs.customColor[theme] };
    }
    const legacy = legacyPresetMap(prefs?.colorPreference);
    if (legacy) {
        return legacy.kind === 'gradient'
            ? { kind: 'gradient', value: legacy.value[theme] }
            : { kind: 'solid', value: legacy.value[theme] };
    }
    return { kind: 'solid', value: defaultTierColor(tier, theme) };
}

export function buildPatronStyle(
    prefs: PatronPreferences | null | undefined,
    tier: number,
    theme: Theme,
): CSSProperties {
    const fill = resolveFill(prefs, tier, theme);
    const isGradient = fill.kind === 'gradient';

    const backgroundValue = isGradient
        ? `linear-gradient(${prefs?.gradientAngle?.[theme] ?? 90}deg, ${fill.value.join(',')})`
        : undefined;

    const style: CSSProperties = {
        background: backgroundValue,
        WebkitBackgroundClip: isGradient ? 'text' : undefined,
        backgroundClip: isGradient ? 'text' : undefined,
        color: isGradient ? 'transparent' : (fill.value as string),
        WebkitTextFillColor: isGradient ? 'transparent' : undefined,
        fontWeight: prefs?.bold ? 700 : 400,
        fontStyle: prefs?.italic ? 'italic' : 'normal',
    };

    if (prefs?.textShadow) {
        const s = prefs.textShadow[theme];
        style.textShadow = `0 0 ${s.blur}px ${s.color}`;
    }

    if (prefs?.outline) {
        const o = prefs.outline[theme];
        style.WebkitTextStroke = `${o.width}px ${o.color}`;
    }

    if (isGradient && prefs?.gradientAnimated) {
        style.animation = 'patron-gradient 6s linear infinite';
        style.backgroundSize = '200% 100%';
    }

    return style;
}
```

- [ ] **Step 2: Append keyframes to `_globals.scss`**

Open `app/(new-layout)/styles/_globals.scss` and append to the end of the file:

```scss
@keyframes patron-gradient {
    0%   { background-position: 0%   50%; }
    100% { background-position: 200% 50%; }
}

@media (prefers-reduced-motion: reduce) {
    @keyframes patron-gradient {
        0%, 100% { background-position: 0 50%; }
    }
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: No new errors from these files.

- [ ] **Step 4: Commit**

```bash
git add src/components/patreon/patron-style.ts app/\(new-layout\)/styles/_globals.scss
git commit -m "feat(patron): add buildPatronStyle helper and gradient keyframes"
```

---

## Task 4: Refactor `<PatreonName>` to new signature

**Files:**
- Modify: `src/components/patreon/patreon-name.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import type { PatronPreferences } from '../../../types/patreon.types';
import { BunnyIcon } from '~src/icons/bunny-icon';
import { getColorMode } from '~src/utils/colormode';
import { safeDecodeURI } from '~src/utils/uri';
import { buildPatronStyle, type Theme } from './patron-style';
import { usePatreons } from './use-patreons';

interface NameAsPatreonProps {
    name: string;
}

export const NameAsPatreon: React.FunctionComponent<NameAsPatreonProps> = ({
    name,
}) => {
    const { data: patreons, isLoading } = usePatreons();
    const patron = patreons?.[name];
    if (isLoading || !patron || patron.preferences?.hide) {
        return <>{safeDecodeURI(name)}</>;
    }
    return (
        <PatreonName
            name={name}
            preferences={patron.preferences}
            tier={patron.tier}
            icon={patron.preferences?.showIcon ?? true}
        />
    );
};

export interface PatreonNameProps {
    name: string;
    preferences: PatronPreferences | null | undefined;
    tier: number;
    icon?: boolean;
    size?: number;
}

export const PatreonName: React.FunctionComponent<PatreonNameProps> = ({
    name,
    preferences,
    tier,
    icon = true,
    size = 20,
}) => {
    const [theme, setTheme] = useState<Theme>('dark');
    useEffect(() => {
        setTheme(getColorMode() === 'light' ? 'light' : 'dark');
    }, []);

    const style = buildPatronStyle(preferences, tier, theme);

    return (
        <>
            <span style={style}>{safeDecodeURI(name)}</span>
            {icon && (
                <OverlayTrigger
                    placement="top"
                    overlay={
                        <Tooltip id={`patron-${name}`}>
                            therun.gg Patron
                        </Tooltip>
                    }
                >
                    <span>
                        {' '}
                        <BunnyIcon size={size} />
                    </span>
                </OverlayTrigger>
            )}
        </>
    );
};

export default PatreonName;
```

- [ ] **Step 2: Typecheck — expect call-site failures**

Run: `npm run typecheck`
Expected: Errors in every call site that still passes `color={number}` instead of `preferences`/`tier`. Fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/components/patreon/patreon-name.tsx
git commit -m "feat(patron): rewrite PatreonName around buildPatronStyle"
```

---

## Task 5: Migrate all `<PatreonName>` call sites

**Files:**
- Modify: `src/components/links/links.tsx`
- Modify: `src/components/Topbar/PatronCta.tsx`
- Modify: `src/components/Topbar/MobileMenu.tsx`
- Modify: `app/(new-layout)/frontpage/panels/patreon-panel/patreon-panel.tsx`
- Modify: `app/(new-layout)/frontpage/panels/patreon-panel/patreon-panel-view.tsx`
- Modify: `src/components/live/live-user-run.tsx`
- Modify: `src/components/live/recommended-stream.tsx`

- [ ] **Step 1: `links.tsx` — replace lines 50-63**

Replace:
```tsx
if (!isLoading && patreons && patreons[withoutSlash]) {
    let color = 0;
    let showIcon = icon;
    if (patreons[withoutSlash].preferences) {
        color = patreons[withoutSlash].preferences.colorPreference;
        if (showIcon) {
            showIcon = patreons[withoutSlash].preferences.showIcon;
        }
    }

    withoutSlash = (
        <PatreonName name={withoutSlash} icon={showIcon} color={color} />
    );
}
```

With:
```tsx
if (!isLoading && patreons && patreons[withoutSlash]) {
    const patron = patreons[withoutSlash];
    const showIcon = icon && (patron.preferences?.showIcon ?? true);
    withoutSlash = (
        <PatreonName
            name={withoutSlash}
            preferences={patron.preferences}
            tier={patron.tier}
            icon={showIcon}
        />
    );
}
```

- [ ] **Step 2: `PatronCta.tsx` — change the local `Slide.patron.preferences` type and the `PatronDisplayName` body**

Change the `Slide` interface's `preferences` type:

```ts
preferences: PatronPreferences | null;
```

Add import at top:
```ts
import type { PatronPreferences } from '../../../types/patreon.types';
```

Replace the body of `PatronDisplayName`:

```tsx
function PatronDisplayName({
    patron,
    tier,
}: {
    patron: Slide['patron'];
    tier: number;
}) {
    const displayName = patron.username ?? patron.patreonName;
    if (patron.preferences) {
        return (
            <span className={styles.name}>
                <PatreonName
                    name={displayName}
                    preferences={patron.preferences}
                    tier={tier}
                    icon={false}
                />
                {patron.preferences.showIcon && <BunnyIcon size={16} />}
            </span>
        );
    }
    return <span className={styles.name}>{displayName}</span>;
}
```

Then update every call of `<PatronDisplayName patron={slide.patron} />` to `<PatronDisplayName patron={slide.patron} tier={slide.patron.tier} />`. This requires adding `tier: number` onto `Slide.patron`. Update the two `slides.push({ ..., patron: supporterOfTheDay })` calls — since `supporterOfTheDay` is a `FeaturedPatron` with `tier`, you can pass `tier: supporterOfTheDay.tier` and `tier: latestPatron.tier`. Also extend the `Slide.patron` type:

```ts
patron: {
    patreonName: string;
    username: string | null;
    picture: string | null;
    tier: number;
    preferences: PatronPreferences | null;
};
```

- [ ] **Step 3: `MobileMenu.tsx` — mirror the same change to its local `PatronDisplayName`**

Replace the local `patron.preferences: { colorPreference: number; showIcon: boolean } | null` type with `PatronPreferences | null` (add import), and change the `<PatreonName>` call exactly like Step 2. Pipe `tier` through from wherever `patron` originates, matching the pattern used above.

- [ ] **Step 4: `patreon-panel.tsx` — pass full preferences through**

Replace the `FeaturedPatron` local type and the `.map(...)` body:

```ts
import type { PatronPreferences } from '../../../../../types/patreon.types';

interface FeaturedPatron {
    name: string;
    tier: number;
    preferences: PatronPreferences;
}

// inside the .map(...):
.map(([name, patron]) => ({
    name,
    tier: patron.tier,
    preferences: patron.preferences,
}));
```

- [ ] **Step 5: `patreon-panel-view.tsx` — accept preferences and pass to `<PatreonName>`**

```tsx
import type { PatronPreferences } from '../../../../../types/patreon.types';

interface FeaturedPatron {
    name: string;
    tier: number;
    preferences: PatronPreferences;
}

// in the render:
<PatreonName
    name={patron.name}
    preferences={patron.preferences}
    tier={patron.tier}
    icon={patron.preferences.showIcon}
    size={14}
/>
```

- [ ] **Step 6: `live-user-run.tsx` — replace the `useEffect` at lines 93-116 with `buildPatronStyle`-derived values**

```tsx
import { buildPatronStyle, resolveFill } from '../patreon/patron-style';

// replace the effect:
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

Remove the now-unused `patreonStyles` import.

- [ ] **Step 7: `recommended-stream.tsx` — same treatment as Step 6**

Replace the effect at lines 140-167:

```tsx
import { resolveFill } from '../patreon/patron-style';

useEffect(() => {
    if (!isLoading && patreons && patreons[liveRun.user]) {
        const { preferences, tier } = patreons[liveRun.user];
        let borderColor = '';
        let gradient = '';

        if (preferences && !preferences.hide) {
            const fill = resolveFill(preferences, tier, dark ? 'dark' : 'light');
            if (fill.kind === 'gradient') {
                gradient = `-webkit-linear-gradient(left, ${fill.value.join(',')})`;
            } else {
                borderColor = fill.value;
            }
        } else if (!preferences) {
            borderColor = 'var(--bs-link-color)';
        }
        setRecommendedStyles({ borderColor, gradient });
    }
}, [patreons, isLoading, liveRun.user, dark]);
```

Remove the now-unused `patreonStyles` import.

- [ ] **Step 8: Typecheck, lint, dev smoke test**

```
npm run typecheck
npm run lint
npm run dev
```

Expected: Typecheck clean. Lint clean. Open `http://localhost:3000`, visit a page showing a patron name in the live panel, the topbar PatronCta, and a leaderboard (e.g., `/live`). Names render with their current `colorPreference`-based styling (legacy precedence path), both dark and light mode.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(patron): migrate all PatreonName call sites to new signature"
```

---

## Task 6: Settings page shell — layout and state

**Files:**
- Create: `app/(new-layout)/change-appearance/customization/customization.module.scss`
- Create: `app/(new-layout)/change-appearance/customization/preview-pane.tsx`
- Modify: `app/(new-layout)/change-appearance/patreon-section.tsx`

- [ ] **Step 1: Create `customization.module.scss`**

```scss
.layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 2rem;
    align-items: start;

    @media (max-width: 991px) {
        grid-template-columns: 1fr;
    }
}

.left {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.right {
    position: sticky;
    top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    @media (max-width: 991px) {
        position: static;
    }
}

.card {
    border: 1px solid var(--bs-border-color);
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    background: var(--bs-body-bg);
}

.cardHeader {
    font-weight: 600;
    margin-bottom: 0.75rem;
}

.previewBox {
    border-radius: 0.5rem;
    padding: 1rem;
    text-align: center;
    font-size: 1.5rem;
}

.previewDark {
    background: #0d0e12;
}

.previewLight {
    background: #ffffff;
    color: #0d0e12;
}

.migrationBanner {
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    background: var(--bs-info-bg-subtle);
    color: var(--bs-info-text-emphasis);
    font-size: 0.875rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
}

.stopRow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
}

.angleChips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
}

.chip {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--bs-border-color);
    border-radius: 0.25rem;
    background: transparent;
    cursor: pointer;

    &[data-active='true'] {
        background: var(--bs-primary);
        color: var(--bs-primary-text);
        border-color: var(--bs-primary);
    }
}

.presetGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5rem;
}

.presetTile {
    padding: 0.5rem;
    border: 1px solid var(--bs-border-color);
    border-radius: 0.375rem;
    cursor: pointer;
    text-align: center;
    font-size: 1rem;

    &:hover {
        border-color: var(--bs-primary);
    }
}

.contrastWarning {
    font-size: 0.8125rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.25rem;
    background: var(--bs-warning-bg-subtle);
    color: var(--bs-warning-text-emphasis);
}

.fieldRow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.errorText {
    color: var(--bs-danger);
    font-size: 0.8125rem;
    margin-top: 0.25rem;
}
```

- [ ] **Step 2: Create `preview-pane.tsx`**

```tsx
'use client';
import type { PatronPreferences } from '../../../../types/patreon.types';
import { buildPatronStyle } from '~src/components/patreon/patron-style';
import styles from './customization.module.scss';

interface PreviewPaneProps {
    username: string;
    preferences: PatronPreferences;
    tier: number;
}

export function PreviewPane({ username, preferences, tier }: PreviewPaneProps) {
    const darkStyle = buildPatronStyle(preferences, tier, 'dark');
    const lightStyle = buildPatronStyle(preferences, tier, 'light');
    return (
        <>
            <div className={`${styles.previewBox} ${styles.previewDark}`}>
                <span style={darkStyle}>{username}</span>
            </div>
            <div className={`${styles.previewBox} ${styles.previewLight}`}>
                <span style={lightStyle}>{username}</span>
            </div>
        </>
    );
}
```

- [ ] **Step 3: Replace `patreon-section.tsx`**

Replace the entire file with a scaffold that holds the shared state and renders the layout shell. Later tasks fill in each section's children.

```tsx
'use client';

import axios from 'axios';
import Router from 'next/router';
import { useState } from 'react';
import { Button } from 'react-bootstrap';
import type {
    PatronPreferences,
    PerMode,
} from '../../../types/patreon.types';
import type { User } from '../../../types/session.types';
import styles from './customization/customization.module.scss';
import { LoginWithPatreon } from './login-with-patreon';
import { PreviewPane } from './customization/preview-pane';

export interface UserPatreonData {
    tier: 1 | 2 | 3;
    preferences: PatronPreferences;
}

interface PatreonSectionProps {
    userPatreonData: UserPatreonData;
    session: User;
}

const EMPTY_PREFERENCES: PatronPreferences = {
    hide: false,
    featureInScrollbar: true,
    featureOnOverview: true,
    showIcon: true,
    customColor: null,
    customGradient: null,
    bold: false,
    italic: false,
    textShadow: null,
    outline: null,
    gradientAngle: null,
    gradientAnimated: false,
};

export default function PatreonSection({
    userPatreonData,
    session,
    baseUrl,
}: PatreonSectionProps & { baseUrl: string }) {
    if (!userPatreonData.tier) {
        return <LoginWithPatreon session={session} baseUrl={baseUrl} />;
    }
    return (
        <PatreonSettings session={session} userPatreonData={userPatreonData} />
    );
}

function PatreonSettings({ userPatreonData, session }: PatreonSectionProps) {
    const initial: PatronPreferences = {
        ...EMPTY_PREFERENCES,
        ...userPatreonData.preferences,
    };
    const [prefs, setPrefs] = useState<PatronPreferences>(initial);
    const [saving, setSaving] = useState(false);

    const update = <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => {
        setPrefs((p) => ({ ...p, [key]: value }));
    };

    const resetAll = () => {
        setPrefs({
            ...EMPTY_PREFERENCES,
            // keep display preferences as-is
            hide: prefs.hide,
            featureInScrollbar: prefs.featureInScrollbar,
            featureOnOverview: prefs.featureOnOverview,
            showIcon: prefs.showIcon,
            colorPreference: 0,
        });
    };

    const onSave = async () => {
        setSaving(true);
        try {
            const payload: PatronPreferences = {
                ...prefs,
                // Clear legacy after any save from the new UI.
                colorPreference: 0,
            };
            await axios.post(
                `/api/users/${session.id}-${session.username}/patreon-settings`,
                payload,
            );
            Router.reload();
        } finally {
            setSaving(false);
        }
    };

    // PerMode helper used by later tasks' subcomponents.
    void ({} as PerMode<string>);

    return (
        <div>
            <h1>Patreon Customization</h1>
            <p>Thank you for supporting! Customize how your name appears.</p>
            <div className={styles.layout}>
                <div className={styles.left}>
                    {/* Filled in by later tasks: preset-shortcuts, fill, font, effects, display */}
                </div>
                <div className={styles.right}>
                    <PreviewPane
                        username={session.username}
                        preferences={prefs}
                        tier={userPatreonData.tier}
                    />
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={resetAll}
                    >
                        Reset to default
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Save settings'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Typecheck, lint, browser**

```
npm run typecheck
npm run lint
npm run dev
```

Visit `http://localhost:3000/change-appearance`. Expected: page loads, two-column layout visible, dual previews show the username, Save button present (no-op; nothing to save yet).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(patron): scaffold customization settings page shell"
```

---

## Task 7: Display preferences section

**Files:**
- Create: `app/(new-layout)/change-appearance/customization/display-section.tsx`
- Modify: `app/(new-layout)/change-appearance/patreon-section.tsx`

- [ ] **Step 1: Create `display-section.tsx`**

```tsx
'use client';
import Switch from 'react-switch';
import styles from './customization.module.scss';
import { PatreonBunnySvg } from '~app/(new-layout)/patron/patreon-info';
import type { PatronPreferences } from '../../../../types/patreon.types';

interface DisplaySectionProps {
    prefs: PatronPreferences;
    tier: number;
    onChange: <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => void;
}

export function DisplaySection({ prefs, tier, onChange }: DisplaySectionProps) {
    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>Display preferences</div>

            <label className={styles.fieldRow}>
                <Switch
                    onChange={(v) => onChange('hide', !v)}
                    checked={!prefs.hide}
                />
                <span>Display me as Patreon (overrides all other settings when off)</span>
            </label>

            <label className={styles.fieldRow}>
                <Switch
                    onChange={(v) => onChange('showIcon', v)}
                    checked={prefs.showIcon}
                />
                <span>
                    Show the <PatreonBunnySvg /> next to my name
                </span>
            </label>

            <label className={styles.fieldRow}>
                <Switch
                    onChange={(v) => onChange('featureOnOverview', v)}
                    checked={prefs.featureOnOverview}
                />
                <span>Display my name on the Support page</span>
            </label>

            {tier >= 3 && (
                <label className={styles.fieldRow}>
                    <Switch
                        onChange={(v) => onChange('featureInScrollbar', v)}
                        checked={prefs.featureInScrollbar}
                    />
                    <span>Display my name in the scrolling bar</span>
                </label>
            )}
        </section>
    );
}
```

- [ ] **Step 2: Mount in `patreon-section.tsx` — inside `<div className={styles.left}>`**

Replace the comment placeholder with:

```tsx
<DisplaySection
    prefs={prefs}
    tier={userPatreonData.tier}
    onChange={update}
/>
```

And add the import at the top of `patreon-section.tsx`:

```tsx
import { DisplaySection } from './customization/display-section';
```

- [ ] **Step 3: Verify**

```
npm run typecheck
npm run dev
```

Open settings page, toggle each switch, confirm state reflects in the preview (icon toggle is the most visible — not a style change but the preview still renders; hide switch changes nothing visually on the preview but the underlying state should update).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(patron): add display preferences section"
```

---

## Task 8: Font section (bold / italic)

**Files:**
- Create: `app/(new-layout)/change-appearance/customization/font-section.tsx`
- Modify: `app/(new-layout)/change-appearance/patreon-section.tsx`

- [ ] **Step 1: Create `font-section.tsx`**

```tsx
'use client';
import styles from './customization.module.scss';
import type { PatronPreferences } from '../../../../types/patreon.types';

interface FontSectionProps {
    prefs: PatronPreferences;
    onChange: <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => void;
}

export function FontSection({ prefs, onChange }: FontSectionProps) {
    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>Font</div>
            <div className={styles.fieldRow}>
                <button
                    type="button"
                    className={styles.chip}
                    data-active={!!prefs.bold}
                    onClick={() => onChange('bold', !prefs.bold)}
                    aria-pressed={!!prefs.bold}
                    style={{ fontWeight: 700 }}
                >
                    B
                </button>
                <button
                    type="button"
                    className={styles.chip}
                    data-active={!!prefs.italic}
                    onClick={() => onChange('italic', !prefs.italic)}
                    aria-pressed={!!prefs.italic}
                    style={{ fontStyle: 'italic' }}
                >
                    I
                </button>
            </div>
        </section>
    );
}
```

- [ ] **Step 2: Mount in `patreon-section.tsx` — inside `.left`, above `<DisplaySection>`, gated by `tier >= 2`**

```tsx
{userPatreonData.tier >= 2 && (
    <FontSection prefs={prefs} onChange={update} />
)}
```

Import:
```tsx
import { FontSection } from './customization/font-section';
```

- [ ] **Step 3: Verify**

```
npm run dev
```

Click B — preview text turns bold in both previews. Click I — italic. Click again to clear. Typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(patron): add font section (bold / italic)"
```

---

## Task 9: Solid color picker

**Files:**
- Create: `app/(new-layout)/change-appearance/customization/solid-picker.tsx`

Gradient picker is in Task 10; the fill-section radio that chooses between them is in Task 11. This task builds the solid picker in isolation so its behavior is easy to verify.

- [ ] **Step 1: Create `solid-picker.tsx`**

```tsx
'use client';
import styles from './customization.module.scss';
import type { PerMode } from '../../../../types/patreon.types';

interface SolidPickerProps {
    value: PerMode<string>;
    onChange: (next: PerMode<string>) => void;
}

function normalizeHex(v: string): string {
    // <input type="color"> already returns #rrggbb lowercase.
    return v;
}

export function SolidPicker({ value, onChange }: SolidPickerProps) {
    return (
        <div>
            <div className={styles.fieldRow}>
                <label>Dark mode</label>
                <input
                    type="color"
                    value={value.dark}
                    onChange={(e) =>
                        onChange({ ...value, dark: normalizeHex(e.target.value) })
                    }
                />
                <span>{value.dark}</span>
                <button
                    type="button"
                    className={styles.chip}
                    onClick={() => onChange({ dark: value.dark, light: value.dark })}
                    title="Copy dark → light"
                >
                    ↓
                </button>
            </div>
            <div className={styles.fieldRow}>
                <label>Light mode</label>
                <input
                    type="color"
                    value={value.light}
                    onChange={(e) =>
                        onChange({ ...value, light: normalizeHex(e.target.value) })
                    }
                />
                <span>{value.light}</span>
                <button
                    type="button"
                    className={styles.chip}
                    onClick={() => onChange({ dark: value.light, light: value.light })}
                    title="Copy light → dark"
                >
                    ↑
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck**

```
npm run typecheck
```

Expected: clean (unused import warning would fail, but this file has no dead imports).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(patron): add solid color picker component"
```

---

## Task 10: Gradient picker

**Files:**
- Create: `app/(new-layout)/change-appearance/customization/gradient-picker.tsx`

- [ ] **Step 1: Create `gradient-picker.tsx`**

```tsx
'use client';
import styles from './customization.module.scss';
import type {
    PatronPreferences,
    PerMode,
} from '../../../../types/patreon.types';

const DEFAULT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const DEFAULT_ANGLE: PerMode<number> = { dark: 90, light: 90 };

interface GradientPickerProps {
    stops: PerMode<string[]>;
    onStopsChange: (next: PerMode<string[]>) => void;
    angle: PerMode<number> | null;
    onAngleChange: (next: PerMode<number>) => void;
    animated: boolean;
    onAnimatedChange: (next: boolean) => void;
}

export function GradientPicker({
    stops,
    onStopsChange,
    angle,
    onAngleChange,
    animated,
    onAnimatedChange,
}: GradientPickerProps) {
    const resolvedAngle = angle ?? DEFAULT_ANGLE;

    const setStop = (mode: 'dark' | 'light', idx: number, color: string) => {
        const next = { ...stops, [mode]: stops[mode].slice() };
        next[mode][idx] = color;
        onStopsChange(next);
    };

    const addStop = (mode: 'dark' | 'light') => {
        if (stops[mode].length >= 6) return;
        const next = { ...stops, [mode]: [...stops[mode], '#ffffff'] };
        onStopsChange(next);
    };

    const removeStop = (mode: 'dark' | 'light', idx: number) => {
        if (stops[mode].length <= 2) return;
        const next = {
            ...stops,
            [mode]: stops[mode].filter((_, i) => i !== idx),
        };
        onStopsChange(next);
    };

    const copyDarkToLight = () => {
        onStopsChange({ dark: stops.dark, light: stops.dark.slice() });
    };

    const setAngle = (mode: 'dark' | 'light', value: number) => {
        const clamped = Math.max(0, Math.min(360, value));
        onAngleChange({ ...resolvedAngle, [mode]: clamped });
    };

    return (
        <div>
            {(['dark', 'light'] as const).map((mode) => (
                <div key={mode}>
                    <div className={styles.cardHeader}>
                        {mode === 'dark' ? 'Dark mode stops' : 'Light mode stops'}
                    </div>
                    {stops[mode].map((c, i) => (
                        <div key={i} className={styles.stopRow}>
                            <input
                                type="color"
                                value={c}
                                onChange={(e) => setStop(mode, i, e.target.value)}
                            />
                            <span>{c}</span>
                            <button
                                type="button"
                                className={styles.chip}
                                onClick={() => removeStop(mode, i)}
                                disabled={stops[mode].length <= 2}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        className={styles.chip}
                        onClick={() => addStop(mode)}
                        disabled={stops[mode].length >= 6}
                    >
                        + Add stop
                    </button>

                    <div className={styles.cardHeader} style={{ marginTop: '0.75rem' }}>
                        Angle ({mode})
                    </div>
                    <div className={styles.angleChips}>
                        {DEFAULT_ANGLES.map((a) => (
                            <button
                                key={a}
                                type="button"
                                className={styles.chip}
                                data-active={resolvedAngle[mode] === a}
                                onClick={() => setAngle(mode, a)}
                            >
                                {a}°
                            </button>
                        ))}
                        <input
                            type="number"
                            min={0}
                            max={360}
                            value={resolvedAngle[mode]}
                            onChange={(e) => setAngle(mode, Number(e.target.value))}
                            style={{ width: '5rem' }}
                        />
                    </div>
                </div>
            ))}

            <button
                type="button"
                className={styles.chip}
                onClick={copyDarkToLight}
            >
                Copy dark stops → light
            </button>

            <label className={styles.fieldRow} style={{ marginTop: '0.75rem' }}>
                <input
                    type="checkbox"
                    checked={animated}
                    onChange={(e) => onAnimatedChange(e.target.checked)}
                />
                <span>Animate gradient</span>
            </label>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck**

```
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(patron): add gradient picker component"
```

---

## Task 11: Fill section (radio + wires pickers)

**Files:**
- Create: `app/(new-layout)/change-appearance/customization/fill-section.tsx`
- Modify: `app/(new-layout)/change-appearance/patreon-section.tsx`

- [ ] **Step 1: Create `fill-section.tsx`**

```tsx
'use client';
import styles from './customization.module.scss';
import { SolidPicker } from './solid-picker';
import { GradientPicker } from './gradient-picker';
import type {
    PatronPreferences,
    PerMode,
} from '../../../../types/patreon.types';

const DEFAULT_SOLID: PerMode<string> = { dark: '#ffffff', light: '#000000' };
const DEFAULT_GRADIENT: PerMode<string[]> = {
    dark: ['#ffffff', '#888888'],
    light: ['#000000', '#888888'],
};

type Mode = 'solid' | 'gradient';

function currentMode(prefs: PatronPreferences): Mode {
    if (prefs.customGradient) return 'gradient';
    return 'solid';
}

interface FillSectionProps {
    prefs: PatronPreferences;
    tier: number;
    onChange: <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => void;
}

export function FillSection({ prefs, tier, onChange }: FillSectionProps) {
    const mode = currentMode(prefs);

    const switchToSolid = () => {
        onChange(
            'customColor',
            prefs.customColor ?? DEFAULT_SOLID,
        );
        onChange('customGradient', null);
    };

    const switchToGradient = () => {
        onChange(
            'customGradient',
            prefs.customGradient ?? DEFAULT_GRADIENT,
        );
        onChange('customColor', null);
        if (!prefs.gradientAngle) {
            onChange('gradientAngle', { dark: 90, light: 90 });
        }
    };

    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>Fill</div>
            <div className={styles.fieldRow}>
                <label>
                    <input
                        type="radio"
                        name="fill-mode"
                        checked={mode === 'solid'}
                        onChange={switchToSolid}
                    />{' '}
                    Solid
                </label>
                {tier >= 3 && (
                    <label>
                        <input
                            type="radio"
                            name="fill-mode"
                            checked={mode === 'gradient'}
                            onChange={switchToGradient}
                        />{' '}
                        Gradient
                    </label>
                )}
            </div>

            {mode === 'solid' && (
                <SolidPicker
                    value={prefs.customColor ?? DEFAULT_SOLID}
                    onChange={(v) => onChange('customColor', v)}
                />
            )}

            {mode === 'gradient' && tier >= 3 && (
                <GradientPicker
                    stops={prefs.customGradient ?? DEFAULT_GRADIENT}
                    onStopsChange={(v) => onChange('customGradient', v)}
                    angle={prefs.gradientAngle}
                    onAngleChange={(v) => onChange('gradientAngle', v)}
                    animated={!!prefs.gradientAnimated}
                    onAnimatedChange={(v) => onChange('gradientAnimated', v)}
                />
            )}
        </section>
    );
}
```

- [ ] **Step 2: Mount in `patreon-section.tsx` — above `<FontSection>`, gated by `tier >= 2`**

```tsx
{userPatreonData.tier >= 2 && (
    <FillSection
        prefs={prefs}
        tier={userPatreonData.tier}
        onChange={update}
    />
)}
```

Import:
```tsx
import { FillSection } from './customization/fill-section';
```

- [ ] **Step 3: Verify in browser**

```
npm run dev
```

Settings page: solid picker appears, color changes reflect in both previews live, switching to Gradient (tier 3 only) shows the stop editor, gradient renders live.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(patron): wire fill section with solid and gradient pickers"
```

---

## Task 12: Effects section (shadow + outline)

**Files:**
- Create: `app/(new-layout)/change-appearance/customization/effects-section.tsx`
- Modify: `app/(new-layout)/change-appearance/patreon-section.tsx`

- [ ] **Step 1: Create `effects-section.tsx`**

```tsx
'use client';
import styles from './customization.module.scss';
import type {
    PatronPreferences,
    PerMode,
    TextShadowSpec,
    OutlineSpec,
} from '../../../../types/patreon.types';

const DEFAULT_SHADOW: PerMode<TextShadowSpec> = {
    dark: { color: '#000000', blur: 4 },
    light: { color: '#ffffff', blur: 2 },
};

const DEFAULT_OUTLINE: PerMode<OutlineSpec> = {
    dark: { color: '#000000', width: 1 },
    light: { color: '#ffffff', width: 1 },
};

interface EffectsSectionProps {
    prefs: PatronPreferences;
    onChange: <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => void;
}

export function EffectsSection({ prefs, onChange }: EffectsSectionProps) {
    const shadow = prefs.textShadow;
    const outline = prefs.outline;

    const setShadow = (mode: 'dark' | 'light', patch: Partial<TextShadowSpec>) => {
        const base = shadow ?? DEFAULT_SHADOW;
        onChange('textShadow', { ...base, [mode]: { ...base[mode], ...patch } });
    };

    const setOutline = (mode: 'dark' | 'light', patch: Partial<OutlineSpec>) => {
        const base = outline ?? DEFAULT_OUTLINE;
        onChange('outline', { ...base, [mode]: { ...base[mode], ...patch } });
    };

    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>Effects</div>

            <div className={styles.cardHeader} style={{ marginTop: '0.25rem' }}>
                Shadow
            </div>
            {(['dark', 'light'] as const).map((mode) => {
                const s = (shadow ?? DEFAULT_SHADOW)[mode];
                return (
                    <div key={mode} className={styles.fieldRow}>
                        <label>{mode === 'dark' ? 'Dark' : 'Light'}</label>
                        <input
                            type="color"
                            value={s.color}
                            onChange={(e) => setShadow(mode, { color: e.target.value })}
                        />
                        <input
                            type="range"
                            min={0}
                            max={20}
                            value={s.blur}
                            onChange={(e) =>
                                setShadow(mode, { blur: Number(e.target.value) })
                            }
                        />
                        <span>{s.blur}px</span>
                    </div>
                );
            })}
            <button
                type="button"
                className={styles.chip}
                onClick={() => onChange('textShadow', null)}
                disabled={!shadow}
            >
                Clear shadow
            </button>

            <div className={styles.cardHeader} style={{ marginTop: '0.75rem' }}>
                Outline
            </div>
            {(['dark', 'light'] as const).map((mode) => {
                const o = (outline ?? DEFAULT_OUTLINE)[mode];
                return (
                    <div key={mode} className={styles.fieldRow}>
                        <label>{mode === 'dark' ? 'Dark' : 'Light'}</label>
                        <input
                            type="color"
                            value={o.color}
                            onChange={(e) => setOutline(mode, { color: e.target.value })}
                        />
                        <input
                            type="range"
                            min={0}
                            max={3}
                            step={0.5}
                            value={o.width}
                            onChange={(e) =>
                                setOutline(mode, { width: Number(e.target.value) })
                            }
                        />
                        <span>{o.width}px</span>
                    </div>
                );
            })}
            <button
                type="button"
                className={styles.chip}
                onClick={() => onChange('outline', null)}
                disabled={!outline}
            >
                Clear outline
            </button>
        </section>
    );
}
```

- [ ] **Step 2: Mount in `patreon-section.tsx` — above `<DisplaySection>`, gated by `tier >= 3`**

```tsx
{userPatreonData.tier >= 3 && (
    <EffectsSection prefs={prefs} onChange={update} />
)}
```

Import:
```tsx
import { EffectsSection } from './customization/effects-section';
```

- [ ] **Step 3: Verify in browser**

```
npm run dev
```

Adjust shadow blur slider: preview text gets a glow. Clear shadow: glow disappears. Same for outline.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(patron): add effects section (shadow / outline)"
```

---

## Task 13: Preset shortcuts + legacy migration banner

**Files:**
- Create: `app/(new-layout)/change-appearance/customization/preset-shortcuts.tsx`
- Modify: `app/(new-layout)/change-appearance/patreon-section.tsx`

Curated shortlist is embedded in the shortcuts file as a constant. Selected to cover solid + gradient across tiers 1-3 and several visual styles.

- [ ] **Step 1: Create `preset-shortcuts.tsx`**

```tsx
'use client';
import styles from './customization.module.scss';
import { buildPatronStyle } from '~src/components/patreon/patron-style';
import {
    legacyPresetMap,
    type LegacyPresetEntry,
} from '~src/components/patreon/legacy-preset-map';
import type {
    PatronPreferences,
} from '../../../../types/patreon.types';

// Curated shortlist — visually distinct, covers solid + gradient across tiers.
const CURATED_IDS = [0, 100, 101, 106, 200, 202, 205, 210, 207] as const;

interface PresetShortcutsProps {
    tier: number;
    username: string;
    onChange: <K extends keyof PatronPreferences>(
        key: K,
        value: PatronPreferences[K],
    ) => void;
}

export function PresetShortcuts({
    tier,
    username,
    onChange,
}: PresetShortcutsProps) {
    const items = CURATED_IDS
        .map((id) => ({ id, entry: legacyPresetMap(id)! }))
        .filter(({ entry }) => entry.tier <= tier);

    const apply = (id: number, entry: LegacyPresetEntry) => {
        if (entry.kind === 'solid') {
            onChange('customColor', entry.value);
            onChange('customGradient', null);
        } else {
            onChange('customGradient', entry.value);
            onChange('customColor', null);
        }
    };

    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>Presets</div>
            <div className={styles.presetGrid}>
                {items.map(({ id, entry }) => {
                    const fakePrefs: PatronPreferences = {
                        hide: false,
                        featureInScrollbar: true,
                        featureOnOverview: true,
                        showIcon: true,
                        customColor:
                            entry.kind === 'solid' ? entry.value : null,
                        customGradient:
                            entry.kind === 'gradient' ? entry.value : null,
                    };
                    const previewStyle = buildPatronStyle(
                        fakePrefs,
                        entry.tier,
                        'dark',
                    );
                    return (
                        <button
                            key={id}
                            type="button"
                            className={styles.presetTile}
                            onClick={() => apply(id, entry)}
                            title={
                                entry.kind === 'solid'
                                    ? 'Apply as solid color'
                                    : 'Apply as gradient'
                            }
                        >
                            <span style={previewStyle}>{username}</span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
```

- [ ] **Step 2: Add migration banner + mount shortcuts in `patreon-section.tsx`**

At the top of `PatreonSettings`, add a `hadLegacy` detection and a dismissable banner:

```tsx
const [legacyBannerDismissed, setLegacyBannerDismissed] = useState(false);
const hadLegacy =
    !!userPatreonData.preferences.colorPreference &&
    !userPatreonData.preferences.customColor &&
    !userPatreonData.preferences.customGradient;
```

Seed the initial state from the legacy preset when `hadLegacy`. Replace the `initial` const with:

```tsx
const legacy = hadLegacy
    ? legacyPresetMap(userPatreonData.preferences.colorPreference)
    : null;
const initial: PatronPreferences = {
    ...EMPTY_PREFERENCES,
    ...userPatreonData.preferences,
    customColor:
        legacy?.kind === 'solid'
            ? legacy.value
            : userPatreonData.preferences.customColor ?? null,
    customGradient:
        legacy?.kind === 'gradient'
            ? legacy.value
            : userPatreonData.preferences.customGradient ?? null,
};
```

Import:
```tsx
import { legacyPresetMap } from '~src/components/patreon/legacy-preset-map';
import { PresetShortcuts } from './customization/preset-shortcuts';
```

Render the banner above the two-column layout:

```tsx
{hadLegacy && !legacyBannerDismissed && (
    <div className={styles.migrationBanner}>
        <span>
            We've imported your current color. Save to switch to the new customizer.
        </span>
        <button
            type="button"
            className={styles.chip}
            onClick={() => setLegacyBannerDismissed(true)}
        >
            ✕
        </button>
    </div>
)}
```

Mount shortcuts at the top of `.left`:

```tsx
<PresetShortcuts
    tier={userPatreonData.tier}
    username={session.username}
    onChange={update}
/>
```

- [ ] **Step 3: Verify in browser**

```
npm run dev
```

For a user with a legacy `colorPreference`, the banner appears and the Fill picker shows their preset's value pre-populated. Clicking any preset tile updates the preview live.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(patron): add preset shortcuts and legacy migration banner"
```

---

## Task 14: Client-side validation + save gate

**Files:**
- Create: `app/(new-layout)/change-appearance/customization/validation.ts`
- Modify: `app/(new-layout)/change-appearance/patreon-section.tsx`

- [ ] **Step 1: Create `validation.ts`**

```ts
import type { PatronPreferences } from '../../../../types/patreon.types';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export interface ValidationResult {
    ok: boolean;
    errors: string[];
}

export function validatePrefs(p: PatronPreferences): ValidationResult {
    const errors: string[] = [];

    if (p.customColor) {
        if (!HEX.test(p.customColor.dark)) errors.push('Dark solid color is not a valid hex.');
        if (!HEX.test(p.customColor.light)) errors.push('Light solid color is not a valid hex.');
    }

    if (p.customGradient) {
        for (const mode of ['dark', 'light'] as const) {
            const stops = p.customGradient[mode];
            if (!Array.isArray(stops) || stops.length < 2 || stops.length > 6) {
                errors.push(`${mode} gradient must have 2–6 stops.`);
            } else if (stops.some((s) => !HEX.test(s))) {
                errors.push(`${mode} gradient has an invalid hex stop.`);
            }
        }
    }

    if (p.textShadow) {
        for (const mode of ['dark', 'light'] as const) {
            const s = p.textShadow[mode];
            if (!HEX.test(s.color)) errors.push(`${mode} shadow color is not a valid hex.`);
            if (!Number.isFinite(s.blur) || s.blur < 0 || s.blur > 20) {
                errors.push(`${mode} shadow blur must be 0–20.`);
            }
        }
    }

    if (p.outline) {
        for (const mode of ['dark', 'light'] as const) {
            const o = p.outline[mode];
            if (!HEX.test(o.color)) errors.push(`${mode} outline color is not a valid hex.`);
            if (!Number.isFinite(o.width) || o.width < 0 || o.width > 3) {
                errors.push(`${mode} outline width must be 0–3.`);
            }
        }
    }

    if (p.gradientAngle) {
        for (const mode of ['dark', 'light'] as const) {
            const a = p.gradientAngle[mode];
            if (!Number.isFinite(a) || a < 0 || a > 360) {
                errors.push(`${mode} gradient angle must be 0–360.`);
            }
        }
    }

    return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 2: Wire into `patreon-section.tsx`**

Add the import:
```tsx
import { validatePrefs } from './customization/validation';
```

Compute validation each render:

```tsx
const validation = validatePrefs(prefs);
```

Pass errors into the right column below the previews:

```tsx
{!validation.ok && (
    <div className={styles.errorText}>
        {validation.errors.map((e, i) => (
            <div key={i}>{e}</div>
        ))}
    </div>
)}
```

Disable save:
```tsx
<Button
    variant="primary"
    onClick={onSave}
    disabled={saving || !validation.ok}
>
```

- [ ] **Step 3: Verify**

Can't easily induce an invalid state via the UI (all inputs are clamped), so quick manual test: temporarily set `gradientAngle.dark` to `999` from devtools state — Save disables, error row appears.

Run typecheck:
```
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(patron): validate preferences client-side before save"
```

---

## Task 15: Contrast warning

**Files:**
- Create: `app/(new-layout)/change-appearance/customization/contrast-warning.tsx`
- Modify: `app/(new-layout)/change-appearance/patreon-section.tsx`

- [ ] **Step 1: Create `contrast-warning.tsx`**

```tsx
'use client';
import styles from './customization.module.scss';
import { resolveFill } from '~src/components/patreon/patron-style';
import type { PatronPreferences } from '../../../../types/patreon.types';

const DARK_BG = '#0d0e12';
const LIGHT_BG = '#ffffff';

function parseHex(hex: string): [number, number, number] | null {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(rgb: [number, number, number]): number {
    const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(hexA: string, hexB: string): number | null {
    const a = parseHex(hexA);
    const b = parseHex(hexB);
    if (!a || !b) return null;
    const la = luminance(a);
    const lb = luminance(b);
    const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
    return (lighter + 0.05) / (darker + 0.05);
}

function colorsToCheck(
    prefs: PatronPreferences,
    tier: number,
    theme: 'dark' | 'light',
): string[] {
    const fill = resolveFill(prefs, tier, theme);
    if (fill.kind === 'solid') return [fill.value];
    // For gradients, check both endpoint stops.
    return [fill.value[0], fill.value[fill.value.length - 1]];
}

interface ContrastWarningProps {
    prefs: PatronPreferences;
    tier: number;
}

export function ContrastWarning({ prefs, tier }: ContrastWarningProps) {
    const messages: string[] = [];
    for (const theme of ['dark', 'light'] as const) {
        const bg = theme === 'dark' ? DARK_BG : LIGHT_BG;
        const colors = colorsToCheck(prefs, tier, theme);
        const failing = colors.some((c) => {
            const ratio = contrast(c, bg);
            return ratio !== null && ratio < 4.5;
        });
        if (failing) {
            messages.push(
                theme === 'dark'
                    ? 'Your name may be hard to read in dark mode.'
                    : 'Your name may be hard to read in light mode.',
            );
        }
    }
    if (messages.length === 0) return null;
    return (
        <div className={styles.contrastWarning}>
            {messages.map((m, i) => (
                <div key={i}>⚠ {m}</div>
            ))}
        </div>
    );
}
```

- [ ] **Step 2: Mount in `patreon-section.tsx` — right column, under previews**

```tsx
<ContrastWarning prefs={prefs} tier={userPatreonData.tier} />
```

Import:
```tsx
import { ContrastWarning } from './customization/contrast-warning';
```

- [ ] **Step 3: Verify in browser**

Set solid color to `#111111` (dark gray) — light-mode warning appears. Set to `#eeeeee` — dark-mode warning appears. Normal colors produce no warning.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(patron): add WCAG AA contrast warning in preview pane"
```

---

## Task 16: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

```
npm run typecheck
```

Expected: clean.

- [ ] **Step 2: Lint**

```
npm run lint
```

Expected: clean.

- [ ] **Step 3: Browser smoke — new user flow**

```
rm -rf .next
npm run dev
```

As a tier 3 user with no prior customization:
- Open `/change-appearance`.
- Click a gradient preset → both previews render the gradient.
- Switch radio to Solid → preview becomes solid.
- Toggle Bold/Italic → preview updates.
- Add shadow → preview glows.
- Click Reset to default → customization cleared, previews revert to tier-1 default color + plain text.
- Click Save → page reloads, prefs persisted.

- [ ] **Step 4: Browser smoke — legacy user flow**

As a user with a saved `colorPreference`:
- Open `/change-appearance`.
- Migration banner visible.
- Fill picker pre-populated with the legacy color.
- Save → reload → banner gone, `customColor`/`customGradient` now populated, `colorPreference` cleared.

- [ ] **Step 5: Browser smoke — consumer sites**

Visit pages that render patron names:
- `/live` — live-user-run borders and names render correctly in both themes.
- `/` — PatreonCta slide carousel renders names.
- `/<known-patron-username>` — user profile link renders via `links.tsx`.
- PatreonPanel on frontpage — featured patrons render.

For a patron using the new `customColor` shape, names must match the settings preview.

- [ ] **Step 6: Reduced-motion check**

In devtools: emulate `prefers-reduced-motion: reduce`. Enable "Animate gradient" on a tier-3 user — gradient does not animate.

- [ ] **Step 7: Final commit / no-op**

If the previous tasks left any `rm -rf .next`-induced or lint-induced changes uncommitted, commit them now:

```bash
git status
git add -A
git commit -m "chore(patron): final cleanup" --allow-empty
```

---

## Notes on scope deliberately excluded

- Backend schema or endpoint changes (spec says server already accepts the new shape).
- Server-side migration of existing `colorPreference` (frontend migrates on the user's next save).
- Removal of the `colorPreference` field from types/backend (deferred until usage hits zero).
- Chat-mention rendering: only touched if existing chat code already imports `<PatreonName>`; otherwise out of scope for this plan.
- A unit-test framework: the project doesn't have one, and adding one is unrelated scope.

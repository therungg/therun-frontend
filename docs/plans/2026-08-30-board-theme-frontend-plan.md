# Custom Board Themes — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-game board theme (hue/saturation-derived colors, optional background image, panel opacity) applied to everything under `games-v2/[game]` including the topbar, editable from a new console Theme pane.

**Architecture:** A pure `buildThemeCss()` derives all CSS custom-property overrides from the stored `GameTheme`; a new server `layout.tsx` at `games-v2/[game]/` injects them as a `<style>` tag (document-order beats `_overrides.scss` at equal specificity) plus a fixed scrim-backdrop div. The site canvas gradient learns two fallback vars so the topbar re-tints. Console pane writes through the existing `updateGameMetadataAction` / upload-image flow.

**Tech Stack:** Next.js 16 App Router, React 19, SCSS modules, vitest (colocated `*.test.ts`).

**Spec:** `docs/plans/2026-08-30-board-theme-design.md` (this repo). Backend counterpart: `/home/joey/therun/therun/docs/plans/2026-08-30-board-theme-backend-plan.md` — must be deployed before end-to-end verification, but every task here is buildable and unit-testable without it.

## Global Constraints

- `GameTheme` = `{ hue: int 0–359, saturation: int 20–70, backgroundUrl: string|null, panelOpacity: number 0.85–1.0 }`; absent/`null` = unthemed, board renders byte-identical to today.
- Text colors, rank gold/silver/bronze, verify-state and live colors are NEVER themed.
- No `backdrop-filter` on panels. Background image always behind the built-in scrim.
- Branch `board-theme` in this repo; commit per task; NEVER push to main; no PRs (Joey opens them).
- typecheck/lint are not clean on main (~356 pre-existing errors) — gate on a baseline diff, not exit 0.
- Biome formatting: 4-space indent, single quotes, trailing commas.

---

### Task 1: Mirror `GameTheme` into the frontend types + parse it

**Files:**
- Modify: `src/lib/game-mgmt.ts` (`UpdateGameBody` ~line 33, `GameMetadata` ~line 77, `GameMetadataPageData` ~line 122, `getGameMetadata` return literal ~line 176)
- Modify: `src/lib/game-metadata.ts` (`EMPTY_GAME_METADATA`)
- Test: `src/lib/game-theme.test.ts`
- Create: `src/lib/game-theme.ts`

**Interfaces:**
- Produces: `interface GameTheme { hue: number; saturation: number; backgroundUrl: string | null; panelOpacity: number }` and `parseGameTheme(raw: unknown): GameTheme | null` (lenient: anything malformed → `null`, never throws — pageData is untrusted at parse time). `GameMetadata.theme: GameTheme | null`; `UpdateGameBody.theme?: GameTheme | null`. Tasks 2–6 import `GameTheme` from `~src/lib/game-theme`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/game-theme.test.ts
import { describe, expect, it } from 'vitest';
import { parseGameTheme } from './game-theme';

const valid = {
    hue: 280,
    saturation: 55,
    backgroundUrl: 'https://media.therun.gg/backgrounds/12-1.webp',
    panelOpacity: 0.9,
};

describe('parseGameTheme', () => {
    it('round-trips a valid theme', () => {
        expect(parseGameTheme(valid)).toEqual(valid);
    });
    it('accepts a color-only theme', () => {
        const t = { ...valid, backgroundUrl: null, panelOpacity: 1 };
        expect(parseGameTheme(t)).toEqual(t);
    });
    it.each([
        ['undefined', undefined],
        ['null', null],
        ['non-object', 7],
        ['hue out of range', { ...valid, hue: 360 }],
        ['fractional hue', { ...valid, hue: 1.5 }],
        ['saturation out of range', { ...valid, saturation: 71 }],
        ['opacity out of range', { ...valid, panelOpacity: 0.5 }],
        ['non-https url', { ...valid, backgroundUrl: 'javascript:x' }],
    ])('returns null for %s', (_l, raw) => {
        expect(parseGameTheme(raw)).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game-theme.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/game-theme.ts
/**
 * Per-game board theme, mirrored by hand from the backend
 * (therun/src/types/game-theme.ts) per the no-shared-types contract.
 * Deliberately not free-form colors: every painted value is derived from
 * (hue, saturation), so a stored theme is legible by construction. See
 * docs/plans/2026-08-30-board-theme-design.md.
 */
export interface GameTheme {
    hue: number; // integer 0–359
    saturation: number; // integer 20–70
    backgroundUrl: string | null;
    panelOpacity: number; // 0.85–1.0
}

/** Lenient read-side parse: malformed themes render as unthemed, never 500. */
export function parseGameTheme(raw: unknown): GameTheme | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const t = raw as Record<string, unknown>;
    const { hue, saturation, backgroundUrl, panelOpacity } = t;
    if (!Number.isInteger(hue) || (hue as number) < 0 || (hue as number) > 359)
        return null;
    if (
        !Number.isInteger(saturation) ||
        (saturation as number) < 20 ||
        (saturation as number) > 70
    )
        return null;
    if (
        backgroundUrl !== null &&
        (typeof backgroundUrl !== 'string' ||
            !backgroundUrl.startsWith('https://') ||
            backgroundUrl.length > 2048)
    )
        return null;
    if (
        typeof panelOpacity !== 'number' ||
        !Number.isFinite(panelOpacity) ||
        panelOpacity < 0.85 ||
        panelOpacity > 1
    )
        return null;
    return {
        hue: hue as number,
        saturation: saturation as number,
        backgroundUrl: (backgroundUrl as string | null) ?? null,
        panelOpacity,
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/game-theme.test.ts` — Expected: PASS.

- [ ] **Step 5: Thread through the game-mgmt types**

In `src/lib/game-mgmt.ts`:
1. `import { type GameTheme, parseGameTheme } from './game-theme';`
2. `UpdateGameBody`: add `theme?: GameTheme | null;` after `categoryDisplayMode`.
3. `GameMetadata`: add `/** Mod-set board theme; null = default look. */ theme: GameTheme | null;` after `showMilliseconds`.
4. `GameMetadataPageData.game`: add `theme?: unknown;`.
5. `getGameMetadata` return literal: add `theme: parseGameTheme(data?.game?.theme),`.

In `src/lib/game-metadata.ts`, add `theme: null,` to `EMPTY_GAME_METADATA`.

- [ ] **Step 6: Typecheck baseline diff + commit**

Run: `npm run typecheck 2>&1 | wc -l` before/after the edit (or diff the error list) — no NEW errors.

```bash
git checkout -b board-theme
git add src/lib/game-theme.ts src/lib/game-theme.test.ts src/lib/game-mgmt.ts src/lib/game-metadata.ts
git commit -m "feat(theme): GameTheme mirror + lenient parse into GameMetadata"
```

---

### Task 2: `buildThemeCss` — derive every CSS override from (hue, saturation)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/theme/theme-css.ts`
- Test: `app/(new-layout)/games-v2/[game]/theme/theme-css.test.ts`

**Interfaces:**
- Consumes: `GameTheme` from `~src/lib/game-theme`.
- Produces: `buildThemeCss(theme: GameTheme): string` — a complete stylesheet with `[data-bs-theme='dark']` and `[data-bs-theme='light']` blocks. Task 3 injects it; Task 6's preview reuses the exported `deriveThemeVars(theme, scheme)` helper.

- [ ] **Step 1: Write the failing test**

```ts
// app/(new-layout)/games-v2/[game]/theme/theme-css.test.ts
import { describe, expect, it } from 'vitest';
import { buildThemeCss, deriveThemeVars } from './theme-css';

const base = { hue: 280, saturation: 55, backgroundUrl: null, panelOpacity: 1 };

describe('deriveThemeVars', () => {
    it('keeps dark surfaces at the reference lightness steps', () => {
        const dark = deriveThemeVars(base, 'dark');
        expect(dark['--board-surface-bg']).toBe('hsl(280 14% 11%)');
        expect(dark['--board-recess-bg']).toBe('hsl(280 17% 5.5%)');
        expect(dark['--board-accent']).toBe('hsl(280 55% 45%)');
        expect(dark['--site-canvas-bg']).toBe('hsl(280 17% 5%)');
        expect(dark['--site-canvas-primary']).toBe('hsl(280 55% 40%)');
    });
    it('keeps light surfaces white with a whisper canvas tint', () => {
        const light = deriveThemeVars(base, 'light');
        expect(light['--board-surface-bg']).toBe('hsl(0 0% 100%)');
        expect(light['--site-canvas-bg']).toBe('hsl(280 30% 98%)');
    });
    it('applies panelOpacity to surfaces only when an image is set', () => {
        const themed = { ...base, backgroundUrl: 'https://x/i.webp', panelOpacity: 0.9 };
        expect(deriveThemeVars(themed, 'dark')['--board-surface-bg']).toBe(
            'hsl(280 14% 11% / 0.9)',
        );
        expect(deriveThemeVars(themed, 'light')['--board-surface-bg']).toBe(
            'hsl(0 0% 100% / 0.9)',
        );
        // no image → opacity ignored, surfaces stay opaque
        expect(
            deriveThemeVars({ ...base, panelOpacity: 0.9 }, 'dark')[
                '--board-surface-bg'
            ],
        ).toBe('hsl(280 14% 11%)');
    });
    it('never emits text or rank colors', () => {
        const keys = Object.keys(deriveThemeVars(base, 'dark')).join(' ');
        expect(keys).not.toMatch(/color|gold|silver|bronze|emphasis/);
    });
});

describe('buildThemeCss', () => {
    it('emits one block per scheme with every var, and nothing user-typed', () => {
        const css = buildThemeCss(base);
        expect(css).toContain("[data-bs-theme='dark'] {");
        expect(css).toContain("[data-bs-theme='light'] {");
        expect(css).toContain('--board-surface-bg: hsl(280 14% 11%);');
        // only numbers we generated: no url() ever appears in the stylesheet
        expect(css).not.toContain('url(');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/theme/theme-css.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// app/(new-layout)/games-v2/[game]/theme/theme-css.ts
import type { GameTheme } from '~src/lib/game-theme';

type Scheme = 'dark' | 'light';

/**
 * Every themed custom property, derived from (hue, saturation) at the same
 * lightness steps as the reviewed defaults in styles/_overrides.scss
 * (#161c18 ≈ L11%, #0d0f0d ≈ L5.5%) — a theme changes the tint, never the
 * value structure, so contrast survives any input in the validated range.
 * Text, rank-metal, verify-state, and live colors are deliberately absent.
 */
export function deriveThemeVars(
    theme: GameTheme,
    scheme: Scheme,
): Record<string, string> {
    const { hue: h, saturation: s } = theme;
    // Panels go translucent only over a background image; opacity elsewhere
    // would show the canvas gradient through every panel for no reason.
    const alpha =
        theme.backgroundUrl && theme.panelOpacity < 1
            ? ` / ${theme.panelOpacity}`
            : '';
    if (scheme === 'dark') {
        const surfS = Math.round(s * 0.25);
        const deepS = Math.round(s * 0.3);
        return {
            '--board-surface-bg': `hsl(${h} ${surfS}% 11%${alpha})`,
            '--board-surface-border': `hsl(${h} ${s}% 80% / 0.09)`,
            '--board-recess-bg': `hsl(${h} ${deepS}% 5.5%)`,
            '--board-recess-strong-bg': `hsl(${h} ${deepS}% 3.5%)`,
            '--board-accent': `hsl(${h} ${s}% 45%)`,
            '--board-accent-soft': `hsl(${h} ${s}% 45% / 0.05)`,
            '--site-canvas-bg': `hsl(${h} ${deepS}% 5%)`,
            '--site-canvas-primary': `hsl(${h} ${s}% 40%)`,
        };
    }
    return {
        '--board-surface-bg': `hsl(0 0% 100%${alpha})`,
        '--board-surface-border': `hsl(${h} 40% 25% / 0.1)`,
        '--board-recess-bg': `hsl(${h} 20% 91%)`,
        '--board-recess-strong-bg': `hsl(${h} 20% 88%)`,
        '--board-accent': `hsl(${h} ${s}% 40%)`,
        '--board-accent-soft': `hsl(${h} ${s}% 40% / 0.05)`,
        '--site-canvas-bg': `hsl(${h} 30% 98%)`,
        '--site-canvas-primary': `hsl(${h} ${s}% 40%)`,
    };
}

function block(selector: string, vars: Record<string, string>): string {
    const lines = Object.entries(vars)
        .map(([k, v]) => `    ${k}: ${v};`)
        .join('\n');
    return `${selector} {\n${lines}\n}`;
}

/**
 * The stylesheet injected by the game layout. Values are built exclusively
 * from validated integers — nothing user-typed is interpolated, and the
 * background URL never enters CSS (the backdrop div carries it inline).
 */
export function buildThemeCss(theme: GameTheme): string {
    return [
        block("[data-bs-theme='dark']", deriveThemeVars(theme, 'dark')),
        block("[data-bs-theme='light']", deriveThemeVars(theme, 'light')),
    ].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/theme/theme-css.test.ts"` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/theme/"
git commit -m "feat(theme): derive board CSS vars from (hue, saturation)"
```

---

### Task 3: Inject the theme — game layout, backdrop, site-canvas vars

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/layout.tsx`
- Create: `app/(new-layout)/games-v2/[game]/theme/theme.module.scss`
- Modify: `app/(new-layout)/layout.module.scss` (the `.background` gradient)

**Interfaces:**
- Consumes: `resolveGame` (`~src/lib/games-v1`), `getGameMetadata` (`~src/lib/game-mgmt`), `buildThemeCss` (Task 2).
- Produces: every route under `games-v2/[game]` (board, overview, run pages, manage, setup) renders inside the theme; unthemed games return `children` untouched.

- [ ] **Step 1: Make the site canvas theme-aware (no-op off game pages)**

In `app/(new-layout)/layout.module.scss`, inside `.background`'s `linear-gradient(...)`, replace each `var(--bs-primary)` with `var(--site-canvas-primary, var(--bs-primary))` and each `var(--bs-body-bg)` with `var(--site-canvas-bg, var(--bs-body-bg))` (three body-bg occurrences, two primary). The fallbacks make this byte-identical everywhere the theme vars are unset — that is the entire mechanism by which the topbar re-tints on themed game pages.

- [ ] **Step 2: The backdrop styles**

```scss
// app/(new-layout)/games-v2/[game]/theme/theme.module.scss

// Fixed full-viewport background art. Lives inside <main> (z-index 1 in the
// root layout), so z-index -1 paints it above the site canvas but under all
// content; the z-index 10 topbar renders over it, which is the point — the
// theme covers the topbar. The scrim is not optional: panels are readable
// over arbitrary art because the art only really shows in the gutters.
.backdrop {
    position: fixed;
    inset: 0;
    z-index: -1;
    background-size: cover;
    background-position: center;

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
            180deg,
            rgba(6, 8, 7, 0.5) 0%,
            rgba(6, 8, 7, 0.78) 60%
        );
    }
}

:global([data-bs-theme='light']) .backdrop::after {
    background: linear-gradient(
        180deg,
        rgba(250, 250, 250, 0.6) 0%,
        rgba(250, 250, 250, 0.86) 60%
    );
}
```

- [ ] **Step 3: The layout**

```tsx
// app/(new-layout)/games-v2/[game]/layout.tsx
import type React from 'react';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveGame } from '~src/lib/games-v1';
import { buildThemeCss } from './theme/theme-css';
import styles from './theme/theme.module.scss';

/**
 * Applies the game's mod-set theme to everything under games-v2/[game].
 * Server-rendered so there is no flash: the <style> tag lands after the head
 * stylesheets in document order, which is what lets equal-specificity
 * [data-bs-theme] blocks beat _overrides.scss. Both reads are 'use cache'
 * functions the page fetches anyway.
 */
export default async function GameThemeLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ game: string }>;
}) {
    const { game: slug } = await params;
    const game = await resolveGame(slug).catch(() => null);
    const theme = game
        ? ((await getGameMetadata(game.id).catch(() => null))?.theme ?? null)
        : null;
    if (!theme) return children;

    return (
        <>
            <style
                // Safe by construction: buildThemeCss interpolates only
                // validated integers; the URL below never enters the CSS.
                dangerouslySetInnerHTML={{ __html: buildThemeCss(theme) }}
            />
            {theme.backgroundUrl ? (
                <div
                    className={styles.backdrop}
                    style={{
                        backgroundImage: `url(${JSON.stringify(theme.backgroundUrl).slice(1, -1)})`,
                    }}
                    aria-hidden
                />
            ) : null}
            {children}
        </>
    );
}
```

(The `JSON.stringify(...).slice(1, -1)` escapes quotes/backslashes so the https-checked URL cannot break out of the `url()` — cheap belt-and-braces on the one user-influenced string.)

- [ ] **Step 4: Verify no-theme is a no-op**

Run: `npx vitest run "app/(new-layout)/games-v2"` (existing suites still pass) and `npm run typecheck` baseline diff (no new errors). With no dev server of Joey's running, a full browser pass waits for Task 7; the structural check here is that `theme: null` short-circuits before any DOM change.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/layout.tsx" "app/(new-layout)/games-v2/[game]/theme/theme.module.scss" "app/(new-layout)/layout.module.scss"
git commit -m "feat(theme): inject per-game theme + scrimmed backdrop via game layout"
```

---

### Task 4: `AccentFromCover` yields to an explicit theme

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/board-masthead.tsx` (~line 108)

**Interfaces:**
- Consumes: `data.gameMeta.theme` (Task 1) — `data: GamePageData` is already the masthead's prop.

- [ ] **Step 1: Skip sampling when themed**

`AccentFromCover` writes `--board-accent(-soft)` as **inline** style on the plate, which beats the injected stylesheet — so when a theme exists it must not render. In `board-masthead.tsx` replace the unconditional render (~line 108):

```tsx
                {data.gameMeta.theme == null ? (
                    // Inline-written accent would override the theme's
                    // stylesheet accent — sampled color yields to the mod's
                    // explicit choice.
                    <AccentFromCover
                        coverUrl={
                            data.gameMeta.coverUrl ?? data.game.image ?? null
                        }
                        targetRef={plateRef}
                    />
                ) : null}
```

- [ ] **Step 2: Tests + commit**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/header"` — Expected: PASS.

```bash
git add "app/(new-layout)/games-v2/[game]/header/board-masthead.tsx"
git commit -m "feat(theme): sampled cover accent yields to an explicit theme"
```

---

### Task 5: Server actions — save the theme, upload the background

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/actions/update-game-metadata.action.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/console/actions/get-background-upload-url.action.ts` (create the `console/actions/` dir if absent; if one exists elsewhere in `manage/`, follow that placement)

**Interfaces:**
- Consumes: `GameTheme`, `parseGameTheme` (Task 1).
- Produces: `updateGameMetadataAction` accepts `theme?: GameTheme | null` (null clears); `getBackgroundUploadUrlAction(input: { gameSlug: string; gameId: number; contentType: string; contentLength: number })` → `{ result: { uploadUrl, imageUrl } } | { error }`. Task 6 calls both.

- [ ] **Step 1: Extend the update action**

In `update-game-metadata.action.ts`:
1. `import { type GameTheme, parseGameTheme } from '~src/lib/game-theme';`
2. `Input`: add `theme?: GameTheme | null;`.
3. Validation, alongside the other field checks:

```ts
    if (input.theme !== undefined && input.theme !== null) {
        if (parseGameTheme(input.theme) === null) {
            return { error: 'Invalid theme.' };
        }
    }
```

4. Body mapping: `if (input.theme !== undefined) body.theme = input.theme;`

- [ ] **Step 2: The background upload action**

Copy `setup/actions/get-cover-upload-url.action.ts` verbatim into `get-background-upload-url.action.ts` with exactly these deltas: function name `getBackgroundUploadUrlAction`; `MAX_CONTENT_LENGTH = 6 * 1024 * 1024`; size error message `'Image must be 6 MB or smaller.'`; and the POST body gains the kind:

```ts
                body: JSON.stringify({
                    contentType: input.contentType,
                    contentLength: input.contentLength,
                    kind: 'background',
                }),
```

Permission stays `confirmPermission(user, 'edit', 'category-settings', { game: input.gameSlug })` — same tier as the pane itself.

- [ ] **Step 3: Typecheck diff + commit**

```bash
git add "app/(new-layout)/games-v2/[game]/setup/actions/update-game-metadata.action.ts" "app/(new-layout)/games-v2/[game]/manage/console/actions/"
git commit -m "feat(theme): theme field on the game-update action + background upload action"
```

---

### Task 6: Console Theme pane

**Files:**
- Modify: `src/lib/console/vocabulary.ts` — mirror every place `'game-details'` appears for the new id (`CONCEPT_LABEL` entry `theme: 'Theme'`, the concept-id union at ~line 16, and the id lists at ~lines 78/125/175/192 where applicable to a pane)
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts` — add `'theme'` to `NavItemId`; add `{ id: 'theme', label: CONCEPT_LABEL.theme }` to the `game` group right after `game-details`; visibility falls through to the default `return flags.canConfigure` in `itemVisible`, which is correct (same tier as game-details) — verify `theme` is not accidentally caught by an earlier branch
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/nav-model.test.ts` — extend the nearest visibility test: `canConfigure: true` shows `theme`, `canConfigure: false` hides it
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/content-router.tsx` — new `case 'theme':` mirroring `case 'game-details':` (~line 239): pass the same `identifiers` + `metadata` + `game` data the GameDetailsPane case receives
- Create: `app/(new-layout)/games-v2/[game]/manage/console/theme-pane.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/console/theme-pane.module.scss`

**Interfaces:**
- Consumes: `updateGameMetadataAction` + `getBackgroundUploadUrlAction` (Task 5), `deriveThemeVars` (Task 2), `GameTheme` (Task 1), console chrome (`~src/components/console-chrome/console.module.scss` `surface/paneHeader/paneTitle/paneActions`, `../shared/form-kit.module.scss` — the classes `game-details-pane.tsx` uses).
- Produces: `?pane=theme` deep link; `<ThemePane identifiers={...} metadata={...} game={...} />`.

- [ ] **Step 1: The pane component**

```tsx
// app/(new-layout)/games-v2/[game]/manage/console/theme-pane.tsx
'use client';

import { useRouter } from 'next/navigation';
import { type CSSProperties, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import styles from '~src/components/console-chrome/console.module.scss';
import type { GameIdentifiers, GameMetadata } from '~src/lib/game-mgmt';
import type { GameTheme } from '~src/lib/game-theme';
import { deriveThemeVars } from '../../theme/theme-css';
import { getBackgroundUploadUrlAction } from './actions/get-background-upload-url.action';
import { updateGameMetadataAction } from '../../setup/actions/update-game-metadata.action';
import kit from '../shared/form-kit.module.scss';
import paneStyles from './theme-pane.module.scss';

const DEFAULT_DRAFT: GameTheme = {
    hue: 145, // brand-green neighborhood as the starting point
    saturation: 40,
    backgroundUrl: null,
    panelOpacity: 0.92,
};

interface Props {
    identifiers: GameIdentifiers;
    metadata: GameMetadata;
    game: { id: number; name: string };
}

export function ThemePane({ identifiers, metadata, game }: Props) {
    const router = useRouter();
    const [draft, setDraft] = useState<GameTheme | null>(metadata.theme);
    const [busy, setBusy] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    const save = async (theme: GameTheme | null) => {
        setBusy(true);
        const res = await updateGameMetadataAction({
            gameSlug: identifiers.slug,
            gameId: game.id,
            theme,
        });
        setBusy(false);
        if ('error' in res) {
            toast.error(res.error);
            return;
        }
        toast.success(theme ? 'Theme saved.' : 'Theme removed.');
        router.refresh();
    };

    const uploadBackground = async (file: File) => {
        setBusy(true);
        const urlRes = await getBackgroundUploadUrlAction({
            gameSlug: identifiers.slug,
            gameId: game.id,
            contentType: file.type,
            contentLength: file.size,
        });
        if ('error' in urlRes) {
            setBusy(false);
            toast.error(urlRes.error);
            return;
        }
        const put = await fetch(urlRes.result.uploadUrl, {
            method: 'PUT',
            body: file,
        }).catch(() => null);
        setBusy(false);
        if (!put?.ok) {
            toast.error('Upload failed.');
            return;
        }
        setDraft((d) => ({
            ...(d ?? DEFAULT_DRAFT),
            backgroundUrl: urlRes.result.imageUrl,
        }));
    };

    const t = draft ?? DEFAULT_DRAFT;
    // Custom-property keys aren't in CSSProperties; the double cast is the
    // standard escape hatch for style={{ '--x': ... }} objects.
    const previewVars = deriveThemeVars(t, 'dark') as unknown as CSSProperties;

    return (
        <div className={styles.surface}>
            <div className={styles.paneHeader}>
                <h2 className={styles.paneTitle}>Theme</h2>
                <div className={styles.paneActions}>
                    {metadata.theme != null && (
                        <button
                            type="button"
                            className={kit.dangerBtn ?? kit.saveBtn}
                            disabled={busy}
                            onClick={() => {
                                setDraft(null);
                                void save(null);
                            }}
                        >
                            Remove theme
                        </button>
                    )}
                    <button
                        type="button"
                        className={kit.saveBtn}
                        disabled={busy || draft == null}
                        onClick={() => draft && void save(draft)}
                    >
                        {busy ? 'Saving…' : 'Save theme'}
                    </button>
                </div>
            </div>

            <p className={paneStyles.lede}>
                Give {game.name}&rsquo;s board its own look. Pick a color and
                optionally a background image — panel and text contrast are
                handled automatically, in both light and dark mode.
            </p>

            <div className={paneStyles.controls}>
                <label className={paneStyles.field}>
                    <span>Color</span>
                    <input
                        type="range"
                        min={0}
                        max={359}
                        value={t.hue}
                        className={paneStyles.hueSlider}
                        onChange={(e) =>
                            setDraft({ ...t, hue: Number(e.target.value) })
                        }
                    />
                </label>
                <label className={paneStyles.field}>
                    <span>Vividness</span>
                    <input
                        type="range"
                        min={20}
                        max={70}
                        value={t.saturation}
                        onChange={(e) =>
                            setDraft({
                                ...t,
                                saturation: Number(e.target.value),
                            })
                        }
                    />
                </label>
                <div className={paneStyles.field}>
                    <span>Background image</span>
                    {t.backgroundUrl ? (
                        <div className={paneStyles.bgRow}>
                            {/* Backend media CDN; plain img is fine here. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={t.backgroundUrl}
                                alt=""
                                className={paneStyles.bgThumb}
                            />
                            <button
                                type="button"
                                className={kit.ghostBtn ?? kit.saveBtn}
                                disabled={busy}
                                onClick={() =>
                                    setDraft({ ...t, backgroundUrl: null })
                                }
                            >
                                Remove image
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className={kit.ghostBtn ?? kit.saveBtn}
                            disabled={busy}
                            onClick={() => fileInput.current?.click()}
                        >
                            Upload image (PNG/JPEG/WEBP, max 6 MB)
                        </button>
                    )}
                    <input
                        ref={fileInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadBackground(f);
                            e.target.value = '';
                        }}
                    />
                </div>
                {t.backgroundUrl != null && (
                    <label className={paneStyles.field}>
                        <span>Panel opacity</span>
                        <input
                            type="range"
                            min={85}
                            max={100}
                            value={Math.round(t.panelOpacity * 100)}
                            onChange={(e) =>
                                setDraft({
                                    ...t,
                                    panelOpacity:
                                        Number(e.target.value) / 100,
                                })
                            }
                        />
                    </label>
                )}
            </div>

            <div
                className={paneStyles.preview}
                style={previewVars}
                aria-hidden
            >
                <div className={paneStyles.previewPanel}>
                    <div className={paneStyles.previewAccent} />
                    <div className={paneStyles.previewRows}>
                        <span />
                        <span />
                        <span />
                    </div>
                </div>
            </div>
        </div>
    );
}
```

(Adjust `kit.dangerBtn` / `kit.ghostBtn` to whatever the form kit actually exports — check `manage/console/shared/form-kit.module.scss`; `game-details-pane.tsx` shows the idiom. `GameIdentifiers` import per `game-details-pane.tsx`.)

- [ ] **Step 2: The pane styles**

```scss
// app/(new-layout)/games-v2/[game]/manage/console/theme-pane.module.scss
@use '../../../../styles/board' as board;

.lede {
    max-width: 60ch;
    color: var(--bs-secondary-color);
}

.controls {
    display: grid;
    gap: 1rem;
    max-width: 28rem;
    margin-block: 1.25rem;
}

.field {
    display: grid;
    gap: 0.375rem;

    > span {
        font-size: 0.8125rem;
        font-weight: 600;
    }
}

.hueSlider {
    // The track IS the picker: full spectrum, thumb picks the hue.
    appearance: none;
    height: 0.75rem;
    border-radius: 999px;
    background: linear-gradient(
        90deg,
        hsl(0 60% 50%),
        hsl(60 60% 50%),
        hsl(120 60% 50%),
        hsl(180 60% 50%),
        hsl(240 60% 50%),
        hsl(300 60% 50%),
        hsl(360 60% 50%)
    );
}

.bgRow {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.bgThumb {
    width: 96px;
    height: 54px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid var(--bs-border-color);
}

// Miniature board rendered with the DERIVED vars from deriveThemeVars —
// the preview and the real board share one derivation, so it cannot lie.
.preview {
    padding: 1.25rem;
    border-radius: 8px;
    background: var(--board-recess-bg);
    max-width: 28rem;
}

.previewPanel {
    background: var(--board-surface-bg);
    border: 1px solid var(--board-surface-border);
    border-radius: 6px;
    padding: 0.875rem;
}

.previewAccent {
    height: 0.5rem;
    width: 40%;
    border-radius: 999px;
    background: var(--board-accent);
    margin-bottom: 0.75rem;
}

.previewRows {
    display: grid;
    gap: 0.5rem;

    > span {
        height: 0.625rem;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.12);

        &:nth-child(2) {
            width: 85%;
        }
        &:nth-child(3) {
            width: 70%;
        }
    }
}
```

(If `@use '.../board'` isn't how sibling pane scss files import — check `board-categories.module.scss`'s header — mirror whatever they do, or drop the import; nothing above requires the mixins.)

- [ ] **Step 3: Wire nav + router**

1. `vocabulary.ts`: add `theme: 'Theme'` to `CONCEPT_LABEL` and `'theme'` to the same unions/lists that carry `'game-details'` **where they concern panes** (read each list's comment before adding — e.g. a "wizard steps" list must NOT gain it).
2. `nav-model.ts`: extend `NavItemId` with `| 'theme'`; add `{ id: 'theme', label: CONCEPT_LABEL.theme }` after `game-details` in the `game` group.
3. `content-router.tsx`: add after the `game-details` case, passing the same data object fields:

```tsx
        case 'theme':
            return (
                <ThemePane
                    identifiers={data.identifiers}
                    metadata={data.metadata}
                    game={data.game}
                />
            );
```

(Prop plumbing must mirror `case 'game-details'` exactly — read that case first; the names above assume its shape.)

- [ ] **Step 4: Tests**

Extend `nav-model.test.ts`: with `canConfigure: true` the `game` group contains `'theme'`; with `canConfigure: false` it does not.

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage/console"`
Expected: PASS (note `row-actions.test` has 3 pre-existing failures elsewhere in the repo — only new failures count).

- [ ] **Step 5: Commit**

```bash
git add src/lib/console/vocabulary.ts "app/(new-layout)/games-v2/[game]/manage/console/" "app/(new-layout)/games-v2/[game]/theme/"
git commit -m "feat(theme): console Theme pane (?pane=theme) with live preview"
```

---

### Task 7: Verification + hand-off

- [ ] **Step 1: Full local gates**

Run: `npx vitest run` (only pre-existing failures), `npm run typecheck` + `npm run lint` baseline diffs (no new errors).

- [ ] **Step 2: Browser pass**

Backend must be deployed first (backend plan Task 4). Check nothing is serving (`ps -eo pid,args | grep "next dev" | grep -v grep`), start `npm run dev`, then verify — dark AND light mode each time:
1. Unthemed game: board pixel-identical to main (spot-check masthead, table, sidebar).
2. `?pane=theme`: set a hue (e.g. 280), save → board, overview, run page, console, AND topbar/page canvas re-tint; text/rank colors unchanged.
3. Upload a background: image behind everything including topbar, scrim present, panels translucent at the chosen opacity, tables readable.
4. Remove theme → default look returns.
5. Kill the dev server by exact pid before ending the turn.

- [ ] **Step 3: Push the branch**

```bash
rm -rf .next
git push -u origin board-theme
```

No PR (Joey opens PRs). Report the branch name and the browser-pass results.

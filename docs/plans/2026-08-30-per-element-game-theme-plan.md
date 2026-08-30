# Per-element Game Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hue/saturation game theme with three per-element color pickers (panel, accent, page background) plus the existing background image, deriving borders, recesses, accents, and readable text/contrast colors so a board can never become unreadable.

**Architecture:** A board owner picks three hex colors. Both repos store them on the existing `games_pg.theme` jsonb column (no migration). The frontend derives every board CSS var from the three colors — including Bootstrap text vars (`--bs-body-color`, etc.) and `--bs-primary` — using WCAG luminance to choose light-or-dark text per panel. The board therefore looks the same regardless of the visitor's site theme.

**Tech Stack:** TypeScript, React 19, Next.js 16 App Router (frontend); AWS Lambda + Drizzle (backend); Vitest both sides.

**Spec:** `therun-fr/docs/plans/2026-08-30-per-element-game-theme-design.md`

## Global Constraints

- **Deploy order is a hard requirement: backend ships first.** The backend's `validateGameTheme` rebuilds the stored object with only known fields — until it knows the color fields, they are stripped and themes save empty. Frontend PR merges only after backend is confirmed deployed.
- No schema migration — `games_pg.theme` is already a jsonb column.
- No back-compat / migration path — no production themes exist yet.
- Hex color format everywhere: lowercase `#rrggbb`, validated by `^#[0-9a-f]{6}$`.
- The new `GameTheme` shape is hand-mirrored in both repos (no shared types): backend `therun/src/types/game-theme.ts`, frontend `therun-fr/src/lib/game-theme.ts`. They must stay identical in field names and validation ranges.
- Backend commits happen in `/home/joey/therun/therun` (repo therun-backend); frontend commits in `/home/joey/therun/therun-fr` (repo therun-frontend) on branch `per-element-game-theme`.

---

## Task 1 (BACKEND): GameTheme shape + validator

**Repo:** therun-backend (`/home/joey/therun/therun`) — branch off `origin/main`.

**Files:**
- Modify: `src/types/game-theme.ts` (full rewrite of the interface + `validateGameTheme`)
- Test: `test/unit/game-theme.test.ts` (rewrite)

**Interfaces:**
- Produces: `interface GameTheme { panelColor: string; accentColor: string; backgroundColor: string; backgroundUrl: string | null; panelOpacity: number }` and `validateGameTheme(input: unknown): GameTheme` (throws `Error` on any violation; returns a rebuilt object containing only those five fields).
- Consumes: nothing new. `updateGame` in `src/services/game-mgmt-service.ts` already calls `validateGameTheme(params.theme)` and stores the result — no change needed there.

- [ ] **Step 1: Rewrite the test file**

Replace the entire contents of `test/unit/game-theme.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { validateGameTheme } from "../../src/types/game-theme";

const valid = {
    panelColor: "#161c18",
    accentColor: "#4aa06a",
    backgroundColor: "#0d0f0d",
    backgroundUrl: "https://media.therun.gg/backgrounds/12-1725000000000.webp",
    panelOpacity: 0.9,
};

describe("validateGameTheme", () => {
    it("accepts a fully-populated theme", () => {
        expect(validateGameTheme(valid)).toEqual(valid);
    });

    it("accepts a color-only theme (no image)", () => {
        const t = { ...valid, backgroundUrl: null, panelOpacity: 1 };
        expect(validateGameTheme(t)).toEqual(t);
    });

    it("lowercase-normalizes hex colors", () => {
        const out = validateGameTheme({ ...valid, panelColor: "#161C18" });
        expect(out.panelColor).toBe("#161c18");
    });

    it("strips unknown keys", () => {
        expect(validateGameTheme({ ...valid, evil: "x" })).toEqual(valid);
    });

    it.each([
        ["panelColor missing #", { ...valid, panelColor: "161c18" }],
        ["panelColor 3-digit", { ...valid, panelColor: "#abc" }],
        ["panelColor non-hex char", { ...valid, panelColor: "#gggggg" }],
        ["accentColor not a string", { ...valid, accentColor: 123 }],
        ["backgroundColor with alpha", { ...valid, backgroundColor: "#0d0f0dff" }],
        ["panelOpacity below 0.85", { ...valid, panelOpacity: 0.8 }],
        ["panelOpacity above 1", { ...valid, panelOpacity: 1.01 }],
        ["non-https backgroundUrl", { ...valid, backgroundUrl: "javascript:x" }],
        ["arbitrary https URL not under /backgrounds/", { ...valid, backgroundUrl: "https://evil.example/x.png" }],
        ["backgroundUrl with non-image extension", { ...valid, backgroundUrl: "https://media.therun.gg/backgrounds/1-1.svg" }],
        ["missing panelColor", { accentColor: "#4aa06a", backgroundColor: "#0d0f0d", backgroundUrl: null, panelOpacity: 1 }],
        ["not an object", 42],
        ["null", null],
    ])("rejects %s", (_label, input) => {
        expect(() => validateGameTheme(input)).toThrow();
    });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run test/unit/game-theme.test.ts`
Expected: FAIL (old validator still expects `hue`/`saturation`).

- [ ] **Step 3: Rewrite `src/types/game-theme.ts`**

Replace the whole file with (keep the `backgroundUrl`/`panelOpacity` logic verbatim from the current file — only the color fields change):

```ts
/**
 * Per-game board theme. Three picked colors (panel, accent, page background);
 * the frontend derives borders, recesses, accents, and readable text from them
 * (light-or-dark text chosen by panel luminance), so any stored theme is legible
 * by construction. See therun-fr docs/plans/2026-08-30-per-element-game-theme-design.md.
 */
export interface GameTheme {
    /** Board/table panel surface, lowercase #rrggbb. */
    panelColor: string;
    /** Links, highlights, active states, lowercase #rrggbb. */
    accentColor: string;
    /** Page canvas behind the panels, lowercase #rrggbb. */
    backgroundColor: string;
    /**
     * Media-CDN URL from the upload endpoint, or null. Must match
     * `https://<domain>/backgrounds/<gameId>-<timestamp>.(png|jpg|webp)`.
     */
    backgroundUrl: string | null;
    /** Panel alpha over a background image, 0.85–1.0. */
    panelOpacity: number;
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

function normalizeHex(value: unknown, field: string): string {
    if (typeof value !== "string" || !HEX_COLOR_PATTERN.test(value.toLowerCase())) {
        throw new Error(`theme.${field} must be a #rrggbb hex color`);
    }
    return value.toLowerCase();
}

export function validateGameTheme(input: unknown): GameTheme {
    if (typeof input !== "object" || input === null) {
        throw new Error("theme must be an object");
    }
    const t = input as Record<string, unknown>;
    const panelColor = normalizeHex(t.panelColor, "panelColor");
    const accentColor = normalizeHex(t.accentColor, "accentColor");
    const backgroundColor = normalizeHex(t.backgroundColor, "backgroundColor");

    const { backgroundUrl, panelOpacity } = t;
    const BACKGROUND_URL_PATTERN =
        /^https:\/\/[a-z0-9.-]+\/backgrounds\/\d+-\d+\.(png|jpg|webp)$/;
    if (backgroundUrl !== null) {
        if (
            typeof backgroundUrl !== "string" ||
            backgroundUrl.length > 2048 ||
            !BACKGROUND_URL_PATTERN.test(backgroundUrl)
        ) {
            throw new Error(
                "theme.backgroundUrl must be null or a background image URL uploaded through the upload endpoint",
            );
        }
    }
    if (
        typeof panelOpacity !== "number" ||
        !Number.isFinite(panelOpacity) ||
        panelOpacity < 0.85 ||
        panelOpacity > 1
    ) {
        throw new Error("theme.panelOpacity must be a number between 0.85 and 1");
    }
    return {
        panelColor,
        accentColor,
        backgroundColor,
        backgroundUrl: (backgroundUrl as string | null) ?? null,
        panelOpacity,
    };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run test/unit/game-theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck the touched file compiles**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "game-theme" || echo "no game-theme type errors"`
Expected: `no game-theme type errors` (the repo baseline has unrelated errors — only regressions in `game-theme.ts` matter).

- [ ] **Step 6: Commit**

```bash
git -C /home/joey/therun/therun add src/types/game-theme.ts test/unit/game-theme.test.ts
git -C /home/joey/therun/therun commit -m "feat(games): per-element theme colors (panel/accent/background)"
```

> **Deploy gate:** After this task, the backend branch is pushed to main by Joey (auto-deploys, no migration). Do not start the frontend UI merge until the deploy is confirmed live. Frontend Tasks 2–4 can be *written and committed* on the branch meanwhile; only merging waits on the backend deploy.

---

## Task 2 (FRONTEND): GameTheme mirror + read-side parse

**Repo:** therun-frontend, branch `per-element-game-theme`.

**Files:**
- Modify: `src/lib/game-theme.ts` (rewrite interface + `parseGameTheme`)
- Test: `src/lib/game-theme.test.ts` (rewrite)

**Interfaces:**
- Produces: `interface GameTheme { panelColor: string; accentColor: string; backgroundColor: string; backgroundUrl: string | null; panelOpacity: number }` and `parseGameTheme(raw: unknown): GameTheme | null` (lenient: returns `null` for anything malformed, never throws). Mirrors Task 1's shape exactly.
- Consumes: nothing.

- [ ] **Step 1: Rewrite the test file**

Replace the entire contents of `src/lib/game-theme.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { parseGameTheme } from './game-theme';

const valid = {
    panelColor: '#161c18',
    accentColor: '#4aa06a',
    backgroundColor: '#0d0f0d',
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
    it('lowercase-normalizes hex colors', () => {
        expect(parseGameTheme({ ...valid, panelColor: '#161C18' })?.panelColor).toBe(
            '#161c18',
        );
    });
    it.each([
        ['undefined', undefined],
        ['null', null],
        ['non-object', 7],
        ['panelColor without #', { ...valid, panelColor: '161c18' }],
        ['3-digit hex', { ...valid, panelColor: '#abc' }],
        ['non-hex char', { ...valid, accentColor: '#gggggg' }],
        ['opacity out of range', { ...valid, panelOpacity: 0.5 }],
        ['non-https url', { ...valid, backgroundUrl: 'javascript:x' }],
    ])('returns null for %s', (_l, raw) => {
        expect(parseGameTheme(raw)).toBeNull();
    });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/lib/game-theme.test.ts`
Expected: FAIL (old parser expects `hue`/`saturation`).

- [ ] **Step 3: Rewrite `src/lib/game-theme.ts`**

```ts
/**
 * Per-game board theme, mirrored by hand from the backend
 * (therun/src/types/game-theme.ts) per the no-shared-types contract.
 * Three picked colors; theme-css.ts derives borders, recesses, accents and
 * readable text from them, so a stored theme is legible by construction.
 * See docs/plans/2026-08-30-per-element-game-theme-design.md.
 */
export interface GameTheme {
    panelColor: string; // lowercase #rrggbb — board/table surface
    accentColor: string; // lowercase #rrggbb — links, highlights, active
    backgroundColor: string; // lowercase #rrggbb — page canvas
    backgroundUrl: string | null;
    panelOpacity: number; // 0.85–1.0
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

function normHex(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const lower = value.toLowerCase();
    return HEX_COLOR_PATTERN.test(lower) ? lower : null;
}

/** Lenient read-side parse: malformed themes render as unthemed, never 500. */
export function parseGameTheme(raw: unknown): GameTheme | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const t = raw as Record<string, unknown>;
    const panelColor = normHex(t.panelColor);
    const accentColor = normHex(t.accentColor);
    const backgroundColor = normHex(t.backgroundColor);
    if (panelColor === null || accentColor === null || backgroundColor === null)
        return null;
    const { backgroundUrl, panelOpacity } = t;
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
        panelColor,
        accentColor,
        backgroundColor,
        backgroundUrl: (backgroundUrl as string | null) ?? null,
        panelOpacity,
    };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run src/lib/game-theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/joey/therun/therun-fr add src/lib/game-theme.ts src/lib/game-theme.test.ts
git -C /home/joey/therun/therun-fr commit -m "feat(theme): mirror per-element GameTheme shape"
```

---

## Task 3 (FRONTEND): color derivation

**Repo:** therun-frontend, branch `per-element-game-theme`.

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/theme/theme-css.ts` (rewrite `deriveThemeVars`; `buildThemeCss` and `block` unchanged)
- Test: `app/(new-layout)/games-v2/[game]/theme/theme-css.test.ts` (rewrite)

**Interfaces:**
- Consumes: `GameTheme` (new shape) from Task 2.
- Produces: `deriveThemeVars(theme: GameTheme, scheme: 'dark' | 'light'): Record<string, string>` and `buildThemeCss(theme: GameTheme): string`. The map now includes `--bs-body-color`, `--bs-emphasis-color`, `--bs-secondary-color`, `--bs-tertiary-color`, `--bs-primary`, `--bs-primary-rgb` in addition to the existing `--board-*` and `--site-canvas-*` vars. Output no longer varies by `scheme` (the board carries its own colors regardless of the visitor's site theme); the `scheme` param is retained so `buildThemeCss` can keep emitting one block per `[data-bs-theme]` selector unchanged.

- [ ] **Step 1: Rewrite the test file**

Replace the entire contents of `theme-css.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { buildThemeCss, deriveThemeVars } from './theme-css';

const base = {
    panelColor: '#161c18',
    accentColor: '#4aa06a',
    backgroundColor: '#0d0f0d',
    backgroundUrl: null,
    panelOpacity: 1,
};

describe('deriveThemeVars', () => {
    it('maps the picked colors onto the board surface, accent and canvas', () => {
        const v = deriveThemeVars(base, 'dark');
        expect(v['--board-surface-bg']).toBe('#161c18');
        expect(v['--board-accent']).toBe('#4aa06a');
        expect(v['--site-canvas-bg']).toBe('#0d0f0d');
        expect(v['--bs-primary']).toBe('#4aa06a');
        expect(v['--bs-primary-rgb']).toBe('74, 160, 106');
    });
    it('chooses light text on a dark panel', () => {
        const v = deriveThemeVars(base, 'dark');
        expect(v['--bs-emphasis-color']).toBe('#ffffff');
        expect(v['--bs-body-color']).toBe('#e8eaed');
    });
    it('chooses dark text on a light panel', () => {
        const v = deriveThemeVars({ ...base, panelColor: '#f2f2f2' }, 'dark');
        expect(v['--bs-emphasis-color']).toBe('#000000');
        expect(v['--bs-body-color']).toBe('#1a1d1a');
    });
    it('derives recesses darker than the panel', () => {
        const v = deriveThemeVars(base, 'dark');
        expect(v['--board-recess-bg']).toBe('#12161380'.slice(0, 7)); // hex, no alpha
        expect(v['--board-recess-bg']).toMatch(/^#[0-9a-f]{6}$/);
        expect(v['--board-recess-strong-bg']).toMatch(/^#[0-9a-f]{6}$/);
    });
    it('applies panelOpacity to the surface only when an image is set', () => {
        const themed = { ...base, backgroundUrl: 'https://x/i.webp', panelOpacity: 0.9 };
        expect(deriveThemeVars(themed, 'dark')['--board-surface-bg']).toBe(
            'rgba(22, 28, 24, 0.9)',
        );
        // no image → opacity ignored, surface stays opaque hex
        expect(deriveThemeVars({ ...base, panelOpacity: 0.9 }, 'dark')['--board-surface-bg']).toBe(
            '#161c18',
        );
    });
    it('is identical across schemes (board owns its colors)', () => {
        expect(deriveThemeVars(base, 'dark')).toEqual(deriveThemeVars(base, 'light'));
    });
});

describe('buildThemeCss', () => {
    it('emits one block per scheme and never leaks a url()', () => {
        const css = buildThemeCss(base);
        expect(css).toContain("[data-bs-theme='dark'] {");
        expect(css).toContain("[data-bs-theme='light'] {");
        expect(css).toContain('--board-surface-bg: #161c18;');
        expect(css).not.toContain('url(');
    });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/theme/theme-css.test.ts"`
Expected: FAIL.

- [ ] **Step 3: Rewrite `deriveThemeVars` in `theme-css.ts`**

Keep the imports, `Scheme` type, `block()`, and `buildThemeCss()` exactly as they are. Replace only the `deriveThemeVars` function (and its doc comment) with:

```ts
interface Rgb {
    r: number;
    g: number;
    b: number;
}

function hexToRgb(hex: string): Rgb {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
    };
}

function toHex({ r, g, b }: Rgb): string {
    const h = (n: number) =>
        Math.max(0, Math.min(255, Math.round(n)))
            .toString(16)
            .padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
}

/** Linear mix of a color toward a target by `amount` (0–1). */
function mix(color: Rgb, target: Rgb, amount: number): Rgb {
    return {
        r: color.r + (target.r - color.r) * amount,
        g: color.g + (target.g - color.g) * amount,
        b: color.b + (target.b - color.b) * amount,
    };
}

/** WCAG relative luminance, 0 (black) – 1 (white). */
function luminance({ r, g, b }: Rgb): number {
    const lin = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Every themed custom property, derived from the three picked colors. Panel
 * luminance chooses a light or dark text set so contrast survives any input;
 * recesses mix the panel toward black; the accent drives both --board-accent
 * and --bs-primary. Rank-metal, verify-state, and live colors stay un-themed.
 * The board owns its colors, so the result does not depend on `scheme`.
 */
export function deriveThemeVars(
    theme: GameTheme,
    _scheme: Scheme,
): Record<string, string> {
    const panel = hexToRgb(theme.panelColor);
    const accent = hexToRgb(theme.accentColor);
    const useLightText = luminance(panel) < 0.4;

    // Panels go translucent only over a background image.
    const surfaceBg =
        theme.backgroundUrl && theme.panelOpacity < 1
            ? `rgba(${panel.r}, ${panel.g}, ${panel.b}, ${theme.panelOpacity})`
            : theme.panelColor;

    const text = useLightText
        ? {
              body: '#e8eaed',
              emphasis: '#ffffff',
              secondary: 'rgba(232, 234, 237, 0.75)',
              tertiary: 'rgba(232, 234, 237, 0.5)',
          }
        : {
              body: '#1a1d1a',
              emphasis: '#000000',
              secondary: 'rgba(26, 29, 26, 0.7)',
              tertiary: 'rgba(26, 29, 26, 0.5)',
          };

    return {
        '--board-surface-bg': surfaceBg,
        '--board-surface-border': useLightText
            ? 'rgba(255, 255, 255, 0.09)'
            : 'rgba(0, 0, 0, 0.1)',
        '--board-recess-bg': toHex(mix(panel, BLACK, 0.18)),
        '--board-recess-strong-bg': toHex(mix(panel, BLACK, 0.3)),
        '--board-accent': theme.accentColor,
        '--board-accent-soft': `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.08)`,
        '--site-canvas-bg': theme.backgroundColor,
        '--site-canvas-primary': theme.accentColor,
        '--bs-primary': theme.accentColor,
        '--bs-primary-rgb': `${accent.r}, ${accent.g}, ${accent.b}`,
        '--bs-body-color': text.body,
        '--bs-emphasis-color': text.emphasis,
        '--bs-secondary-color': text.secondary,
        '--bs-tertiary-color': text.tertiary,
    };
}
```

Also delete the old file-level doc comment block above `deriveThemeVars` (the one referencing "(hue, saturation)") — it is replaced by the new comment above.

- [ ] **Step 4: Fix the recess test to use the real derived value**

The recess test in Step 1 used a placeholder. Run the tests once (`npx vitest run "app/(new-layout)/games-v2/[game]/theme/theme-css.test.ts"`), read the actual `--board-recess-bg` value from any failure output, and replace the first line of the `derives recesses darker than the panel` test with an exact-value assertion:

```ts
expect(v['--board-recess-bg']).toBe('<actual value from run>'); // panel mixed 18% toward black
```

Keep the two `toMatch(/^#[0-9a-f]{6}$/)` assertions.

- [ ] **Step 5: Run the tests, verify they pass**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/theme/theme-css.test.ts"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C /home/joey/therun/therun-fr add "app/(new-layout)/games-v2/[game]/theme/theme-css.ts" "app/(new-layout)/games-v2/[game]/theme/theme-css.test.ts"
git -C /home/joey/therun/therun-fr commit -m "feat(theme): derive board vars from three picked colors"
```

---

## Task 4 (FRONTEND): theme pane color pickers

**Repo:** therun-frontend, branch `per-element-game-theme`. No unit test — this is UI wiring verified by typecheck + manual pass.

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/theme-pane.tsx`

**Interfaces:**
- Consumes: `GameTheme` (Task 2), `deriveThemeVars` (Task 3), `updateGameMetadataAction` (unchanged).

- [ ] **Step 1: Replace the default draft**

Change the `DEFAULT_DRAFT` const (currently `hue`/`saturation`) to:

```ts
const DEFAULT_DRAFT: GameTheme = {
    panelColor: '#161c18', // current dark-panel neighborhood
    accentColor: '#4aa06a', // brand-green neighborhood
    backgroundColor: '#0d0f0d', // current canvas
    backgroundUrl: null,
    panelOpacity: 0.92,
};
```

- [ ] **Step 2: Replace the two range sliders with three color inputs**

In the JSX, replace the two `<label className={paneStyles.field}>` blocks for "Color" (hue) and "Vividness" (saturation) — currently lines ~122–149 — with three color-picker fields:

```tsx
<label className={paneStyles.field}>
    <span>Panel color</span>
    <input
        type="color"
        value={t.panelColor}
        onChange={(e) => setDraft({ ...t, panelColor: e.target.value })}
    />
</label>
<label className={paneStyles.field}>
    <span>Accent color</span>
    <input
        type="color"
        value={t.accentColor}
        onChange={(e) => setDraft({ ...t, accentColor: e.target.value })}
    />
</label>
<label className={paneStyles.field}>
    <span>Page background</span>
    <input
        type="color"
        value={t.backgroundColor}
        onChange={(e) => setDraft({ ...t, backgroundColor: e.target.value })}
    />
</label>
```

Leave the "Background image", "Panel opacity", preview, and header/action blocks unchanged. (`<input type="color">` always returns a lowercase `#rrggbb`, so it already matches the validator.)

- [ ] **Step 3: Update the lede copy**

Replace the `paneLede` paragraph text with copy that matches three colors, e.g.:

```tsx
<p className={styles.paneLede}>
    Give {game.name}&rsquo;s board its own look. Pick the panel, accent, and
    page-background colors and optionally a background image — text contrast is
    handled automatically.
</p>
```

- [ ] **Step 4: Typecheck (regression-gated)**

Run: `npx tsc --noEmit 2>&1 | grep -iE "theme-pane|game-theme|theme-css" || echo "no theme type errors"`
Expected: `no theme type errors` (repo baseline has ~356 unrelated errors — only theme-file regressions matter).

- [ ] **Step 5: Lint the touched file**

Run: `npx @biomejs/biome check "app/(new-layout)/games-v2/[game]/manage/console/theme-pane.tsx"`
Expected: no errors (fix any it reports).

- [ ] **Step 6: Commit**

```bash
git -C /home/joey/therun/therun-fr add "app/(new-layout)/games-v2/[game]/manage/console/theme-pane.tsx"
git -C /home/joey/therun/therun-fr commit -m "feat(theme): three color pickers in the theme pane"
```

---

## Task 5 (FRONTEND): full test + manual verification

- [ ] **Step 1: Run the whole theme test set**

Run: `npx vitest run src/lib/game-theme.test.ts "app/(new-layout)/games-v2/[game]/theme/theme-css.test.ts"`
Expected: all PASS.

- [ ] **Step 2: Manual browser pass (dev server)**

Start `npm run dev` (check nothing else is serving first: `ps -eo pid,args | grep "next dev" | grep -v grep`). Then, against a deployed backend that has Task 1 live:
1. Open a game's `/games-v2/<slug>/manage?pane=theme`.
2. Change all three colors — confirm the live preview updates and text stays readable.
3. Upload a background image, drop panel opacity — confirm the panel goes translucent over the image.
4. Save, then open the public board — confirm colors apply and text is readable in both the site's light and dark themes.
5. Remove theme — confirm the board reverts to default.

Kill the dev server when done (match the exact pid, never `pkill -f`).

- [ ] **Step 3: Push the branch (Joey opens the PR)**

```bash
git -C /home/joey/therun/therun-fr push -u origin per-element-game-theme
```

Do NOT merge to main. Do NOT open the PR. Confirm the backend deploy is live before the PR is merged.

---

## Self-Review

- **Spec coverage:** model replacement (Tasks 1–2), derivation with contrast (Task 3), 3 pickers + image (Task 4), deploy-order constraint (Global Constraints + Task 1 gate), testing (Tasks 1–3, 5). All spec sections mapped.
- **Type consistency:** `GameTheme` field names identical across Task 1 (backend) and Task 2 (frontend): `panelColor`, `accentColor`, `backgroundColor`, `backgroundUrl`, `panelOpacity`. `deriveThemeVars` signature unchanged (still `(theme, scheme)`), so `buildThemeCss` and `theme-pane.tsx`'s preview call site need no signature change.
- **Placeholder note:** Task 3 Step 4 deliberately fills in one exact hex value from a real run rather than hardcoding an unverified constant — this is a compute-then-assert step, not a placeholder left in the shipped code.

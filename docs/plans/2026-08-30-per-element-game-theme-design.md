# Per-element game theme — design

**Date:** 2026-08-30
**Repos:** therun-backend (first) + therun-frontend (second)
**Supersedes:** the hue/saturation theme shipped 2026-08-30 (backend a8e5865/0113, fr merge 98399188). No production themes exist yet, so this is a clean model replacement with no migration.

## Problem

The shipped theme is 4 knobs — Color (single hue), Vividness (saturation), Background image, Panel opacity — with all 8 board CSS vars derived from one hue+saturation at fixed lightness steps. This guarantees contrast but gives owners far less control than a full game-page theming contract, where individual elements are colored independently.

## Goal

Let a board owner set individual element colors (panel, accent, page background) while keeping text/border/recess colors auto-derived so a board can never become unreadable. Chosen model: **per-element colors with derived text/contrast** — not raw free-form per-element (which allows unreadable boards), not a hue-derived quick theme.

## Element set

Three color pickers + image. Everything else derives.

| Picker | CSS target | Derived from it |
|--------|-----------|-----------------|
| **Panel color** | `--board-surface-bg` | border, recess, recess-strong, panel text color |
| **Accent color** | `--board-accent` | `--board-accent-soft` |
| **Page background color** | `--site-canvas-bg` | `--site-canvas-primary` (topbar tint) |
| Background image | backdrop div (inline) | — |
| Panel opacity | alpha on panel, only when image set | — |

Text, rank-metal, verify-state, and live colors stay un-themed (unchanged from current behavior).

## Data model

Replace the `GameTheme` shape in both repos. Same jsonb `games_pg.theme` column — **no schema migration**.

```ts
interface GameTheme {
    panelColor: string;       // hex "#rrggbb" — board/table surface
    accentColor: string;      // hex "#rrggbb" — links, highlights, active states
    backgroundColor: string;  // hex "#rrggbb" — page canvas behind panels
    backgroundUrl: string | null;  // unchanged (presigned-upload URL or null)
    panelOpacity: number;     // unchanged, 0.85–1.0, only applied when backgroundUrl set
}
```

## Backend changes (therun-backend, ship first)

- `src/types/game-theme.ts` — rewrite `GameTheme` interface + `validateGameTheme`:
  - Each of `panelColor`/`accentColor`/`backgroundColor`: normalize to lowercase, must match `^#[0-9a-f]{6}$`, else `ValidationError`.
  - `backgroundUrl` regex + `panelOpacity` range validation: unchanged.
  - Still rebuilds output with only the known fields (unknown keys stripped — existing behavior).
- No change to `updateGame` theme branch, handler field lists, `rebuildGamePageData`, schema, or migrations — the column and permission wiring already exist.
- Deploy: push to main (auto-deploys; no migration to run).

## Frontend changes (therun-frontend, ship second)

- `src/lib/game-theme.ts` — mirror the new `GameTheme` type + update `parseGameTheme` validation to match backend (hex checks).
- `app/(new-layout)/games-v2/[game]/theme/theme-css.ts` — rewrite `deriveThemeVars`:
  - Parse each hex → RGB.
  - **Panel:** compute WCAG relative luminance; pick near-white or near-black text color for contrast; border = panel ±8% L; recess / recess-strong = panel shifted darker (dark scheme) / lighter (light scheme).
  - **Accent:** accent-soft = accent at reduced alpha/lightness.
  - **Background:** `--site-canvas-bg` = value directly; `--site-canvas-primary` = a derived shade.
  - Emit both `[data-bs-theme='dark']` and `[data-bs-theme='light']` blocks with opposite-direction shifts (as today).
  - `panelOpacity` alpha only when `backgroundUrl` present (unchanged).
- `app/(new-layout)/games-v2/[game]/manage/console/theme-pane.tsx` — replace the two range sliders (Color, Vividness) with three `<input type="color">` pickers (Panel, Accent, Page background). Keep the background-image upload block, "Panel opacity" slider (image-gated), "Save theme", "Remove theme", and the existing live preview.
  - Update the default draft to sensible hex defaults (e.g. panel `#1b2233`, accent `#3ba55d`, background `#0f1320` — tune during build).
- Deploy: PR, merged after backend is live.

## Deploy sequencing (hard requirement)

1. **Backend first.** If frontend shipped first, the old validator strips the new color fields and themes save empty.
2. **Frontend second**, after backend is confirmed deployed.

## Out of scope (YAGNI)

- No separate header/topbar, row-striping, or rank/medal color pickers (derived or un-themed).
- No migration/back-compat path — no prod themes exist.
- No raw free-form (no-guardrail) mode.

## Testing

- Backend: unit tests on `validateGameTheme` — valid hex triples pass and normalize case; bad hex / missing fields / out-of-range opacity throw; unknown fields stripped.
- Frontend: unit test `deriveThemeVars` produces readable text color across light and dark panel inputs (luminance branch both ways); `parseGameTheme` accepts/rejects the same cases as backend.
- Manual: theme a board, verify live preview + saved board render in both site themes; confirm background image + opacity still work.

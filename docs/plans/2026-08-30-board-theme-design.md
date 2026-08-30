# Custom board themes — design

Status: agreed with Joey 2026-08-30, not yet implemented.

Game moderators can give their board a custom look: a theme color, an optional
full-page background image, and a panel opacity — the board (and the topbar
above it) re-skins while staying legible. Editable by anyone with the existing
`edit category-settings` permission on the game. No approval flow.

## The constrained model ("still looks good" by construction)

Mods do not pick raw hex colors. The theme is four knobs:

| Knob | Range | Meaning |
|---|---|---|
| `hue` | 0–359 | The community's color. Everything is derived from it. |
| `saturation` | 20–70 | How vivid. Same clamp as the cover-accent sampler. |
| `backgroundUrl` | S3 image or null | Full-page fixed backdrop, always behind a scrim. |
| `panelOpacity` | 0.85–1.0 | Panel translucency over the image. Floor keeps tables readable. |

`theme: null` = no theme, board renders exactly as today.

From `(hue, saturation)` a pure function derives every CSS custom property,
per color scheme, so contrast is guaranteed by construction:

- Text colors are **never** themed — `--bs-body-color` / `--bs-emphasis-color`
  stay as-is. Rank gold/silver/bronze, verify-state colors, and live
  indicators stay brand-fixed.
- Dark: surface `hsl(h s·0.25 11%)`, canvas `hsl(h s·0.3 5%)` — same
  lightness as today's `#161c18` / `#0d0f0d`, only the tint changes.
- Light: surface stays white, canvas gets a whisper tint `hsl(h 30% 98%)`.
- Accent: `hsl(h s 45%)` — identical formula to `AccentFromCover`, which
  yields to an explicit theme (skip sampling when a theme exists).
- Recess backgrounds re-derived at the same lightness steps as
  `_overrides.scss`; the neutral overlay vars (recess border/shadow/highlight,
  engrave) are pure black/white alphas and stay untouched.

Background image rules (non-negotiable, baked in, no toggle):

- Rendered as a `position: fixed` backdrop with a built-in darken scrim
  (dark theme: ~55% black gradient, heavier behind the content column;
  light theme: ~55% white). The art shows in the gutters, not under text.
- When an image is set, panels use the derived surface color at
  `panelOpacity` alpha; without an image, panels are always opaque.

## Where the theme applies and how it reaches the topbar

Everything under `games-v2/[game]` — public board, overview, run pages,
manage console, setup — via a new **server** `layout.tsx` at
`app/(new-layout)/games-v2/[game]/layout.tsx`:

1. Resolves the game and reads `gameMeta.theme` (`getGameMetadata`, cached).
2. If themed, renders a `<style>` tag with `[data-bs-theme='dark']` /
   `[data-bs-theme='light']` blocks overriding the board vars. Injected
   styles come after the head stylesheets in document order, so equal
   specificity wins against `_overrides.scss`. SSR — no FOUC, no client JS.
   All emitted values are generated from validated numbers + our own S3 URL;
   nothing user-typed is interpolated.
3. Renders the fixed backdrop div (first child) when `backgroundUrl` is set.

The topbar (`(new-layout)/layout.tsx` → `.header`) is transparent over the
site canvas (`.background` in `layout.module.scss`). Two small edits make the
canvas theme-aware with zero effect off game pages:

- `.background`'s gradient reads `var(--site-canvas-primary, var(--bs-primary))`
  and `var(--site-canvas-bg, var(--bs-body-bg))`; the theme sets both.
- The fixed backdrop paints above the canvas and below all content
  (`z-index: -1` inside `main`'s stacking context; the `z-index: 10` header
  sits above it), so the image runs behind the topbar too.

## Storage & contract

`games.theme` jsonb column, nullable:

```ts
interface GameTheme {
    hue: number;          // integer 0–359
    saturation: number;   // integer 20–70
    backgroundUrl: string | null;
    panelOpacity: number; // 0.85–1.0, one decimal step
}
```

- Written through the existing `PUT /v1/games/{gameId}` (`UpdateGameBody.theme`)
  — no new API Gateway route (the `api` stack is at 499/500 resources).
  Considered and rejected: the vestigial `game_customizations.visual` jsonb
  (`PUT /v1/games/:id/customizations`) — untyped `Record<string, unknown>`
  grab-bags with no real frontend consumer; a typed `games.theme` column
  (`jsonb().$type<GameTheme>()`, the schema's established pattern) keeps one
  write path, one permission, and flows through the audit log for free.
- Read through the existing game pageData response as `game.theme`;
  frontend mirror in `GameMetadata.theme`.
- Background image upload rides the existing presigned-PUT endpoint
  `POST /mod/v1/games/{gameId}/upload-image` with a new optional
  `kind: 'background'` body field: separate S3 key prefix, 6 MB cap
  (covers stay 2 MB), same PNG/JPEG/WEBP allowlist.

## Console UI

New "Theme" pane in the manage console (Game group, `?pane=theme`), following
the `game-details-pane.tsx` pattern:

- Hue + saturation sliders with a live swatch strip (surface/accent/canvas
  as they will render, both schemes).
- Background dropzone (same drag-drop pattern as the cover uploader) with
  remove.
- Panel opacity slider, enabled only when an image is set.
- Live preview panel: a miniature board card rendered with the derived vars.
- "Remove theme" resets to `theme: null`.
- Save → `updateGameMetadataAction` (extended with `theme`) → `updateTag`.

## Rejected / out of scope

- Free hex pickers, per-element colors, both-theme value editing — produces
  clashing boards; the hue-derived model is the feature.
- Custom logo / favicon / trophy images — not in v1.
- Blur on panels (`backdrop-filter`) — perf cost on long tables; opacity only.
- Mod-approval or reporting flow — Joey: mods can set it, no review step.
- Note the 2026-08-02 rejection of *sampled* per-game accents applied to
  chips/pills site-brand-wide still stands: brand green stays the default;
  a theme is an explicit mod choice scoped to that game's pages.

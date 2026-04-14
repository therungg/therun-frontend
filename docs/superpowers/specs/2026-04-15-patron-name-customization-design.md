# Patron Name Customization — Design

## Overview

Expand patron name styling from a fixed preset list to a full customizer: per-mode solid colors, per-mode gradients (with angle and animation), bold/italic, text shadow, and outline. Tier-gated client-side to mirror the server. Introduce a single shared `<PatronName>` renderer used everywhere patron names appear, and rewrite the settings page around a sticky dual-preview layout.

Scope is frontend-only. The backend already accepts the new `PatreonPreferences` shape.

## Goals

- Users can customize patron name appearance through a single settings page with live dark/light previews.
- Every patron name on the site renders identically via one component, respecting precedence: `customGradient` → `customColor` → legacy `colorPreference` → default tier styling.
- Existing users with a saved `colorPreference` are migrated to `customColor`/`customGradient` the first time they save in the new UI, with no data loss.
- The UI rejects invalid values before they reach the server (even though the server silently reverts them).

## Non-Goals

- Backend schema or endpoint changes.
- Migrating legacy `colorPreference` values server-side (frontend migrates on save).
- Adding new legacy preset IDs.
- Chat-mention rendering changes, unless existing chat code already consumes a shared component.

## Data Shape

`types/patreon.types.ts` — `PatronPreferences` becomes:

```ts
export interface PerMode<T> { dark: T; light: T; }

export interface PatronPreferences {
    hide: boolean;
    featureInScrollbar: boolean;
    featureOnOverview: boolean;
    showIcon: boolean;

    /** @deprecated Legacy preset id. Read for rendering; never written by new UI. */
    colorPreference?: number;

    customColor?: PerMode<string> | null;       // tier >= 2
    customGradient?: PerMode<string[]> | null;  // tier >= 3

    bold?: boolean;                             // tier >= 2
    italic?: boolean;                           // tier >= 2

    textShadow?: PerMode<{ color: string; blur: number }> | null;   // tier >= 3
    outline?:    PerMode<{ color: string; width: number }> | null;  // tier >= 3

    gradientAngle?: PerMode<number> | null;     // tier >= 3
    gradientAnimated?: boolean;                 // tier >= 3
}
```

Wire format matches the spec exactly. Omitting a key leaves stored value untouched; passing `null` clears.

## Architecture

### New / refactored modules

- **`src/components/patreon/patreon-name.tsx`** — refactored. Single component consumers use everywhere. Takes `{ name, preferences, tier, showIcon?, size? }`, resolves theme via existing `getColorMode()`, calls `buildPatronStyle`.
- **`src/components/patreon/patron-style.ts`** — new. Pure function `buildPatronStyle(prefs, tier, theme): CSSProperties`. No React. Implements the precedence and style-object recipe from the spec. Unit-testable in isolation.
- **`src/components/patreon/legacy-preset-map.ts`** — new. Maps a legacy `colorPreference` id to either `{ kind: 'solid', value: PerMode<string> }` or `{ kind: 'gradient', value: PerMode<string[]> }`, derived from the existing `patreonStyles()` table. Used both for legacy rendering and for seeding the picker during migration.
- **Global keyframes** — added once to `app/(new-layout)/styles/_globals.scss`:
  ```scss
  @keyframes patron-gradient {
      0%   { background-position: 0%   50%; }
      100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
      @keyframes patron-gradient { 0%, 100% { background-position: 0 50%; } }
  }
  ```

### Settings page restructure

`app/(new-layout)/change-appearance/patreon-section.tsx` is rewritten as an orchestrator that holds state and composes child subcomponents living in a new folder:

`app/(new-layout)/change-appearance/customization/`
- `preset-shortcuts.tsx` — curated seed presets
- `fill-section.tsx` — Solid/Gradient radio + child pickers
- `solid-picker.tsx` — two per-mode color swatches
- `gradient-picker.tsx` — stops, angle, animate toggle
- `font-section.tsx` — bold/italic
- `effects-section.tsx` — shadow + outline
- `display-section.tsx` — hide/icon/overview/scrollbar
- `preview-pane.tsx` — sticky dual-theme preview + contrast warning + Save/Reset
- `contrast-warning.tsx` — WCAG AA check

One shared React state object matching `PatronPreferences` shape. Children receive slices + setters. No derived state in children.

### Consumer migration

Every call site that currently reads `preferences.colorPreference` directly or renders a patron name by ad-hoc composition migrates to `<PatronName>`. Known sites to audit:

- `src/components/live/live-user-run.tsx`
- `src/components/live/recommended-stream.tsx`
- `src/components/links/links.tsx`
- `app/(new-layout)/frontpage/panels/patreon-panel/patreon-panel-view.tsx`
- `src/components/Topbar/MobileMenu.tsx`
- `src/components/Topbar/PatronCta.tsx`

Any other site surfaced by search during implementation is included.

## Settings Page Layout

Two-column with sticky right preview.

```
┌────────────────────────────────────┬──────────────────────────┐
│ LEFT (scroll)                      │ RIGHT (sticky)           │
│ [Preset shortcuts]                 │  Dark preview            │
│ [Fill: Solid ● / Gradient ○]       │  Light preview           │
│   solid or gradient pickers        │  [contrast warning?]     │
│ [Font]      (tier 2+)              │  [Reset to default]      │
│ [Effects]   (tier 3, shadow+outline)│  [Save settings]         │
│ [Display preferences]              │                          │
└────────────────────────────────────┴──────────────────────────┘
```

- Tier-locked sections are hidden entirely, not greyed.
- Tier 1 users see preset shortcuts (defaults only), display preferences, previews — no customization cards.
- Narrow breakpoints: previews move above the left column; Save/Reset become a sticky footer.

## Section Behaviors

### Preset shortcuts (above the fill radio)

Curated shortlist (~8–10 picks) from `patreonStyles()`. Each rendered as a small pill showing its preset style. Tier-gated. Click behavior:

- Solid preset → radio flips to Solid, `customColor` populated from preset `colorset1`/`colorset2`.
- Gradient preset (tier 3 only) → radio flips to Gradient, `customGradient` populated from preset arrays.

Does not save; user still hits Save.

Exact shortlist decided during implementation; selection criteria = visually distinct, currently-popular presets covering solid + gradient.

### Fill section

- Radio: **Solid** | **Gradient** (Gradient hidden for tier < 3).
- Selecting one queues `null` for the other when building the save payload.
- Solid picker: two `<input type="color">` swatches (dark/light) with a "copy dark → light" and "copy light → dark" button between them.
- Gradient picker: per-mode stop lists (2–6 each, independent counts). Each row = color input + remove button. "Add stop" disabled at 6; "Remove" disabled when count == 2. "Copy dark stops → light" button.
- Gradient angle: eight chips (0/45/90/135/180/225/270/315°) + numeric input (0–360) per mode.
- "Animate gradient" toggle below the gradient picker.

### Font section (tier 2+)

Two toggle buttons styled as a small toolbar: `[B]`, `[I]`. Independent.

### Effects section (tier 3)

- **Shadow:** per-mode color + blur slider (0–20). Single "Clear" button sets `textShadow: null`.
- **Outline:** per-mode color + width slider (0–3). Single "Clear" button sets `outline: null`.

### Display preferences (all tiers)

Unchanged: `hide`, `showIcon`, `featureOnOverview`, `featureInScrollbar` (scrollbar toggle only tier 3+).

### Preview pane (sticky right)

- Renders username with `buildPatronStyle(state, tier, 'dark')` and `'light'`, each against the matching theme background.
- Updates live on every state change.
- Hosts the contrast warning and the Save/Reset buttons.

### Contrast warning

Compute relative luminance of the computed fill (for gradients, check both endpoint stops) vs. the preview's theme background. If either mode fails WCAG AA 4.5:1, show a non-blocking warning row beneath the previews. Save stays enabled.

## Legacy Migration

On settings page load, if `colorPreference` is set and no `customColor`/`customGradient`:

1. Look up the preset via `legacy-preset-map.ts`.
2. Seed the matching picker (solid or gradient) and flip the Fill radio accordingly.
3. Show a dismissable banner: "We've imported your current color. Save to switch to the new customizer."

On Save in a migrated session, include `colorPreference: 0` in the payload alongside the new custom field, so the legacy field is cleared.

Render sites rendering legacy users who haven't visited the settings page keep working via the precedence rule inside `<PatronName>`.

## Validation (client-side)

Mirrors the server:

- Hex: `/^#([0-9a-f]{3}|[0-9a-f]{6})$/i`.
- Gradient stops: 2–6 per mode; counts may differ between dark and light.
- Shadow blur: finite number 0–20.
- Outline width: finite number 0–3.
- Gradient angle: finite number 0–360.
- Booleans: strict `true`/`false`.

Invalid values block the Save button and surface inline error text on the offending control.

## Save Flow

1. Build full `PatreonPreferences` payload from current state, setting the disused of `customColor`/`customGradient` to `null`.
2. If `colorPreference` was loaded and user pressed Save, include `colorPreference: 0`.
3. POST to `/api/users/${session.id}-${session.username}/patreon-settings` (existing endpoint).
4. On success, `Router.reload()` to refresh all downstream consumers.

Reset-to-default confirms, then sends `null` for every customization field and `colorPreference: 0`.

## Accessibility

- `prefers-reduced-motion` handled entirely in CSS keyframes; JS does not re-check.
- Every form control has an associated `<label>`.
- Previews render the plain username text; no screen-reader-hiding wrappers.
- Color inputs retain native keyboard/focus behavior.

## Rendering Recipe (for `buildPatronStyle`)

Fill resolution follows precedence and must handle legacy gradient presets, not only legacy solids:

```ts
// Returns { kind: 'solid', value: string } | { kind: 'gradient', value: string[] }
function resolveFill(prefs, tier, theme) {
    if (prefs.customGradient) {
        return { kind: 'gradient', value: prefs.customGradient[theme] };
    }
    if (prefs.customColor) {
        return { kind: 'solid', value: prefs.customColor[theme] };
    }
    const legacy = legacyPresetMap(prefs.colorPreference); // null if unset/unknown
    if (legacy) {
        return legacy.kind === 'gradient'
            ? { kind: 'gradient', value: legacy.value[theme] }
            : { kind: 'solid',    value: legacy.value[theme] };
    }
    return { kind: 'solid', value: defaultTierColor(tier, theme) };
}
```

`defaultTierColor` returns the existing tier-1 default (current preset id 0: `#27A11B` dark / `#007c00` light); tiers 2 and 3 use the same default when no customization is set.

Style object:

```ts
const fill = resolveFill(prefs, tier, theme);
const isGradient = fill.kind === 'gradient';
const backgroundValue = isGradient
    ? `linear-gradient(${prefs.gradientAngle?.[theme] ?? 90}deg, ${fill.value.join(',')})`
    : undefined;

return {
    background: backgroundValue,
    WebkitBackgroundClip: isGradient ? 'text' : undefined,
    backgroundClip: isGradient ? 'text' : undefined,
    color: isGradient ? 'transparent' : (fill.value as string),
    fontWeight: prefs.bold ? 700 : 400,
    fontStyle: prefs.italic ? 'italic' : 'normal',
    textShadow: prefs.textShadow
        ? `0 0 ${prefs.textShadow[theme].blur}px ${prefs.textShadow[theme].color}`
        : undefined,
    WebkitTextStroke: prefs.outline
        ? `${prefs.outline[theme].width}px ${prefs.outline[theme].color}`
        : undefined,
    animation: isGradient && prefs.gradientAnimated
        ? 'patron-gradient 6s linear infinite'
        : undefined,
    backgroundSize: isGradient && prefs.gradientAnimated ? '200% 100%' : undefined,
};
```

Note: `prefs.gradientAnimated` applies only when the *active* fill is a gradient. A legacy gradient preset does not animate (legacy data predates the flag).

## Testing

- Unit tests for `buildPatronStyle`: precedence order, each field shape, both themes.
- Unit tests for `legacyPresetMap`: every current preset id returns the expected per-mode value.
- Unit tests for the validation helpers.
- Manual QA: dev server, verify previews match the rendered name in live/leaderboard/scrollbar/profile sites across both themes, and that reduced-motion disables the animation.

## Rollout

Single PR. On merge, new UI is live for all patrons; legacy users continue to render correctly via precedence and migrate on their next save. `colorPreference` can be removed from the schema once the legacy field is empty for all active users (tracked separately, out of scope here).

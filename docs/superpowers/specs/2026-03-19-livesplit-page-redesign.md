# LiveSplit Key Page Redesign

## Overview

Redesign the LiveSplit key page from a plain text-heavy layout to a polished utility page with the key card as the hero element.

## Design

### Structure (top to bottom)

1. **Page header** — "LiveSplit Key" title + one-line subtitle describing what it does
2. **Hero key card** — the focal point of the page
   - Green accent glow (gradient border/shadow using `--bs-primary`)
   - Status badge ("Key Active") with green dot
   - "Your LiveSplit Key" label
   - Masked key (`••••••••`) by default
   - Two buttons: "Reveal Key" (outline) and "Copy to Clipboard" (filled primary)
   - Security warning integrated into the card footer
3. **Info card** — "What does this do?" with icon, single compact card explaining the integration
4. **Setup steps** — "Setup in 2 steps" with numbered step cards (step number in a green-accented square badge)
5. **Benefits grid** — 3-column grid: Live Tracking, Tournaments, Races (with icons)
6. **Troubleshooting** — collapsible `<details>` element, not prominent
7. **GitHub link** — small link to component source at bottom

### Logged-out state

Show the page header and a login prompt card in place of the key card. Setup steps and info sections still visible.

### Component changes

**`copy-upload-key.component.tsx`** — rewrite to support:
- Masked/revealed toggle (password-field style)
- Styled reveal and copy buttons
- "Copied!" feedback toast/inline message
- Status badge

### Styling

- Max-width ~520px, centered
- Use existing design tokens from `_design-tokens.scss`
- Card backgrounds: `linear-gradient(135deg, color-mix(in srgb, var(--bs-body-bg) 92%, var(--bs-primary) 8%), ...)`
- Green accent via `var(--bs-primary)` and `rgba(var(--bs-primary-rgb), ...)`
- Step number badges: green background with green border
- Benefits grid: `grid-template-columns: repeat(3, 1fr)`
- Troubleshooting: native `<details>/<summary>`

### Files to modify

- `app/(new-layout)/livesplit/page.tsx` — restructure JSX
- `app/(new-layout)/livesplit/livesplit.module.scss` — rewrite styles
- `app/(new-layout)/livesplit/copy-upload-key.component.tsx` — rewrite with masked key UI

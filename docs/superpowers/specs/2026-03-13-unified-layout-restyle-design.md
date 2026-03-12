# Unified Layout Restyle

Migrate all pages from `(old-layout)` and `(footer)` layout groups into `(new-layout)`, applying the new design language (gradient backgrounds, design tokens, CSS Modules) to every page. Visual refresh only — no information architecture changes.

## Layout Consolidation

All pages move into `(new-layout)`. The `(old-layout)` and `(footer)` layout groups are removed.

The unified layout provides:
- Gradient background: green-tinted `color-mix()` fade from top, dark mode ambient glow with radial green gradients
- New header: positioned inside the gradient, `z-index: 10`
- New slim footer (see Footer section)

Pages currently using React Bootstrap `<Container>` keep using it for width constraints. Bootstrap grid (`Container`, `Row`, `Col`) stays for layout structure throughout.

## Design Token Application

Every page's components get restyled using the existing design tokens from `_design-tokens.scss`. No new design system — applying what exists to old-layout pages.

### Per-component-type changes

**Cards/panels**: Replace Bootstrap card classes with CSS Module styles using `color-mix()` backgrounds, shadow scale (`$shadow-sm` through `$shadow-xl`), border radius scale (`$radius-md`/`$radius-lg`), subtle green-tinted borders (`rgba(var(--bs-primary-rgb), 0.15)`).

**Typography**: Apply font size scale (`$font-size-xs` through `$font-size-2xl`), letter-spacing adjustments, `tabular-nums` for numeric data.

**Badges/pills**: Subtle semi-transparent backgrounds (`color-mix(in srgb, var(--bs-primary) 10%, transparent)`) with matching borders.

**Tables**: Sticky headers, subtle striped rows (rgba alternation), row hover with `translateX(2px)`, consistent with runs table style.

**Buttons**: Smooth transitions (`0.15s ease-in-out`), hover lift (`translateY(-1px)`).

**Spacing**: Use spacing scale (`$spacing-xs` through `$spacing-3xl`) instead of ad-hoc Bootstrap margin/padding utilities.

**Hover/interaction states**: Consistent transitions, border highlights, shadow increases on hover.

### What stays the same
- Bootstrap grid for layout structure
- Information architecture — same content, same arrangement
- Existing component logic and data fetching

## Slim Footer

Replaces the current multi-column Bootstrap footer.

- Single row, horizontally centered links
- Links: About, Blog, FAQ, Contact, Privacy Policy, Terms
- `$font-size-xs`, muted text color, subtle top border (`1px solid rgba(var(--bs-primary-rgb), 0.15)`)
- `$spacing-md` vertical padding, `$spacing-lg` gaps between links
- Hover: smooth color transition to primary
- Optional small copyright text
- CSS Module, no Bootstrap component dependencies
- Dark mode: inherits from design tokens

## Shared Component Extraction

Restyle once, use across pages:

- **Data tables**: One CSS Module for consistent table styling (sticky header, striped rows, hover states), modeled after `runs-table.module.scss`
- **Stat cards**: Consistent card style with `color-mix()` backgrounds and shadow scale
- **Form elements**: Consistent input/select/button styling
- **Page headers/titles**: Consistent heading treatment
- **Search/filter bars**: Consistent filter UI

Located in `app/(new-layout)/styles/shared/` and imported by pages that need them.

## Page Scope

Every page gets the same treatment: move into new layout, apply design tokens.

### User pages
`/[username]`, `/[username]/[game]`, `/[username]/[game]/[run]`, `/[username]/races`, `/[username]/recap`, `/[username]/wrapped` — restyle stat cards, run tables, split displays, profile headers.

### Game pages
`/games`, `/games/[game]` — restyle game cards, leaderboard tables, category selectors.

### Race pages
`/races`, `/races/[race]`, `/races/create`, `/races/[race]/edit`, `/races/finished`, `/races/stats/*` — restyle race cards, participant lists, real-time race displays, stat tables.

### Event pages
`/events`, `/events/[event]`, `/events/create`, `/events/[event]/edit` — restyle event cards, search/filter UI, event detail panels.

### Tournament pages
`/tournaments`, `/tournaments/[tournament]` — restyle tournament cards, bracket/standings displays.

### Live pages
`/live`, `/live/[username]` — restyle live run cards, stream displays.

### Utility pages
`/livesplit`, `/upload`, `/upload-key`, `/change-appearance`, `/how-it-works`, `/moist-setup`, `/marathon` — restyle forms, instruction panels, setup guides.

### Admin pages
`/admin/roles`, `/admin/move-user`, `/admin/exclusions`, `/data` — restyle data tables, admin forms.

### Static/content pages
`/about`, `/blog`, `/blog/[post]`, `/faq`, `/contact`, `/privacy-policy`, `/terms`, `/roadmap`, `/media`, `/discord`, `/patreon`, `/patron` — restyle content containers, typography, cards/lists.

### Misc
`/old-frontpage` (consider removing), `/recap`, `/stories/manage` — same treatment.

## Constraints

- Visual refresh only — no changes to information architecture, component logic, or data fetching
- Bootstrap grid stays (`Container`, `Row`, `Col`)
- Custom components get CSS Modules with design tokens
- All pages must look clean and uncluttered — apply the same restraint as the frontpage and /runs page

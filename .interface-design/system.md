# Interface Design System — therun.gg Admin Console

Scope: the unified game admin console at `/games-v2/[game]/manage` and its moderation surfaces. Extends the app's existing system; does not replace it.

## Intent

- **Human:** a speedrun game moderator / board-admin. Opens this to triage suspicious/flagged runs at volume and to configure leaderboard standards. Often acting between other things; wants to act fast and confidently without mistakes.
- **Verb:** *triage* flagged runs (approve / remove / ban) and *configure* standards/categories.
- **Feel:** a calm, precise **leaderboard-integrity control room**. Authoritative, fast, trustworthy, uncluttered. Speedrun precision shows up as tabular monospace times. Severity is the visual organizing principle. Craft whispers.

## Domain & color world

Splits/timers, WR/PB, ranks, categories & platforms, verification/VODs, flags/severity, runners & trust, 3:4 cover art. Colors come from the app: brand **green** (`--bs-primary`, ≈#007c00) = verified/go; **red** (`$accent-red #ef4444`) = reject/remove/high-severity; **amber** (`$accent-amber #f59e0b`) = caution/medium; **gold** (`$accent-gold #d4af37`) = WR/top. Canvas = `--bs-body-bg` (dark-mode aware).

## Signature

1. **Severity spine** — a 3px colored left edge on every attention/run item (red=high, amber=medium, neutral=low). Lets a moderator scan the queue by integrity risk at a glance. This is the console's defining element.
2. **Tabular monospace times** — every run time uses `$font-mono` with tabular numerals, like a speedrun timer. Times are data, aligned and scannable.

## Defaults rejected

- Emoji icons (⚙🚩⚖✋☰🕘▾▸) → **`react-bootstrap-icons`** only, one consistent monochrome set. (Emoji is the #1 "not crafted" tell.)
- Bootstrap raw `border rounded p-3` uniform boxes → token-based **console surfaces** with a severity spine and distinct meta/action zones.
- Generic gray equal-weight admin sidebar → **same-canvas** sidebar (border separation, not a different bg), grouped rhythm (Moderate vs Configure), the attention count as a quiet focal integrity signal, refined active state with a green accent.

## Rules (apply everywhere in the console)

- **Tokens, not magic numbers.** Use `_design-tokens.scss` (`$spacing-*`, `$radius-*`, `$shadow-*`, `$font-size-*`, `$transition-*`, accent colors, `$font-mono`). Co-locate styles as `*.module.scss` (project convention).
- **Depth = borders + subtle surface tint** (the app's strategy). Borders are low-opacity green/`--bs-border-color`; never harsh. Sidebar shares the canvas bg with a right border. Inputs slightly inset.
- **Surfaces:** canvas → console surface (faint tint + 1px border, `$radius-lg`) → raised (hover/active, `$shadow-md`). Whisper-quiet jumps.
- **Type:** headings 600 + slight negative tracking; labels uppercase `$font-size-2xs` letter-spaced muted; **times always `$font-mono` tabular**. Four text levels (primary/secondary/tertiary/muted via `--bs-*` tones).
- **Icons:** `react-bootstrap-icons`, ~16px inline / ~18px standalone, `aria-hidden` when decorative, with accessible labels on icon-only buttons.
- **States:** every interactive element has hover/active/focus-visible/disabled; data has loading/empty/error. Empty states are calm ("All clear"), not barren.
- **Motion:** `$transition-fast`/`$transition-base`, deceleration easing only. No bounce.
- **Severity map:** high→`$accent-red`, medium→`$accent-amber`, low→neutral `--bs-secondary`. Reuse this everywhere severity/status appears.

## Components

- `console.module.scss` — shared console styles: `.shell`, `.sidebar`, `.navGroup`, `.navItem`/`.active`, `.surface`, `.severitySpine`/`--high`/`--med`/`--low`, `.time` (mono tabular), `.metaRow`, `.actionRow`, `.empty`.
- Reuse app `Badge` for status pills; reuse `Panel` only for page-level framing if needed (its bookmark tab is heavy for dense lists — prefer the lighter `.surface`).
- Sidebar item = icon + label + optional count badge; active = green left accent + tinted bg.

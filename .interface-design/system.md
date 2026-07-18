# Interface Design System — therun.gg games-v2

Scope: all games-v2 surfaces — the public leaderboard, the setup wizard, the unified admin console at /games-v2/[game]/manage, and claim surfaces. Extends the app's existing system; does not replace it.

## Intent

- **Human:** a speedrun game moderator / board-admin. Opens this to triage suspicious/flagged runs at volume and to configure leaderboard standards. Often acting between other things; wants to act fast and confidently without mistakes.
- **Verb:** *triage* flagged runs (approve / remove / ban) and *configure* standards/categories.
- **Human (public):** a speedrunner or viewer scanning a leaderboard. Wants the board to be overzichtelijk — instantly legible, calm, competitive. **Verb:** *scan* ranks and times.
- **Feel:** a calm, precise **leaderboard-integrity control room**. Authoritative, fast, trustworthy, uncluttered. Speedrun precision shows up as tabular monospace times. Severity is the visual organizing principle. Craft whispers. The public board's register moves from calm-admin to premium-competitive (the crown redesign); the console keeps its calm register.

## Domain & color world

Splits/timers, WR/PB, ranks, categories & platforms, verification/VODs, flags/severity, runners & trust, 3:4 cover art. Colors come from the app: brand **green** (`--bs-primary`, ≈#007c00) = verified/go; **red** (`$accent-red #ef4444`) = reject/remove/high-severity; **amber** (`$accent-amber #f59e0b`) = caution/medium; **gold** (`$accent-gold #d4af37`) = WR/top. Canvas = `--bs-body-bg` (dark-mode aware).

## Signature

1. **Severity spine** — a 3px colored left edge on every attention/run item (red=high, amber=medium, neutral=low). Lets a moderator scan the queue by integrity risk at a glance. This is the console's defining element.
2. **Tabular monospace times** — every run time uses `$font-mono` with tabular numerals, like a speedrun timer. Times are data, aligned and scannable.
3. **Rank accents** — ranks 1/2/3 colored gold/silver/bronze ($accent-gold/$accent-silver/$accent-bronze) in the mono rank column. The public board's defining element; the wizard's live preview shares it.
4. **Ambient art hero / the crown** — the game's own cover art, blurred to atmosphere under a scrim, with the category WR set monumentally in gold mono. Per-game identity derived from content, not configuration.

## Defaults rejected

- Emoji icons (⚙🚩⚖✋☰🕘▾▸) → **`react-bootstrap-icons`** only, one consistent monochrome set. (Emoji is the #1 "not crafted" tell.)
- Bootstrap raw `border rounded p-3` uniform boxes → token-based **console surfaces** with a severity spine and distinct meta/action zones.
- Generic gray equal-weight admin sidebar → **same-canvas** sidebar (border separation, not a different bg), grouped rhythm (Moderate vs Configure), the attention count as a quiet focal integrity signal, refined active state with a green accent.

## Rules (apply everywhere in games-v2)

- **Tokens, not magic numbers.** Use `_design-tokens.scss` (`$spacing-*`, `$radius-*`, `$shadow-*`, `$font-size-*`, `$transition-*`, accent colors, `$font-mono`). Co-locate styles as `*.module.scss` (project convention).
- **Depth = borders + subtle surface tint** (the app's strategy). Borders are low-opacity green/`--bs-border-color`; never harsh. Sidebar shares the canvas bg with a right border. Inputs slightly inset.
- **Surfaces:** canvas → console surface (faint tint + 1px border, `$radius-lg`) → raised (hover/active, `$shadow-md`). Whisper-quiet jumps.
- **Glass** (board-glass) is reserved for the hero's quiet actions, the sticky control band, and the rail's live panel — never for content surfaces.
- **Type:** headings 600 + slight negative tracking; labels uppercase `$font-size-2xs` letter-spaced muted; **times always `$font-mono` tabular**. Four text levels (primary/secondary/tertiary/muted via `--bs-*` tones).
- **Icons:** `react-bootstrap-icons`, ~16px inline / ~18px standalone, `aria-hidden` when decorative, with accessible labels on icon-only buttons.
- **States:** every interactive element has hover/active/focus-visible/disabled; data has loading/empty/error. Empty states are calm ("All clear"), not barren.
- **Motion:** `$transition-fast`/`$transition-base`, deceleration easing only. No bounce. One orchestrated load-in per navigation (hero fade-up, first rows stagger); category/filter swaps crossfade. prefers-reduced-motion disables all of it.
- **Severity map:** high→`$accent-red`, medium→`$accent-amber`, low→neutral `--bs-secondary`. Reuse this everywhere severity/status appears.
- **One red:** severity/destructive text and fills use `$accent-red` (`#ef4444`), never Bootstrap's `$danger` (`#dc3545`) — no `.text-danger`/`.btn-danger`/`var(--bs-danger)` in games-v2's board-vocabulary surfaces. (Decision, Task 23: a handful of not-yet-restyled raw-Bootstrap CONFIGURE forms — `groups-section.tsx`, `manual-time-dialog.tsx`, `variable-form.tsx`, `wr-history-drawer.tsx` — still use `.text-danger`; they're out of scope until those forms get their own board-vocabulary pass, per console.module.scss's existing "not-yet-restyled" carve-out.)
- **One green (decision, Task 23):** verified/done/active states use `--bs-primary` (the app's brand green, ≈`#007c00`), not `$accent-amber`'s sibling `$accent-green` (`#4caf50`) — a second, slightly different green was drifting in via `run-badges.module.scss`'s verified pill and `reassignments.module.scss`'s done/success states. `$accent-green` is no longer used anywhere in games-v2. Gold/amber/red keep their own distinct hues (WR/caution/severity); only "affirmative/complete" collapses onto the one brand green.
- **Action hierarchy (Task 9):** three tiers, everywhere in games-v2. Primary = `board-btn-primary` (filled brand green — the board's single answer to "what does a primary action look like": hero "Submit a run", wizard step Continue/Save actions, board/table empty-state CTAs). Secondary = `control-pill` (wizard Back, finish step's "View your board"). Tertiary = `board-quiet-link` (wizard Skip, and the shared `BackLink` up-navigation component). Carve-outs stay untouched: the hero's own `glassChip` (glass, not chrome, over ambient art), moderation verdict actions (`btn-success`/`btn-danger` approve/reject — a distinct severity-action vocabulary, not this hierarchy), and in-step form saves nested inside sub-editors (e.g. the category-config/defaults variable editor's Save/Cancel) which aren't step-progress actions.
- **Popover shadow:** floating panels anchored to a trigger (rules toggle, variable dropdown, row-actions menu, the leaderboard's set-time info popover) use `$shadow-md` uniformly. **Exception:** `game-page.module.scss`'s `.heroCover` (the 96×128px game-art thumbnail sitting directly over the blurred ambient hero backdrop) keeps `$shadow-lg` — it isn't a popover, and needs the heavier lift to read as a distinct object against the busier background behind it.
- **Overlay motion + elevation (`_board.scss`'s `board-overlay-enter` mixin):** every overlay enters like it came from its trigger — 160ms `cubic-bezier(0.4, 0, 0.2, 1)` (200ms for slide-in drawers), enter-only (exit is instant, no animation), `prefers-reduced-motion: reduce` disables it. One reduced-motion guard, written once, inside the mixin. Stacking order is a single decision in `_design-tokens.scss`'s z-scale, not a per-component guess: `$z-sticky` (20, sticky bars) < `$z-popover` (30, popovers/dropdowns) < `$z-drawer` (40, slide-in drawers) < `$z-dialog` (1055, matches Bootstrap's `.modal` default — BoardDialog).

## Components

- `console.module.scss` — shared console styles: `.shell`, `.sidebar`, `.navGroup`, `.navItem`/`.active`, `.surface`, `.severitySpine`/`--high`/`--med`/`--low`, `.time` (mono tabular), `.metaRow`, `.actionRow`, `.empty`.
- `styles/_board.scss` — shared board vocabulary (board-surface, board-table, board-rank, mono-time, board-eyebrow, control-pill, board-pill, board-input-rules, board-empty/-icon/-title, board-stepper + board-step-num/-current/-current-num/-done/-done-num, board-error-alert, board-dialog-header/-title/-body/-footer/-field-label/-textarea/-field-error/-btn-danger/-btn-warning, board-btn-primary, board-quiet-link). All games-v2 module.scss files compose these instead of hand-copying.
- Sidebar item = icon + label + optional count badge; active = green left accent + tinted bg.
- `shared/back-link.tsx` (`BackLink`) — the one up-navigation pattern: `{ href, label }`, quiet-link tier + leading `ArrowLeft` (react-bootstrap-icons), eyebrow-adjacent sizing. Copy standard: "Back to leaderboard" on public surfaces (submit, manage-run header), "Back to console" on console sub-routes (roster, runner, wizard header).

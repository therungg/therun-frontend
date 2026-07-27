# Board masthead — implementation handoff

Date: 2026-07-27
Branch: `game-standings`, commits `be042752..8336035b` (18 commits)
Design: `2026-07-27-board-masthead-design.md` · Plan: `2026-07-27-board-masthead-plan.md`

Nine planned tasks plus a cross-cutting fix wave. Every task passed a scoped review; the whole-branch review returned "ready to merge with fixes", those fixes were made, and the scoped re-review of them came back clean.

## Nothing here has been seen rendered

No agent could reach the board page — `/games-v2/[game]` requires an admin session. Every line of this was verified by typecheck, lint, Sass compile, unit tests and code reading. **A browser pass is required before merge**, and these are the places most likely to be wrong on screen:

1. **Light-theme rail contrast.** The recessed well is `#e6e9e6` against a `#eee` rail zone — about 1.05:1. The recess reads almost entirely off its border and inset shadow, not the fill. If it looks flat, darken `--board-recess-bg` / `--board-recess-strong-bg` in `app/(new-layout)/styles/_overrides.scss` to roughly `#dfe3df` / `#d2d7d2`. Dark mode (`#0d0f0d` / `#080a08` against `#1C221E`) was computed as fine.
2. **The sticky bar's appearance on scroll.** It mounts and unmounts via conditional render, so each flip inserts or removes real flow height at the plate/table boundary. Whether that reads as a jump depends on browser scroll anchoring. Check with reduced motion both off and on.
3. **The endcap row-height invariant, under load.** Find a game with a group of 12+ categories and confirm the wrapped well keeps its endcap label centred, with no dead space above or below the chips.
4. **The skeleton-to-content swap.** Computed at ~166px skeleton against ~174px real, both cover-bound. Throttle the network and watch for a jump.
5. **Emblems.** They render only when *every* category in a group has one. Worth seeing a mixed game to confirm the all-or-nothing rule looks deliberate rather than broken.

## Known gaps, accepted

- **`RulesPanel` has no sticky-bar counterpart.** The design's decision 6 lists four utilities in the bar; three are there (verified toggle, filters, WR history). Noticed during the final re-review, outside the fix wave's scope. Decide whether the bar should carry Rules too.
- **`system.md`'s motion rule** still describes a "hero fade-up" load-in. The final review confirmed no such keyframes exist and never did within this work's scope. One-line correction outstanding.
- **`needs-attention.module.scss:430`** still cites the old "sticky control band" glass rule by name. Comment-only.

## Deferred minors, triaged by the whole-branch review as safe to ship

- `data.ts` — the deep-page WR refetch runs sequentially after the main `Promise.all`; joining it (guarded on `page !== 1`) would save a round trip for deep-linked pages. The adjacent `boardResult.ok` guard is redundant with `resolveWrEntry`'s own empty-board check.
- `board-identity.ts` — a redundant `.slice()` before `.sort()`; `.filter(Boolean)` would also drop a legitimately-empty selected value, unreachable in practice.
- `category-rail.tsx` — chip labels read "1 runners" with no pluralisation; no live-region announcement when a collapsed group expands.
- `masthead.module.scss` — `.chipEmblem` is 17px, off the avatar token scale (nearest is 20px); `.tier`'s hairline uses a bespoke 0.35 opacity where 0.4 is the house value.
- `subcategory-pills.tsx` / `active-filter-chips.tsx` — both hand-roll the same block/endcap/well shape. A small `RailGroup` wrapper would stop the copies drifting.
- `switch-board-popover.tsx` — duplicates `category-rail.tsx`'s URL-mutation logic verbatim rather than sharing it; nothing enforces that edits to one follow the other. Also lacks the rail's "No categories enabled for this group" empty-state fallback.
- `board-masthead.tsx` — the "World record" eyebrow relates to its value by DOM order alone; a `<dl>` pairing or an `aria-label` would make it explicit.
- `.rulesToggle` still composes `control-pill` while its siblings in the same utilities row compose `board-chip` — two near-identical mixins side by side.
- `--board-recess-*` have no `:root` fallback, unlike Bootstrap's own convention. Safe today because next-themes stamps `data-bs-theme` before first paint.
- `loading.module.scss` has no responsive breakpoints at all, so it does not mirror the hero row's wrap below 992px. Pre-existing.

## Plan defects found during execution

Recorded because they are the plan's failures, not the implementers':

1. Rail recess colours were specified as raw `rgba(0,0,0,X)` literals, which break in light mode. Ruled and fixed mid-flight; the first replacement formula then inverted in dark mode and needed a second round. Resolved with named per-theme `--board-*` custom properties.
2. `BoardMasthead` was specified to pass `subcategoryKey=""`, silently breaking the submit CTA's subcategory preselection on every board.
3. The plate was specified with its own `<h1>` while `GameHero` already rendered one unconditionally — two `<h1>`s on the board page.
4. Coexistence of the plate's and the sticky bar's duplicate controls was never considered; an open popover kept a document-level Tab trap alive off-screen.
5. The loading skeleton's markup merged two stacked blocks into one flex row, making it text-bound rather than cover-bound and undershooting the real height by 25–40px.
6. The sticky bar's "Switch board" popover, specified in design decision 6, was omitted from the plan entirely — so every per-task review, which checked code against the plan, was structurally unable to catch it.

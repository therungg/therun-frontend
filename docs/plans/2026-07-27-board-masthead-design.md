# Board masthead + category rail redesign

Date: 2026-07-27
Surface: `app/(new-layout)/games-v2/[game]/` — the public leaderboard board page, and the shared `GameHero`.

## Problem

Two complaints, one root cause.

The game hero is a bare block with a bottom hairline (`game-page.module.scss` `.hero`) sitting on a page where everything below it — the sticky glass control band, the plaque cards, the rail panels — is a contained surface. The most identity-carrying element on the page has the least definition.

The control band looks bland. It isn't under-decorated, it's **under-ranked**. When the header redesign (`35b1b93f`) stripped category information out of the hero, the band silently became the board's title bar but kept its utility-strip styling: category switching, the board's primary navigation axis, renders at exactly the same weight as "WR history", and the only signal of which board you are looking at is a 10%-opacity tint on one pill.

## Shape of the answer

One **plate** — a single bordered, faintly tinted surface — holding a condensed game line, the category as the page's headline, and a rail of category chips as its floor. The plate is not sticky; a slim glass bar sticks instead.

```
┌──────────────────────────────────────────────────────────────┐
│ ← All categories                                             │
│ ┌────┐                                                       │
│ │art │  Super Mario 64                        [Submit a run] │
│ └────┘  1996 · N64 · Nintendo · 1,204 runners · 88,412 att.  │
│                                                              │
│  CATEGORY EXTENSIONS                          WORLD RECORD   │
│  Bowser 1 · Mario                              1:12.430      │
│  38 runs on this board                             Kanno     │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────┬───────────────────────────────────────────────┐ │
│ │ MAIN     │ [Any%] [16 Star] [70 Star] [120 Star]         │ │
│ ├──────────┼───────────────────────────────────────────────┤ │
│ │ EXTENSIONS│ [Bowser 1] [Bowser 2] [All Coins] [▸Memes 6] │ │
│ └──────────┴───────────────────────────────────────────────┘ │
│ ──────────────────────────────────────────────────────────── │
│ ┌──────────┬───────────────────────────────────────────────┐ │
│ │ CHARACTER│ [Mario] [Luigi] [Yoshi] [Wario]               │ │
│ └──────────┴───────────────────────────────────────────────┘ │
│                    Verified only │ Filters │ Rules │ WR hist │
└──────────────────────────────────────────────────────────────┘
```

## Decisions

### 1. Two hero densities

`GameHero` currently renders on three surfaces with different jobs and gives all of them the same treatment.

| Surface | Subject | Treatment |
|---|---|---|
| Category wall (`overview-page.tsx`) | the game | **Full** spec-sheet hero, unchanged |
| Standings (`standings/page.tsx`) | cross-category standings | **Full** hero, unchanged |
| Board page (`game-page.tsx`) | the category board | **Condensed** — inside the plate |

On a board page the game is context and the category is content, so the game drops to a 56px cover and one facts line, and the category becomes the headline. This buys back roughly 100px above the first run time, which today costs ~320px of chrome.

Implementation: a `variant?: 'full' | 'condensed'` prop on `GameHero`, or a separate `BoardMasthead` composing the shared facts helpers. The condensed variant takes the board-line props (category, counts, WR); the full variant ignores them.

### 2. The board line

Three zones on one row:

- **Eyebrow** — the group name, repeating the rail's endcap label so the current board's group is always stated. Present only when group chrome is (2+ groups in use, per `computeCategoryVisibility`); otherwise the headline starts the block.
- **Headline** — `selectedCategory.display`, plus active subcategory values appended in lighter weight (`Any% · Mario · No Major Skips`). That string is the board's real name and is what the WR beside it refers to.
- **Meta** — `{leaderboard.totalItems} runs on this board`. Uses `totalItems`, so it describes the *filtered* board, matching the WR.
- **Record** — right-aligned: `WORLD RECORD` eyebrow, time in `$accent-gold` `mono-time`, holder below.

### 3. The crown stays in the table

The header record is a quiet spec line. The gold-washed rank-1 row and its verified-only `WR` chip stay exactly as the crown redesign shipped them. Two appearances in two registers: the header *states the bar*, the table *is the run*.

### 4. Category rail — inset wells with endcaps

One block per group. Each block is a recessed well holding that group's chips, with the group name in a darker endcap welded to its left edge. Membership is structural, not typographic: the chips are physically inside the panel that carries the name.

**Chip** (`role="button"`, `aria-pressed`): flat and transparent at rest against the recessed well, `--bs-secondary-color`; hover raises a faint tint; **active is a solid `--bs-primary` fill**, white text, `inset 0 1px 0 rgba(255,255,255,.15)` and a soft drop shadow. The confident filled active state is the single biggest departure from today's 10% tint and the main reason the band read as bland.

**Chip numeral**: each chip carries `ResolvedCategory.uniqueRunners` as a trailing tabular-mono numeral at `$font-size-2xs`, ~50% opacity, with an accessible `N runners` label. Free from data already loaded; supplies the density that makes the control read as a leaderboard instrument rather than a nav bar.

Note the deliberate unit mismatch: the chip numeral counts **runners**, the board line's meta counts **runs** (`totalItems`). Per-category run totals aren't available without a request per category. Both are labelled in full where they appear, and they never sit adjacent.

**Endcap**: fixed width (≈148px), group name only — no count — in engraved uppercase (`board-eyebrow` weight, `text-shadow: 0 1px 0 rgba(0,0,0,.7)`), flush left, vertically centred. Names longer than the cap wrap inside it; the cap never widens, so the cap/well seam is one unbroken vertical line down the whole rail.

**Layout invariant** — write this into the CSS, it is what prevents the whole class of bug found during design:

> The endcap never determines the row height. The chips set it, and the cap centres its content within whatever they need. The chip container fills the well and centres its rows, so no dead space can pool above or below in either direction.

**Collapsed groups** (`hiddenByDefault`): render as a single dashed chip `▸ Name 12` in place of the group's block, expanding in place. Auto-expands when it holds the active board — the contract `category-pills.tsx` already implements. The count lives here because a collapsed group has no expanded panel to make its size visible.

**Trivial case**: `computeCategoryVisibility` already flattens a single group to one unlabelled section. That section renders as a well with no endcap. Most games never see group chrome at all.

### 5. Overflow: wrap, deliberately

A group's chips wrap to as many rows as needed. 30 categories is roughly 3–4 rows (~120–150px) at desktop width. No horizontal scroll, no "+N more", no measurement code. Keeping a board's category count sane is the moderator's job, and the category wall already exists as the browse-everything surface.

This is only affordable because of decision 6.

### 6. The plate scrolls; a slim bar sticks

Today the entire multi-row band is `position: sticky`, so a three-group game pins three rows of pills to the top of the viewport for the length of a hundred-row board. Remove sticky from the plate entirely.

In its place, a single-row glass bar (`board-glass`, `$z-sticky`): cover thumbnail, board name (`Any% · Mario`), a `Switch board ▾` popover reusing the rail's grouped content, then the four utilities. Height is bounded regardless of category count — which is what makes wrapping and endcaps affordable above.

Revealed by an `IntersectionObserver` on a zero-height sentinel placed at the plate's bottom edge; hidden by default, so no-JS renders the plate only, which is acceptable for an enhancement of this kind.

### 7. Subcategory tier

Below a full-width hairline inside the rail, using the **identical** endcap+well anatomy — one block per `role: 'subcategory'` variable, endcap carrying the variable name, well carrying its value chips. Choosing a Character is the same kind of act as choosing a board, so it uses the same control.

Active `role: 'filter'` chips (`ActiveFilterChips`) get their own block with an `ACTIVE` endcap, keeping the removable-chip behaviour.

The four utilities — verified toggle, Filters popover, Rules, WR history — move out of the category row to the rail's bottom-right, behind hairline separators. They stop competing with navigation.

### 8. Responsive

Below 768px the group block stacks: the endcap becomes a full-width label row above its well rather than a 148px left column. Below 992px the condensed game line drops to a 40px cover and the actions wrap under it, following the existing hero breakpoints.

## Data

Everything the board line needs is already loaded, with one exception.

| Field | Source | Cost |
|---|---|---|
| Run count for this board | `leaderboard.totalItems` | free |
| Per-chip runner count | `ResolvedCategory.uniqueRunners` | free |
| WR entry (page 1) | `leaderboard.entries[0]` | free |
| WR entry (page > 1) | page-1 refetch | one cached call |

The deep-page refetch is the block deleted in `e1e58060`; reinstate it verbatim. It routes through the cached `getLeaderboard`, so it is never a fresh hit and never a client waterfall, and it only runs on a deep-linked later page.

**Not doing:** a WR time on every chip. Per-category records cost one request each (`fetchCardEntries` in `overview/data.ts`) — fine for the wall's cards, not for a 26-chip rail.

**Not doing:** a "last PB 2 days ago" line. `leaderboard.entries` is time-sorted, so page 1 does not contain the most recent run, and `recentPbs` is a game-level capped list that may not include the selected category at all. There is no cheap honest source; the meta line is the run count only.

## Explicitly rejected

- **Ambient/blurred cover art behind the masthead.** Rejected twice before (2026-07-22, 2026-07-23). Presence comes from scale, type, spacing, containment and the gold accent.
- **Per-game accent theming.** The customizations jsonb is `{}` everywhere and wiring it was previously declined.
- **Underlined tabs.** They only work as a single row; once the rail wraps, the active underline sits on an interior baseline and stops reading as a tab. Incompatible with decision 5.

## Knock-on work

1. **`setup/steps/category-band-preview.tsx`** imports `bandRow`, `bandRowSub`, `pill`, `pillActive`, `groupLabel` from `game-page.module.scss` to mirror the public band from unsaved wizard state. It must be updated in lockstep or the preview silently stops resembling the thing it previews — which is the exact failure it exists to prevent.
2. **`loading.tsx` / `loading.module.scss`** mirror the current hero geometry so content lands without shifting. Reshape to the plate.
3. **`.interface-design/system.md`** signature #4 still describes an ambient-art hero with a monumental gold WR that no longer exists and is not coming back. Replace with the plate/rail vocabulary. Also add the endcap and the row-height invariant to the components list.
4. **`board-glass` usage note** in system.md: the sticky control band is listed as a sanctioned glass surface. The glass moves to the slim stuck bar; the plate is a normal board surface.

## Accessibility

- Chips stay `<button aria-pressed>`, not tabs — they are URL navigations, and `aria-pressed` already carries optimistic state during a pending nav.
- Each group block is a `<div role="group">` labelled by its endcap via `aria-labelledby`, so the group name is announced with its categories rather than being decorative text.
- The whole rail keeps `<nav aria-label="Category">` and `aria-busy` during pending navigation.
- The stuck bar is `aria-hidden` while collapsed so its duplicate controls never enter the tab order twice.
- Focus-visible rings on chips follow `control-pill`'s existing ring; the solid active chip needs a ring that reads against `--bs-primary`.

## Resolved while writing (each reversible in one line)

1. **Category emblems in chips: yes, but all-or-nothing per group.** A group renders emblems only when *every* category in it has an `imageUrl`; otherwise that group's chips are text-only. `CategoryEmblem` renders nothing when absent (Joey's call, 2026-07-22), so a per-chip rule would produce a ragged mix of chips with and without art inside one well — the exact inconsistency this redesign exists to remove. Deciding per group keeps every row internally uniform while still rewarding moderators who set the full set. Emblem size ~17px, leading, inside the chip.
2. **Chip numerals: included**, as specced in decision 4.

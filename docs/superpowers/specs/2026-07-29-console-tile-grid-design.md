# Console tile grid — design

**Date:** 2026-07-29
**Branch:** `console-tile-grid` (stacked on `console-drop-url-slug-item`)
**Status:** design approved, not yet implemented

## Problem

The admin console sidebar is eleven terse nouns — "Browse runs", "Bans",
"Groups", "Merge games & categories" — with no explanation anywhere in the
product. A newly-added moderator lands on Needs attention and has no way to
learn what the other ten items do, or which one solves the problem they came
with, short of clicking every one and inferring from what renders.

Nothing in the app currently answers "here's what you can do as a mod."

## Solution

A tile grid at bare `/manage`: one tile per console section, each with a
task-framed title and a sentence of explanation. The sidebar stays exactly as
it is; the grid is an additional surface, not a replacement.

## Decisions

Recorded with the rejected alternatives, because several were close calls.

### The grid is the front door for everyone

Bare `/manage` always renders the grid. Rejected: showing it only to first-time
mods, or only when the attention queue is empty.

The cost is real and was argued at length: moderators are daily users clearing a
queue, and this charges every one of them a click on every visit to solve a
problem that occurs once per mod per board. The accepted mitigation is a
**per-user setting to skip the grid**, deferred to a follow-up (see below). That
converts a permanent tax into an opt-out, which is what made the trade
acceptable.

The counter-argument that carried the decision: an explicit front door is
predictable. The same screen every time builds muscle memory for where things
live, whereas "the grid appears under some conditions" is fuzzier to reason
about, both for mods and for us.

### Tile labels are verbs; the sidebar keeps its nouns

One inventory, two label sets. `CONCEPT_TILE` sits beside `CONCEPT_LABEL` in
`src/lib/console/vocabulary.ts`, which exists precisely to stop the wizard and
console vocabularies from drifting apart — this is the same mechanism applied
again.

Rejected: a separately curated task-framed tile list. It answers the question
better in principle but creates a second inventory that can drift from
`nav-model.ts`, and the permission filtering would have to be reimplemented.

### Counts only where something is waiting on a human

Needs attention and Moderators carry a number. Nothing else does.

Both values are already in the shell (`attentionItems.length`, with the existing
90-second live poll; `modApplications.length`). No new fetching.

Rejected: counts on everything countable. Inventory numbers and urgency numbers
render identically on a tile — "12 categories" and "7 runs waiting" look the
same but only one is a task. A number on a tile should mean "act on this".

### Reports gets no tile

`Reports` is not a real pane: `handleNavigate('reports')` lands on the attention
pane pre-filtered by `?kind=report`. Two tiles leading to the same pane, one a
filtered view of the other, is exactly the confusion tiles exist to remove. The
attention tile's blurb mentions reports instead.

The sidebar keeps its Reports item unchanged. This is a deliberate 1:1 break
between sidebar and grid — the only one.

### The lastPane write survives; only the read is deleted

The per-game `console:<id>:lastPane` memory is no longer consulted, since bare
`/manage` now always resolves to the grid. But the deferred skip setting has to
skip *to* somewhere, and "wherever you left off" is the likely answer — so the
write effect stays, commented as deliberately unread until that lands. Six lines
of insurance against re-deriving a hydration-safe bootstrap later.

## 1. Routing and landing behavior

`activeItem === null` becomes a real state rather than a fallback.

- `resolveInitialPane()` returns `null` when there is no `?pane=`. A valid
  `?pane=` deep link still wins outright and lands directly on that pane. The
  `storedPane` parameter drops from the signature.
- Delete the lastPane **read**/bootstrap effect (`console-shell.tsx:145-167`)
  and the `isRetiredPaneId` purge (`:124-129`), which only existed to keep that
  read honest. Keep the **write** effect (`:174-180`) per the decision above.
- Delete `defaultItem()` from `nav-model.ts`. It is confined to that file and
  `nav-model.test.ts`; nothing else imports it.
- `showSetupCard()` loses its `activeItem === defaultItem(groups)` arm, which is
  meaningless once no viewer has a default landing pane. It becomes: true on the
  grid, true on any Board-group pane. A half-configured board therefore still
  nags on the front door, which is the intent.
- `isLandingPaneId()` and `NON_LANDING_IDS` stay — they still validate `?pane=`
  deep links.
- `/manage/moderation` (`moderation/page.tsx:40`) redirects to bare `/manage`
  instead of `?pane=attention`. Its permission gating is unchanged: non-mods
  still get `ModDoor`, not the grid.
- The chrome header's game title (`console-chrome.tsx:107`) becomes a link to
  `/games-v2/[game]/manage` — the app-logo-goes-home convention. **Without this
  the grid is unreachable after the first click** except via browser Back. The
  chrome is shared with the moderation sub-route pages, so they inherit the same
  door.

Browser Back already works unmodified: `handleNavigate` pushes, so grid → tile →
Back returns to the grid.

## 2. Tile inventory

Ten tiles, same two groups, driven by `buildNav(flags)` so permission filtering
is inherited with no new logic. Icons are the existing `NAV_ICON` entries.

### Moderate

| Tile | Blurb |
|---|---|
| **Review what's waiting** ⁽ⁿ⁾ | Runs flagged for review, reports from runners, and people asking to moderate this board. |
| **Look up a run or runner** | Search every submitted run, check a runner's history, and act on anything you find. |
| **Manage banned runners** | See who's banned from this board and why, and lift a ban. |
| **See what mods have done** | Every moderation action on this board — who did it, when, and undo. |

### Board

| Tile | Blurb |
|---|---|
| **Set the board up step by step** | The guided walkthrough for configuring this board from scratch. |
| **Edit the game's details** | Cover art, release info, the board's URL, and how it's matched to IGDB. |
| **Configure categories** | Add and edit categories, set timing, proof and minimum-time rules, and pick what's featured. |
| **Sort categories into groups** | Bundle related categories so the leaderboard reads in a sensible order. |
| **Manage who moderates** ⁽ⁿ⁾ | Add or remove moderators, and review applications from people who want to help. |
| **Merge duplicates** | Fold a duplicate game or category into the right one and move its runs across. |

⁽ⁿ⁾ carries a count.

The attention count must reuse the existing badge logic verbatim, including the
degraded-source `+` and `!` handling (`console-sidebar.tsx:85-109`) — extract
that badge into its own component consumed by both sidebar and grid, so the two
cannot drift.

## 3. Structure and visuals

- New `console/tile-grid.tsx`, rendering `NavGroup[]` → tiles.
- `NAV_ICON` moves out of `console-sidebar.tsx` into `console/nav-icons.ts` so
  the grid and sidebar share one icon set.
- New `console/attention-badge.tsx` — the extracted count badge.
- `content-router.tsx` gets a `case null` returning `<TileGrid>`. This replaces
  the current `default:` placeholder ("Select an item from the sidebar"), which
  is a dead end that already concedes the front door is empty.
- Tiles are `<button>`s calling the same `onNavigate` the sidebar calls. History
  therefore still opens as a drawer and Setup still leaves the console — no new
  navigation paths, and no chance of the two surfaces behaving differently.
- Layout: `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))`, group
  headers reusing `styles.groupLabel`, each tile an icon, an action title, and a
  two-line blurb.
- Visual weight stays in the console's own flat idiom. Explicitly **not** the
  overview `plaque` cards: those are heavy because they carry world-record times
  and podium rows, and tiles carrying one sentence at that weight would read as
  ten empty boxes.

## Out of scope

**Per-user "skip the grid" setting.** Agreed as a follow-up, not part of this
build. When it lands it will most likely skip to the viewer's last pane, which
is why the lastPane write is being preserved.

## Files touched

| File | Change |
|---|---|
| `console/tile-grid.tsx` | new |
| `console/nav-icons.ts` | new — `NAV_ICON` moved here |
| `console/attention-badge.tsx` | new — extracted from sidebar |
| `console/console-sidebar.tsx` | import icons + badge instead of defining them |
| `console/console-shell.tsx` | drop lastPane read + retired-pane purge; keep write |
| `console/console-chrome.tsx` | header title links to bare `/manage` |
| `console/content-router.tsx` | `case null` → `<TileGrid>` |
| `console/nav-model.ts` | delete `defaultItem`; simplify `resolveInitialPane`, `showSetupCard` |
| `console/nav-model.test.ts` | drop `defaultItem` tests; update the others |
| `src/lib/console/vocabulary.ts` | add `CONCEPT_TILE` |
| `manage/moderation/page.tsx` | redirect to bare `/manage` |

## Testing

Unit tests in `nav-model.test.ts`:

- `resolveInitialPane` returns `null` for a bare URL, for an unknown `?pane=`,
  and for a `?pane=` the viewer lacks permission to see.
- `resolveInitialPane` returns the requested pane for a valid deep link.
- `showSetupCard` is true for `null` and for Board-group panes, false for
  Moderate-group panes.

Manual checks:

- A moderator with no configure rights sees only the four Moderate tiles.
- The History tile opens the drawer over the grid and leaves the URL alone.
- The Setup tile leaves for `/setup`.
- The attention count on the tile matches the sidebar badge, including the
  degraded state.
- The header title returns to the grid from a pane and from a moderation
  sub-route page.

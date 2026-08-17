# Board sidebar audit (games-v2)

**Status (2026-08-17): implemented on branch `board-rail-redesign`**, except Your runs `#rank of N` (deferred by Joey) and the backend handoffs in stage 4 (PB rank on the feed, category-scoped fetch).

Date: 2026-08-17. Scope: `app/(new-layout)/games-v2/[game]/sidebar/*` as rendered on the
category wall, board view, standings and stats routes. Reviewed from source plus a
screenshot of the SM64 wall (Live now / Your runs / Recent PBs / About).

## Verdict

The sidebar is a stack of six-to-nine identical boxes. Each one is fine on its own; as a
column they have no hierarchy, no relationship to what's in the main column, and they
under-use the data they already hold. The main column earned its "premium-competitive"
register through scale, type and containment. The rail never got that pass: same eyebrow,
same padding, same row template, same weight, top to bottom. It reads as a widget column
from a CMS theme sitting next to a designed leaderboard.

Three things fix most of it:

1. **Give it a job per zone.** Pulse (what's happening now) → You (your standing) → Trust
   (who runs this, what this game is). Zones get different weight; the trust zone loses its
   boxes.
2. **Scope it to the screen.** On a board, Live and Recent PBs default to *this board* with
   an "all boards" switch. Today the rail is game-wide everywhere except one stats panel.
3. **Show the numbers we already have.** Rank of your run out of N, live current time and
   PB pace, PB rank on the board (backend). Rows currently show name + one number and hide
   the rest.

---

## Questions the audit set out to answer

### 1. What is the sidebar for? Does each panel earn its place?

The main column is *the record*: ranks, times, static. The rail should be *the pulse* and
*your relationship to the record*. Judged on that:

| Panel | Earns place? | Note |
|---|---|---|
| Live now | Yes, top of rail | Under-shows data, doesn't update (see 3) |
| Races | Yes | Rare; fine |
| Board stats (board view) | Marginal | Duplicates the masthead's category name; four numbers nobody acts on |
| Your runs | Yes, but should be higher | Signed-in runner's own standing is the single most personal fact on the page; it's third |
| Recent PBs | Yes | Best panel in the rail; needs board scoping and rank |
| Series | Yes | Fine, dormant until backend |
| Moderators | Yes (trust) | Should not be a full panel |
| About | No, not as-is | IGDB marketing copy ("Mario is super in a whole new way!") clamped at 6 lines with no expand. Wrong register at the foot of a competitive board |
| Claim CTA | Yes | Fine |

### 2. Is there visual hierarchy? Where does the eye land?

Nowhere. Every panel is `board-surface` + `board-eyebrow` + `font-size-sm` rows. Every
list uses the same two-line `pbRow`. The only visual accents are the green live dot, the
blue "−5.7s" deltas and, loudest of all, the amber-outlined `PENDING` pill in Your runs.
The one thing that shouts is a status badge on the reader's own unverified run.

Also two eyebrow patterns coexist: `panelHead` (flex row + hairline underline: Live, Races,
About) versus `d-block mb-2` (Your runs, Recent PBs, Board stats, Moderators, Series). Same
column, two heading treatments.

### 3. Does "Live now" behave like it's live?

No.
- `useSWR` with no `refreshInterval`: it fetches once and revalidates on tab focus. A row can
  say "PSS (3)" for ten minutes.
- No sort by importance/rank; rows come back in whatever order `/api/live` returns.
- Rows between attempts (reset / not started) show only name + category, so 3 of 5 rows in
  the screenshot look dead. There's no "idle" cue to say the timer is between runs.
- Data on `LiveRun` the panel throws away: `currentTime`, `pb`, `delta` sign as "on PB pace",
  `bestPossible`, `currentlyStreaming`, `currentPrediction`. Current time + PB pace is what a
  viewer wants from a live row: *"1:04:12, −18.4s vs PB, on pace for sub-1:35"*.
- Category is the raw LiveSplit string ("70 star", "16 Star", "All Red Coin Stars"), not
  matched to a board, so it can't link to one and casing is inconsistent.
- Name is a raw `<a target="_blank">`, not `UserLink`, so no hover card and it pops a new tab
  where every other name in the rail navigates in place.

### 4. What crucial data do we have and not show?

Already in the frontend types, unused:

| Where | Field | Show as |
|---|---|---|
| Your runs | `UserRanking.rank` + `totalRunners` | `#12 of 680` — today `#12` and nothing when pending |
| Your runs | `runDate`, `vodUrl` | date on the meta line; VOD glyph |
| Your runs | `primaryTiming` + `gameTime` | the second clock, when the board shows both |
| Live now | `currentTime`, `pb`, `delta`, `bestPossible`, `currentlyStreaming`, `currentPrediction` | current time, PB pace, stream dot |
| Recent PBs | `previousPb` | shown as −5.7s, but only when improved; a first-ever PB says nothing ("first PB" is worth saying) |
| Board stats | `totalFinishedAttemptCount` | finish rate is a title tooltip; it's the more interesting number |
| GameMetadata | `platforms`, `releaseYear`, `companies`, `genres` | the About panel should be these, not the blurb |

Needs backend:
- **Rank the PB landed at** (`RecentPb` has no rank). "retroswan 57:06 → #14" is the fact
  that makes a PB feed worth reading; without it the panel is a list of times with no
  standing. Handoff: add `rank` (and `isTop10`/`isWr` derivable) to the finished-runs feed.
- Recent PBs scoped by category id (frontend can filter today since `categoryId` is on the
  row, but the fetch is game-wide with a fixed page size, so a busy game starves quiet
  boards).

### 5. Does the rail react to context (wall vs board vs standings)?

Only `BoardStatsPanel` does. Recent PBs stays "all boards" everywhere and defends that with
an eyebrow suffix; Live is game-wide everywhere. On a 120 Star board a 16 Star PB row is
noise. Default to *this board* on board view (both Live and Recent PBs), keep "all boards"
one click away, and drop the eyebrow qualifier.

### 6. Is the sticky rail correct?

No. `.rail { position: sticky; top: 5rem }` on the whole aside. With 5+ panels the aside is
taller than the viewport, so it pins at the top and everything below the fold
(Moderators, About, claim link) is unreachable until the main column runs out. On a
long board that's several screens. Options: sticky only the top zone (Live + Your runs),
let the rest flow; or `max-height: calc(100vh - 5rem); overflow-y: auto` on the aside.

### 7. Mobile (<992px)?

The grid collapses to one column and the rail drops *below* the main column, i.e. under a
100-row leaderboard. Live and Your runs are invisible on a phone. Your runs at minimum
should surface above the board on narrow screens (one compact strip); About/Moderators can
stay at the foot.

### 8. Accessibility?

- Panels are `<section>` with a `<span>` eyebrow. No headings anywhere in the rail, so no
  landmark navigation. Eyebrows should be `<h2>` (styled the same).
- Live rows: progress bar has aria; the pace delta's meaning is title-only.
- `PENDING`/verification badge is icon + text, fine.

### 9. Copy (voice rules, system.md)

- "Recent PBs · all boards", "Category: 120 Star" — qualifiers doing structural work the
  layout should do.
- "No one is live for this game right now." → "No one live." One fact, stop.
- Race status "open entry" / "in progress" fine.
- About: IGDB blurb violates every voice rule at once; it's not our copy, so replace, don't
  edit.

---

## Defects seen in the screenshot

- **Your runs shows raw slugs**: "70 Star · nintendo64". `parseSubcategoryKey` yields
  key/value pairs and the panel prints `p.value` — the slug, not the display value.
  Should say "Nintendo 64" (resolve through the board's subcategory defs, as the board
  itself does).
- **Two identical pending rows** "70 Star" and "70 Star+" both 53:59 PENDING. Either the same
  run is ranked under two categories or 70 Star+ genuinely has an identical time. Worth
  checking `getUserRankingsByName` before assuming it's right.
- **Live categories mixed-case** ("70 star" vs "70 Star") — raw LiveSplit input, see 3.
- **About clamped mid-sentence** with no affordance to read the rest.
- **PENDING pill dominates** the panel; a quiet amber word would do.

## System.md violations (mechanical)

- `sidebar.module.scss:273` `.paceBehind { color: var(--bs-red) }` — one-red rule says
  `$accent-red`.
- Off-grid magic numbers: `.row padding-block: 2px`, `.statList gap: 2px`, `.yourRunHead
  margin-bottom: 2px`, `.progressTrack margin-block: xs 4px`, `.seriesArt 24×32` (fine as a
  3:4 cover but not on the avatar token scale), `.pbTiming margin-left: 0.3rem`.
- Bootstrap utilities used as design (`text-muted small`, `d-block mb-2`,
  `text-decoration-none`, `list-unstyled mb-0`) where the system wants module tokens.
- `about-panel.tsx` inline `clampStyle` with a stale "fold in later" comment.
- Moderators rows have no avatar; every other person row in the rail does. Same person,
  three row templates (Live: `RunnerAvatar` + raw `<a>`; PBs: `RunnerAvatar` + `UserLink`;
  Mods: `UserLink` only).
- Two heading patterns (`panelHead` vs `d-block mb-2`).

---

## What to add, what to remove, what to restyle

### Remove
- The About blurb as a text panel.
- "Category: {name}" eyebrow on Board stats (the masthead already says it) — either fold
  Board stats into the masthead facts line or keep it as a two-number strip (on the board /
  finish rate).
- The "· all boards" qualifier once scoping exists.
- Moderators as a boxed panel → a one-line "Moderated by a, b, c +5" in the trust foot.

### Add
- Live: current time (mono), PB pace (green when ahead), stream indicator, `refreshInterval`
  ~15s (or the WS bucket the live page already uses), sort by importance, "idle" cue for
  reset rows, board link when the category matches a board, `UserLink` for the hover card.
- Your runs: `#rank of N`, run date, second clock, link to the row on the board (and
  highlight it), move the panel to the top when signed in.
- Recent PBs: board scoping toggle; rank on the board (backend); "first PB" when
  `previousPb === null`.
- Trust foot: platforms · release year · developer, moderators line, Discord/links if not in
  the masthead, IGDB link. Quiet, unboxed, at the bottom.
- Headings (`h2`) on every panel; mobile placement for Your runs + Live.

### Restyle
- Three zones with different weight: Pulse gets the panel surface and the live dot; You gets
  the surface plus a green left accent (it's *your* row, the same accent the board uses to
  highlight your row); Trust is unboxed text on the canvas with a hairline above.
- One row template for a person: avatar · name · right-aligned mono time; second line meta.
  Use it in Live, PBs, Your runs, Mods.
- Verification status as a quiet word in the meta line, not a pill.
- One eyebrow pattern (`panelHead`) everywhere; `h2`.
- Fix sticky (top zone only, or scrollable rail).

## Suggested order of work

1. Data-in-hand upgrades: Your runs rank/N + slug fix + pill → word; Live current time + pace
   + refresh + UserLink + sort. (Frontend only.)
2. Structure: three zones, trust foot replaces About/Moderators panels, one row template,
   h2 eyebrows, sticky fix, mobile placement.
3. Scoping: this-board default for Live and Recent PBs with an all-boards switch.
4. Backend handoff: `rank` on the recent-PBs feed; category-scoped recent-PBs fetch.

Each of 1–3 is a frontend branch on its own; 4 is a backend note.

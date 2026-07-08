# fast50 Stats Screen — Design

**Date:** 2026-07-08
**Status:** Approved design, pending implementation plan

## Context

therun.gg is pitching to provide live data for fast50 (Ludwig's speedrun event). The
centerpiece is a "purge weatherman"-style on-site presenter screen: before and after each
run, a presenter stands next to a big screen and walks viewers through stats about the
runner and the run. The goal is to mesmerize viewers who know nothing about the game.

A previous attempt at a per-runner stats display (`src/components/live/liverun-stats-panel.tsx`)
failed on all fronts: visually a website widget rather than a broadcast, generic stats with
no storytelling, and clunky to operate. The newer commentary drawer
(`src/components/live/commentary-drawer/`) solved the hard data problems (snapshot freezing,
Monte Carlo charts, bespoke SVG rendering) but its drawer-with-tabs form factor is not a
presentation. This design reuses its data techniques, not its UI.

### Constraints (from brainstorming)

- **Delivery:** on-site presenter screen, 1920×1080, driven by the presenter clicking
  through with keyboard/clicker. No operator console, no OBS overlay (possible later reuse).
- **Event format:** many games — each runner brings their own game/category. All runners
  use therun.gg, so full per-runner stat depth exists.
- **Live mid-run display is out of scope.** The screen covers pre-run and post-run moments
  only. (Live data is silently *captured* mid-run for post-run use — see Capture layer.)
- **Status: still pitching.** Priority is a stunning live demo driven by real therun.gg
  data for well-known runners. Production hardening and event-config integration come
  after the pitch lands.
- **Marathon reality:** PBs are essentially never beaten at marathon sessions. PB is a
  reference line, never the protagonist. The marathon-native stories are: "he gets exactly
  one attempt," "will the run survive," and "how good was that, for a single attempt."
- **Viewer's-guide principle:** assume viewers know nothing about the run. Pre-run slides
  must teach them what to watch for — which split matters, roughly when it happens on the
  clock, and what the visual cue is — so the knowledge pays off during the run.

## Architecture

### Routes (all chromeless — no site header/footer)

- `/fast50/screen` — backstage picker: search any therun user, pick game/category, choose
  pre-run or post-run deck. Warns when a runner's data supports too few slides. Hosts the
  capture layer.
- `/fast50/screen/[username]/[game]/[category]?deck=pre|post` — the fullscreen deck.
  Directly linkable so decks can be prepared as browser tabs backstage; switching runner =
  switching tab.
- `/fast50/screen/demo` — cycles fixture decks; rehearsal and pitch tool.

### The RunnerDossier

One server-assembled object feeds everything. `src/lib/fast50/dossier.ts` (`'use cache'`,
`cacheLife('minutes')`) fans out with `Promise.allSettled` to existing endpoints and
returns a normalized dossier:

| Source (existing endpoint) | Contributes |
|---|---|
| `GET /users/{user}/{game}/{run}` | PB, SOB, attempts, finish rate, splits history, run history, playtime on category |
| `GET /live/{user}` | live snapshot (post-run tier 2): final splits, golds, Monte Carlo, backend `events[]` |
| `GET /games/{game}/{category}` | category leaderboards: runner's rank on PB/consistency/attempts |
| `GET /games/{game}/{category}/segments` | community split percentiles (p1–p99) |
| advanced user stats Lambda | playtime per day/hour maps, total playtime |
| `GET /users/{user}/streaks` | current/best streaks |
| activity/summary endpoints | recent form (last 7/30 days playtime, attempts, recent PBs) |

**No new backend work for the demo.** If fast50 confirms, a thin event config (runner list
via the existing `event_participants` table) can replace the manual picker — follow-up, not
part of this build.

### Capture layer (post-run data reliability)

The live-run object has a `removeAt` TTL and is deleted on reset/finish, so fetching
`GET /live/{user}` after the run is unreliable. Instead: while a run is underway, the
backstage picker page subscribes to that runner's websocket channel (existing
`useLiveRunsWebsocket(username)` hook) and persists the last-received `LiveRun` to
`localStorage`, keyed by user/game/category. No mid-run UI — just recording.

**Post-run dossier resolution order:**

1. Captured snapshot from localStorage — richest: final per-split times, deltas, golds,
   Monte Carlo history, backend `events[]` (gold split, best run ever, top-10% segment).
2. `GET /live/{user}` if the object still exists.
3. Uploaded run history — once the runner saves splits, the finished run appears in run
   history. Golds and per-split deltas are recomputable from history (the backend's
   wrapped code does exactly this — `getPbsAndGolds`). This tier is what makes the pitch
   demo work: post-run decks for *past* runs of real runners, no live event needed.

Each post-run slide declares the data tier it needs; the composer drops slides whose tier
is unavailable rather than rendering holes.

### Component architecture

- Slides are pure components — `<GrindSlide dossier={...} />` — rendering entirely from
  the dossier. Slides never fetch.
- `composeDeck(dossier, 'pre' | 'post')` returns an ordered slide list. The composer never
  renders.
- Both are unit-testable with fixture dossiers built from real runner data.

## Slide catalog

Every slide is one sentence the presenter can say out loud, with the screen making that
sentence hit hard. One huge number or one chart per slide, never both crammed together.
PB/SOB appear on the intro card and as faint reference lines on charts only.

### Pre-run deck (two anchors + top ~4 by score → ~6 slides per runner)

| Slide | The line it tells | Data |
|---|---|---|
| **Intro card** (anchor, always first) | "Next up: Runner, Game, Category" — avatar, game art, PB, country | dossier core |
| **The Roadmap** (anchor, always second) | The whole run as one horizontal timeline; split names as landmarks with wall-clock times from his average splits ("Water Temple hits around 0:48, final boss around 1:36"). Danger split glows red, gold-opportunity splits marked. The presenter walks the timeline like a weatherman walking a front across the map. | average split times (cumulative) |
| **The Grind** | "4,812 attempts. 379 hours of his life." — counter animates up, playtime heatmap fades in behind | attempts, playtime maps |
| **One Shot** | "At home, 94% of his runs die before the credits. Tonight he gets exactly one." | finish rate |
| **Danger Zone** | "If this run dies, it dies at Water Temple — around 48 minutes in, right after Fire Temple. If he's still ahead *after* Water Temple, you can start believing." States when it happens and the on-screen tell. | per-split reset concentration + stdDev, cumulative timing |
| **World Class** | "His Barrel Room is top 3% of everyone on therun.gg" — percentile bars vs the community | community segments p1–p99 |
| **The Profile** | "Finishes only 6% of runs he starts — full send, every time" vs "a machine: 71% finish rate" | finish rate, consistency score |
| **The Forecast** | "Expect around 1:42. Under 1:40 means something special is happening." — p10/p50/p90 bands from recent finished runs; PB and SOB as faint dream-lines | recent completions distribution |
| **Form Check** | "He's put in 42 hours these last two weeks" — recent activity sparkline, recent PBs | activity/summary + streaks |

### Post-run deck

| Slide | The line | Data tier |
|---|---|---|
| **The Result** (anchor, always first) | Final time, huge; delta vs his *typical* finish (not PB); "NEW PB" treatment in the rare case it happens | any |
| **Where It Lands** (emotional peak) | "First try, on stage, in front of a crowd — and it's a top-8% run of his 612 finished." — dot drops onto his all-time finished-run distribution | any |
| **Survived** | "That run passes Water Temple only 59% of the time. Tonight it lived." — pays off the pre-run Danger Zone setup | capture or history |
| **Gold Rush** | "2 golds tonight" — splits he'd literally never done faster, with time saved | capture preferred; recomputable from history |
| **Story of the Run** | Split-by-split delta chart — where it was won, where it nearly died | capture or history |
| **The Table** | "He left 1:12 on the table across 3 splits." — final vs best-possible per split | capture or history |
| **Zoom Out** | "That was attempt #4,813" — career counters tick up, tonight's dot appended to the timeline | any |

Pre-run and post-run decks form a narrative arc: Danger Zone sets up Survived; The
Forecast sets up The Result's "vs typical" delta. The presenter gets callbacks for free.

### The composer

Each slide exports `evaluate(dossier)` returning `null` (not applicable / data missing) or
`{ score, headline }`. Score measures how *remarkable* the stat is for this runner: The
Grind scores high only for genuinely huge attempt counts, Danger Zone only when deaths
concentrate on one split, World Class only with a real top-N% community segment. The
composer takes the anchor slides, then the top ~4 by score — a grinder's deck leads with
The Grind, a prodigy's with World Class. Low-scoring slides sit after the cut line; the
presenter can overflow past the composed deck into the full catalog if they want to keep
talking. Thresholds live in one config file for tuning during rehearsal.

## Presentation mechanics

- Keyboard/clicker: `→`/page-down advances in **stages** — headline first, then the number
  counts up, then the chart draws — so the presenter controls the reveal, not just the
  slide. `←` back, `B` blackout, `Esc` to picker. Presenter remotes emulate page-up/down,
  so standard hardware works.
- Slide-position dots + next-slide hint appear only on mouse-move; the screen stays clean
  on stream.
- Once loaded, a deck needs zero network — everything is in the dossier — so venue wifi
  dying mid-presentation cannot kill a deck already on screen.

## Visual direction

- 1920×1080 broadcast-dark, therun branding. Extends the commentary drawer's
  SCSS-modules + bespoke-SVG approach; no chart library for hero visuals — hand-drawn SVG
  so every axis, easing, and draw-on animation is intentional.
- Typography does the mesmerizing: one huge stat per slide (200px+ numerals), GSAP
  count-ups, charts drawing in over ~1s. Game art (IGDB, 3:4 portrait) as a dimmed
  backdrop per deck.
- Small, consistent motion vocabulary: count-up, draw-on, dot-drop, glow-pulse for danger.
  No particle-effect soup.

## Failure handling

- Composer drops slides with missing data; if a dossier is so thin that only anchors
  survive, the picker warns before the show ("2 slides available for this runner").
- Dossier sources fetch independently (`Promise.allSettled`); the picker shows which
  source failed; the deck renders from whatever resolved.
- Post-run tiers degrade gracefully (capture → live endpoint → uploaded history).

## Testing

- `composeDeck` and every slide's `evaluate()` unit-tested against fixture dossiers: a
  grinder, a prodigy, a sparse-data runner.
- `/fast50/screen/demo` cycles fixture decks — doubles as the rehearsal and pitch tool.
- Demo verification: build pre-run and post-run decks for a handful of well-known real
  runners from live production data.

## Out of scope (follow-ups if the pitch lands)

- Event config: runner schedule via `event_participants`, replacing the manual picker.
- Operator-console / OBS-overlay rendering of the same slide components
  (marathon-dashboard pattern).
- Mid-run live display.
- RBAC gating (demo route can ship behind a simple flag; production gating decided later).

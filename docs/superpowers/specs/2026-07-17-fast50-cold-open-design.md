# fast50 cold-open story arc — design

Date: 2026-07-17. Approved by Joey in-session (option A). Goal: introduce an
unknown runner and unknown game to a 50k general audience — answer *what is
this game*, *who is this person*, *why care tonight*, in that order.

## Slides

**"The Game" — new anchor slide, id `the-game`, first in the pre deck.**
- Visual: muted looping gameplay b-roll mp4 (prep) full-bleed; else box-art
  backdrop, louder than the standard ghost.
- Stage 0: kicker "The game", game title huge, category under it.
- Stage 1: plain-language blurb from prep ("Beat the entire game. No
  glitches."). Fallback: community scarcity line from
  `community.userCount`; else nothing.
- Stage 2: contrast payoff — "A casual playthrough: ~40 hours" vs
  "{runner}'s best: 1:38:12" (`story.casualTimeMs` vs `core.pbMs`).
  Fallback without casual time: PB stat alone (PB must appear here — it
  moves off the runner slide).

**"The Runner" — repurposed intro slide, id stays `intro`** (saved deck
orders keep working).
- Headshot is the dominant visual from stage 0 (avatar fallback). Game
  title/category shrink to one muted line — the game slide owns that job now.
- Stage 1: narrator hook line from prep, big statement type. No hook → beat
  skipped.
- Stage 2: stat row — Average viewers (prep), Attempts, therun.gg rank.

Stakes stay distributed: roadmap → story pool → called-shot closes the deck.

## Prep fields

Optional `story` block on `PrepSessionData` (JSON, no migration):
`gameBlurb?: string`, `casualTimeMs?: number`, `hook?: string`,
`avgViewers?: number`, `brollUrl?: string` (mp4, reuses the clip upload
endpoint). Sanitizers (backend + frontend mirror) keep the block only when at
least one field is valid.

Prep studio: "Story" section in the interview panel — blurb input, casual
time in hours (number input, stored as ms), hook textarea, avg-viewers
number input, b-roll mp4 upload with preview/remove.

## Plumbing

- `PRE_ANCHORS` → `['the-game', 'intro', 'roadmap']`; evaluator for
  `the-game` always fires (score 100).
- Slide registry + SCSS additions (b-roll cover video, loud backdrop
  variant, blurb type, contrast row, hook line).
- `fixturePrep` gains a story block (b-roll reuses `/fast50-demo-clip.mp4`)
  so the demo shows the full arc with `&prep=full`.
- Old saved decks: `the-game` simply absent from frozen orders (available to
  add in the deck builder); auto-composed decks show it immediately.

## Testing

Backend jest + frontend vitest for story sanitizing; typecheck/lint; visual
pass by Joey (sandbox can't run `next dev`).

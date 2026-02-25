# Races Section Redesign v2 — Status-Tiered Cards

## Problem

The races panel treats every race identically — same flat rows regardless of state. A live race with 15 people battling gets the same visual treatment as a finished race from yesterday. There's no hierarchy, urgency, or celebration. It fails to convey the excitement of live and imminent races.

## Design: Status-Tiered Cards

Races get visual treatment proportional to their urgency. Live and imminent races get full-width cards with game art backgrounds. Finished/non-imminent races stay as compact rows.

### Live Race Cards (status: `progress` or `starting`)

Full-width card per live race:
- **Game art as blurred background** with dark gradient overlay (same technique as PB featured slides — `<img>` with `object-fit: cover`, absolute positioned, overlay on top)
- **Amber glow** — `box-shadow` with amber, subtle `border-left: 3px solid amber`
- **"LIVE" badge** — small pill in top-right with pulsing amber dot
- **Game + Category** — large white text over overlay
- **Timer** — large monospace, front and center. Reuses existing `RaceTimer`
- **Participants** — `N runners` with user icon
- **Leader info** — if someone is ahead, show "Leader: username" in muted tone below game/category

Cards stack vertically when multiple live races exist.

### Imminent Upcoming Race Cards (status: `pending`, starting soon or high participant count)

Similar card treatment, cooler-toned:
- **Game art blurred background** with slightly lighter overlay
- **Blue/info accent** — blue-tinted left border and glow
- **"STARTING SOON" badge** — pill with clock icon, blue accent
- **Game + Category** — large white text
- **Countdown** — if `willStartAt` set, show "Starts in X min". If `everyone-ready`, show "X/Y Ready" prominently
- **Creator** — "Created by username"
- **Participants** — same as live cards

"Imminent" criteria: scheduled within ~30 min, OR high participant count (≥3).

### Finished Race Rows (compact)

Compact rows with celebration accents:
- **Gold left-border accent** (3px)
- **Winner**: name in gold + trophy icon, winning time in large monospace
- **Game art thumbnail**: 30×40px
- **Game + Category** on left, winner + time on right

### Non-Imminent Pending Rows (compact)

Standard compact rows — small game art, game/category, creator, participant count. No special treatment.

### Panel Structure (top to bottom)

1. Live race cards (stacked, amber glow)
2. Imminent upcoming cards (stacked, blue accent)
3. Compact rows: non-imminent pending + recently finished
4. "Start a Race" CTA button (keep current)

### Panel Header

Title: "Races". Subtitle becomes dynamic — "N Live Now" when active races exist, else "Race against friends".

### Empty State

Keep text-only centered empty state.

## Files Changed

- `app/(new-layout)/frontpage/sections/races-section.tsx` — restructure to render cards vs rows by status
- `app/(new-layout)/frontpage/sections/races-section.module.scss` — add card styles, keep row styles, add status-specific treatments
- `app/(new-layout)/frontpage/sections/race-row.tsx` — split into `RaceCard` (for live/imminent) and keep `RaceRow` (for compact)

## Technical Notes

- `RaceCard` is a client component (needs `useRace` for live WebSocket updates, `RaceTimer`)
- `RaceRow` stays a client component (same reason)
- Blurred background technique: `<img>` with `position: absolute; width: 100%; height: 100%; object-fit: cover; filter: blur(20px) brightness(0.3);` + overlay div
- "Imminent" logic lives in the server component — check `willStartAt` vs now, or `participantCount >= 3`

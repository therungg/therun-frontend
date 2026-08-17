# VOD review — frame-stepped verification with markers and retime

Date: 2026-08-17
Repos: therun-frontend (workbench, submit-dialog pin), therun-backend (one jsonb column, three field pass-throughs)
Status: BUILT 2026-08-17 — frontend `vod-review` (unpushed at time of writing; A1-B7 all committed, tip 2668ce33) and backend `vod-review` (unpushed; A1-A4, tip af68dee). Executed subagent-driven (12 tasks, per-task spec+quality review; migration 0096 additive). Browser pass DEFERRED to post-backend-deploy: frame-stepping/markers/retime are pure-frontend and unit-tested (69 vod-review tests green), but Save/Apply persistence can only be verified once the backend branch is merged+deployed (= migration 0096 + deploy, Joey's call). Place-splits (phase 1b) NOT built.

## Problem

A moderator verifying a run today opens the VOD in a raw `<iframe>`
(`src/components/run/dashboard/vod.tsx`), scrubs by hand, and decides.
There is no way to step frames, no record of *which* frames the mod
considered start and end, no computed retime, and nothing the runner can
pin at submission to pre-empt "which frame is the start" disputes. Every
serious community does this in an external retimer tab and pastes the
result into a note.

## Decision summary (from the brainstorm)

- **Phase 1 = embedded players (YouTube + Twitch), not self-hosted media.**
  Frame stepping is "as accurate as the player's seek", exactly like the
  community retimers. Pixel access is impossible from an embed, so **frame
  recognition / OCR is out of scope** until a later phase adds server-side
  frame extraction.
- **Runner may pin start/end at submission; mod markers are authoritative.**
- **Retime is evidence, not the time.** The run's submitted time stays as-is;
  the mod sees `submitted · retimed (Δ)` and may click **Apply retime**,
  which is an ordinary run edit.
- **FPS is manual**: 60 (default) / 30 / Other (free number). A backend
  probe is a later nicety.
- **No new API route** (the `api` CFN stack has one resource slot left).
  Storage rides existing edit/create endpoints and the existing detail reads.

## Vocabulary

| Term | Meaning |
|---|---|
| cursor | the frame the workbench believes the player is showing |
| marker | `{ kind, frame, label?, note?, splitIndex? }`, kinds `start` `end` `split` `note` |
| review | one author's set of markers + fps: `{ fps, markers, at, by? }` |
| retime | `(end.frame − start.frame) / fps`, in ms, rounded to the millisecond |

Frames are integers from video time 0 at the chosen fps. Time ⇄ frame:
`frame = floor(t × fps + 1e-6)`, `t = (frame + 0.5) / fps` (seek to the
middle of a frame so player rounding lands on the intended one).

## Player adapter

One interface, two implementations, in `leaderboard/vod-review/player/`:

```ts
interface VodPlayer {
    ready: Promise<void>;
    seek(seconds: number): void;      // pauses first
    play(): void; pause(): void;
    getTime(): number;                // seconds, as reported by the player
    setRate(rate: 0.25 | 0.5 | 1 | 2): void;
    duration(): number | null;
    destroy(): void;
}
```

- **YouTube** — IFrame API (`https://www.youtube.com/iframe_api`, `YT.Player`
  with `enablejsapi=1`, `origin`, `rel=0`, `controls=1`). `seek` =
  `pauseVideo()` then `seekTo(t, true)`. `getTime` = `getCurrentTime()`.
  When the iframe has focus, YouTube's own `,` / `.` step a frame; **Set
  start / Set end read `getTime()`**, so a mod may step either way. Note:
  YouTube exposes no fps; the manual chooser is the source of truth.
- **Twitch** — Embed JS (`https://player.twitch.tv/js/embed/v1.js`,
  `new Twitch.Player(el, { video, parent: [...] })`). `seek(seconds)`,
  `pause()`, `getCurrentTime()`. Twitch exposes no rate setter, so the
  speed control is hidden for Twitch. `parent` must list
  `localhost` and `therun.gg` (same values `vod.tsx` uses today).
- Which adapter: `youtubeParser(url)` → YouTube; `/twitch\.tv\/videos\/(\d+)/`
  → Twitch; anything else → the workbench is unavailable, the drawer keeps
  today's plain link.

Player load failure (adblock, network) → the workbench shows the plain
embed and a one-line "frame stepping unavailable" note; markers can still
be typed as times.

## Workbench (mod mode)

Lives in `app/(new-layout)/games-v2/[game]/leaderboard/vod-review/`, opened
from the drawer's `EvidenceSection` by a **Review VOD** action that expands
the existing embed in place (the drawer is 1400 lines; nothing new goes in
`run-inspector.tsx` except the mount + a prop for the current review).

Layout, top to bottom:

1. **Player** (16:9, full drawer width).
2. **Transport**: `−1s` `−10f` `−1f` `▶/⏸` `+1f` `+10f` `+1s`, speed
   `0.25 0.5 1 2` (YouTube only), fps chooser `60 · 30 · Other [__]`.
   Cursor readout: `frame 123456 · 34:17.600`.
3. **Marker rail**: buttons `Set start` (`[`), `Set end` (`]`), `Add split`,
   `Add note` (`m`); list of markers sorted by frame — kind chip, frame,
   time, label/note (inline-editable), click seeks, `×` deletes. Only one
   `start` and one `end`; setting again replaces.
4. **Retime line**: `submitted 1:23:45.67 · retimed 1:23:45.72 (+0.05)`;
   `—` until both start and end exist. Timing shown is RTA (the frame count
   is real time by definition); the line says so when the board's primary
   timing is game time.
5. **Footer**: `Save markers` (persists the review), `Apply retime`
   (enabled when a retime exists and differs from `time`; performs
   `editRun({ time: retimedMs, reason: 'Retimed from VOD: <start>→<end> @<fps>fps' })`
   after saving markers). Both go through the existing reason/mod-log path.

Keyboard: `,` `.` step ±1 frame, `<` `>` ±10 frames, `space` play/pause,
`[` `]` set start/end, `m` note — active while focus is inside the
workbench but outside the iframe (an iframe with focus gets YouTube's own
keys, which is fine and stated in a hint line).

If the run already has a **runner review**, its start/end are shown as
ghost markers (dimmed, `runner` chip, click seeks) and a **Use runner's
markers** button copies them into the mod set.

### Place splits (phase 1b, stretch)

If the run resolves to per-attempt split data, a **Place splits** button
drops one `split` marker per split at `start.frame + splitCumulativeMs × fps / 1000`,
labelled with the split name and `splitIndex`. The mod steps through and
nudges. Resolution path: `finished_runs.run_id` → `speedrun_runs` →
`historyFilename` → `history.json` on the CloudFront splits bucket
(`src/components/run/get-splits-history.ts`) → the attempt whose final time
equals the run's `time` (±1 ms; on ambiguity, the attempt whose `endedAt`
matches). Manual times have no split data → button hidden. Ship phase 1
without it if the resolution proves unreliable; the marker model already
supports it.

## Runner mode (submit dialog)

In the submit-run dialog's evidence step, when the pasted link is
embeddable, an **optional** disclosure "Pin start and end frames" mounts
the same workbench with `mode="runner"`: player, transport, fps, `Set
start` / `Set end` only, no notes/splits, no retime line, no Apply. The
result is sent as `vodReview` on the create call. Skipping it is the
default and costs nothing.

## Storage & contract (backend)

One nullable jsonb column, same shape, on both tables:

- `finished_runs.vod_review`
- `manual_times.vod_review`

```ts
interface VodReview {
    fps: number;                       // > 0, ≤ 240
    runner?: { markers: VodMarker[]; at: string };                 // ISO
    mod?: { markers: VodMarker[]; retimedMs: number | null; by: number; at: string };
}
interface VodMarker {
    kind: 'start' | 'end' | 'split' | 'note';
    frame: number;                     // integer ≥ 0
    label?: string;                    // split name / short note title, ≤ 80
    note?: string;                     // ≤ 500
    splitIndex?: number;
}
```

Endpoints (all existing):

| Op | Route | Change |
|---|---|---|
| mod save (run) | `PUT /v1/leaderboards/runs/{runId}` | accepts `vodReview.mod` (+ `fps`); merges — never drops `runner`; `reason` still required |
| mod save (manual time) | `PUT /v1/leaderboards/games/{gameId}/manual-times/{id}` | same |
| runner pin (manual time create) | existing manual-time create | accepts `vodReview: { fps, runner }` |
| runner later | — | none: `attach-vod.action.ts` is mod-only today, so a runner pins only at create |
| read | `GET /v1/leaderboards/runs/{runId}` (`RunDetail`), manual-time detail | returns `vodReview` |
| clear | `PUT` with `vodReview: null` | clears the whole review (mod only) |

Rules: server validates the shape (fps range, ≤ 200 markers, one start/one
end), computes nothing else. `retimedMs` is stored as sent (client-computed;
the server re-derives it from start/end/fps and rejects a mismatch > 1 ms).
Changing `vodUrl` clears `vodReview` (markers are meaningless against a
different video) — the frontend warns before doing so. Saving a mod review
writes a mod-log row (`vod_review` action) like other edits.

Migration: one `ALTER TABLE … ADD COLUMN vod_review jsonb` per table.
Frontend type mirror: `types/leaderboards.types.ts` gets `VodReview`,
`VodMarker`, and `vodReview: VodReview | null` on `RunDetail`; the manual
time detail type likewise.

Handoff artifact: `docs/frontend-guide-vod-review.md` in the backend repo
(copied here) once the pass-throughs exist.

## Frontend module layout

```
leaderboard/vod-review/
  retime.ts                 pure: frame⇄time, retimeMs, format, marker ops   (vitest)
  player/types.ts           VodPlayer interface, detectVod(url)
  player/youtube.ts         YT IFrame API adapter (script loader, singleton)
  player/twitch.ts          Twitch Embed adapter
  use-vod-player.ts         hook: mounts adapter, cursor state, step(), mark()
  vod-review-workbench.tsx  layout + transport + footer, mode 'mod' | 'runner'
  marker-rail.tsx
  vod-review.module.scss
```

Server actions: `save-vod-review.action.ts` (mod; wraps `editRun` /
`updateManualTime`) next to the existing `attach-vod.action.ts`; the runner
path adds the field to the submit dialog's existing create action.

## Testing

- `retime.ts`: frame⇄time round-trips at 30/60/59.94, retime rounding, set
  start/end replacement, sort, Place-splits placement math.
- Adapter hook with a fake `VodPlayer`: step clamps at 0 and duration,
  mark reads player time, fps change re-derives marker times but not
  frames (frames are canonical; the mod is told "markers keep their frame
  numbers" when fps changes with markers present).
- Backend: validation unit tests for the shape; mismatch-retime rejection;
  `vodUrl` change clears review; runner block preserved on mod save.
- Browser pass (mandatory, per project convention): YouTube and Twitch,
  step accuracy sanity (10 steps forward = 10 frames of visible change at
  60 fps on a known 60 fps VOD), keyboard, dark/light, drawer width.

## Out of scope / later phases

- Server-side frame stills at markers (yt-dlp sections + ffmpeg) → pixel
  access, evidence archive, and the door to recognition.
- Recognition: black/freeze detection for loads, template matching against
  per-game reference frames, timer OCR.
- fps probe from metadata; pause / load-removal markers; retime as the
  authoritative time; per-community retime policy.

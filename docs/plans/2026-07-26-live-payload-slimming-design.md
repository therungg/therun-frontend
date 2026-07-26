# Live payload slimming — backend handoff

**Date:** 2026-07-26
**Repo affected:** `therun-backend` (the `/live` endpoint), then `therun-frontend`
**Motivation:** Vercel cost. Runtime Cache Writes are the second-largest line on the
bill ($28.71 billed, Jul 1–26) and the cause is payload size, not request volume.

## The problem

Vercel's Runtime Cache has a hard **2 MB item size limit**
(<https://vercel.com/docs/caching/runtime-cache>). Measured against production on
2026-07-26:

| Request | Bytes | |
|---|---:|---|
| `/live?limit=7` (`getTopNLiveRuns`) | 2,584,291 | 2.46 MB — over the limit |
| `/live?minify=true` (`getAllLiveRuns`, 70 runners) | 1,929,523 – 2,080,818 | 1.84–1.98 MB — straddles the limit |
| `/live?limit=1` | 333,409 | 0.32 MB |

`src/lib/live-runs.ts` marks all of these `'use cache: remote'`. Entries at or over
2 MB cannot be retained, so the hottest cache keys on the site have an effectively
0% hit rate: every request re-fetches from the backend and re-attempts a write that
cannot stick.

The billing corroborates it — ~370k runtime cache writes/day against ~400k function
invocations/day, i.e. **0.9 writes per invocation**, where a working cache would be
near zero.

Because `/live?minify=true` sits *right on* the boundary, the hit rate is also
erratic and degrades silently as more runners go live.

### `minify=true` does not minify

`?minify=true` strips 12 metadata keys (`gameData`, `variables`, `platform`,
`region`, `emulator`, `events`, `partition`, `raceId`, `removeAt`, `sob`,
`endedAt`, `monteCarloPrediction`) — about 2.4% of the payload.

It leaves `splits` fully intact:

```
minified /live: 70 runs, 2,080,818 bytes
  splits = 2,030,586 bytes  (97.6% of the payload)
  avg 132 splits/run, worst case 487, ~1,185 bytes per split
  per split: comparisons (350B) + total (227B) + single (201B) = 778B = 66%
```

None of that is real-time. Split comparisons, PB split times and best-possible
values are historical run data that does not change during a run. We are moving
~2 MB of static history every few seconds to deliver a few dozen bytes of live
timer state.

## What the frontend actually reads

Every consumer of `.splits` on a **live** run (as of `main`, 2026-07-26):

| Consumer | Uses |
|---|---|
| `app/(new-layout)/frontpage/components/use-run-refresh.ts` (×4) | `run.splits.length` only |
| `app/(new-layout)/live/live.tsx` (×3) | `run.splits.length` only |
| `app/(new-layout)/frontpage/components/hero-content.tsx:426` | `run.splits.length` only |
| `app/(new-layout)/live/live-split-timer.component.tsx` | `splits[currentSplitIndex - 1]`, `splits[splits.length - 1]` |
| `app/(new-layout)/live/stories/run-story-view.tsx` | indexes a single split |
| `app/(new-layout)/races/[race]/race-focused-runner.tsx:20` | **already bails when splits are absent** |

That last one matters: the minified contract *already* assumes splits may be
missing —

```ts
if (!focusedRun || focusedRun.isMinified || !focusedRun.splits) return null;
```

— and the code already re-fetches the full run on demand via `getLiveRunForUser`
when a viewer focuses a runner. The frontend is built for this; the backend just
never stripped the field.

## Requested API change

Make `minify=true` actually minify (preferred), or add `?fields=live` if the
current `minify` shape has external consumers that would break.

The slim run object should be the current minified shape **minus `splits`**, plus:

| Field | Type | Replaces |
|---|---|---|
| `splitsCount` | `number` | every `run.splits.length` read |
| `currentSplit` | `Split \| null` | `splits[currentSplitIndex]` |
| `previousSplit` | `Split \| null` | `splits[currentSplitIndex - 1]` |
| `finalSplit` | `Split \| null` | `splits[splits.length - 1]` |

Keep `isMinified: true` on the response so the existing frontend guards keep
working unchanged.

Everything real-time stays: `currentTime`, `currentSplitIndex`,
`currentSplitName`, `delta`, `currentPrediction`, `currentComparison`,
`runPercentage`, `bestPossible`, `hasReset`, `gameTime`, `currentlyStreaming`.
**No freshness is lost — this is purely dropping static history.**

### Projected sizes

Modelled against the live 70-runner payload:

```
current minified                    2,080,818 bytes  (1.98 MB)  over the limit
drop per-split comparisons/total/single  555,957 bytes  (0.53 MB)  −73%
drop splits, add the 4 fields above       49,392 bytes  (48 KB)    −98%
```

48 KB fits the runtime cache with 40× headroom, at the current 15s revalidate.

If dropping `splits` wholesale is too invasive for other consumers, the fallback —
keeping `splits` but omitting the per-split `comparisons` / `total` / `single`
blobs — still gets to 0.53 MB and is enough to get under the limit.

## Frontend follow-up (this repo, after the API ships)

1. `src/lib/live-runs.ts` — pass the new param on `getAllLiveRuns`,
   `getTopNLiveRuns`, `getLiveRunsForGameCategory`, `getRandomTopLiveRun`.
   Leave `getLiveRunForUser` on the full shape: it is the on-demand "give me
   everything for this one runner" call.
2. Replace `run.splits.length` with `run.splitsCount` in `use-run-refresh.ts`,
   `live.tsx`, `hero-content.tsx`.
3. Point `live-split-timer.component.tsx` at `previousSplit` / `finalSplit`.
4. Update `LiveRun` / `Split` in `app/(new-layout)/live/live.types.ts`.
5. Once payloads are small **and** Fluid Compute is on, consider moving the hot
   short-TTL getters from `'use cache: remote'` to plain `'use cache'`. Per the
   Vercel docs, `'use cache'` is in-memory per instance and is **not** billed as
   Runtime Cache operations — same 15s freshness, zero cache cost.

## Out of scope / not recommended

Raising `cacheLife` revalidate above 15s on live data. It was considered and
rejected — this is real-time data and the staleness is user-visible. Payload
slimming achieves more saving with no freshness cost.

## Measurement notes

- Traffic figures come from two production log samples (2026-07-26 04:36 UTC,
  3.8 min; 04:49 UTC, 2.9 min). The mix was consistent across both: ~4.5% real
  page loads, ~50% server-action polling, ~45% public API GETs.
- Per-operation Runtime Cache prices ($0.40/1M reads, $4.00/1M writes) are derived
  from the team's Vercel price matrix; the public docs confirm runtime cache is
  charged but do not publish the unit.
- Vercel does not document the behaviour of an over-limit write. The ~0.9
  writes-per-invocation ratio strongly indicates the entries are not retained,
  but that is inferred rather than documented.

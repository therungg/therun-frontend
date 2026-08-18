# Frontend Integration Guide: VOD Review

Moderators and runners can attach frame-level VOD verification markers (start, end, splits, notes) to runs and manual times. The contract is frame-stepped: frames are canonical and times derive from fps. This guide covers types, endpoints, and validation.

## Types

```typescript
/** Frame-stepped VOD verification. Frames are canonical; times derive from fps. */
export type VodMarkerKind = "start" | "end" | "split" | "note";

export interface VodMarker {
    kind: VodMarkerKind;
    /** Integer ≥ 0, counted from video time 0 at `VodReview.fps`. */
    frame: number;
    /** Split name / short title, ≤ 80 chars. */
    label?: string;
    /** Free text, ≤ 500 chars. */
    note?: string;
    splitIndex?: number;
}

export interface VodReviewAuthor {
    markers: VodMarker[];
    /** ISO timestamp of the save. */
    at: string;
}

export interface VodReview {
    /** 0 < fps ≤ 240. Shared by both blocks: the fps is a fact about the video. */
    fps: number;
    /** What the runner pinned at submission. Never rewritten by moderators. */
    runner?: VodReviewAuthor;
    /** The authoritative markers. */
    mod?: VodReviewAuthor & { retimedMs: number | null; by: number };
}
```

## Reads

### `GET /v1/leaderboards/runs/{runId}`

Returns a `RunDetail` object with a `vodReview: VodReview | null` field. Contains the reviewer's markers (both runner and mod blocks, if present).

It also returns a `splits: RunSplit[]` field for the review workbench's split-jump controls:

```typescript
export interface RunSplit {
    /** Zero-based segment ordinal — pairs with a VodMarker's `splitIndex`. */
    index: number;
    name: string;
    /** Cumulative real (RTA) time from run start to this split, in ms. */
    splitTimeMs: number;
    /** Cumulative game-time split, ms, when the board stores one. Display only —
     *  a VOD is real footage, so frame anchoring must always use `splitTimeMs`. */
    gameSplitTimeMs: number | null;
    segmentCount: number;
}
```

**`splits` is populated only when the reviewed run IS the current PB.** Per-split
times are keyed by run identity (they always describe the current PB), so the
backend returns them only when the run's real time equals the PB's final
cumulative split. For any non-PB (or since-superseded) attempt, or a
guest/unsynced run with no segment data, `splits` is `[]` — the client should
show "splits not available" and hide split-jump controls.

Anchoring math (client): a split's video frame = `startMarkerFrame +
round(splitTimeMs / 1000 * fps)`. Always the real `splitTimeMs`, never
`gameSplitTimeMs` — game time is load-removed and does not map to video frames.

The manual-time detail endpoint does **not** return `splits` (manual times have no
segment data).

### `GET /v1/leaderboards/manual-times/{id}`

Returns the manual-time detail object with a `vodReview: VodReview | null` field. Contains the reviewer's markers (both runner and mod blocks, if present).

## Writes

| Operation | Endpoint | Method | Body | Notes |
|-----------|----------|--------|------|-------|
| Mod save markers on run | `/v1/leaderboards/runs/{runId}` | PUT | `{ "vodReview": {...}, "reason": "..." }` | Saves to `vodReview.mod` block. `reason` ≥ 10 chars required. |
| Mod clear markers on run | `/v1/leaderboards/runs/{runId}` | PUT | `{ "vodReview": null, "reason": "..." }` | Clears the entire `vodReview` object. |
| Mod save markers on manual time | `/v1/leaderboards/games/{gameId}/manual-times/{id}` | PUT | `{ "vodReview": {...} }` | Saves to `vodReview.mod` block. |
| Mod clear markers on manual time | `/v1/leaderboards/games/{gameId}/manual-times/{id}` | PUT | `{ "vodReview": null }` | Clears the entire `vodReview` object. |
| Mod create manual time with markers | `/v1/leaderboards/games/{gameId}/manual-times` | POST | `{ "vodReview": {...}, ... }` | Saves to `vodReview.mod` block on creation. `vodReview` is optional. |
| Runner pin markers at create | `/v1/me/manual-times` | POST | `{ "vodReview": {...}, ... }` | Saves to `vodReview.runner` block on creation. `vodReview` is optional. |

### Marker write example

```json
{
  "vodReview": {
    "fps": 60,
    "markers": [
      { "kind": "start", "frame": 150 },
      { "kind": "split", "frame": 1800, "label": "First segment", "splitIndex": 0 },
      { "kind": "split", "frame": 3600, "label": "Second segment", "splitIndex": 1 },
      { "kind": "end", "frame": 5400 },
      { "kind": "note", "frame": 2700, "note": "Emulator load" }
    ],
    "retimedMs": 90000
  },
  "reason": "Verified VOD timestamps match submitted time"
}
```

### URL change clears stored review

If a `PUT` request changes `vodUrl` (on runs) or `evidenceUrl` (on manual times) to a different value, **the stored `vodReview` is automatically cleared** — unless the same request also carries a `vodReview` object. A request that **includes both** a new URL and a `vodReview` will keep the new review intact.

```json
{
  "vodUrl": "https://new-video-url.com",
  "vodReview": {
    "fps": 60,
    "markers": [
      { "kind": "start", "frame": 100 },
      { "kind": "end", "frame": 5000 }
    ]
  }
}
```

In this case, the old review is discarded and the new one is stored. Omitting `vodReview` would clear it instead.

## Validation Errors

The server validates `vodReview` patches and returns `400 Bad Request` with one of these error messages:

- `vodReview must be an object` — request body's `vodReview` is not a JSON object.
- `vodReview.fps must be a number in (0, 240]` — fps must be a finite number between 0 (exclusive) and 240 (inclusive).
- `vodReview.markers must be an array` — `markers` field is not an array.
- `vodReview.markers: at most 200 markers` — marker count exceeds 200.
- `vodReview.markers: unknown marker kind {kind}` — marker's `kind` is not one of `"start"`, `"end"`, `"split"`, or `"note"`.
- `vodReview.markers: marker must be an object` — a marker entry is not a JSON object.
- `vodReview.markers: marker.frame must be a non-negative integer` — marker's `frame` is not a non-negative integer.
- `vodReview.markers: marker.label must be a string of at most 80 chars` — marker's `label` is missing, not a string, or exceeds 80 characters.
- `vodReview.markers: marker.note must be a string of at most 500 chars` — marker's `note` is not a string or exceeds 500 characters.
- `vodReview.markers: marker.splitIndex must be a non-negative integer` — marker's `splitIndex` (if present) is not a non-negative integer.
- `vodReview.markers: only one start marker` — more than one marker with `kind: "start"`.
- `vodReview.markers: only one end marker` — more than one marker with `kind: "end"`.
- `vodReview.markers: end is before start` — end marker's frame is less than start marker's frame.
- `vodReview.retimedMs must be a number` — `retimedMs` was supplied but is not a number.
- `vodReview.retimedMs disagrees with the start/end markers` — client-supplied `retimedMs` differs from the computed value by more than 1 millisecond.

## Retime Math

Frames are 0-indexed and counted from video time 0. Times derive from fps as follows:

### Time → Frame

```
frame = floor(t * fps + 1e-6)
```

where `t` is time in seconds and `1e-6` is a small epsilon to handle floating-point rounding.

### Frame → Time

```
t = (frame + 0.5) / fps
```

where `t` is time in seconds. Note the `+0.5` offset: a frame interval is treated as a half-open window `[frame/fps, (frame+1)/fps)`, so the canonical time is the midpoint.

### Retime duration (start to end)

```
retimeMs = round((end.frame - start.frame) / fps * 1000)
```

The retime duration is `null` unless both `start` and `end` markers are present. The server re-derives this value from the markers and rejects any client-supplied `retimedMs` that disagrees by more than 1 ms. The `mod` block's `retimedMs` and `by` (user id) are server-stamped and immutable.

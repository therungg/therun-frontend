# Frontend Integration Guide: Splits Backups

## Overview

Patrons get automatic cloud backups of every split file they upload to therun.gg. The backend stores two kinds of snapshot per uploaded `originalKey`:

- **Recent**: the last 5 uploads (rolling, keyed by timestamp). Useful for "undo my last few saves."
- **Daily**: one snapshot per UTC calendar day (overwritten on each upload that day). Useful for "give me the file from last Tuesday."

Each daily snapshot is stamped with a **deletion date** at upload time, based on the uploader's current tier:

| Tier | Daily retention            |
|------|----------------------------|
| T1   | 90 days from upload        |
| T2   | 180 days from upload       |
| T3   | Never expires (`null`)     |

Tier changes are **monotonic — upgrades extend, downgrades and cancellations never shrink existing rows**:

- **Upgrade** (e.g. T1 → T3): existing rows' deletion dates are extended (or cleared to "never") to match the new tier.
- **Downgrade** (e.g. T3 → T1): old rows keep their longer retention; only *new* uploads get T1 retention.
- **Cancel**: data is untouched — rows stay until their own deletion date. Download access is blocked immediately, but re-subscribing restores it.

**Grace window (access only).** Cancelled patrons keep download access to their own backups for 30 days (`graceUntil` is set). Data retention is independent of this window.

### Visibility model

Backups are publicly browseable — the paywall is on downloads, not on metadata.

| Caller | Browse anyone's listing | Download own backups | Download others' backups |
|--------|-------------------------|----------------------|--------------------------|
| Anonymous / non-patron | ✅ | ❌ | ❌ |
| Grace-window user (cancelled, < 30 days) | ✅ | ✅ | ❌ |
| Active patron (tier ≥ 1) | ✅ | ✅ | ✅ |

Downloads are issued as **pre-signed S3 URLs with a 15-minute TTL**. Never cache them — always refetch when the user clicks download.

---

## Auth

All authenticated endpoints use `Authorization: Bearer <sessionId>`. Public endpoints (`/backups/user/...`) work with or without the header — pass it when present so the backend can decide whether to embed `downloadUrl` values.

- **403 `{"error":"unauthenticated"}`** — endpoint requires a session and none was provided.
- **403 `{"error":"no backup access"}`** — `/backups/my` was called but the caller is not a patron and not in grace.

---

## Endpoints

Base path: `/backups`, e.g. `https://api.therun.gg/backups/...`.

### `GET /backups/my` — current user's listing

Convenience alias for "list my own backups." Requires a session. Returns the caller's tier/retention info alongside files.

**Response 200:**

```json
{
  "files": [
    {
      "originalKey": "joey/super-mario-64/120-star.lss",
      "recentCount": 5,
      "dailyCount": 42,
      "dailyEarliest": "2026-03-09",
      "dailyLatest": "2026-04-19"
    }
  ],
  "tier": 2,
  "retentionDays": 180,
  "graceUntil": null
}
```

### `GET /backups/my/versions?key=<originalKey>` — current user's versions

Returns every snapshot for one of the caller's own `originalKey`s, each with a presigned `downloadUrl`. Requires a session. `key` must URL-encode the `originalKey` exactly as returned by `/backups/my`, and its first path segment must match the caller's username (the backend re-checks).

**Response 200:**

```json
{
  "recent": [
    {
      "uploadedAt": "2026-04-19T18:22:14.000Z",
      "downloadUrl": "https://splits-backup-bucket-....s3.eu-west-1.amazonaws.com/recent/..."
    }
  ],
  "daily": [
    {
      "date": "2026-04-19",
      "downloadUrl": "https://splits-backup-bucket-....s3.eu-west-1.amazonaws.com/daily/...",
      "expiresAt": "2026-10-16T00:00:00.000Z"
    }
  ]
}
```

### `GET /backups/user/{username}` — any user's listing *(public)*

Public — works with or without a session. Use this on profile pages: `therun.gg/{username}` → Backups tab.

**Response 200:**

```json
{
  "files": [
    {
      "originalKey": "alice/celeste/any-percent.lss",
      "recentCount": 5,
      "dailyCount": 120,
      "dailyEarliest": "2025-12-15",
      "dailyLatest": "2026-04-18"
    }
  ],
  "tier": 3,
  "retentionDays": null,
  "graceUntil": null,
  "canDownload": true
}
```

Field notes:

- `tier` / `retentionDays` / `graceUntil` describe **the owner**, not the caller. `retentionDays` reflects what *new* uploads at the owner's current tier will get — individual row `expiresAt` values come from `/versions` and may differ (e.g. a T1 user with a historic T3 row that still has `expiresAt: null`).
- `canDownload` is `true` only if the caller is authenticated as an active patron (tier ≥ 1). Use this to decide whether to show download buttons or a "patrons only" upsell.

**Errors:**
- `404 {"error":"no backups for user"}` — the user has no backups at all. Non-patrons always land here.

### `GET /backups/user/{username}/versions?key=<originalKey>` — any user's versions *(public metadata, gated downloads)*

Public metadata listing. `downloadUrl` fields are presigned strings for active patrons, `null` for everyone else.

**Response 200:**

```json
{
  "recent": [
    {
      "uploadedAt": "2026-04-19T18:22:14.000Z",
      "downloadUrl": null
    }
  ],
  "daily": [
    {
      "date": "2026-04-19",
      "downloadUrl": null,
      "expiresAt": null
    }
  ],
  "canDownload": false
}
```

`expiresAt` is the row's stored deletion timestamp (ISO 8601). `null` means the row never expires — either stamped at T3 upload time, or promoted via a later upgrade. Because tier changes are monotonic, `expiresAt` can be later than today's tier retention would suggest.

**Errors:**
- `400 {"error":"missing key"}` — no `key` query param.
- `403 {"error":"key does not match user"}` — key's first segment ≠ the `{username}` in the path.
- `404 {"error":"no backups for key"}` — no snapshots found.

---

## Suggested UX flow

**On someone's profile page (`/{username}`):**

1. Call `GET /backups/user/{username}` — attach `Authorization` if the viewer is logged in.
   - On 404 `no backups for user`: render nothing, or "this user has no backups."
   - Otherwise render the files table. Use `canDownload` to decide between a download button vs a locked icon with "patrons only" tooltip.
2. User clicks/expands a row.
   - Call `GET /backups/user/{username}/versions?key={originalKey}`.
   - Render recent + daily lists.
3. User clicks download.
   - If `downloadUrl` is null: don't show a button. Show upsell.
   - If present: if the response is older than ~14 min, refetch first. Otherwise use it immediately.

**On "my backups" (settings page):**

- Use `GET /backups/my` and `GET /backups/my/versions?key=...` — same shape but always includes `downloadUrl`s.
- Equivalent to `GET /backups/user/{self}` + `canDownload: true`. Pick whichever's cleaner for your frontend routing. `/my` returns 403 if the caller isn't a patron/grace; `/user/{self}` returns 404 for anyone with no backups.

---

## Gotchas

- **Presigned URLs are bearer tokens.** They carry a signature — anyone with the URL can download until it expires (15 min). Don't log them, don't put them in bookmarks. Refetch rather than reuse on every download click.
- **Filename in download.** The default filename the browser gets is the S3 key. For nicer names, add `download="..."` on your `<a>` tag.
- **Storage class is Glacier Instant Retrieval.** Downloads are still millisecond-latency, but retrieval has a per-GB fee. Don't prefetch `downloadUrl`s for every row — fetch only when the user expands.
- **Grace users are `tier: 0` when viewing their own page.** Check `graceUntil` to tell them apart from non-patrons with zero history.
- **Cross-user downloads require active tier ≥ 1.** Grace-window users (owner cancelled, within 30 days) can download their *own* backups but not others'.
- **`originalKey` is the upload key, not a display name.** Shape: `username/game-name/category.lss`. Split on `/` and show the last two segments.
- **No pagination.** Both endpoints return the full list. Not a concern at current scale.

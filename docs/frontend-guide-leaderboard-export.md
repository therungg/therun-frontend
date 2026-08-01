# Frontend guide: full-board leaderboard export

Backend copy is authoritative; `therun-fr/docs/` holds a copy.

## Endpoint

```
GET https://api.therun.gg/mod/v1/leaderboards/{game}/{category}/export
```

- **`/mod` base path is required.** The main API Gateway is at its 500-resource
  hard cap, so this route is only reachable through the moderation proxy API
  (`proxy: true`, strips the `mod` prefix before the Lambda). Handler:
  `src/api/leaderboards/export-handler.ts`, dispatched from
  `handleLeaderboards` via `isExportPath`.
- Public, no auth — same visibility as the paginated board endpoint.
- Query params: identical to the board endpoint (`timing`, `combined`,
  subcategory/filter variables by `nameNormalized`, `verified`, `year`).
  `page`/`pageSize` are ignored.
- Not enveloped: the body is the object below directly (no `{ result }`).

## Response

```jsonc
{
  "game": { "id": 1, "slug": "hades", "display": "Hades" },
  "category": { "id": 2, "slug": "any-heat", "display": "Any% Heat" },
  "timing": "rt",              // resolved, like the board endpoint
  "defaultTiming": "rt",
  "forceRealTime": false,
  "hideRealTime": false,
  "hideGameTime": false,
  "totalItems": 312,
  "truncated": false,           // true when the 10 000-row guard fired
  "exportedAt": "2026-08-01T12:00:00.000Z",
  "entries": [ /* LeaderboardExportEntry[] — full board, rank order */ ]
}
```

`LeaderboardExportEntry` = the paginated board's `LeaderboardEntry`
(rank, runnerName, userId, isGuest, time/realTime/gameTime, runDate,
vodUrl, verificationStatus, source, manualTimeId, picture, country) plus:

| Field | Type | Notes |
|---|---|---|
| `subcategoryKey` | `string \| null` | the entry's own slice |
| `variables` | `Record<string,string> \| null` | per-run variables (runs only) |
| `platform` | `string \| null` | runs only |
| `emulator` | `boolean \| null` | runs only |
| `speedrunRunId` | `string \| null` | set when timer-synced |
| `verifiedAt` | `string \| null` | ISO timestamp |
| `ingestedAt` | `string \| null` | ISO timestamp (`created_at`) |
| `origin` | `string \| null` | `timer \| guest_submit \| submission \| manual_mod \| manual_self` |

All emitted fields are already public via the board or run-detail endpoints;
runner names/pictures/countries go through the same anonymization mask.
Mod-only fields (modNote, rejectionReason, manual-time reason/createdBy)
are deliberately excluded.

## Limits

- `EXPORT_MAX_ROWS = 10000` (same pattern as game standings' `MAX_RUNNERS`).
  When a board exceeds it, `entries` holds the top 10 000 and
  `truncated: true` is set — surface this to the user.
- Enrichment lookups are chunked (1 000 ids per query).

## Frontend integration (implemented)

- Types: `LeaderboardExportEntry` / `LeaderboardExportResponse` in
  `therun-fr/types/leaderboards.types.ts`.
- Fetcher: `getLeaderboardExport` in `therun-fr/src/lib/leaderboards-v1.ts` —
  deliberately uncached.
- UI: `ExportButton` on the games-v2 board meta bar
  (`app/(new-layout)/games-v2/[game]/leaderboard/export-button.tsx`),
  CSV via `export-csv.ts` (variables become `variable:<key>` columns) or raw
  JSON, honoring the active filter state.

# fast50 runner headshot — design

Date: 2026-07-17. Approved by Joey in-session (option A, "both" presentation).

## What

Presenters can upload a real headshot photo of a runner (distinct from their
Twitch avatar) in the prep studio. On the intro slide, stages 1–2 reveal the
headshot as a large portrait card on the right side, over the backdrop art.
The avatar + runner-name headline row is unchanged at all stages. No headshot
uploaded → intro behaves exactly as today.

## Storage (option A — prep-session field)

- `headshotUrl?: string` added to the `PrepSessionData` JSON blob (backend
  `src/types/fast50.ts`, frontend `src/lib/fast50/prep.types.ts`). No DB
  migration.
- Upload rides the existing presigned-URL endpoint
  `POST /fast50/prep/upload-url`, generalized to accept images:
  - `video/mp4` → `fast50/clips/<uuid>.mp4` (existing, unchanged semantics)
  - `image/jpeg` / `image/png` / `image/webp` →
    `fast50/headshots/<uuid>.<ext>`, cap 10 MB
  - Response gains a generic `url` field; `videoUrl` kept for mp4 back-compat.
- `validate-prep` accepts an optional `headshotUrl` string.

Rejected: user-profile-level field (needs migration, leaks broadcast asset
into general profile data; only useful if reused across events).

## Frontend

- **Prep studio:** headshot card in the session editor — file picker with
  client-side type/size validation, presigned upload, preview thumbnail,
  remove button. Saved with the session like other prep fields.
- **Intro slide:** when prep carries `headshotUrl`, render a framed portrait
  card (~19vw wide, 3:4, `object-fit: cover`) revealed at stage ≥ 1,
  positioned right over the backdrop. Same framed treatment as the earlier
  art-card experiment (border, shadow, rounded corners).

## Testing

- Backend: unit coverage for upload-url content-type/size matrix and
  validate-prep headshotUrl acceptance/rejection, alongside existing tests.
- Frontend: typecheck + build; visual pass by Joey in browser (sandbox can't
  run `next dev`).

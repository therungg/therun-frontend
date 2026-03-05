# Hide Streaks Toggle

## Summary

Add a toggle to hide/show the streak card on the frontpage. When hidden, streaks are also hidden from the user's public profile. Uses the existing backend `PUT /users/:user/preferences` endpoint with `{ hideStreaks: boolean }`.

## Behavior

- **Default (`hideStreaks: false`)**: StreakCard renders normally. Owner sees a small eye-off icon button in the card header to hide.
- **Owner with `hideStreaks: true`**: Compact placeholder — muted "Streaks hidden" text with a "Show" link. Clicking calls the API and re-renders.
- **Other users viewing a profile with `hideStreaks: true`**: StreakCard not rendered, no placeholder.

## Data Flow

1. `your-stats-section.tsx` (server component) fetches preferences via `GET /users/:user/preferences` and passes `hideStreaks` + `isOwner` to `YourStatsClient`.
2. Toggle calls a server action `toggleStreakVisibility` which `PUT`s to `/users/:user/preferences` and invalidates the cached preference via `revalidateTag`.
3. Public profile streak rendering checks the preference and skips if hidden.

## Components

| File | Change |
|------|--------|
| `src/lib/user-preferences.ts` (new) | `getUserPreferences()` — cached fetch from `GET /users/:user/preferences` |
| `src/actions/user-preferences.action.ts` (new) | `toggleStreakVisibility()` server action |
| `app/(new-layout)/frontpage/sections/your-stats-section.tsx` | Fetch preferences, pass down |
| `app/(new-layout)/frontpage/sections/your-stats-client.tsx` | StreakCard: accept `hideStreaks` + `isOwner`, render hide button or placeholder |

## UI

- **Hide button**: Small icon button (eye-off from lucide-react) in StreakCard header, tooltip "Hide streaks". Only visible to owner.
- **Placeholder**: Single line, muted text in same grid position: "Streaks hidden · [Show]"

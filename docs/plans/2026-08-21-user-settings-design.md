# User settings — design

Date: 2026-08-21. Status: approved, not implemented.

## Goal

One `/settings` page with a sidebar that holds everything a user can configure about their own account. Phase 1 consolidates surfaces that already exist and are scattered across the site. Later phases add new capabilities.

## Scope

**Phase 1 sections (sidebar order):**

| Group | Item | Route | Source today |
|---|---|---|---|
| Account | Profile | `/settings/profile` | inline `Userform` on `/[username]` |
| Account | General preferences | `/settings/preferences` | `hideStreaks` toggle in frontpage "your stats" card |
| Supporter | Patreon | `/settings/patreon` | link/status half of `/change-appearance` |
| Supporter | Appearance | `/settings/appearance` | customiser half of `/change-appearance` |
| Tools | LiveSplit key | `/settings/livesplit` | `/livesplit`, `/upload-key` |
| Tools | Story Mode | `/settings/story-mode` | `/stories/manage` |

**Explicitly out of scope (later phases):** notification settings, privacy settings, move profile, delete profile, leaderboard preferences. **Not included:** a speedrun.com section (user-level sync is being built elsewhere; no placeholder).

## Decisions

- Route is `/settings`, separate from the `/manage` mod console. Personal settings do not mix with moderation.
- Old routes **redirect**; we do not keep two surfaces.
- The `{sessionId}-{username}` composite path params on the three backend endpoints the settings page touches are replaced by bearer auth + plain username, with a composite fallback kept until the last caller is gone.
- Profile write path is rewritten as a typed server action via `apiFetch`. Appearance write path is moved, not rewritten, in phase 1.

## Routes and shell (frontend)

- `app/(new-layout)/settings/layout.tsx` (server): `getSession()`; no session → login prompt without sidebar; otherwise `<SettingsChrome>` around `children`.
- `settings/page.tsx` → `redirect('/settings/profile')`.
- One server page per section (table above).
- `settings/settings-chrome.tsx` (client): static `NavGroup[]`, active item from `usePathname()`, `router.push` on select. `settings/nav-model.ts` is pure (groups, `activeItemFor(pathname)`), unit-tested.
- **Chrome extraction:** `ConsoleChrome`, `ConsoleSidebar`, `attention-badge`, `nav-icons`, `console.module.scss` move from `games-v2/[game]/manage/console/` to `src/components/console-chrome/`. `ConsoleChrome` takes `header: ReactNode` instead of `game`; `attentionCount`, `badgeDegraded`, `moderatedGamesCount` become optional; `NavItemId` generalises to `string` (manage keeps its own narrowed union). `/manage` behaviour unchanged.
- **Redirects** (`next.config.js`, non-permanent): `/change-appearance` → `/settings/appearance`, `/livesplit` → `/settings/livesplit`, `/upload-key` → `/settings/livesplit`, `/stories/manage` → `/settings/story-mode`. The Patreon OAuth `redirect_uri` changes to `/settings/patreon`; the `?code=` callback handling moves there. `app/(new-layout)/upload-key/` is deleted.
- **Entry points:** Topbar `toolsItems` and `UserMenu` point at new URLs; `UserMenu` gains "Settings".

## Sections

### Profile
- New `ProfileForm` (typed, form-kit primitives). Fields: pronouns, aka, country, timezone, bio (≤100), socials.youtube, socials.twitter, socials.bluesky. Handle stripping for youtube/twitter kept.
- `src/actions/update-profile.action.ts`: zod-validated → `apiFetch('/users/{username}', PUT, sessionId)` → `updateTag('user-{username}')`. Replaces `app/api/users/[user]/route.ts` PUT and `src/lib/edit-user.ts`.
- `Userform` on `/[username]` loses edit mode; owner sees "Edit profile" link to `/settings/profile`. `wrapped/timezone-warning.tsx` links there too.
- `types/session.types.ts` `User` gains `bio`, `aka`, `country`, `socials.bluesky`.

### General preferences
- One toggle: `hideStreaks`, via existing `toggleStreakVisibility`. Frontpage card toggle removed, replaced by a link to `/settings/preferences`.

### Patreon
- Status card: linked or not, tier, "Connect Patreon" (OAuth URL with `redirect_uri=/settings/patreon`) or "Manage on Patreon". `getUserPatreonData(searchParams)` unchanged. Failed `?code=` exchange shows a "Linking failed, try again" state.

### Appearance
- `PatreonSection` customiser moved as-is. Non-patron sees a supporter notice linking `/settings/patreon` and `/patron`. Admin `?tier=` override preserved.
- Save moves from `axios` → route handler to a server action `save-patreon-settings.action.ts` using `apiFetch('/users/patreon/{username}', POST, sessionId)` + existing `revalidateTag('patrons','hours')`. (Write *logic* unchanged; only the transport.)

### LiveSplit key
- `CopyUploadKey` + setup steps moved in. Key fetched server-side via `apiFetch('/users/uploadKey/{username}', sessionId)`. New "Regenerate key" button → `regenerate-upload-key.action.ts` → existing `POST /users/{username}/reset-upload-key`, with confirm step. `app/api/users/[user]/upload-key/route.ts` deleted.

### Story Mode
- `ManageStories` rendered in place.

## Backend (therun, `src/api/users/handler.ts`)

Three branches currently split `params.user` on `-`:
- `PUT /users/{user}` (profile edit)
- `GET /users/uploadKey/{user}`
- `POST /users/patreon/{user}`

Add `resolveUserTarget(event, params.user)` → `{ authuser, username }`: bearer token first (`getAuthenticatedUserFromEvent`), else composite split fallback. Callers then run the existing `confirmPermission` checks, so mods/admins can act on other users. No new API Gateway routes. Fallback is removed in a follow-up once no frontend caller uses composite paths. Run-level composite paths (`/users/{user}/{game}/{run}`) are out of scope.

Sequencing: backend branch → push to main (auto-deploys) → frontend branch. The fallback means nothing breaks in between.

## Error handling

- Server actions return `{ ok: true } | { ok: false; error: string }`; never throw to the client. 403 → "You don't have permission to do that"; otherwise the `ApiError` message.
- Inline status via form-kit pattern.
- Read-your-writes with `updateTag`, not `revalidateTag`.

## Testing

- Backend: unit tests for `resolveUserTarget` (bearer, composite fallback, mod-on-other-user, unauthenticated → 403); existing handler tests as regression gate.
- Frontend: vitest for `nav-model`, profile zod schema, action error mapping.
- Browser pass on dev server: every section, every redirect, Patreon link round-trip, `/manage` console unchanged.
- Typecheck/lint gated on diff vs main baseline.

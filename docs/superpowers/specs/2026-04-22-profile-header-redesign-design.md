# Profile Header Redesign

**Date:** 2026-04-22
**Scope:** Redesign the header at the top of user profile pages (`app/(new-layout)/[username]/user-profile.tsx`) using the new-layout design language (tokens, color-mix backdrops, rounded cards, subtle gradients). Patron style features prominently.

## Goals

- Give user profiles a proper visual identity anchor (avatar + styled name), matching the craft level of downloads / frontpage / live / support.
- Surface patron style (solid color, gradient, animated gradient, bold/italic) prominently without overpowering the rest of the page.
- Keep total height modest (~180–200px desktop) — not a hero-scale banner.
- Move filter/toggle controls that aren't identity out of the header into the tab area.

## Non-goals

- Redesigning the tabs, Overview layout, or any tab content.
- Changing the edit form fields or their validation.
- Changing the patron style picker.

## Overall structure

A new `ProfileHeader` component replaces the current `Userform` block at the top of `user-profile.tsx`.

**Container**
- Rounded-`$radius-lg` card, full content-width, ~180–200px tall on desktop.
- Backdrop varies by patron state (see "Patron backdrop").
- Padding ~`$spacing-2xl` horizontal, `$spacing-xl` vertical.

**Desktop layout (flex row)**

1. **Avatar zone (left, 0 0 auto):** 96×96px rounded-square (`$radius-lg`) Twitch profile picture with a 2px ring. Ring color = patron color (or `--bs-border-color` for non-patrons). Soft outer glow in the same color for patrons. When live, ring switches to `--bs-danger` and pulses.
2. **Info zone (flex 1):**
   - Row 1: display name (patron-styled via `buildPatronStyle`, ~2rem, weight 700) + optional `LIVE` pill linking to `/live/{username}`.
   - Row 2: socials row — Twitch, YouTube, Twitter, Bluesky, 20px icons, `gap: $spacing-sm`.
   - Row 3: meta line — `aka · 🏳 Country · pronouns`, separated by subtle dot bullets, each segment omitted when empty.
   - Row 4: bio, italic, `font-size: $font-size-sm`, `opacity: 0.75`, line-clamped to 2 lines. Omitted when empty.
3. **Action zone (right, 0 0 auto):** "Edit info" button, rendered only via `<Can I="edit" this={subject('user', username)}>`, opens the edit modal.

**Mobile layout (<=768px)**
- Avatar shrinks to 56×56 and stays inline with the name on the first row.
- Socials + meta + bio stack vertically below. Edit button becomes full-width at the bottom of the card.

## Patron backdrop (medium prominence)

Non-identity content (rows 2–4, buttons) always uses normal body colors. The patron style only affects the container backdrop + border + avatar ring + the name itself (existing behavior).

A new helper sits next to the existing patron style utils:

```
src/components/patreon/patron-backdrop-style.ts
  export function buildPatronBackdropStyle(
    prefs: PatronPreferences | null | undefined,
    tier: number,
    theme: Theme,
  ): { background: string; borderColor: string; glowColor: string; animated: boolean };
```

**Non-patron**
- `background: color-mix(in srgb, var(--bs-body-bg) 82%, var(--bs-primary) 10%)`
- `border: 1px solid rgba(var(--bs-primary-rgb), 0.22)`
- `glowColor: rgba(var(--bs-primary-rgb), 0.18)`
- `animated: false`

**Patron, solid color**
- `background: linear-gradient(135deg, color-mix(<color> 28%, var(--bs-body-bg)) 0%, color-mix(<color> 6%, var(--bs-body-bg)) 100%)`
- `border: 1px solid color-mix(<color> 45%, transparent)`
- `glowColor: color-mix(<color> 35%, transparent)`

**Patron, gradient**
- Backdrop uses their gradient stops blended over body-bg at 28% → 6% opacity at the same 135deg angle (or their configured angle when not animated).
- Border uses the mid-stop at 45%.
- When `gradientAnimated`, the backdrop gradient animates via the same `--patron-grad-angle` CSS var and `patron-gradient` keyframes already used for the name.

**Display name:** always uses full `buildPatronStyle(prefs, tier, theme)` output (unchanged). Includes bold/italic, gradient animation, etc.

## Live state

When `liveRun` is defined:

- A `LIVE` pill appears next to the name. Rounded 999px, red `var(--bs-danger)` background, white text weight 700, letter-spacing 0.08em, 0.75s opacity-pulse animation.
- The pill is wrapped in a `Link` to `/live/{username}`.
- Avatar ring switches from patron color to `var(--bs-danger)` and gets a subtle pulse.
- The patron backdrop is NOT overridden — the red signal lives only on the avatar ring + pill.
- The existing "Currently Live!" card in the Overview right column stays as-is (not moved).

## Edit mode

- "Edit info" button opens a Bootstrap `Modal` (using the new-layout `Button` and Bootstrap's standard `Modal`).
- The modal body mounts `EditProfileForm`, extracted from the existing `Edit` function in `src/components/user/userform.tsx` into its own exported component.
- Form fields, state shape, and PUT payload unchanged from today.
- On successful PUT to `/api/users/{sessionId}-{username}`, modal closes and a router refresh is triggered so the header shows the new values.
- Cancel button closes the modal without submitting.

## Tab-strip controls (moved)

Gametime toggle (`GametimeForm`) and game filter (`<select>` of games from `allRunsRunMap`) move out of the header into a right-aligned control cluster attached to the tab strip.

- Visible only on tabs where they apply: `overview` and `sessions`.
- On other tabs (`stats`, `downloads`, `stream`), the controls are hidden.
- On mobile, controls collapse under the tab strip in a single row.

## Data model change

`UserData` gains an optional `profileImageUrl?: string` field. The backend already has Twitch profile image data for OAuth users; the backend response that feeds `get-session-data` must be extended to include it.

**Fallback:** if `profileImageUrl` is absent, render an initial-letter tile:
- Background = patron color or `var(--bs-primary)`.
- Text = first letter of the display name, white, weight 700, centered.

If adding the field to the backend is non-trivial, this redesign ships with the fallback tile rendering for everyone, and the real image is wired up in a follow-up change. The component handles both paths identically from the consumer's side.

## Files

**New**
- `src/components/user/profile-header/profile-header.tsx` — the component. Reads patron data via `usePatreons()`.
- `src/components/user/profile-header/profile-header.module.scss` — styles (`@use` design-tokens + mixins like `downloads.module.scss`).
- `src/components/user/profile-header/edit-profile-modal.tsx` — Bootstrap `Modal` wrapper around `EditProfileForm`.
- `src/components/patreon/patron-backdrop-style.ts` — `buildPatronBackdropStyle` helper.

**Refactored**
- `src/components/user/userform.tsx` — extract `Edit` into exported `EditProfileForm`. `Display` and the `Userform` wrapper can remain temporarily for any other callers; `user-profile.tsx` stops using them.
- `app/(new-layout)/[username]/user-profile.tsx` — replace the `<Row>` holding `Userform` + `GametimeForm` with `<ProfileHeader />`; move gametime + game-filter controls into the tab-strip area.
- `src/lib/get-session-data.ts` and the `UserData` type — add `profileImageUrl?: string` and populate from backend.

## Responsive & a11y

- Avatar `<img>` has `alt={username}`.
- LIVE pill is a link with `aria-label="{username} is live on Twitch"`.
- Edit modal is a standard Bootstrap `Modal` with focus trap and ESC-to-close (built in).
- Socials icons have accessible labels (`aria-label="Twitch"`, etc.).
- Animated gradients already respect the existing patron-gradient approach; no additional motion-reduction logic added beyond what currently exists.

## Acceptance criteria

1. Visiting any user profile shows the new header styled in the new-layout design language.
2. For a non-patron user, the header uses the neutral-theme-accent backdrop.
3. For a patron with a solid color preference, the backdrop is a soft diagonal wash of that color and the avatar has a matching ring + glow.
4. For a patron with a gradient preference (animated or not), the backdrop uses that gradient at the reduced opacity described above; the name itself still uses the full-strength gradient as today.
5. When the user is live, a pulsing LIVE pill appears next to the name linking to `/live/{username}` and the avatar ring turns red.
6. Clicking "Edit info" (visible only for users with edit permission) opens a modal with the existing form. Submitting updates the profile and closes the modal.
7. Gametime toggle and game filter appear in the tab-strip area on Overview and Sessions tabs only.
8. Mobile layout places avatar inline with name, then stacks socials/meta/bio/button below.
9. Header height stays in the 180–200px range on desktop.
10. No-runs state still renders the new header followed by the "not uploaded runs yet" message.

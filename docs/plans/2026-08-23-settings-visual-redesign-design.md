# Settings visual redesign — design

**Date:** 2026-08-23
**Branch:** `user-settings` (continues existing work)
**Scope:** the whole `app/(new-layout)/settings/` section + the shared `ConsoleChrome` header/sidebar it rides on.
**Goal:** make settings read like a finished product, not a form on a dark panel. Imposing through scale / type / spacing — no gradient washes, no new decoration.

## Problem

Measured against a mature competitor, ours is missing three structural things, not color:

1. **No identity.** Pages open cold on form fields under a tiny grey "SETTINGS / therun_gg" text link. Nothing anchors the page to the user.
2. **No consequence.** The profile form edits into a void — no preview of how the name/avatar actually render.
3. **Flat, low-contrast surfaces.** The section went deliberately flat ("the frame IS the surface"), and `profile-form.module.scss` rolls its own inputs with `background: var(--bs-body-bg)` — identical to the page, so fields visually disappear.

## Constraints (standing rules)

- No gradient washes; "looks AI built." Weight comes from scale/type/spacing. (`[[feedback-no-gradient-washes]]`)
- No competitor references anywhere in code or copy. (`[[feedback-no-competitor-references]]`)
- Reuse the existing token + mixin vocabulary (`design-tokens`, `_board.scss`). Do **not** invent a parallel design language.
- Frontend only. Everything below is buildable from data already on the session (`UserData`: `picture`, `country`, `pronouns`, `aka`, `socials`, roles). No new backend route.

## The four moves

### 1. Identity masthead (biggest win)

Replace the thin eyebrow+title in `ConsoleChrome`'s header with a real identity block, shown on every settings page.

- **New component** `src/components/console-chrome/console-identity.tsx` + styles.
- Content: Twitch avatar (`picture`, `board-avatar` mixin) · username (links to public profile) · country flag + name · role badges (`<Can>` / existing role chips, e.g. Supporter/Mod) · a right-aligned **"View public profile"** quiet link.
- Wiring: extend `ConsoleHeader` with an optional `identity?: ReactNode` slot. `ConsoleChrome` renders `identity` in place of the eyebrow/title stack when present; manage-console callers pass nothing and keep today's header (no regression).
- `SettingsChrome` builds the identity node from the session user.
- Data: session only. **No** run-stat fetch in v1 — avoids a request on every settings page and a loading state in the masthead. (Run counts can be a follow-up once justified.)

### 2. Fix the inputs (cheap, high polish)

- Delete the bespoke flat inputs in `profile/profile-form.module.scss`; route all `input/select/textarea` through the shared `board-input-rules` mixin (inset surface, real focus ring). Same treatment audited across `livesplit`, `preferences`, `patreon`, `appearance` so every field looks like one system.
- Sharpen labels: the `.field span` label already exists — keep 600 weight, add the tertiary-color + letter-spacing treatment used by `board-dialog-field-label` so labels read as labels, not body text.

### 3. Live "how you appear" preview on the profile page

- A compact right-column card on `profile/page.tsx` echoing the existing `liveCard` pattern from `appearance/customization/preview-pane.tsx`: avatar + name-chip + country flag, reflecting the form's live values (name is static from session; country/pronouns update as you type).
- On ≥ `board-page-columns` breakpoint it sits beside the form; below, it stacks under the first section. Reuse `board-page-columns` mixin.
- Purpose: close the "editing into a void" gap. Kept intentionally small — this is a mirror, not the Appearance page's full editor.

### 4. Sidebar + section craft

- **Sidebar identity chip:** small avatar + username at the top of `ConsoleSidebar` (above the first group) when an `identity` slot is present. Anchors the rail.
- **Section objects:** wrap each `FormSection` body in a subtle `board-surface` tint with a hairline top divider so a page reads as distinct blocks, not a wall of labels. Applied via the shared `form-kit` `FormSection` so every settings page benefits at once (verify no manage-console regression, since `FormSection` is shared — if it regresses, gate the tint behind a variant prop).
- Tighten the pane header: eyebrow/title/lede spacing per tokens; kill the flat `opacity: 0.75` lede in favor of `--bs-secondary-color`.

## Files touched

**New**
- `src/components/console-chrome/console-identity.tsx`
- `src/components/console-chrome/console-identity.module.scss` (or fold into `console.module.scss`)
- `app/(new-layout)/settings/profile/profile-preview.tsx`

**Edited**
- `src/components/console-chrome/console-chrome.tsx` — `identity` slot
- `src/components/console-chrome/console-sidebar.tsx` — identity chip slot
- `src/components/console-chrome/console.module.scss` — header/sidebar tweaks
- `app/(new-layout)/settings/settings-chrome.tsx` — build identity from session
- `app/(new-layout)/settings/profile/profile-form.{tsx,module.scss}` — inputs + preview column
- `app/(new-layout)/settings/settings.module.scss` — pane header/lede
- `.../manage/shared/form-kit` `FormSection` — section-object tint (guarded)
- audit inputs in `livesplit`, `preferences`, `patreon`, `appearance`

## Build order (subagent-driven, review between tasks)

1. **Masthead** — identity component + `ConsoleChrome` slot + `SettingsChrome` wiring. (Visible win first.)
2. **Inputs** — `board-input-rules` everywhere + label treatment + section-object tint (`FormSection`).
3. **Profile preview** — right-column mirror card.
4. **Sidebar chip + pane-header polish** — finish the shell.
5. **Cross-page audit** — walk all six settings pages; confirm manage console unregressed; browser pass.

Each task ends with a browser check before the next starts.

## Risks

- `FormSection` and `ConsoleChrome`/`ConsoleSidebar` are **shared** with the manage/admin console. Every change to them must leave the manage side pixel-unchanged (optional slots default to today's rendering). Verify `/manage` and a game `manage` page after tasks 1, 2, 4.
- `board-input-rules` currently reaches manage config forms via a `.content :global(.form-control)` override; applying it directly to settings inputs must not double up. Check specificity.

## Explicitly out of scope (v1)

- Run-stat counts in the masthead (needs a fetch; defer).
- Avatar upload / decoration features.
- Any backend change.
- Reusing this as a site-wide language (that was option C; B stops at "settings feels like a product").

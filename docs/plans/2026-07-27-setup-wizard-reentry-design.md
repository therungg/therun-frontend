# Re-entering the board setup wizard after setup is done

Date: 2026-07-27
Status: implemented

## Problem

`/games-v2/[game]/setup` has no "already configured" guard — the route stays
fully usable after a board goes live. What is missing is a way to *reach* it.

The only link to the wizard anywhere in the app is in `SetupChecklistCard`
(`manage/console/setup-checklist-card.tsx`). `console-shell.tsx` renders that
card only while the `finish` step is not yet `done`; once the board is
configured it swaps in `BoardHealthCard`, which links to console panes and
never to the wizard. The card's own `complete` branch — the one that renders
the "Revisit setup" label — is therefore unreachable dead code, and its
leading comment ("A finished board still shows the card — it's the console's
only door back into the wizard") is stale.

Nothing else links to `/setup`: not the console sidebar (`nav-model.ts` has no
setup item), not the board masthead mod door, not the cross-game hub at
`/games-v2/manage`.

Result: after a board admin finishes setup, the wizard is reachable only by
typing the URL.

## Decision

Give the wizard a permanent address in the console sidebar, and make the
wizard's last step read correctly when it is revisited rather than completed.

Considered and rejected: adding a "Revisit setup" link to `BoardHealthCard`
(only visible on panes where `showSetupCard()` is true, so still
situational), and reviving the checklist card's complete branch (keeps the
door tied to a card that comes and goes).

## Changes

### 1. `setup` nav item

`manage/console/nav-model.ts`:

- Add `'setup'` to `NavItemId`.
- Add it as the **first** item of the `game` group: label `Setup wizard`,
  `categoryScoped: false`.
- No change to `itemVisible` — game-group items already require
  `flags.canConfigure`, which is the same ability the `/setup` page gates on
  (`edit` / `category-settings` for this game).
- Add `'setup'` to the never-a-landing-pane set alongside `history`,
  `roster` and `reports`. It navigates away from the console, so it is never
  an active pane; without the guard a hand-typed `?pane=setup` would select
  a pane `ContentRouter` cannot render.

  Found during implementation: that set has to be shared with `defaultItem`,
  not just `isLandingPaneId`. `defaultItem` returned `groups[0].items[0].id`
  verbatim, so making `setup` the first Game item would have made it the
  landing pane for any viewer whose first group is `game` — i.e. a board
  configurer who isn't a moderator — leaving them on a blank console. Both
  functions now read a shared `NON_LANDING_IDS`, and `defaultItem` returns
  the first item that isn't in it.

`manage/console/console-sidebar.tsx`:

- Add a `NAV_ICON` entry. Use `ListCheck` from `react-bootstrap-icons`,
  consistent with the existing icon set (no emoji).

`manage/console/console-shell.tsx`:

- In `handleNavigate`, handle `'setup'` with an early return that pushes
  `/games-v2/${game.name}/setup` — the same shape `'roster'` already uses.
  It must not write `?pane=` or call `setActiveItem`.

The wizard already links back: its header renders a `BackLink` to
`/games-v2/[game]/manage` ("Back to console"), so the round trip closes with
no further work.

The item is visible whether or not setup is finished. The checklist card
continues to handle the "you are not done yet" nudge while setup is
incomplete; the nav item is the stable address, not a nag.

### 2. Finish step on an already-live board

`setup/steps/step-finish.tsx`. Derive `alreadyLive` from the completeness
data the step already receives:

```ts
const alreadyLive =
    data.completeness.steps.find((s) => s.step === 'finish')?.status === 'done';
```

When `alreadyLive`:

- `StepHeader` copy reads as a review rather than a launch — title
  "Mod team and setup review", lede adjusted to match (no "put the board
  live").
- The `Finish setup` button is replaced by a primary "Back to console" link
  to `/games-v2/${data.game.name}/manage`. `setGameConfiguredAction` is a
  no-op against a board that is already configured, so it is not fired.
- The review list, the blocker note and the warning note render unchanged. A
  blocker that appeared after launch (e.g. every category unfeatured) is
  worth surfacing on a revisit.

The moderator add/remove section is unchanged in both states.

Everything else about re-entry stays as it is. `SetupPage` computes
`initialStep` as `completeness.firstIncomplete ?? 'details'`; on a complete
board `firstIncomplete` is `null`, so the wizard lands on step 1 (Game
details). That is the intended landing step — no change.

### 3. Cleanup

`manage/console/setup-checklist-card.tsx`:

- Remove the unreachable `complete` branch (the `Revisit setup` label and the
  `setupCardQuietAction` styling path). The card only ever renders while
  setup is incomplete.
- Replace the stale leading comment with one that names the sidebar item as
  the door back into the wizard.
- If `styles.setupCardQuietAction` becomes unused in
  `manage/console/console.module.scss`, remove it too.

## Testing

`manage/console/nav-model.test.ts` (pure functions, matching how the file is
already tested):

- `buildNav` includes `setup` in the `game` group when `canConfigure` is
  true, and omits it when false.
- `setup` is the first item of the `game` group.
- `isLandingPaneId('setup', visible)` is `false` even when `setup` is in the
  visible list.
- `resolveInitialPane('setup', null, groups)` falls back to the default pane
  rather than returning `'setup'`.

Manual pass (dev server): from a configured board's console, the Game group
shows "Setup wizard"; clicking it lands on the wizard at step 1; "Back to
console" returns; the finish step shows the review copy and a "Back to
console" link instead of "Finish setup". On an unconfigured board the
checklist card and the nav item coexist and the finish step is unchanged.

## Out of scope

- Any guard that blocks `/setup` for configured boards. The route stays open.
- Entry points outside the console (board masthead mod door, cross-game hub).
- Per-game "last step visited" memory for the wizard.

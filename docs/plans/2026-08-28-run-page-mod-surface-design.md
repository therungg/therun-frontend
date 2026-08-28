# Retire the run-inspector drawer; move moderation onto the run page

**Date:** 2026-08-28
**Repo:** therun-fr (frontend only — no backend changes)
**Status:** Design — not yet implemented

## Problem

Clicking a board row on the games-v2 leaderboard opens the `RunInspector`
drawer for mods/owners instead of navigating. We want a board row to behave
like a link: **hover** shows run-specific info, **click** goes to the run page.
The drawer's moderation surface moves onto the run detail page itself, so the
run page is the single place to view *and* moderate a run.

## Goals

1. A board row is a link for everyone. Click → run detail page. No drawer.
2. Hovering a board row shows a **run-specific** hover card (this row's time,
   rank, date, video, platform). The runner **name** keeps its existing
   **user** hover card — two cards, each on its own zone of the row.
3. The full mod surface currently in the drawer lands on the run detail page,
   gated by `isMod`. Full parity, including the VOD review workbench.
4. Manual/set-time runs get the same treatment on `manual/[manualTimeId]`.
5. `RunInspector` and `ManualInspector` are deleted, along with all host wiring.

## Non-goals

- No backend/API changes. Every server action the drawer calls already exists
  and is shared with the mod console; they stay.
- No change to the shared verdict engine (`RunActionForm` / `RunActionDialog`),
  the `MoveDialog` / `AdjustDialog` / `HideIdentityDialog`, or the VOD review
  components. They are reused as-is.
- Not touching the separate `manage/run/[runId]` console page in this pass
  (it keeps its stripped verdict card). See "Open question" below.
- No owner-mode port from the drawer — the run page's `run-actions.tsx`
  already covers owner self-service.

## Current state (verified)

### Board row → drawer (to be removed)
- `leaderboard/leaderboard-row.tsx`
  - `detailHref` (lines 187–192): `/games-v2/{game}/run/{runId}` for runs,
    `/games-v2/{game}/manual/{manualTimeId}` for set-times.
  - `opensInspector = canManage && onModerate != null` (line 226). When true the
    time cell renders a `<button onClick={onModerate(entry)}>` (238–252) instead
    of the stretched `<Link href={detailHref}>` (253–254).
  - Kebab / quick-remove / manage buttons also call `onModerate` (499–553).
  - Runner name renders through `<UserLink>` → already carries the **user**
    hover card (`HoverCardAnchor` → `UserHoverCard`, `/users/global?card=1`).
- Host A `leaderboard/leaderboard-pager.tsx`: imports (28, 30); state
  `inspectRunId`/`inspectManualId`/`inspectVerb` (201–206); derived
  `inspectEntry`/`inspectManualEntry` + stale-clear effects (308–336);
  `inspectorMode` (364); `openModerate` (368–389); `onModerate` prop (633–636);
  `<RunInspector>` (663–723); `<ManualInspector>` (724–770). Note
  `hideIdentityOpen` (213) + its dialog (~650–662) is opened via the drawer's
  `onOpenHideIdentity` but is a board-wide dialog — see Risk 1.
- Host B `manage/boards/board-curation.tsx`: import (43); state `inspectRunId`
  (358), `inspectVerb` (360); derived `inspectEntry` (534–548); `onModerate`
  (1066–1069); `<RunInspector>` (1086–1131). Runs only — no ManualInspector.

### What the run page already has
- `run/[runId]/page.tsx` — server component. Loads run (`getRunById`,
  de-redact via `getRunByIdAsViewer`), `getRunHistory`, `getRunProvenance`
  (mod only), board standing (`getUserRankingsByName`). Auth: `getSession()`,
  `isMod = canModerateGame(session, game.name)`. Renders `<RunView>` with
  `model`, `history`, `sessionUsername`, `isMod`, and `modPanel` slot
  (currently `<ModProvenancePanel>`).
- `run-view/run-view.tsx` — presentational; has a `modPanel` slot.
- `run-view/run-actions.tsx` — **owner-facing only**, no mod verbs (report,
  appeal, correct, move-my, hide-my-identity, hide/restore-my).
- `run-view/run-evidence-panel.tsx` — mod + owner **evidence editing**
  (`attachVodAction`, `updateManualTimeAction`, `selfSet*EvidenceAction`),
  takes `isMod`. VOD attach/change already works on the page.
- `run-view/mod-provenance-panel.tsx` — read-only provenance + link to console.
- `manual/[manualTimeId]/page.tsx` — same shape for set-times
  (`getManualTimeById`, de-redact, provenance), renders `<RunView>` with
  `model.kind='manual'`, `history=[]`, `boardStanding=null`.

### The drawer's mod surface to port (from `run-inspector.tsx`, `mode='mod'`)
- **Verb footer** — `RunActionForm` (1477–1513), verbs from `verbsForStatus`
  (225): pending→approve, verified→unverify, rejected→restore, always +remove.
  Reject is folded into remove's notify toggle. Ban routes to the runner page
  (1244–1251) — not a drawer control, unchanged.
- **Move…** → `MoveDialog` (mod path `moveRunAction`) (1398–1404, 1556–1587).
- **Adjust time…** → `AdjustDialog` (1411–1417, 1605–1614).
- **Hide identity…** → `HideIdentityDialog` (1424–1436, 1615–1627).
- **Evidence + VOD review** — `EvidenceSection` (298–536): attach/change VOD,
  and the `ReviewPane`/`ReviewVodPanel`/`ReviewingCard` frame-step workbench.
- **Timeline undo** — `TimelineUndoButton` per history event (162–215),
  calls applyVerdicts/restore/exclude/marks directly.
- **Context** it shows: rank, previous best, outlier warning, runner board
  count, keyboard verbs (v/x/j/k). Nice-to-have; see "Context" below.
- Own-data reads it does lazily on open: `loadRunHistoryAction`,
  `loadUserEligibleRunsAction`/`loadSelfEligibleRunsAction`,
  `loadModBoardContextAction`/`loadOwnerBoardContextAction`.

### ManualInspector's mod surface (`manual-inspector.tsx`, `mode='mod'`)
- Verbs from `manualVerbsForStatus` (141): not-verified→approve,
  not-rejected→reject, always +remove (remove = hard delete). `RunActionForm`
  with `target.manualTimeIds=[id]` (625–638).
- **Change time…** → `ManualTimeDialog` (608–614, 667–691) — value + evidence.
- No Move / Adjust / Hide identity (a manual time has no finished_run).
- Own-data reads: `loadUserEligibleRunsAction`, `loadModBoardContextAction`,
  `loadOwnerEvidenceAction`.

## Design

### 1. Board row → link (both hosts)
In `leaderboard-row.tsx`, delete the `opensInspector` branch: the time cell is
always the stretched `<Link href={detailHref}>`. Remove the `onModerate` prop
and the kebab/quick-remove/manage buttons that call it (499–553), since the
drawer they opened no longer exists. The board no longer has an inline mod
affordance — moderation happens on the run page after clicking through.

Both hosts drop all drawer state and render blocks (exact ranges in "Current
state"). Preserve `leaderboard-pager`'s board-wide `hideIdentityOpen` dialog if
anything other than the drawer opens it (Risk 1) — otherwise remove it too.

### 2. Run-specific hover card (new)
New `src/components/run/run-hover-card/` mirroring the user hover-card pattern:
- `run-hover-card.tsx` — presentational card: time (primary + fallback timing),
  rank + total, date achieved, video/VOD indicator, platform, verified/pending
  status. **All fields come from the `LeaderboardEntry` the row already has —
  no new fetch.** (Contrast with the user card, which fetches `?card=1`.)
- Reuse the existing `HoverCardAnchor` hover-intent + portal mechanics
  (`src/components/user/hover-card/hover-card-anchor.tsx`) — generalize it to
  accept arbitrary card content, or clone its intent/portal logic into a small
  `RunHoverCardAnchor`. Prefer generalizing to avoid duplicated hover-intent.
- Wire in `leaderboard-row.tsx`: wrap the row body / time cell zone (NOT the
  runner-name zone) so hovering the row body shows the run card while hovering
  the name still shows the user card. Two anchors, two zones, no overlap.

### 3. Run page mod surface (new `RunModPanel`)
New `run-view/run-mod-panel.tsx` (client), rendered in the run page's existing
`modPanel` slot when `isMod`. It replaces `ModProvenancePanel` as the slot's
content, or sits alongside it (provenance timeline stays). It reuses, unchanged:
- `RunActionForm` for the verb footer (approve/unverify/reject/restore/remove),
  driven by `verbsForStatus` on the run's current status.
- `MoveDialog`, `AdjustDialog`, `HideIdentityDialog` (mod path).
- The `EvidenceSection` VOD review workbench (`ReviewPane`/`ReviewVodPanel`) —
  ported so frame-stepped verification survives. Evidence attach/change already
  lives in `run-evidence-panel.tsx`; consolidate so the workbench and the
  attach/change control are one surface, not two.
- `TimelineUndoButton` per history event, folded into the provenance/history
  list the page already renders.

Data: the page already loads history + provenance + board standing server-side,
so pass those in as props instead of the drawer's lazy client reads. The
board-context read (`loadModBoardContextAction`, for Move/Adjust category +
variable options) is still needed client-side when a dialog opens — keep that
lazy load inside the dialog wrapper, as the drawer did.

**Context (rank / previous best / outlier / runner board count):** the run page
already computes board standing (rank + total). Port the previous-best and
outlier hints if cheap from data already loaded; otherwise defer — they are
informational, not blocking.

### 4. Manual run page mod surface
New `run-view/manual-mod-panel.tsx` (or a `kind`-branch inside
`run-mod-panel.tsx`) rendered on `manual/[manualTimeId]` when `isMod`:
- `RunActionForm` with `manualTimeIds`, verbs from `manualVerbsForStatus`.
- `ManualTimeDialog` (change time + evidence).
- No Move/Adjust/Hide identity.
- `manual/[manualTimeId]/page.tsx` currently loads no history (`history=[]`) —
  fine; manual runs have no run-history timeline in the drawer either.

### 5. Delete
- `leaderboard/run-inspector.tsx`, `leaderboard/manual-inspector.tsx`,
  `run-inspector.module.scss`, `manual-inspector.module.scss`.
- Orphaned-only helpers: `history-undo.ts`, `mod-row.ts` (`entryToRosterRow`),
  and the `vod-review/` folder **only if** nothing else imports them (the mod
  panel will reuse the VOD-review + `RunActionForm` pieces, so those stay —
  verify each before deleting).
- Tests: `run-inspector.test.ts`, `run-inspector-owner.test.tsx`,
  `manual-inspector*.test.*`. Update `leaderboard-pager.test.tsx` for the
  removed drawer wiring. New tests for `RunModPanel` and the run hover card.

## Data flow

Board row (`entry: LeaderboardEntry`) → `<Link>` to run/manual page → server
component loads run + history + provenance + standing → `<RunView>` renders
`<RunModPanel isMod entry-equivalent model history standing/>` in `modPanel`.
Mod verbs call the same shared server actions the drawer called; on success the
run page revalidates its own cache tags (the drawer's `onMutated` refetched the
board; here the run page is the surface, so revalidate the run + board tags).

## Error handling / correctness

- Verb actions already surface `ApiError` via the shared `RunActionForm`; reuse
  its existing error UI. No new error path.
- **Read-your-writes:** after a mod verb the run page must reflect the new
  status without a stale-while-revalidate gap. Use `updateTag` (not
  `revalidateTag`) for the run's own tag so the surface reads its own write
  (per the caching memory); revalidate the board tag as SWR since the board is
  a different surface.
- De-redaction: the run page already re-reads hidden/redacted runs as the
  viewer; the mod panel operates on the mod-visible model, unchanged.

## Testing

- Unit: `RunModPanel` renders the correct verbs per status (pending/verified/
  rejected); manual panel renders manual verbs; hover card renders run fields
  from an entry with/without VOD, with/without game-time.
- Integration: `leaderboard-pager` no longer mounts a drawer; row is a link.
- Manual browser pass: board row hover (both cards, correct zones), click →
  run page, mod verbs + Move/Adjust/Hide identity + VOD review workbench all
  function on the page; same for a set-time via `manual/[id]`.

## Risks

1. **`hideIdentityOpen` in `leaderboard-pager` (line 213)** is a board-wide
   dialog opened via the drawer's `onOpenHideIdentity` (680). Confirm whether
   anything else opens it before removing. If drawer-only, remove; hide-identity
   moves to the run page's mod panel.
2. **Shared component reuse vs. deletion.** `MoveDialog`/`AdjustDialog`/
   `HideIdentityDialog`/`EvidenceSection`/`RunActionForm`/vod-review are shared
   with the mod console and/or reused by the new panel — delete ONLY the drawer
   shells, verify every "orphaned" helper has zero remaining importers first.
3. **Losing the board-level quick-moderate.** Mods currently remove/verify
   without leaving the board (kebab → drawer). After this, moderation is one
   click away (row → run page). Accepted per the design goal, but it is a
   workflow change for mods doing bulk triage — the `manage/moderation/*`
   console lists remain for bulk work.
4. **Manual page has no history load.** If the manual mod panel wants a
   timeline, `manual/[manualTimeId]/page.tsx` must add a provenance/history
   load. Drawer didn't show manual run-history, so parity = no timeline; skip.

## Open question (not blocking)

The `manage/run/[runId]` console page stays as its stripped verdict card. With
full mod controls now on the public run page, that console page is largely
redundant. Leave it for now; revisit whether to retire or redirect it in a
follow-up.

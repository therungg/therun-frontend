# Run-Page Moderation Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a board row a link (hover shows a run card, click opens the run page), move the run-inspector drawer's full moderation surface onto the run detail page, keep the board's quick-verify/remove as an inline dialog, and delete the drawer.

**Architecture:** The games-v2 board row stops opening the `RunInspector`/`ManualInspector` drawer. It becomes a stretched `<Link>` for everyone; its body zone gets a new run-specific hover card while the runner name keeps the existing user hover card. The board's kebab quick-actions now open the shared `RunActionDialog` inline instead of the drawer. The drawer's mod controls (verb footer, Move/Adjust/Hide-identity dialogs, VOD-review workbench, timeline undo) are reassembled into a `RunModPanel` (and a manual variant) rendered in the run page's existing `modPanel` slot, gated by `isMod`. All the reused dialogs and the shared verdict engine already exist; this is relocation + rewiring, not new business logic. Then the two drawer files and their host wiring are deleted.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Biome, vitest, SCSS modules.

**Spec:** `docs/plans/2026-08-28-run-page-mod-surface-design.md`

## Global Constraints

- Frontend-only. No backend/API changes. Every server action reused here already exists.
- Biome formatting: 4-space indent, single quotes, trailing commas, semicolons. Unused vars prefixed `_`.
- `typecheck`/`lint` are NOT clean on `main` (~356 pre-existing errors). Gate on a baseline diff, never exit 0. Run `npm run typecheck` before and after; only new errors count.
- Caching: functions using `'use cache'` add `cacheLife()` + `cacheTag()`. `revalidateTag(tag, profile)` takes 2 args and is stale-while-revalidate; for read-your-writes on the same surface use `updateTag(tag)`.
- Never reference speedrun.com / "SRC" in user-facing copy.
- The runner **name** on a board row must keep its existing user hover card (`UserLink` → `HoverCardAnchor`). The new run card attaches to the row **body/time zone only** — never overlapping the name.
- Do NOT push to `main` in this repo. Work on a branch; the user opens the PR.
- Reused, DO-NOT-MODIFY components: `RunActionForm`/`RunActionDialog` (`manage/moderation/shared/run-action-dialog.tsx`), `MoveDialog`, `AdjustDialog`, `HideIdentityDialog`, `ManualTimeDialog`, the `vod-review/` review pane. Import and reuse; do not fork.

## File Structure

**Create:**
- `src/components/user/hover-card/hover-anchor.tsx` — generic hover-intent + portal positioning anchor (content-agnostic), extracted from `hover-card-anchor.tsx`.
- `src/components/run/run-hover-card/run-hover-card.tsx` — presentational run card (renders from a `LeaderboardEntry`, no fetch).
- `src/components/run/run-hover-card/run-hover-card.module.scss` — card styles.
- `src/components/run/run-hover-card/run-hover-card-anchor.tsx` — wraps `HoverAnchor` with the run card.
- `src/components/run/run-hover-card/__tests__/run-hover-card.test.tsx`
- `app/(new-layout)/games-v2/[game]/run-view/run-mod-panel.tsx` — the ported mod surface for real runs.
- `app/(new-layout)/games-v2/[game]/run-view/run-mod-panel.module.scss`
- `app/(new-layout)/games-v2/[game]/run-view/manual-mod-panel.tsx` — the ported mod surface for manual/set-times.
- `app/(new-layout)/games-v2/[game]/run-view/__tests__/run-mod-panel.test.tsx`
- `app/(new-layout)/games-v2/[game]/run-view/__tests__/manual-mod-panel.test.tsx`

**Modify:**
- `src/components/user/hover-card/hover-card-anchor.tsx` — delegate to `HoverAnchor`.
- `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx` — row→link, run card anchor, `onModerate`→`onQuickModerate`.
- `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-pager.tsx` — drop drawer, add inline `RunActionDialog`.
- `app/(new-layout)/games-v2/[game]/manage/boards/board-curation.tsx` — drop drawer, add inline `RunActionDialog`.
- `app/(new-layout)/games-v2/[game]/run/[runId]/page.tsx` — mount `RunModPanel` in `modPanel`.
- `app/(new-layout)/games-v2/[game]/manual/[manualTimeId]/page.tsx` — mount `ManualModPanel` in `modPanel`.
- `app/(new-layout)/games-v2/[game]/run-view/run-view.tsx` — no interface change (slot is generic `ReactNode`); only touch if a second slot is needed.

**Delete (Task 11, last):**
- `app/(new-layout)/games-v2/[game]/leaderboard/run-inspector.tsx` (+ `.module.scss`)
- `app/(new-layout)/games-v2/[game]/leaderboard/manual-inspector.tsx` (+ `.module.scss`)
- Their tests: `run-inspector.test.ts`, `run-inspector-owner.test.tsx`, `manual-inspector*.test.*`
- Orphaned-only helpers `history-undo.ts`, `mod-row.ts` — ONLY after confirming zero remaining importers.

---

### Task 1: Extract a generic `HoverAnchor`

Refactor the working user hover card so its positioning/intent mechanics are reusable by the run card. Behavior of the user card must not change (its existing test is the guard).

**Files:**
- Create: `src/components/user/hover-card/hover-anchor.tsx`
- Modify: `src/components/user/hover-card/hover-card-anchor.tsx`
- Test: `src/components/user/hover-card/__tests__/hover-card-anchor.test.tsx` (existing — must stay green)

**Interfaces:**
- Produces: `HoverAnchor` component and `AnchorHandlers` (moved here).
  ```ts
  export interface AnchorHandlers {
      ref: (node: HTMLElement | null) => void;
      onPointerEnter: (event: React.PointerEvent) => void;
      onPointerLeave: () => void;
      onFocus: () => void;
      onBlur: () => void;
  }
  export interface HoverAnchorProps {
      children: (handlers: AnchorHandlers) => React.ReactNode;
      /** Card content, rendered inside the positioned portal layer. */
      card: React.ReactNode;
      /** Fixed layer width in px (was CARD_WIDTH). */
      cardWidth: number;
  }
  export function HoverAnchor(props: HoverAnchorProps): React.JSX.Element;
  ```
- Consumes: nothing new. Lift the existing `createHoverIntent`, `placeCard`, `availableHeight`, `styles.layer`, and the `createPortal` block from `hover-card-anchor.tsx` verbatim into `hover-anchor.tsx`, replacing the hardcoded `<UserHoverCard username context/>` with `{card}` and `CARD_WIDTH` with `cardWidth`.

- [ ] **Step 1: Verify the existing user-card test passes first (baseline)**

Run: `npx vitest run src/components/user/hover-card/__tests__/hover-card-anchor.test.tsx`
Expected: PASS (this is the behavior we must preserve).

- [ ] **Step 2: Create `hover-anchor.tsx`**

Move the intent/positioning/portal logic out of `hover-card-anchor.tsx`. The portal layer JSX becomes:

```tsx
return (
    <>
        {children(handlers)}
        {placement && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      className={styles.layer}
                      style={{
                          left: placement.left,
                          top: placement.top,
                          bottom: placement.bottom,
                          width: cardWidth,
                          maxHeight: placement.maxHeight,
                      }}
                      onPointerEnter={() => intent.cancel()}
                      onPointerLeave={() => intent.leave()}
                  >
                      {card}
                  </div>,
                  document.body,
              )
            : null}
    </>
);
```

Keep the `styles` import pointing at the existing `hover-card-anchor.module.scss` (or move `.layer` into a shared module — pick one and be consistent).

- [ ] **Step 3: Rewrite `hover-card-anchor.tsx` to delegate**

```tsx
export function HoverCardAnchor({ username, context, children }: Props) {
    return (
        <HoverAnchor
            cardWidth={CARD_WIDTH}
            card={<UserHoverCard username={username} context={context} />}
        >
            {children}
        </HoverAnchor>
    );
}
```
Re-export `AnchorHandlers` from here if any other module imports it from this path (grep first).

- [ ] **Step 4: Run the existing test + typecheck**

Run: `npx vitest run src/components/user/hover-card/__tests__/hover-card-anchor.test.tsx && npm run typecheck 2>&1 | tail -5`
Expected: test PASS; no NEW typecheck errors vs. baseline.

- [ ] **Step 5: Commit**

```bash
git add src/components/user/hover-card/
git commit -m "refactor(hover-card): extract generic HoverAnchor from HoverCardAnchor"
```

---

### Task 2: Run hover card component

A presentational card built entirely from a `LeaderboardEntry` — no fetch (contrast the user card, which fetches `?card=1`).

**Files:**
- Create: `src/components/run/run-hover-card/run-hover-card.tsx`
- Create: `src/components/run/run-hover-card/run-hover-card.module.scss`
- Create: `src/components/run/run-hover-card/run-hover-card-anchor.tsx`
- Test: `src/components/run/run-hover-card/__tests__/run-hover-card.test.tsx`

**Interfaces:**
- Consumes: `HoverAnchor`, `AnchorHandlers` (Task 1); `LeaderboardEntry` (`types/leaderboards.types.ts`); the project's existing time-formatting helper (find it — the leaderboard row already formats `entry.time`/`realTime`/`gameTime`; reuse the same formatter, do not write a new one).
- Produces:
  ```ts
  export interface RunHoverCardProps {
      entry: LeaderboardEntry;
      gameTimeLabel?: 'igt' | 'lrt';
      showMilliseconds: boolean;
  }
  export function RunHoverCard(props: RunHoverCardProps): React.JSX.Element;

  export interface RunHoverCardAnchorProps {
      entry: LeaderboardEntry;
      gameTimeLabel?: 'igt' | 'lrt';
      showMilliseconds: boolean;
      children: (handlers: AnchorHandlers) => React.ReactNode;
  }
  export function RunHoverCardAnchor(props: RunHoverCardAnchorProps): React.JSX.Element;
  ```

Card content (fields all exist on `LeaderboardEntry`): primary time (+ fallback timing if the row shows both), `rank`, `runDate` (formatted; omit if null), a "Has video" indicator when `vodUrl` is set, and a `verificationStatus` badge (pending/verified/rejected). Do NOT show platform — it is not on the base `LeaderboardEntry` (only on `LeaderboardExportEntry`).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { RunHoverCard } from '../run-hover-card';
import type { LeaderboardEntry } from '~src/../types/leaderboards.types';

const base: LeaderboardEntry = {
    rank: 3,
    runnerName: 'joey',
    isGuest: false,
    time: 3_600_000,
    realTime: 3_600_000,
    gameTime: null,
    runDate: '2026-08-01',
    vodUrl: 'https://twitch.tv/x',
    verificationStatus: 'verified',
};

test('shows rank, video indicator and verified badge', () => {
    render(<RunHoverCard entry={base} showMilliseconds={false} />);
    expect(screen.getByText(/#?3/)).toBeInTheDocument();
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
    expect(screen.getByText(/video/i)).toBeInTheDocument();
});

test('omits video indicator when no vod', () => {
    render(<RunHoverCard entry={{ ...base, vodUrl: null }} showMilliseconds={false} />);
    expect(screen.queryByText(/video/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/run/run-hover-card/__tests__/run-hover-card.test.tsx`
Expected: FAIL (module not found / `RunHoverCard` undefined).

- [ ] **Step 3: Implement `run-hover-card.tsx` + `.module.scss`**

Build the card from the fields above, reusing the existing time formatter. Match the visual weight of `user-hover-card.module.scss` (same portal layer width ballpark). Then implement `run-hover-card-anchor.tsx`:

```tsx
export function RunHoverCardAnchor({
    entry,
    gameTimeLabel,
    showMilliseconds,
    children,
}: RunHoverCardAnchorProps) {
    return (
        <HoverAnchor
            cardWidth={RUN_CARD_WIDTH}
            card={
                <RunHoverCard
                    entry={entry}
                    gameTimeLabel={gameTimeLabel}
                    showMilliseconds={showMilliseconds}
                />
            }
        >
            {children}
        </HoverAnchor>
    );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/run/run-hover-card/__tests__/run-hover-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/run/run-hover-card/
git commit -m "feat(run-hover-card): run-specific hover card built from a board entry"
```

---

### Task 3: Board row → link + run card + quick-moderate prop

Turn the row into a link for everyone, attach the run card to the body zone, and rename the drawer callback to a quick-moderate callback (the kebab quick-actions stay).

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx`
- Test: co-located row test if one exists; otherwise rely on host tests + browser pass.

**Interfaces:**
- Produces: new prop contract for the row.
  ```ts
  // REMOVE: onModerate?: (entry: LeaderboardEntry, verb?: ModVerb) => void;
  // ADD:
  onQuickModerate?: (entry: LeaderboardEntry, verb: ModVerb) => void;
  ```
- Consumes: `RunHoverCardAnchor` (Task 2), `ModVerb` (`manage/moderation/shared/action-model.ts`).

- [ ] **Step 1: Remove the `opensInspector` branch (lines ~226, 238–254)**

Delete `const opensInspector = canManage && onModerate != null;`. The time cell always renders the stretched `<Link href={detailHref}>` path (the existing non-mod branch at lines 253–254). Delete the `<button onClick={() => onModerate?.(entry)}>` branch (238–252).

- [ ] **Step 2: Wrap the row body zone in `RunHoverCardAnchor`**

Attach the anchor to the row body / time cell container — NOT the `<UserLink>` name cell. Pass `entry`, the board's `gameTimeLabel`, and `showMilliseconds` (already row props). Wire `handlers` onto the body element:

```tsx
<RunHoverCardAnchor
    entry={entry}
    gameTimeLabel={gameTimeLabel}
    showMilliseconds={showMilliseconds}
>
    {(handlers) => (
        <td className={styles.timeCell} {...handlers}>
            <Link href={detailHref}>{/* time content */}</Link>
        </td>
    )}
</RunHoverCardAnchor>
```
(Exact element structure follows the current row; the anchor's `ref`/pointer handlers land on the hovered zone.)

- [ ] **Step 3: Rename the moderation prop + retarget the kebab buttons**

Change the prop from `onModerate` to `onQuickModerate(entry, verb)`. The kebab / quick-remove / manage buttons (lines ~499–553) now call `onQuickModerate(entry, 'remove')` etc. — same call sites, new name, and they always pass an explicit verb.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: errors ONLY in the two host files that still pass `onModerate` (fixed in Tasks 4–5). No other new errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/leaderboard/leaderboard-row.tsx
git commit -m "feat(leaderboard-row): row is a link with a run hover card; rename onModerate to onQuickModerate"
```

---

### Task 4: Host A (`leaderboard-pager`) — inline quick-moderate, drop drawer

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-pager.tsx`
- Test: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-pager.test.tsx` (update)

**Interfaces:**
- Consumes: `RunActionDialog` (`manage/moderation/shared/run-action-dialog.tsx`), `RunActionTarget` (same module / `action-model.ts`), `ModVerb`.

- [ ] **Step 1: Remove drawer imports + state + render**

Delete imports of `ManualInspector` (line 28) and `RunInspector` (line 30). Delete `inspectRunId`/`inspectManualId`/`inspectVerb` (201–206), the derived `inspectEntry`/`inspectManualEntry`/index/stale-clear effects (308–336), `inspectorMode` (364), `openModerate` (368–389), and the `<RunInspector>` (663–723) + `<ManualInspector>` (724–770) blocks.

- [ ] **Step 2: Add quick-moderate state + handler**

```tsx
const [quickAction, setQuickAction] = useState<{
    entry: LeaderboardEntry;
    verb: ModVerb;
} | null>(null);

const onQuickModerate = (entry: LeaderboardEntry, verb: ModVerb) =>
    setQuickAction({ entry, verb });
```
Pass `onQuickModerate={onQuickModerate}` to the table (replacing the old `onModerate` prop at 633–636).

- [ ] **Step 3: Render `RunActionDialog` when a quick action is pending**

Build the `RunActionTarget` from the entry (run → `runIds:[entry.runId]`; manual → `manualTimeIds:[entry.manualTimeId]` — mirror how the drawer built its target; read `run-action-dialog.tsx` `RunActionTarget` for the exact shape).

```tsx
{quickAction ? (
    <RunActionDialog
        gameSlug={gameSlug}
        verb={quickAction.verb}
        target={buildTarget(quickAction.entry)}
        onClose={() => setQuickAction(null)}
        onDone={() => {
            setQuickAction(null);
            onMutated(); // existing board refetch
        }}
    />
) : null}
```

- [ ] **Step 4: Decide `hideIdentityOpen` (Risk 1)**

Grep the file: is `hideIdentityOpen` (state ~213, dialog ~650–662) opened by anything other than the removed drawer's `onOpenHideIdentity`?
Run: `grep -n "hideIdentityOpen\|setHideIdentityOpen\|onOpenHideIdentity" app/\(new-layout\)/games-v2/\[game\]/leaderboard/leaderboard-pager.tsx`
- If drawer-only: remove the state + dialog (hide-identity now lives on the run page).
- If opened elsewhere: keep it.

- [ ] **Step 5: Update the host test + typecheck + run test**

Remove drawer-mounting assertions from `leaderboard-pager.test.tsx`; assert a row click is a link (no drawer) and that a kebab quick-remove mounts `RunActionDialog`.
Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/leaderboard/leaderboard-pager.test.tsx && npm run typecheck 2>&1 | tail -5`
Expected: test PASS; no new typecheck errors from this file.

- [ ] **Step 6: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/leaderboard/
git commit -m "feat(leaderboard-pager): inline RunActionDialog quick-moderate, remove drawer"
```

---

### Task 5: Host B (`board-curation`) — inline quick-moderate, drop drawer

Same shape as Task 4, runs-only (no manual entries here).

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/boards/board-curation.tsx`

**Interfaces:**
- Consumes: `RunActionDialog`, `RunActionTarget`, `ModVerb`.

- [ ] **Step 1: Remove drawer import + state + render**

Delete import of `RunInspector` (line 43), state `inspectRunId` (358)/`inspectVerb` (360), derived `inspectEntry` (534–548), the `onModerate` inline handler (1066–1069), and the `<RunInspector>` block (1086–1131).

- [ ] **Step 2: Add quick-moderate state + handler + dialog**

Same `quickAction` state and `RunActionDialog` render as Task 4, Steps 2–3. `onDone` calls this host's existing board-refetch (find its `onMutated`/refetch equivalent). Pass `onQuickModerate` to the table where `onModerate` was passed.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: no new errors. The drawer is now referenced by zero hosts (Task 11 can delete it).

- [ ] **Step 4: Commit**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/boards/board-curation.tsx
git commit -m "feat(board-curation): inline RunActionDialog quick-moderate, remove drawer"
```

---

### Task 6: `RunModPanel` scaffold + verb footer, wired into the run page

The mod surface on the public run page. Start with the verb footer (the most-used control) and wire it into the page so a mod sees verbs on `run/[runId]`.

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/run-view/run-mod-panel.tsx`
- Create: `app/(new-layout)/games-v2/[game]/run-view/run-mod-panel.module.scss`
- Modify: `app/(new-layout)/games-v2/[game]/run/[runId]/page.tsx`
- Test: `app/(new-layout)/games-v2/[game]/run-view/__tests__/run-mod-panel.test.tsx`

**Interfaces:**
- Consumes: `RunActionForm` (`run-action-dialog.tsx`), `verbsForStatus` — **note:** `verbsForStatus` currently lives in `run-inspector.tsx` (deleted in Task 11). Move it into `manage/moderation/shared/action-model.ts` (or a small `verb-status.ts`) in this task and import from there; update any other importer. Also `RunViewModel` (`run-view/run-view.tsx`), `RunActionTarget`.
- Produces:
  ```ts
  export interface RunModPanelProps {
      model: RunViewModel;         // kind === 'run'
      gameSlug: string;
      history: HistoryEvent[];
      provenance: RunProvenance | null;
  }
  export function RunModPanel(props: RunModPanelProps): React.JSX.Element;
  ```

- [ ] **Step 1: Move `verbsForStatus` to a shared module**

Cut `verbsForStatus` (run-inspector.tsx:225–234) into `manage/moderation/shared/action-model.ts`, exported. Re-import it in `run-inspector.tsx` (still present until Task 11) so nothing breaks mid-plan.
Run: `npm run typecheck 2>&1 | tail -5` → no new errors.

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { RunModPanel } from '../run-mod-panel';

const model = {
    kind: 'run', id: 1, /* ...minimal RunViewModel... */,
    verificationStatus: 'pending',
} as any;

test('pending run offers Verify and Remove', () => {
    render(<RunModPanel model={model} gameSlug="g" history={[]} provenance={null} />);
    expect(screen.getByText(/verify/i)).toBeInTheDocument();
    expect(screen.getByText(/remove/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/run-view/__tests__/run-mod-panel.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement the scaffold + verb footer**

Render a framed panel. Compute `verbsForStatus(model.verificationStatus)`; for each verb render a button that opens `RunActionForm` inline (target `{ runIds: [model.id] }`). Reuse `VERB_TITLE` for labels. On `onDone`, trigger a run-surface refresh (Step 6). Keep visual chrome consistent with `mod-provenance-panel`.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/run-view/__tests__/run-mod-panel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Wire into `run/[runId]/page.tsx`**

The page's `modPanel` currently renders only `<ModProvenancePanel>`. Render both — mod panel above provenance:

```tsx
modPanel={
    isMod ? (
        <>
            <RunModPanel
                model={/* the same model object built above */}
                gameSlug={game.name}
                history={history}
                provenance={provenance}
            />
            <ModProvenancePanel
                provenance={provenance}
                history={history}
                gameSlug={game.name}
                runId={runId}
            />
        </>
    ) : undefined
}
```
Read-your-writes: after a verb, the surface must reflect the new status. Use `updateTag(<run tag>)` for this run's own cache tag inside the reused actions' revalidation path if not already; revalidate the board tag as SWR. (Verify how the shared actions revalidate — they already do for the console; confirm the run page's tag is included.)

- [ ] **Step 7: Typecheck + test + commit**

Run: `npm run typecheck 2>&1 | tail -5 && npx vitest run app/\(new-layout\)/games-v2/\[game\]/run-view/__tests__/run-mod-panel.test.tsx`
Expected: no new typecheck errors; test PASS.

```bash
git add app/\(new-layout\)/games-v2/\[game\]/run-view/run-mod-panel.tsx app/\(new-layout\)/games-v2/\[game\]/run-view/run-mod-panel.module.scss app/\(new-layout\)/games-v2/\[game\]/run/\[runId\]/page.tsx app/\(new-layout\)/games-v2/\[game\]/manage/moderation/shared/action-model.ts app/\(new-layout\)/games-v2/\[game\]/run-view/__tests__/run-mod-panel.test.tsx
git commit -m "feat(run-mod-panel): verb footer on the run page, gated by isMod"
```

---

### Task 7: `RunModPanel` — Move / Adjust time / Hide identity

Add the three secondary mod dialogs the drawer exposed.

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/run-view/run-mod-panel.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/run/[runId]/page.tsx` (only if the dialogs need per-run props the page doesn't yet pass)

**Interfaces:**
- Consumes: `MoveDialog`, `AdjustDialog`, `HideIdentityDialog` (mod path). Read each component's props interface before wiring — the drawer supplied `gameId`, `categorySlug`, `categoryId`, `subcategoryDefKeys`, `primaryTiming`, `rtaFallback`, `gameTimeLabel`, `showMilliseconds`. The dialogs load their own category/variable context lazily via `loadModBoardContextAction`; you only supply the static per-run identifiers.

- [ ] **Step 1: List each dialog's required props**

Open `MoveDialog`, `AdjustDialog`, `HideIdentityDialog`; write down each prop. For every prop, note the source: from `model` (has `gameId`, `categoryId`, `subcategoryKey`, `realTime`, `gameTime`, `gameTimeLabel`), from `game`, or a board-config field the run page does not yet load.

- [ ] **Step 2: Supply any missing board-config props on the page**

If a dialog needs `subcategoryDefKeys` / `primaryTiming` / `requireVideo` / `rtaFallback` (board-level, not on the run model), load them server-side in `run/[runId]/page.tsx` using the same category-config source the leaderboard page uses (locate it via the leaderboard page's data fetch), and pass into `RunModPanel`. Add these to `RunModPanelProps`.

- [ ] **Step 3: Add the three buttons + dialogs to the panel**

Secondary action bar: "Move…", "Adjust time…", "Hide identity…", each toggling local state that renders the corresponding dialog. Reuse the exact dialog components; do not reimplement. `onDone`/`onClose` mirror Task 6 (refresh the surface, close).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: no new errors.

- [ ] **Step 5: Manual verification note + commit**

These dialogs mutate real data — verify in the browser during the browser-pass task, not by hitting live actions in a unit test. Commit:

```bash
git add app/\(new-layout\)/games-v2/\[game\]/run-view/run-mod-panel.tsx app/\(new-layout\)/games-v2/\[game\]/run/\[runId\]/page.tsx
git commit -m "feat(run-mod-panel): Move / Adjust time / Hide identity on the run page"
```

---

### Task 8: `RunModPanel` — VOD attach/change + review workbench

Bring the drawer's evidence editing and the frame-step VOD review pane onto the page. The page already has `run-evidence-panel.tsx` (attach/change); consolidate so the workbench and the attach/change control are one surface, not two.

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/run-view/run-mod-panel.tsx`
- Possibly modify: `app/(new-layout)/games-v2/[game]/run-view/run-evidence-panel.tsx` (only to avoid a duplicate VOD control)

**Interfaces:**
- Consumes: the `vod-review/` review components (`ReviewPane`/`ReviewVodPanel`/`ReviewingCard`) the drawer used (`EvidenceSection`, run-inspector.tsx:298–536), plus `attachVodAction`.

- [ ] **Step 1: Determine the split with `run-evidence-panel`**

The run page already renders `RunEvidencePanel` (mod VOD attach/change). Decide: either (a) move the review workbench into `RunEvidencePanel` beside its existing editor, or (b) render the workbench in `RunModPanel` and have `RunEvidencePanel` keep only owner/basic evidence. Pick (a) if `RunEvidencePanel` already shows for mods; document the choice in a code comment. Goal: no two competing "attach VOD" controls.

- [ ] **Step 2: Mount the review workbench for mods**

Lift the `EvidenceSection` mod-side review usage (attach/change + `ReviewPane`) into the chosen host. Reuse the components unchanged; supply `runId`/`gameSlug`/`vodUrl` from `model`.

- [ ] **Step 3: Typecheck + commit**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: no new errors.

```bash
git add app/\(new-layout\)/games-v2/\[game\]/run-view/
git commit -m "feat(run-mod-panel): VOD attach/change + frame-step review on the run page"
```

---

### Task 9: `RunModPanel` — per-event timeline undo

Add the drawer's inline undo on each history event.

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/run-view/run-mod-panel.tsx` (or `mod-provenance-panel.tsx`, whichever renders the history the mod sees)

**Interfaces:**
- Consumes: the drawer's `TimelineUndoButton` logic (run-inspector.tsx:162–215) — it calls `applyVerdictsAction`/`restoreRunsAction`/`excludeAction`/`markRunsAction` to undo a given event. If `history-undo.ts` holds that mapping, import it (and do NOT delete it in Task 11).

- [ ] **Step 1: Decide the host**

`ModProvenancePanel` already renders the history timeline for mods. Add the undo button there (per event) rather than duplicating the timeline in `RunModPanel`. If so, extend `ModProvenancePanel` to accept an `allowUndo` / `isMod` flag and render `TimelineUndoButton` per event.

- [ ] **Step 2: Lift `TimelineUndoButton`**

Move `TimelineUndoButton` (and its undo-mapping helper) out of `run-inspector.tsx` into a standalone file (`run-view/timeline-undo-button.tsx`) so it survives the drawer's deletion. Import into the history host.

- [ ] **Step 3: Typecheck + commit**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: no new errors.

```bash
git add app/\(new-layout\)/games-v2/\[game\]/run-view/
git commit -m "feat(run-mod-panel): per-event timeline undo on the run page"
```

---

### Task 10: `ManualModPanel` — manual/set-time mod surface

The set-time counterpart, wired into the manual detail page. Manual times have no Move/Adjust/Hide-identity (no finished_run).

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/run-view/manual-mod-panel.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manual/[manualTimeId]/page.tsx`
- Test: `app/(new-layout)/games-v2/[game]/run-view/__tests__/manual-mod-panel.test.tsx`

**Interfaces:**
- Consumes: `RunActionForm` (target `{ manualTimeIds: [model.id] }`), `manualVerbsForStatus` (move it from `manual-inspector.tsx:141` into the shared `action-model.ts` alongside `verbsForStatus`), `ManualTimeDialog` (change time + evidence).
- Produces:
  ```ts
  export interface ManualModPanelProps {
      model: RunViewModel; // kind === 'manual'
      gameSlug: string;
  }
  export function ManualModPanel(props: ManualModPanelProps): React.JSX.Element;
  ```

- [ ] **Step 1: Move `manualVerbsForStatus` to shared module**

Cut it into `manage/moderation/shared/action-model.ts`; re-import in `manual-inspector.tsx` (still present until Task 11).

- [ ] **Step 2: Write the failing test**

```tsx
test('unverified manual time offers Verify, Reject, Remove', () => {
    const model = { kind: 'manual', id: 5, verificationStatus: 'pending' } as any;
    render(<ManualModPanel model={model} gameSlug="g" />);
    expect(screen.getByText(/verify/i)).toBeInTheDocument();
    expect(screen.getByText(/reject/i)).toBeInTheDocument();
    expect(screen.getByText(/remove/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/run-view/__tests__/manual-mod-panel.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement the panel**

Verb footer from `manualVerbsForStatus`, `RunActionForm` with `manualTimeIds`, plus a "Change time…" button opening `ManualTimeDialog`. Frame it like `RunModPanel`.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run app/\(new-layout\)/games-v2/\[game\]/run-view/__tests__/manual-mod-panel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Wire into `manual/[manualTimeId]/page.tsx`**

In the page's `modPanel`, render `<ManualModPanel model={model} gameSlug={game.name} />` above the existing `<ModProvenancePanel runId={null} .../>` when `isMod`.

- [ ] **Step 7: Typecheck + test + commit**

Run: `npm run typecheck 2>&1 | tail -5 && npx vitest run app/\(new-layout\)/games-v2/\[game\]/run-view/__tests__/manual-mod-panel.test.tsx`
Expected: no new typecheck errors; test PASS.

```bash
git add app/\(new-layout\)/games-v2/\[game\]/run-view/manual-mod-panel.tsx app/\(new-layout\)/games-v2/\[game\]/manual/\[manualTimeId\]/page.tsx app/\(new-layout\)/games-v2/\[game\]/run-view/__tests__/manual-mod-panel.test.tsx app/\(new-layout\)/games-v2/\[game\]/manage/moderation/shared/action-model.ts
git commit -m "feat(manual-mod-panel): set-time mod surface on the manual run page"
```

---

### Task 11: Delete the drawers + clean up

Now that no host imports the drawer and both page surfaces exist, delete the drawer files and their tests.

**Files:**
- Delete: `leaderboard/run-inspector.tsx` (+ `.module.scss`), `leaderboard/manual-inspector.tsx` (+ `.module.scss`)
- Delete: `run-inspector.test.ts`, `run-inspector-owner.test.tsx`, `manual-inspector*.test.*`
- Conditionally delete: `history-undo.ts`, `mod-row.ts`

- [ ] **Step 1: Confirm zero importers of the drawers**

Run: `grep -rn "run-inspector\|manual-inspector\|RunInspector\|ManualInspector" app/ src/ --include=*.tsx --include=*.ts | grep -v "__tests__\|run-mod-panel\|manual-mod-panel"`
Expected: no matches outside the files being deleted. If any remain, fix them first.

- [ ] **Step 2: Check the conditional-orphan helpers**

Run: `grep -rn "history-undo\|entryToRosterRow\|mod-row" app/ src/ --include=*.tsx --include=*.ts`
Delete `history-undo.ts` / `mod-row.ts` ONLY if the sole importer was the drawer (Task 9 may have moved the undo mapping — if so `history-undo.ts` still has a live importer; keep it). Keep anything still referenced.

- [ ] **Step 3: Delete the drawer files + their tests**

```bash
git rm app/\(new-layout\)/games-v2/\[game\]/leaderboard/run-inspector.tsx \
       app/\(new-layout\)/games-v2/\[game\]/leaderboard/manual-inspector.tsx \
       app/\(new-layout\)/games-v2/\[game\]/leaderboard/run-inspector.module.scss \
       app/\(new-layout\)/games-v2/\[game\]/leaderboard/manual-inspector.module.scss
# plus the four drawer test files (exact paths from Step 1)
```

- [ ] **Step 4: Full check**

Run: `npm run typecheck 2>&1 | tail -8 && npx vitest run 2>&1 | tail -15 && npm run lint 2>&1 | tail -8`
Expected: no NEW typecheck errors vs. baseline; test suite green except any known pre-existing failures (e.g. `row-actions.test` per prior notes — confirm they were already failing on `main`); lint clean on changed files.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(leaderboard): delete run/manual inspector drawers and their tests"
```

---

### Task 12: Browser pass

Manual verification of the whole flow against a deployed backend (`npm run dev`). No code unless something fails; if it does, use systematic-debugging.

- [ ] **Step 1: Start dev, check nothing already serving**

Run: `ps -eo pid,args | grep "next dev" | grep -v grep` (must be empty), then `npm run dev`.

- [ ] **Step 2: Board row behavior**

On a games-v2 leaderboard: hover a row body → run card appears (time, rank, date, video, status). Hover the runner name → the user card still appears. Click the row → navigates to the run page. As a mod, the kebab quick-remove opens `RunActionDialog` inline and applies; the row updates.

- [ ] **Step 3: Run page mod surface**

As a mod on `run/[runId]`: verb footer matches status; Move / Adjust time / Hide identity dialogs open and apply; VOD attach/change + review workbench work; timeline undo works. As a non-mod: no mod panel; owner actions unchanged.

- [ ] **Step 4: Manual page mod surface**

As a mod on `manual/[manualTimeId]`: verify/reject/remove + Change time work.

- [ ] **Step 5: Kill the dev server**

Kill by exact pid (never a broad `pkill -f next-server`).

- [ ] **Step 6: Clear build cache if churn was significant**

`rm -rf .next` (only while no dev server is running).

---

## Self-Review

**Spec coverage:**
- Row → link (both hosts): Tasks 3, 4, 5. ✓
- Run hover card on body zone, user card on name: Tasks 1, 2, 3. ✓
- Keep board quick-verify/remove via inline `RunActionDialog`: Tasks 4, 5. ✓
- Full mod surface on run page (verbs, Move/Adjust/Hide, VOD review, timeline undo): Tasks 6, 7, 8, 9. ✓
- Manual mod surface: Task 10. ✓
- Delete drawers: Task 11. ✓
- Owner mode NOT ported (page already covers it): honored — no task adds owner mode. ✓
- Risk 1 (`hideIdentityOpen`): Task 4 Step 4. ✓
- Risk 2 (delete only true orphans): Task 11 Steps 1–2. ✓
- Read-your-writes: Task 6 Step 6. ✓

**Placeholder scan:** No "TBD"/"handle edge cases". The two "read the component's props" steps (Task 7 Step 1, Task 8 Step 1) are deliberate discovery steps for reused components whose full prop surface was not quoted into this plan — they are bounded ("list each prop, source each"), not vague authoring.

**Type consistency:** `verbsForStatus`/`manualVerbsForStatus` moved to `action-model.ts` in Tasks 6/10 and imported everywhere after; `onModerate`→`onQuickModerate(entry, verb)` renamed in Task 3 and consumed with that exact signature in Tasks 4–5; `RunModPanelProps`/`ManualModPanelProps` defined in Tasks 6/10 and mounted with matching props on their pages; `HoverAnchor`/`AnchorHandlers` defined in Task 1, consumed in Task 2.

**Ordering safety:** New page surfaces (6–10) and host rewiring (3–5) land BEFORE the drawer deletion (11); `verbsForStatus`/`manualVerbsForStatus`/`TimelineUndoButton` are relocated out of the drawer before it is deleted, so no mid-plan breakage.

# Game-level Show RTA / Show IGT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let mods set the per-category "Show real time / Show game time" display flags for the whole game, from the setup wizard's ground-rules zone.

**Architecture:** The backend already stores game-level `hide_real_time`/`hide_game_time`, validates them, and resolves them into every read path with category override. Task 1 makes them mod-settable and readable via the mgmt API (two small edits, no migration). Task 2 plumbs them through the frontend metadata read/write path and adds a "Time columns" checkbox pair to the wizard's timing card.

**Tech Stack:** Backend: AWS Lambda + Drizzle (repo `/home/joey/therun/therun`, main branch). Frontend: Next.js 16 / React 19 (repo `/home/joey/therun/therun-fr`, branch `setup-category-centric`), Vitest + RTL.

**Spec:** `docs/superpowers/specs/2026-07-30-game-level-timing-visibility-design.md`

## Global Constraints

- Frontend branch `setup-category-centric`; never push frontend main; never open PRs.
- Backend work goes on `main` in `/home/joey/therun/therun`; committing is the implementer's job, pushing/deploying is the controller's.
- Never run `npm run build` in the backend repo (leaves `.js` shadows that break `vi.mock`). Backend unit tests: `npm test` (hermetic). Integration tests need local Docker: `npm run test:integration`.
- Biome style in the frontend (4-space, single quotes, trailing commas, semicolons); backend uses its own lint config — match surrounding code.
- Frontend component tests: `// @vitest-environment jsdom` first line; run with `npx vitest run "<path>"` (quote — paths contain brackets).
- Frontend typecheck baseline is dirty (~356 errors); gate on touched files only.
- Copy is fixed: checkbox labels "Show real time" / "Show game time" (verbatim from board-controls.tsx); error copy "Cannot hide both real time and game time." (verbatim from the backend service / TimingSettingsSection).

---

### Task 1: Backend — mod-settable + readable game hide flags

**Files (repo /home/joey/therun/therun):**
- Modify: `src/api/game-mgmt/handler.ts` (PUT branch, `metadataOnlyFields` set)
- Modify: `src/services/game-mgmt-service.ts` (mgmt GET response `game` object)
- Test: extend `test/integration/game-mgmt-board-config.test.ts` if it exercises the PUT permission split or the GET payload; otherwise add coverage beside the closest existing test of those code paths.

**Interfaces:**
- Consumes: nothing.
- Produces: `PUT /game-mgmt/:id` with only metadata-tier fields INCLUDING `hideRealTime`/`hideGameTime` passes the `edit-category-settings` permission check (previously required `edit-game`); mgmt GET response `result.game` includes `hideRealTime: boolean` and `hideGameTime: boolean`.

- [ ] **Step 1: Read the two sites and the existing test file**

`src/api/game-mgmt/handler.ts` — the PUT branch has `metadataOnlyFields = new Set([...])` (currently coverUrl, summaryOverride, platforms, releaseYear, discordUrl, links, configured, rulesTemplate, gameRules, emulatorPolicy, primaryTiming). `src/services/game-mgmt-service.ts` — the mgmt GET builder's `pageData.game` object currently ends with `primaryTiming: dbTimingToApi(game.primaryTiming)`. Read `test/integration/game-mgmt-board-config.test.ts` to see what it covers and how it builds requests.

- [ ] **Step 2: Write the failing test**

If the integration file covers PUT permission tiers, add: a mod with `edit-category-settings` (not `edit-game`) PUTs `{ hideRealTime: true }` → succeeds and the row updates; and the GET response includes both flags. Follow the file's existing fixture/permission setup verbatim. If it doesn't cover those paths, put equivalent assertions wherever the closest existing coverage of `metadataOnlyFields`/the GET payload lives (unit or integration) — same style as its neighbors. The test must fail before the code change (403/permission failure or missing field).

- [ ] **Step 3: Run it, verify it fails**

`npm run test:integration -- game-mgmt-board-config` (or the file you extended). Expected: new assertions fail (permission rejection / missing fields), existing ones pass.

- [ ] **Step 4: Make the two edits**

1. Add `"hideRealTime", "hideGameTime"` to the `metadataOnlyFields` set, and update the comment above it — the justification: the identical per-category flags and game-level `primaryTiming` (which also picks the ranking clock) are already mod-tier.
2. Add to the GET builder's `game` object, next to `primaryTiming`:
```ts
hideRealTime: game.hideRealTime,
hideGameTime: game.hideGameTime,
```

- [ ] **Step 5: Run the tests, verify they pass**

Same command as Step 3, then the full unit suite `npm test`. Expected: all pass, no new failures.

- [ ] **Step 6: Commit (do NOT push)**

```bash
git -C /home/joey/therun/therun add src/api/game-mgmt/handler.ts src/services/game-mgmt-service.ts test/
git -C /home/joey/therun/therun commit -m "feat(game-mgmt): expose game-level hide flags to mods via metadata tier"
```

**Controller (not implementer) afterwards:** push backend main, `npm run cdk -- deploy api`, 15-minute monitoring per cross-repo rules.

---

### Task 2: Frontend — metadata plumbing + wizard Time columns

**Files (repo /home/joey/therun/therun-fr):**
- Modify: `src/lib/game-mgmt.ts`
- Modify: `app/(new-layout)/games-v2/[game]/setup/actions/update-game-metadata.action.ts`
- Modify: `app/(new-layout)/games-v2/[game]/setup/steps/step-details.tsx`
- Test: extend `app/(new-layout)/games-v2/[game]/setup/steps/step-details.test.tsx`

**Interfaces:**
- Consumes: mgmt GET now returns `game.hideRealTime`/`game.hideGameTime` (Task 1); `updateGameMetadataAction` input shape; the step's existing `handleDetailsSaved` save chain.
- Produces: `GameMetadata` gains `hideRealTime: boolean; hideGameTime: boolean`; `UpdateGameBody` gains both optional; action `Input` gains both optional.

- [ ] **Step 1: Write the failing tests**

Extend `step-details.test.tsx` (the fixture's `metadata` object needs `hideRealTime: false, hideGameTime: false` added):

```tsx
it('renders the Time columns pair checked by default and forces the sibling on', () => {
    render(<StepDetails data={data} onAdvance={vi.fn()} onBack={vi.fn()} />);
    const rt = screen.getByRole('checkbox', { name: 'Show real time' });
    const gt = screen.getByRole('checkbox', { name: 'Show game time' });
    expect((rt as HTMLInputElement).checked).toBe(true);
    expect((gt as HTMLInputElement).checked).toBe(true);
    fireEvent.click(rt); // uncheck RT
    expect((rt as HTMLInputElement).checked).toBe(false);
    expect((gt as HTMLInputElement).checked).toBe(true);
    fireEvent.click(gt); // uncheck GT while RT hidden -> RT forced back on
    expect((gt as HTMLInputElement).checked).toBe(false);
    expect((rt as HTMLInputElement).checked).toBe(true);
});

it('sends the hide flags through the metadata save', async () => {
    const onAdvance = vi.fn();
    render(<StepDetails data={data} onAdvance={onAdvance} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show real time' }));
    fireEvent.submit(document.getElementById('game-details-form')!);
    await waitFor(() => expect(onAdvance).toHaveBeenCalledTimes(1));
    expect(updateGameMetadataAction).toHaveBeenCalledWith(
        expect.objectContaining({ hideRealTime: true, hideGameTime: false }),
    );
});
```

- [ ] **Step 2: Run them, verify they fail**

`npx vitest run "app/(new-layout)/games-v2/[game]/setup/steps/step-details.test.tsx"` — new tests fail (no checkboxes with those names); existing ones pass.

- [ ] **Step 3: Implement**

1. `src/lib/game-mgmt.ts`: add `hideRealTime: boolean; hideGameTime: boolean;` to `GameMetadata`; parse in `getGameMetadata` next to the other game fields as `data?.game?.hideRealTime ?? false` (same for gameTime); add `hideRealTime?: boolean; hideGameTime?: boolean;` to `UpdateGameBody` and forward them in `updateGame`'s body construction the same way its siblings are forwarded (check how the body is built — if it already spreads the whole `UpdateGameBody` into the request, no forwarding code is needed).
2. `update-game-metadata.action.ts`: add both optional booleans to `Input`; guard before building the body:
```ts
if (input.hideRealTime === true && input.hideGameTime === true) {
    return { error: 'Cannot hide both real time and game time.' };
}
```
and forward: `if (input.hideRealTime !== undefined) body.hideRealTime = input.hideRealTime;` (same for hideGameTime).
3. `step-details.tsx`: seed state from metadata next to the other seeds:
```tsx
const [hideRealTime, setHideRealTime] = useState(
    data.metadata.hideRealTime ?? false,
);
const [hideGameTime, setHideGameTime] = useState(
    data.metadata.hideGameTime ?? false,
);
```
Sibling-forcing handlers (uncheck = hide; hiding one force-shows the other):
```tsx
const setShowRt = (show: boolean) => {
    setHideRealTime(!show);
    if (!show) setHideGameTime(false);
};
const setShowGt = (show: boolean) => {
    setHideGameTime(!show);
    if (!show) setHideRealTime(false);
};
```
Add a third block to the existing `pairRow` in the timing card, after the Minimum time block:
```tsx
<div>
    <h4 className="h6">Time columns</h4>
    <div className="form-check">
        <input
            type="checkbox"
            className="form-check-input"
            id="game-show-rt"
            checked={!hideRealTime}
            onChange={(e) => setShowRt(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="game-show-rt">
            Show real time
        </label>
    </div>
    <div className="form-check">
        <input
            type="checkbox"
            className="form-check-input"
            id="game-show-gt"
            checked={!hideGameTime}
            onChange={(e) => setShowGt(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="game-show-gt">
            Show game time
        </label>
    </div>
    <p className="text-muted small mt-2 mb-0">
        Applies to every board. Categories with their own display
        setting keep it. A hidden clock also stops ranking boards
        by it.
    </p>
</div>
```
Include both flags in `handleDetailsSaved`'s existing `updateGameMetadataAction` call, next to `primaryTiming`: `hideRealTime, hideGameTime,`.

- [ ] **Step 4: Run the tests, verify they pass**

`npx vitest run "app/(new-layout)/games-v2/[game]/setup/steps/step-details.test.tsx" "app/(new-layout)/games-v2/[game]/setup/game-details-form.test.tsx"` — all pass.

- [ ] **Step 5: Typecheck touched files**

`npx tsc --noEmit 2>&1 | grep -E "game-mgmt|update-game-metadata|step-details"` — no output for touched files.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game-mgmt.ts "app/(new-layout)/games-v2/[game]/setup/actions/update-game-metadata.action.ts" "app/(new-layout)/games-v2/[game]/setup/steps/step-details.tsx" "app/(new-layout)/games-v2/[game]/setup/steps/step-details.test.tsx"
git commit -m "feat(setup): game-level Show RTA / Show IGT in the ground-rules zone"
```

---

### Post-plan (controller)

- Push backend main; `npm run cdk -- deploy api`; 15-minute monitoring (check-health.sh at 0/5/10/15; PushNotification only on errors).
- Push frontend branch.
- Note for Joey's browser pass: wizard step 1 Time columns pair; a board where the game hides IGT shows RTA-only columns; a category with its own flag still overrides.

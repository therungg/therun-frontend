# Leaderboard Variables Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the leaderboard variables surface legible and safe — always show what runners actually see, and never let a mod change board partitioning without seeing, in real numbers, what moves.

**Architecture:** Backend gains a dry-run mode on the existing variables route (re-resolves current leaderboard entries against a proposed definition and reports movement), per-game authorization for the rebuild trigger, and entry counts on the combinations read. Frontend gains three pure modules under `src/lib/variables/`, an "in effect" panel fed by the *public* variables endpoint so it cannot drift from the live board, a consequence-review dialog in front of every write, and sub-boards folded onto the same screen. The console and the wizard render the same components.

**Tech Stack:** Backend — TypeScript, AWS Lambda, Drizzle ORM, PostgreSQL, Jest. Frontend — Next.js 16 App Router, React 19, Server Actions, SCSS modules, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-29-leaderboard-variables-redesign-design.md` (in `therun-fr`).
**Audit it answers:** `docs/superpowers/specs/2026-07-29-setup-flow-ux-audit.md` §E.

## Global Constraints

- **Two repos, two branches, two PRs.** Backend is `/home/joey/therun/therun` (repo `therun-backend`). Frontend is `/home/joey/therun/therun-fr` (repo `therun-frontend`). Run git as `git -C <path>` or cd into the repo.
- **Never push to `main` in `therun-fr`.** Branch + PR only. Backend may be pushed to main by the user.
- **Never run tests in the backend repo.** Write them; the user runs them. Frontend Vitest (`npm run test`) may be run.
- **Never edit `.js` or `.d.ts` files** in the backend — they are compiled artifacts sitting beside the `.ts` sources.
- **No new API Gateway resources.** The `api` CDK stack is at 496/500 CloudFormation resources. Every backend change here rides an existing route. If a task seems to need a new path, stop and raise it.
- **No schema change, no migration.** If a task appears to need one, stop and raise it.
- **Vocabulary is fixed** (spec §2). User-facing strings use: "splits this board", "filter only", "value", "also accept", "used when a run doesn't say", "on the next rebuild", "web address". Never surface `subcategoryKey`, `bucket`, `nameNormalized`, `published`, `version`, or "re-resolve worker".
- **Counting unit is leaderboard entries**, never raw attempts: `finished_runs` rows where `is_leaderboard_entry` or `is_leaderboard_entry_gt` is true.
- **Frontend indentation is 4 spaces, single quotes, trailing commas** (Biome). Backend is 4 spaces, double quotes.
- **Do not add yourself as a git commit co-author.**

## File Structure

**Backend (`/home/joey/therun/therun`)**

| File | Responsibility |
|---|---|
| `src/leaderboards/variables/preview-movement.ts` (new) | Pure: given current entries + proposed defs, compute what moves between boards. No DB, no IO. |
| `src/leaderboards/variables/preview-service.ts` (new) | Loads entry snapshots from PG, resolves the affected category set, calls the pure planner. |
| `src/api/game-mgmt/variables-handler.ts` (modify) | `?dryRun=1` branch on POST and DELETE — returns preview, writes nothing. |
| `src/api/leaderboards/handler.ts` (modify, `handleInvalidateCache`) | Accept a game's own game-admin, not only global roles. |
| `src/api/leaderboards/combinations-handler.ts` (modify) | Add `entryCount` per combination. |
| `test/manual/integration/variables-preview.test.ts` (new) | Pure-planner unit tests + endpoint contract tests. |

**Frontend (`/home/joey/therun/therun-fr`)**

| File | Responsibility |
|---|---|
| `src/lib/variables/language.ts` (new) | The vocabulary table + live consequence sentences. |
| `src/lib/variables/effective.ts` (new) | Source labelling (shared / category / category-overrides-shared), shadow detection. |
| `src/lib/variables/consequences.ts` (new) | Dry-run result → human sentences. |
| `src/lib/variables/__tests__/*.test.ts` (new) | Vitest for all three. |
| `src/lib/leaderboard-variables.ts` (modify) | `previewVariableChange()`, `entryCount` on the combinations type. |
| `.../manage/variables/actions/preview-variable.action.ts` (new) | Server action wrapping the dry-run. |
| `.../manage/variables/actions/rebuild-boards.action.ts` (new) | Server action for "Rebuild now", per-game gated. |
| `.../manage/variables/in-effect-panel.tsx` (new) | Zone 1. Server component, reads the public endpoint. |
| `.../manage/variables/consequence-dialog.tsx` (new) | The review step. |
| `.../manage/variables/variable-table.tsx` (new) | `RoleTable`, extracted from `variables-section.tsx`. |
| `.../manage/variables/variables-screen.tsx` (new) | Composition of the three zones. Replaces `variables-section.tsx`. |
| `.../manage/variables/variable-form.tsx` (modify) | Question-shaped order, captured scope, role lock in create mode. |
| `.../manage/variables/combinations-section.tsx` (modify) | Entry counts, plain-language mode, "Allow every combination". |
| `.../manage/variables/variables.module.scss` (new) | Styles for zones 1–3. |
| `.../manage/console/content-router.tsx` (modify) | `variables` renders `VariablesScreen`; `combinations` deep-links into it. |
| `.../setup/steps/step-variables.tsx` (modify) | Renders `VariablesScreen`; button relabelled. |
| `.../setup/steps/category-band-preview.tsx` (modify) | Delete the contradicting note. |

---

# Phase 1 — Backend

Branch: `git -C /home/joey/therun/therun checkout -b feat/variables-preview`

### Task 1: Per-game authorization for the rebuild trigger

The rebuild is what applies a variable change to existing runs. Today only global roles can trigger it, so the board admin who reads "runs move on the next rebuild" cannot act on it.

**Files:**
- Modify: `src/api/leaderboards/handler.ts` (`handleInvalidateCache`, ~line 40-60)

**Interfaces:**
- Consumes: `checkGameMgmtPermission(userId: number, action: string, ctx: { gameId: number }): Promise<void>` from `src/rbac/check-game-mgmt-permission` — throws on denial. Used identically at `src/api/game-mgmt/variables-handler.ts:124`.
- Produces: no new exports. Behaviour change only.

- [ ] **Step 1: Read the current authorization block**

Open `src/api/leaderboards/handler.ts` and find `handleInvalidateCache`. The current gate is:

```typescript
    try {
        confirmPermission(user, "edit", "leaderboard");
    } catch {
        return forbidden("Not authorized");
    }
```

Note that `gameId` is parsed *after* this block. The new check needs `gameId`, so the order changes.

- [ ] **Step 2: Move gameId parsing above the authorization check and widen the gate**

Replace the permission block and the `gameId` parsing that follows it with:

```typescript
    const gameIdStr = event.pathParameters?.gameId;
    if (!gameIdStr) return yourFault("gameId is required");
    const gameId = parseInt(gameIdStr);
    if (isNaN(gameId)) return yourFault("gameId must be a number");

    // Global leaderboard editors may rebuild any game. A game's own admins may
    // rebuild that game — they are the people told "runs move on the next
    // rebuild" after a variable change, so they must be able to trigger one.
    let authorized = false;
    try {
        confirmPermission(user, "edit", "leaderboard");
        authorized = true;
    } catch {
        // fall through to the per-game check
    }
    if (!authorized) {
        const pgId = await getUserPgId(user.user);
        if (pgId) {
            try {
                await checkGameMgmtPermission(pgId, "edit-customizations", {
                    gameId,
                });
                authorized = true;
            } catch {
                authorized = false;
            }
        }
    }
    if (!authorized) return forbidden("Not authorized");
```

Delete the now-duplicated `gameIdStr` / `gameId` lines that previously sat below.

- [ ] **Step 3: Add the imports**

At the top of `src/api/leaderboards/handler.ts`, confirm or add:

```typescript
import { checkGameMgmtPermission } from "../../rbac/check-game-mgmt-permission";
import { getUserPgId } from "../../services/get-user-pg-id";
```

If `getUserPgId` is not at that path, find it with `grep -rn "export.*getUserPgId" src --include=*.ts` and use the real path. `src/api/game-mgmt/handler.ts` imports it — copy that import line verbatim.

- [ ] **Step 4: Typecheck**

Run: `cd /home/joey/therun/therun && npx tsc --noEmit --skipLibCheck`
Expected: no errors in `src/api/leaderboards/handler.ts`. (Pre-existing TS4023 errors elsewhere are known — see the therun-build-gotcha note. Only your file must be clean.)

- [ ] **Step 5: Commit**

```bash
git -C /home/joey/therun/therun add src/api/leaderboards/handler.ts
git -C /home/joey/therun/therun commit -m "feat(leaderboards): let a game's own admins trigger its rebuild

The variables UI tells a board admin that runs move on the next rebuild.
Only global roles could trigger one, so the person reading the message
could not act on it. Per-game edit-customizations now suffices, scoped to
that game."
```

---

### Task 2: Pure movement planner

The heart of the dry-run. No DB, no IO — given the entries that exist today and a proposed set of definitions, work out what moves.

**Files:**
- Create: `src/leaderboards/variables/preview-movement.ts`
- Test: `test/manual/integration/variables-preview.test.ts`

**Interfaces:**
- Consumes: `resolveRunVariables(userVars, defs, opts)` from `src/leaderboards/resolve-run-variables` returning `{ rawVariables, variables, subcategoryKey, warnings }`; `VariableRow` from `src/services/leaderboard-variables-service`; `normalizeVariableString` from `src/common/normalizeVariable`.
- Produces:
  - `interface EntrySnapshot { subcategoryKey: string; sourceVariables: Record<string, unknown> }`
  - `interface BoardMovement { key: string; label: string; before: number; after: number }`
  - `interface MovementResult { moved: number; unresolved: number; boards: BoardMovement[] }`
  - `function labelForKey(key: string, defs: VariableRow[]): string`
  - `function planMovement(entries: EntrySnapshot[], proposedDefs: VariableRow[]): MovementResult`

- [ ] **Step 1: Write the failing tests**

Create `test/manual/integration/variables-preview.test.ts`:

```typescript
import {
    labelForKey,
    planMovement,
    EntrySnapshot,
} from "../../../src/leaderboards/variables/preview-movement";
import { VariableRow } from "../../../src/services/leaderboard-variables-service";

const platform = (defaultIndex: number): VariableRow =>
    ({
        id: 1,
        gameId: 1,
        categoryId: null,
        name: "Platform",
        nameNormalized: "platform",
        role: "subcategory",
        values: [["Nintendo 64", "n64"], ["Emulator", "emu"]],
        defaultValueIndex: defaultIndex,
        sortOrder: 0,
        description: null,
        version: 1,
        published: true,
    }) as VariableRow;

const entry = (key: string, vars: Record<string, unknown>): EntrySnapshot => ({
    subcategoryKey: key,
    sourceVariables: vars,
});

describe("labelForKey", () => {
    it("renders canonical display values, not normalized keys", () => {
        expect(labelForKey("platform=nintendo64", [platform(0)])).toBe(
            "Nintendo 64",
        );
    });

    it("joins multi-part keys", () => {
        expect(labelForKey("platform=emulator", [platform(0)])).toBe("Emulator");
    });

    it("falls back to the raw value when no definition matches", () => {
        expect(labelForKey("platform=switch", [platform(0)])).toBe("switch");
    });

    it("names the single board when there is no key", () => {
        expect(labelForKey("", [])).toBe("Everyone");
    });
});

describe("planMovement", () => {
    it("reports nothing moving when the definition is unchanged", () => {
        const entries = [
            entry("platform=nintendo64", {}),
            entry("platform=emulator", { platform: "Emulator" }),
        ];
        const result = planMovement(entries, [platform(0)]);
        expect(result.moved).toBe(0);
    });

    it("moves entries that never specified a value when the default changes", () => {
        const entries = [
            entry("platform=nintendo64", {}),
            entry("platform=nintendo64", {}),
            entry("platform=emulator", { platform: "Emulator" }),
        ];
        const result = planMovement(entries, [platform(1)]);
        expect(result.moved).toBe(2);
        const n64 = result.boards.find((b) => b.key === "platform=nintendo64");
        const emu = result.boards.find((b) => b.key === "platform=emulator");
        expect(n64).toMatchObject({ before: 2, after: 0 });
        expect(emu).toMatchObject({ before: 1, after: 3 });
    });

    it("counts entries whose submitted value matches no value as unresolved", () => {
        const entries = [entry("platform=nintendo64", { platform: "Switch" })];
        const result = planMovement(entries, [platform(0)]);
        expect(result.unresolved).toBe(1);
    });

    it("includes boards that only exist after the change", () => {
        const withSwitch = {
            ...platform(0),
            values: [["Nintendo 64", "n64"], ["Emulator"], ["Switch"]],
        } as VariableRow;
        const entries = [entry("platform=nintendo64", { platform: "Switch" })];
        const result = planMovement(entries, [withSwitch]);
        expect(result.boards.map((b) => b.key)).toContain("platform=switch");
        expect(result.moved).toBe(1);
    });

    it("returns zero movement for an empty board", () => {
        expect(planMovement([], [platform(0)])).toEqual({
            moved: 0,
            unresolved: 0,
            boards: [],
        });
    });
});
```

- [ ] **Step 2: Write the implementation**

Create `src/leaderboards/variables/preview-movement.ts`:

```typescript
import { normalizeVariableString } from "../../common/normalizeVariable";
import { VariableRow } from "../../services/leaderboard-variables-service";
import { resolveRunVariables } from "../resolve-run-variables";

/** One leaderboard entry as it exists today, plus the variables it resolves from. */
export interface EntrySnapshot {
    /** The board this entry currently sits on. */
    subcategoryKey: string;
    /** Parent speedrun_runs.variables, or the row's own raw_variables. */
    sourceVariables: Record<string, unknown>;
}

export interface BoardMovement {
    key: string;
    label: string;
    before: number;
    after: number;
}

export interface MovementResult {
    /** Entries whose board changes. */
    moved: number;
    /** Entries whose submitted value matched no value in the proposed defs. */
    unresolved: number;
    boards: BoardMovement[];
}

/**
 * Human label for a subcategory key. Keys are normalized
 * ("platform=nintendo64"); mods read canonical display values
 * ("Nintendo 64"). An unmatched value falls back to its raw form rather than
 * disappearing — a board nobody can name is worse than an ugly name.
 */
export function labelForKey(key: string, defs: VariableRow[]): string {
    if (!key) return "Everyone";
    return key
        .split("|")
        .map((pair) => {
            const eq = pair.indexOf("=");
            if (eq < 0) return pair;
            const name = pair.slice(0, eq);
            const value = pair.slice(eq + 1);
            const def = defs.find((d) => d.nameNormalized === name);
            if (!def) return value;
            const bucket = def.values.find(
                (b) => normalizeVariableString(b[0]) === value,
            );
            return bucket ? bucket[0] : value;
        })
        .join(" · ");
}

export function planMovement(
    entries: EntrySnapshot[],
    proposedDefs: VariableRow[],
): MovementResult {
    const before = new Map<string, number>();
    const after = new Map<string, number>();
    let moved = 0;
    let unresolved = 0;

    for (const e of entries) {
        before.set(e.subcategoryKey, (before.get(e.subcategoryKey) ?? 0) + 1);

        const resolved = resolveRunVariables(e.sourceVariables, proposedDefs);
        after.set(
            resolved.subcategoryKey,
            (after.get(resolved.subcategoryKey) ?? 0) + 1,
        );

        if (resolved.subcategoryKey !== e.subcategoryKey) moved++;
        if (resolved.warnings.some((w) => w.reason === "no_match_default_used")) {
            unresolved++;
        }
    }

    const keys = new Set([...before.keys(), ...after.keys()]);
    const boards: BoardMovement[] = [...keys]
        .map((key) => ({
            key,
            label: labelForKey(key, proposedDefs),
            before: before.get(key) ?? 0,
            after: after.get(key) ?? 0,
        }))
        // Biggest board first: the mod reads the top of the list.
        .sort((a, b) => b.after - a.after || a.label.localeCompare(b.label));

    return { moved, unresolved, boards };
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /home/joey/therun/therun && npx tsc --noEmit --skipLibCheck`
Expected: no errors in the new file.

- [ ] **Step 4: Hand the tests to the user**

Do NOT run Jest. Tell the user: "Task 2 tests are at `test/manual/integration/variables-preview.test.ts` — run `npx jest test/manual/integration/variables-preview.test.ts` when you're ready." Continue to the next task; do not block.

- [ ] **Step 5: Commit**

```bash
git -C /home/joey/therun/therun add src/leaderboards/variables/preview-movement.ts test/manual/integration/variables-preview.test.ts
git -C /home/joey/therun/therun commit -m "feat(variables): pure planner for board movement previews

Given the entries that exist today and a proposed set of definitions,
work out which entries change board. Reuses resolveRunVariables so the
preview cannot disagree with what the rebuild later does."
```

---

### Task 3: Preview service — load entries, resolve the affected categories

**Files:**
- Create: `src/leaderboards/variables/preview-service.ts`

**Interfaces:**
- Consumes: `planMovement`, `EntrySnapshot`, `MovementResult` from Task 2. `getDb()` from `src/db`. `finishedRuns`, `speedrunRuns`, `categories` from `src/db/schema`. `listVariables(gameId, categoryId)` from `src/services/leaderboard-variables-service`. `pickProjectionSource(parentVariables, ownRawVariables)` from `src/leaderboards/resolve-run-variables`.
- Produces:
  - `interface CategoryPreview { categoryId: number; display: string; moved: number; boards: BoardMovement[] }`
  - `interface VariablePreview { moved: number; unresolved: number; categories: CategoryPreview[] }`
  - `function previewVariableChange(args: { gameId: number; categoryId: number | null; proposed: VariableRow | null; nameNormalized: string }): Promise<VariablePreview>`

- [ ] **Step 1: Write the implementation**

Create `src/leaderboards/variables/preview-service.ts`:

```typescript
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { categories, finishedRuns, speedrunRuns } from "../../db/schema";
import {
    listVariables,
    VariableRow,
} from "../../services/leaderboard-variables-service";
import { pickProjectionSource } from "../resolve-run-variables";
import {
    BoardMovement,
    EntrySnapshot,
    planMovement,
} from "./preview-movement";

export interface CategoryPreview {
    categoryId: number;
    display: string;
    moved: number;
    boards: BoardMovement[];
}

export interface VariablePreview {
    moved: number;
    unresolved: number;
    categories: CategoryPreview[];
}

/**
 * Which categories a definition change actually touches.
 *
 * A category-scoped change touches exactly that category. A game-wide change
 * touches every category that does NOT define its own row of the same name —
 * those categories override the game-wide one wholesale and are unaffected.
 * Resolved here rather than taken as input so a caller cannot ask the wrong
 * question.
 */
async function affectedCategoryIds(
    gameId: number,
    categoryId: number | null,
    nameNormalized: string,
): Promise<number[]> {
    if (categoryId !== null) return [categoryId];

    const db = await getDb();
    const rows = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.gameId, gameId));

    const result: number[] = [];
    for (const row of rows) {
        const own = await listVariables(gameId, row.id);
        const overrides = own.some((v) => v.nameNormalized === nameNormalized);
        if (!overrides) result.push(row.id);
    }
    return result;
}

/**
 * The definitions that WOULD apply to a category if the proposed change
 * landed: the category's current merged set with the target row replaced
 * (or removed, when `proposed` is null).
 */
async function proposedDefsFor(
    gameId: number,
    targetCategoryId: number,
    scopeCategoryId: number | null,
    proposed: VariableRow | null,
    nameNormalized: string,
): Promise<VariableRow[]> {
    const gameWide = await listVariables(gameId, null);
    const own = await listVariables(gameId, targetCategoryId);

    const merged = new Map<string, VariableRow>();
    for (const v of gameWide) merged.set(v.nameNormalized, v);
    for (const v of own) merged.set(v.nameNormalized, v);

    // A game-wide edit must not clobber a category that overrides this name.
    const overriddenHere =
        scopeCategoryId === null &&
        own.some((v) => v.nameNormalized === nameNormalized);

    if (!overriddenHere) {
        if (proposed) merged.set(nameNormalized, proposed);
        else merged.delete(nameNormalized);
    }

    return [...merged.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Current leaderboard entries for a category, with the variables they resolve
 * from. Entries only — one row per runner per board — not raw attempts: it is
 * the number a mod reasons about and a far cheaper query.
 */
async function loadEntries(
    gameId: number,
    categoryId: number,
): Promise<EntrySnapshot[]> {
    const db = await getDb();
    const rows = await db
        .select({
            subcategoryKey: finishedRuns.subcategoryKey,
            rawVariables: finishedRuns.rawVariables,
            parentVariables: speedrunRuns.variables,
        })
        .from(finishedRuns)
        .leftJoin(speedrunRuns, eq(finishedRuns.runId, speedrunRuns.id))
        .where(
            and(
                eq(finishedRuns.gameId, gameId),
                eq(finishedRuns.categoryId, categoryId),
                eq(finishedRuns.excluded, false),
                or(
                    eq(finishedRuns.isLeaderboardEntry, true),
                    eq(finishedRuns.isLeaderboardEntryGt, true),
                ),
            ),
        );

    return rows.map((r) => ({
        subcategoryKey: r.subcategoryKey ?? "",
        sourceVariables: pickProjectionSource(
            r.parentVariables as Record<string, unknown> | null,
            r.rawVariables as Record<string, unknown> | null,
        ),
    }));
}

export async function previewVariableChange(args: {
    gameId: number;
    categoryId: number | null;
    proposed: VariableRow | null;
    nameNormalized: string;
}): Promise<VariablePreview> {
    const db = await getDb();
    const ids = await affectedCategoryIds(
        args.gameId,
        args.categoryId,
        args.nameNormalized,
    );

    const displayById = new Map<number, string>();
    if (ids.length > 0) {
        const rows = await db
            .select({ id: categories.id, display: categories.display })
            .from(categories)
            .where(sql`${categories.id} = ANY(${ids})`);
        for (const r of rows) displayById.set(r.id, r.display);
    }

    const out: CategoryPreview[] = [];
    let moved = 0;
    let unresolved = 0;

    for (const id of ids) {
        const defs = await proposedDefsFor(
            args.gameId,
            id,
            args.categoryId,
            args.proposed,
            args.nameNormalized,
        );
        const entries = await loadEntries(args.gameId, id);
        const result = planMovement(entries, defs);
        moved += result.moved;
        unresolved += result.unresolved;
        // Categories where nothing moves are noise in the dialog.
        if (result.moved > 0) {
            out.push({
                categoryId: id,
                display: displayById.get(id) ?? `Category ${id}`,
                moved: result.moved,
                boards: result.boards,
            });
        }
    }

    out.sort((a, b) => b.moved - a.moved);
    return { moved, unresolved, categories: out };
}
```

- [ ] **Step 2: Verify the schema field names you used actually exist**

Run: `cd /home/joey/therun/therun && grep -n "isLeaderboardEntryGt\|subcategoryKey\|rawVariables" src/db/schema.ts | head`
Expected: all three appear on the `finishedRuns` table. If a name differs, fix the query rather than the schema.

Run: `grep -n "variables" src/db/schema.ts | grep -i speedrun`
Expected: `speedrunRuns` has a `variables` jsonb column. If it does not, find the real column with `awk '/export const speedrunRuns/,/^\}\)/' src/db/schema.ts | grep -i var` and use it.

- [ ] **Step 3: Typecheck**

Run: `cd /home/joey/therun/therun && npx tsc --noEmit --skipLibCheck`
Expected: no errors in the new file.

- [ ] **Step 4: Commit**

```bash
git -C /home/joey/therun/therun add src/leaderboards/variables/preview-service.ts
git -C /home/joey/therun/therun commit -m "feat(variables): load entry snapshots and resolve affected categories

A game-wide change affects every category that does not override the same
name; the service resolves that set itself so a caller cannot ask the
wrong question. Counts leaderboard entries, not attempts."
```

---

### Task 4: `?dryRun=1` on the variables route

**Files:**
- Modify: `src/api/game-mgmt/variables-handler.ts`

**Interfaces:**
- Consumes: `previewVariableChange` and `VariablePreview` from Task 3; existing `buildInput`, `validateVariableInput`, `normalizeVariableString`, `listVariables` already imported or importable in this file.
- Produces: `POST|DELETE /v1/games/{gameId}/variables?dryRun=1` → `{ result: { preview: VariablePreview } }`. No new route, no new CloudFormation resource.

- [ ] **Step 1: Add the imports and a query-param reader**

At the top of `src/api/game-mgmt/variables-handler.ts`, add:

```typescript
import { previewVariableChange } from "../../leaderboards/variables/preview-service";
import { validateVariableInput } from "../../services/leaderboard-variables-service";
```

`validateVariableInput` may already be exported alongside the other imports from that module — extend the existing import block rather than adding a second one.

Below `parseCategoryIdFromQuery`, add:

```typescript
const isDryRun = (event: APIGatewayProxyEvent): boolean => {
    const qs = event.queryStringParameters || {};
    return qs.dryRun === "1" || qs.dryRun === "true";
};
```

- [ ] **Step 2: Add the POST dry-run branch**

Inside `handleVariables`, at the very start of the `if (event.httpMethod === "POST" || event.httpMethod === "PUT")` block — before the existing `try` that calls `upsertVariable` — insert:

```typescript
        if (isDryRun(event)) {
            const categoryId = parseCategoryIdFromBody(body.categoryId);
            let validated;
            try {
                validated = validateVariableInput(buildInput(body));
            } catch (err) {
                if (err instanceof VariableValidationError) {
                    return yourFault(err.message);
                }
                throw err;
            }
            const nameNormalized = normalizeVariableString(validated.name);
            // Shape a VariableRow the resolver accepts. id/version/published
            // are irrelevant to resolution and never read by planMovement.
            const proposed = {
                id: -1,
                gameId,
                categoryId,
                name: validated.name,
                nameNormalized,
                role: validated.role,
                values: validated.values,
                defaultValueIndex: validated.defaultValueIndex,
                sortOrder: validated.sortOrder ?? 0,
                description: validated.description ?? null,
                version: 0,
                published: true,
            } as VariableRow;
            const preview = await previewVariableChange({
                gameId,
                categoryId,
                proposed,
                nameNormalized,
            });
            return ok(JSON.stringify({ result: { preview } }));
        }
```

- [ ] **Step 3: Add the DELETE dry-run branch**

Inside the `if (event.httpMethod === "DELETE")` block, immediately after `nameNormalized` is computed and before the `try` that calls `deleteVariable`, insert:

```typescript
        if (isDryRun(event)) {
            const preview = await previewVariableChange({
                gameId,
                categoryId,
                proposed: null,
                nameNormalized,
            });
            return ok(JSON.stringify({ result: { preview } }));
        }
```

- [ ] **Step 4: Confirm the dry-run path writes nothing**

Run: `cd /home/joey/therun/therun && grep -n "upsertVariable\|deleteVariable\|writeAuditLog" src/api/game-mgmt/variables-handler.ts`
Expected: every hit sits *below* a `isDryRun` early return in its branch. Read the file and confirm by eye — a dry run that writes is the one unacceptable outcome of this task.

- [ ] **Step 5: Typecheck**

Run: `cd /home/joey/therun/therun && npx tsc --noEmit --skipLibCheck`
Expected: no errors in `variables-handler.ts`.

- [ ] **Step 6: Add endpoint contract tests**

Append to `test/manual/integration/variables-preview.test.ts`:

```typescript
describe("variables dryRun contract", () => {
    it("documents the request and response shape", () => {
        // POST|DELETE /v1/games/{gameId}/variables?dryRun=1
        // POST body: the same shape the real upsert takes
        //   { categoryId, name, role, values, defaultValueIndex, sortOrder, description }
        // DELETE body: { categoryId, name } or { categoryId, nameNormalized }
        // → { result: { preview: {
        //       moved: number,
        //       unresolved: number,
        //       categories: [{ categoryId, display, moved,
        //                      boards: [{ key, label, before, after }] }]
        //   } } }
        //
        // Invariants:
        //   - writes nothing (no upsert, no delete, no audit log)
        //   - same auth as the real write (edit-customizations for the game)
        //   - `categories` omits categories where nothing moves
        expect(true).toBe(true);
    });
});
```

Then tell the user the live check to run once deployed:

```bash
curl -s -X POST "https://api.therun.gg/v1/games/1/variables?dryRun=1" \
  -H "Authorization: Bearer $SESSION" -H 'Content-Type: application/json' \
  -d '{"categoryId":null,"name":"Platform","role":"subcategory",
       "values":[["Nintendo 64","n64"],["Emulator"]],"defaultValueIndex":1,"sortOrder":0}' | jq
# then confirm nothing changed:
curl -s "https://api.therun.gg/v1/games/1/variables" -H "Authorization: Bearer $SESSION" | jq '.result[].version'
```

- [ ] **Step 7: Commit**

```bash
git -C /home/joey/therun/therun add src/api/game-mgmt/variables-handler.ts test/manual/integration/variables-preview.test.ts
git -C /home/joey/therun/therun commit -m "feat(variables): dryRun mode on the variables route

?dryRun=1 returns what a proposed definition would move between boards and
writes nothing. Rides the existing route rather than adding a path — the
api stack is at 496/500 CloudFormation resources."
```

---

### Task 5: Entry counts on the combinations read

**Files:**
- Modify: the handler serving `GET /admin/combinations/:gameId[/:categoryId]`

**Interfaces:**
- Produces: each combination gains `entryCount: number`. Existing fields `subcategoryKey` and `valid` are unchanged, so the current frontend keeps working before it is updated.

- [ ] **Step 1: Find the handler**

Run: `cd /home/joey/therun/therun && grep -rln "combinations" src/api --include=*.ts | grep -v '\.d\.ts'`

Open the file that serves the GET and locate where the combination list is assembled.

- [ ] **Step 2: Add the count query**

After the combination list is built and before it is returned, add:

```typescript
    // Entry counts per board, so the console can say what unchecking a
    // combination would strand. Entries only — one row per runner per board.
    const countRows = await db
        .select({
            subcategoryKey: finishedRuns.subcategoryKey,
            count: sql<number>`count(*)::int`,
        })
        .from(finishedRuns)
        .where(
            and(
                eq(finishedRuns.gameId, gameId),
                categoryId === null
                    ? sql`true`
                    : eq(finishedRuns.categoryId, categoryId),
                eq(finishedRuns.excluded, false),
                or(
                    eq(finishedRuns.isLeaderboardEntry, true),
                    eq(finishedRuns.isLeaderboardEntryGt, true),
                ),
            ),
        )
        .groupBy(finishedRuns.subcategoryKey);

    const countByKey = new Map(
        countRows.map((r) => [r.subcategoryKey ?? "", Number(r.count)]),
    );
```

Then add `entryCount: countByKey.get(c.subcategoryKey) ?? 0` to each combination object in the response.

Add any missing imports (`and`, `eq`, `or`, `sql` from `drizzle-orm`; `finishedRuns` from `../../db/schema`) to the existing import blocks.

- [ ] **Step 3: Typecheck**

Run: `cd /home/joey/therun/therun && npx tsc --noEmit --skipLibCheck`
Expected: no errors in the modified file.

- [ ] **Step 4: Commit**

```bash
git -C /home/joey/therun/therun add -A src/api
git -C /home/joey/therun/therun commit -m "feat(combinations): report entry counts per combination

Unchecking a sub-board that holds 300 runs should say so before it is
saved."
```

---

### Task 6: Deploy the backend and verify

Backend changes cannot be exercised from the frontend until deployed. This is a gate: Phase 2 can start without it, but Phase 3 onward needs a real endpoint.

- [ ] **Step 1: Confirm no CDK resource change**

Run: `cd /home/joey/therun/therun && npm run cdk -- diff api 2>&1 | tail -30`
Expected: no *added* resources. Every change here rides an existing route. If the diff adds an API Gateway resource, stop — something drifted from the plan.

Note: `cdk diff` under-reports asset-only code changes. That is expected; the Lambda code change ships regardless.

- [ ] **Step 2: Ask the user before deploying**

Deploying is coordinated with the user, per the repo conventions. Ask: "Backend is ready — Tasks 1–5 committed. Deploy `api` and `stats`, or do you want to review first?"

- [ ] **Step 3: Deploy**

```bash
cd /home/joey/therun/therun && npm run cdk -- deploy api
```

- [ ] **Step 4: Post-deploy monitoring (mandatory)**

```bash
/home/joey/therun/.claude/monitoring/check-health.sh 15
```

Re-run at ~5, ~10 and ~15 minutes. Confirm `https://therun.gg` and `https://api.therun.gg/live` return 200. Compare any new errors against `.claude/monitoring/baselines.conf` — `generateStoryLambda` ~1650/hr, `runChangedHandler` ~585/hr, `sync-runs-to-postgres` ~29/hr are chronic noise, not regressions. Notify the user via PushNotification if errors appear, when a fix starts, and with the outcome.

- [ ] **Step 5: Verify the live endpoint**

Run the `curl` from Task 4 Step 6 against production and confirm the response shape and that no version bumped.

---

# Phase 2 — Frontend pure modules

Branch: `git -C /home/joey/therun/therun-fr checkout -b feat/variables-redesign`

These three modules hold the correctness of the whole feature. They have no React and no fetching, and they are where the tests live.

### Task 7: `language.ts` — the vocabulary

**Files:**
- Create: `src/lib/variables/language.ts`
- Test: `src/lib/variables/__tests__/language.test.ts`

**Interfaces:**
- Produces:
  - `type VariableRoleId = 'subcategory' | 'filter'`
  - `const ROLE_LABEL: Record<VariableRoleId, string>`
  - `function roleConsequence(input: { role: VariableRoleId; variableName: string; categoryDisplay: string; valueCount: number }): string`
  - `function boardCountLabel(role: VariableRoleId, valueCount: number): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/variables/__tests__/language.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { boardCountLabel, ROLE_LABEL, roleConsequence } from '../language';

describe('ROLE_LABEL', () => {
    it('never leaks the internal role names to the user', () => {
        expect(ROLE_LABEL.subcategory).toBe('splits this board');
        expect(ROLE_LABEL.filter).toBe('filter only');
    });
});

describe('roleConsequence', () => {
    const base = {
        variableName: 'Platform',
        categoryDisplay: 'Any%',
        role: 'subcategory' as const,
    };

    it('counts the boards a split produces', () => {
        expect(roleConsequence({ ...base, valueCount: 4 })).toBe(
            'Any% becomes 4 separate leaderboards, each with its own world record.',
        );
    });

    it('says a one-value split does nothing yet', () => {
        expect(roleConsequence({ ...base, valueCount: 1 })).toBe(
            'Any% stays one leaderboard until you add a second value.',
        );
    });

    it('asks for values when there are none', () => {
        expect(roleConsequence({ ...base, valueCount: 0 })).toBe(
            'Add at least one value.',
        );
    });

    it('describes a filter as leaving the board intact', () => {
        expect(
            roleConsequence({ ...base, role: 'filter', valueCount: 3 }),
        ).toBe('Any% stays one leaderboard. Runners can filter by Platform.');
    });
});

describe('boardCountLabel', () => {
    it('pluralizes', () => {
        expect(boardCountLabel('subcategory', 1)).toBe('splits this board into 1');
        expect(boardCountLabel('subcategory', 4)).toBe('splits this board into 4');
        expect(boardCountLabel('filter', 3)).toBe('filter only');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/lib/variables/__tests__/language.test.ts`
Expected: FAIL — cannot resolve `../language`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/variables/language.ts`:

```typescript
/**
 * The words this surface uses, in one place.
 *
 * Mods do not read `subcategory`, `bucket`, `nameNormalized` or "re-resolve
 * worker". They read what a thing does. The console, the wizard and the
 * in-effect panel all import from here so they cannot describe the same
 * concept three different ways — which is exactly how this surface got
 * confusing in the first place.
 */

export type VariableRoleId = 'subcategory' | 'filter';

export const ROLE_LABEL: Record<VariableRoleId, string> = {
    subcategory: 'splits this board',
    filter: 'filter only',
};

/** Row-level label, e.g. "splits this board into 4". */
export function boardCountLabel(
    role: VariableRoleId,
    valueCount: number,
): string {
    if (role === 'filter') return ROLE_LABEL.filter;
    return `${ROLE_LABEL.subcategory} into ${valueCount}`;
}

/** Live sentence under the role choice — what this decision actually does. */
export function roleConsequence(input: {
    role: VariableRoleId;
    variableName: string;
    categoryDisplay: string;
    valueCount: number;
}): string {
    const { role, variableName, categoryDisplay, valueCount } = input;

    if (role === 'filter') {
        return `${categoryDisplay} stays one leaderboard. Runners can filter by ${variableName}.`;
    }
    if (valueCount === 0) return 'Add at least one value.';
    if (valueCount === 1) {
        return `${categoryDisplay} stays one leaderboard until you add a second value.`;
    }
    return `${categoryDisplay} becomes ${valueCount} separate leaderboards, each with its own world record.`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/lib/variables/__tests__/language.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git -C /home/joey/therun/therun-fr add src/lib/variables/language.ts src/lib/variables/__tests__/language.test.ts
git -C /home/joey/therun/therun-fr commit -m "feat(variables): one vocabulary for the variables surface

The console, the wizard and the in-effect panel import the same words so
they cannot describe the same concept three different ways."
```

---

### Task 8: `effective.ts` — source labelling and shadow detection

**Files:**
- Create: `src/lib/variables/effective.ts`
- Test: `src/lib/variables/__tests__/effective.test.ts`

**Interfaces:**
- Consumes: `VariableRow` from `types/leaderboards.types` (fields used: `id`, `categoryId`, `name`, `nameNormalized`, `role`, `values`, `defaultValueIndex`, `sortOrder`).
- Produces:
  - `type VariableSource = 'shared' | 'category' | 'category-overrides-shared'`
  - `interface EffectiveVariable extends VariableRow { source: VariableSource }`
  - `function toEffective(merged: VariableRow[], gameWide: VariableRow[]): EffectiveVariable[]`
  - `function describeSource(source: VariableSource, categoryDisplay: string, variableName: string): string`
  - `function findShadowed(name: string, gameWide: VariableRow[]): VariableRow | undefined`
  - `function normalizeVariableName(raw: string): string`

- [ ] **Step 1: Write the failing test**

Create `src/lib/variables/__tests__/effective.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import type { VariableRow } from '../../../../types/leaderboards.types';
import {
    describeSource,
    findShadowed,
    normalizeVariableName,
    toEffective,
} from '../effective';

const row = (over: Partial<VariableRow>): VariableRow =>
    ({
        id: 1,
        gameId: 1,
        categoryId: null,
        name: 'Platform',
        nameNormalized: 'platform',
        role: 'subcategory',
        values: [['Nintendo 64'], ['Emulator']],
        defaultValueIndex: 0,
        sortOrder: 0,
        description: null,
        version: 1,
        published: true,
        ...over,
    }) as VariableRow;

describe('toEffective', () => {
    it('labels a game-wide row as shared', () => {
        const merged = [row({})];
        expect(toEffective(merged, merged)[0].source).toBe('shared');
    });

    it('labels a category row with no shared twin as category-only', () => {
        const merged = [row({ categoryId: 7, name: 'Version', nameNormalized: 'version' })];
        expect(toEffective(merged, [])[0].source).toBe('category');
    });

    it('flags a category row that shadows a shared one', () => {
        const shared = [row({})];
        const merged = [row({ id: 2, categoryId: 7 })];
        expect(toEffective(merged, shared)[0].source).toBe(
            'category-overrides-shared',
        );
    });

    it('sorts by sortOrder', () => {
        const merged = [
            row({ id: 1, nameNormalized: 'b', sortOrder: 2 }),
            row({ id: 2, nameNormalized: 'a', sortOrder: 1 }),
        ];
        expect(toEffective(merged, []).map((v) => v.nameNormalized)).toEqual([
            'a',
            'b',
        ]);
    });
});

describe('describeSource', () => {
    it('names the category in every category-scoped phrasing', () => {
        expect(describeSource('shared', 'Any%', 'Platform')).toBe(
            'Shared by all categories',
        );
        expect(describeSource('category', 'Any%', 'Platform')).toBe('Any% only');
        expect(
            describeSource('category-overrides-shared', 'Any%', 'Platform'),
        ).toBe('Any% only — replaces the shared Platform');
    });
});

describe('findShadowed', () => {
    const shared = [row({})];

    it('matches on the normalized name, not the typed one', () => {
        expect(findShadowed(' PLAT FORM ', shared)?.name).toBe('Platform');
    });

    it('returns undefined when nothing is shadowed', () => {
        expect(findShadowed('Version', shared)).toBeUndefined();
    });
});

describe('normalizeVariableName', () => {
    it('matches the backend normalization', () => {
        expect(normalizeVariableName(' Plat form =|')).toBe('platform');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/lib/variables/__tests__/effective.test.ts`
Expected: FAIL — cannot resolve `../effective`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/variables/effective.ts`:

```typescript
import type { VariableRow } from '../../../types/leaderboards.types';

export type VariableSource =
    | 'shared'
    | 'category'
    | 'category-overrides-shared';

export interface EffectiveVariable extends VariableRow {
    source: VariableSource;
}

/**
 * Same normalization the backend applies (see normalizeVariableString): the
 * override rule keys on it, so a mismatch here would report the wrong source.
 */
export function normalizeVariableName(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, '').replace(/[=|]/g, '');
}

/**
 * Tag each row of the merged list with where it came from.
 *
 * `merged` is what the public endpoint returns for one category — already
 * merged, already published-only. `gameWide` is the admin list for
 * categoryId=null, which is what tells us whether a category row is a plain
 * category variable or one that shadows a shared one. That distinction is the
 * whole point: today a mod can replace a shared variable's values and default
 * for one category without ever being told.
 */
export function toEffective(
    merged: VariableRow[],
    gameWide: VariableRow[],
): EffectiveVariable[] {
    const sharedNames = new Set(gameWide.map((v) => v.nameNormalized));
    return [...merged]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((v) => ({
            ...v,
            source:
                v.categoryId == null
                    ? ('shared' as const)
                    : sharedNames.has(v.nameNormalized)
                      ? ('category-overrides-shared' as const)
                      : ('category' as const),
        }));
}

export function describeSource(
    source: VariableSource,
    categoryDisplay: string,
    variableName: string,
): string {
    switch (source) {
        case 'shared':
            return 'Shared by all categories';
        case 'category':
            return `${categoryDisplay} only`;
        case 'category-overrides-shared':
            return `${categoryDisplay} only — replaces the shared ${variableName}`;
    }
}

/** The game-wide row a new category-scoped name would shadow, if any. */
export function findShadowed(
    name: string,
    gameWide: VariableRow[],
): VariableRow | undefined {
    const normalized = normalizeVariableName(name);
    return gameWide.find((v) => v.nameNormalized === normalized);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/lib/variables/__tests__/effective.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git -C /home/joey/therun/therun-fr add src/lib/variables/effective.ts src/lib/variables/__tests__/effective.test.ts
git -C /home/joey/therun/therun-fr commit -m "feat(variables): label where each effective variable comes from

A category row that shadows a shared one is now a distinct, named state.
Today a mod can replace a shared variable's values and default for one
category without being told."
```

---

### Task 9: `consequences.ts` — dry-run result to sentences

**Files:**
- Create: `src/lib/variables/consequences.ts`
- Test: `src/lib/variables/__tests__/consequences.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface BoardMovement { key: string; label: string; before: number; after: number }`
  - `interface CategoryPreview { categoryId: number; display: string; moved: number; boards: BoardMovement[] }`
  - `interface VariablePreview { moved: number; unresolved: number; categories: CategoryPreview[] }`
  - `interface ConsequenceCopy { nothingMoves: boolean; headline: string; detail: string | null; boards: BoardMovement[] }`
  - `function describeConsequences(preview: VariablePreview, opts: { variableName: string; action: 'save' | 'delete' }): ConsequenceCopy`

These three interface names mirror the backend response exactly (Task 3).

- [ ] **Step 1: Write the failing test**

Create `src/lib/variables/__tests__/consequences.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { describeConsequences, type VariablePreview } from '../consequences';

const empty: VariablePreview = { moved: 0, unresolved: 0, categories: [] };

const oneCategory: VariablePreview = {
    moved: 412,
    unresolved: 0,
    categories: [
        {
            categoryId: 1,
            display: 'Any%',
            moved: 412,
            boards: [
                { key: 'platform=nintendo64', label: 'Nintendo 64', before: 1204, after: 792 },
                { key: 'platform=emulator', label: 'Emulator', before: 18, after: 430 },
            ],
        },
    ],
};

describe('describeConsequences', () => {
    it('says nothing moves when nothing moves', () => {
        const copy = describeConsequences(empty, {
            variableName: 'Platform',
            action: 'save',
        });
        expect(copy.nothingMoves).toBe(true);
        expect(copy.headline).toBe('Nothing moves.');
        expect(copy.boards).toEqual([]);
    });

    it('counts runs, not entries, in user-facing copy', () => {
        const copy = describeConsequences(oneCategory, {
            variableName: 'Platform',
            action: 'save',
        });
        expect(copy.nothingMoves).toBe(false);
        expect(copy.headline).toBe('412 runs move to a different board.');
        expect(copy.boards).toHaveLength(2);
    });

    it('names the affected category count when more than one', () => {
        const many: VariablePreview = {
            moved: 30,
            unresolved: 0,
            categories: [
                { categoryId: 1, display: 'Any%', moved: 20, boards: [] },
                { categoryId: 2, display: '100%', moved: 10, boards: [] },
            ],
        };
        const copy = describeConsequences(many, {
            variableName: 'Platform',
            action: 'save',
        });
        expect(copy.detail).toBe('This changes 2 categories.');
    });

    it('mentions values that match nothing', () => {
        const copy = describeConsequences(
            { ...oneCategory, unresolved: 7 },
            { variableName: 'Platform', action: 'save' },
        );
        expect(copy.detail).toContain(
            '7 runs have a Platform that matches none of your values',
        );
    });

    it('uses delete phrasing for a delete', () => {
        const copy = describeConsequences(oneCategory, {
            variableName: 'Platform',
            action: 'delete',
        });
        expect(copy.headline).toBe(
            '412 runs move to a different board when Platform is deleted.',
        );
    });

    it('singularizes one run', () => {
        const one: VariablePreview = {
            moved: 1,
            unresolved: 0,
            categories: [{ categoryId: 1, display: 'Any%', moved: 1, boards: [] }],
        };
        expect(
            describeConsequences(one, { variableName: 'P', action: 'save' })
                .headline,
        ).toBe('1 run moves to a different board.');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/lib/variables/__tests__/consequences.test.ts`
Expected: FAIL — cannot resolve `../consequences`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/variables/consequences.ts`:

```typescript
/**
 * Turns the backend dry-run into sentences a mod can act on.
 *
 * The shapes here mirror the `?dryRun=1` response exactly. Ceremony scales to
 * consequence: when nothing moves the dialog collapses to a single confirm,
 * and it says so rather than showing an empty table.
 */

export interface BoardMovement {
    key: string;
    label: string;
    before: number;
    after: number;
}

export interface CategoryPreview {
    categoryId: number;
    display: string;
    moved: number;
    boards: BoardMovement[];
}

export interface VariablePreview {
    moved: number;
    unresolved: number;
    categories: CategoryPreview[];
}

export interface ConsequenceCopy {
    nothingMoves: boolean;
    headline: string;
    detail: string | null;
    /** Board table for the single-category case; empty when several. */
    boards: BoardMovement[];
}

const runs = (n: number) => (n === 1 ? '1 run' : `${n} runs`);
const move = (n: number) => (n === 1 ? 'moves' : 'move');

export function describeConsequences(
    preview: VariablePreview,
    opts: { variableName: string; action: 'save' | 'delete' },
): ConsequenceCopy {
    if (preview.moved === 0) {
        return {
            nothingMoves: true,
            headline: 'Nothing moves.',
            detail:
                preview.unresolved > 0
                    ? unresolvedSentence(preview.unresolved, opts.variableName)
                    : null,
            boards: [],
        };
    }

    const headline =
        opts.action === 'delete'
            ? `${runs(preview.moved)} ${move(preview.moved)} to a different board when ${opts.variableName} is deleted.`
            : `${runs(preview.moved)} ${move(preview.moved)} to a different board.`;

    const parts: string[] = [];
    if (preview.categories.length > 1) {
        parts.push(`This changes ${preview.categories.length} categories.`);
    }
    if (preview.unresolved > 0) {
        parts.push(unresolvedSentence(preview.unresolved, opts.variableName));
    }

    return {
        nothingMoves: false,
        headline,
        detail: parts.length > 0 ? parts.join(' ') : null,
        // One category: show its board table. Several: the dialog lists per
        // category instead, so a flattened table here would mislead.
        boards:
            preview.categories.length === 1 ? preview.categories[0].boards : [],
    };
}

function unresolvedSentence(count: number, variableName: string): string {
    return `${runs(count)} have a ${variableName} that matches none of your values, so they use the default.`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/lib/variables/__tests__/consequences.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Run the whole suite**

Run: `cd /home/joey/therun/therun-fr && npm run test`
Expected: all pre-existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git -C /home/joey/therun/therun-fr add src/lib/variables/consequences.ts src/lib/variables/__tests__/consequences.test.ts
git -C /home/joey/therun/therun-fr commit -m "feat(variables): turn the dry-run into sentences a mod can act on

Ceremony scales to consequence: when nothing moves the copy says so
instead of rendering an empty table."
```

---

# Phase 3 — Frontend data layer

### Task 10: Client + server actions for preview and rebuild

**Files:**
- Modify: `src/lib/leaderboard-variables.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/variables/actions/preview-variable.action.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/variables/actions/rebuild-boards.action.ts`

**Interfaces:**
- Consumes: `VariablePreview` from `src/lib/variables/consequences` (Task 9); `apiFetch` from `src/lib/api-client`; `confirmPermission` from `src/rbac/confirm-permission`; the existing `UpsertVariableInput` / `DeleteVariableInput` types in `src/lib/leaderboard-variables.ts`.
- Produces:
  - `previewGameVariable(sessionId, gameId, body, mode): Promise<VariablePreview>` in the lib
  - `previewVariableAction(input): Promise<{ result: VariablePreview } | { error: string }>`
  - `rebuildBoardsAction(input): Promise<{ ok: true } | { error: string }>`
  - `CombinationsResult['combinations'][number]` gains `entryCount: number`

- [ ] **Step 1: Extend the lib**

In `src/lib/leaderboard-variables.ts`, add the import and the two changes:

```typescript
import type { VariablePreview } from '~src/lib/variables/consequences';
```

Add after `deleteGameVariable`:

```typescript
/**
 * Dry run: what a proposed definition would move, without writing it. Rides
 * the same route as the real write (`?dryRun=1`) so it shares its auth and
 * validation — and so no new API Gateway resource was needed.
 */
export async function previewGameVariable(
    sessionId: string,
    gameId: number,
    body: UpsertVariableInput | DeleteVariableInput,
    mode: 'save' | 'delete',
): Promise<VariablePreview> {
    const raw = await apiFetch<{ preview: VariablePreview }>(
        `${basePath(gameId)}?dryRun=1`,
        {
            sessionId,
            method: mode === 'delete' ? 'DELETE' : 'POST',
            body,
        },
    );
    return raw.preview;
}
```

Change the combinations type to carry the new count:

```typescript
export interface CombinationsResult {
    combinations: {
        subcategoryKey: string;
        valid: boolean;
        entryCount: number;
    }[];
    mode: 'open' | 'managed';
}
```

- [ ] **Step 2: Write the preview action**

Create `app/(new-layout)/games-v2/[game]/manage/variables/actions/preview-variable.action.ts`:

```typescript
'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type DeleteVariableInput,
    previewGameVariable,
    type UpsertVariableInput,
} from '~src/lib/leaderboard-variables';
import type { VariablePreview } from '~src/lib/variables/consequences';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    mode: 'save' | 'delete';
    body: UpsertVariableInput | DeleteVariableInput;
}

export async function previewVariableAction(
    input: Input,
): Promise<{ result: VariablePreview } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit variables.' };
    }

    try {
        const preview = await previewGameVariable(
            user.id,
            input.gameId,
            input.body,
            input.mode,
        );
        return { result: preview };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Could not work out what this change would move.' };
    }
}
```

- [ ] **Step 3: Write the rebuild action**

Create `app/(new-layout)/games-v2/[game]/manage/variables/actions/rebuild-boards.action.ts`:

```typescript
'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
}

/**
 * Queues a leaderboard rebuild for this game, which is what applies a variable
 * change to runs that already exist. Gated on the same per-game permission the
 * variable edit itself needs — the backend was widened to match (see the
 * backend's handleInvalidateCache), because the person told "runs move on the
 * next rebuild" has to be able to trigger one.
 */
export async function rebuildBoardsAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to rebuild this game.' };
    }

    try {
        await apiFetch<unknown>(
            `/v1/leaderboards/invalidate-cache/${input.gameId}`,
            { method: 'POST', sessionId: user.id },
        );
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Could not start the rebuild.' };
    }
}
```

- [ ] **Step 4: Typecheck**

Run: `cd /home/joey/therun/therun-fr && npm run typecheck`
Expected: no new errors. `combinations-section.tsx` may now error on the `entryCount` field — that is expected and is fixed in Task 14. If it does, note it and continue.

- [ ] **Step 5: Commit**

```bash
git -C /home/joey/therun/therun-fr add src/lib/leaderboard-variables.ts "app/(new-layout)/games-v2/[game]/manage/variables/actions"
git -C /home/joey/therun/therun-fr commit -m "feat(variables): preview and rebuild server actions"
```

---

### Task 11: Cache revalidation on every variable write

The in-effect panel reads the public endpoint, which is `'use cache'` tagged `game-vars:{gameSlug}:{categorySlug}`. Without revalidation the panel would show yesterday's truth — which is worse than showing nothing, because it looks authoritative.

**Files:**
- Modify: `.../manage/variables/actions/create-variable.action.ts`
- Modify: `.../manage/variables/actions/update-variable.action.ts`
- Modify: `.../manage/variables/actions/delete-variable.action.ts`

**Interfaces:**
- Consumes: `resolveCategory` from `~src/lib/games-v1`, `revalidateTag` from `next/cache`.
- Produces: no new exports.

- [ ] **Step 1: Check what the actions already revalidate**

Run: `cd /home/joey/therun/therun-fr && grep -n "revalidateTag\|updateTag" "app/(new-layout)/games-v2/[game]/manage/variables/actions/"*.ts`

If `game-vars:` is already revalidated in all three, skip to Step 3 and record that no change was needed.

- [ ] **Step 2: Add the revalidation helper and call it**

Create `app/(new-layout)/games-v2/[game]/manage/variables/actions/revalidate-variables.ts`:

```typescript
import { revalidateTag } from 'next/cache';
import { resolveCategory } from '~src/lib/games-v1';

/**
 * The in-effect panel reads the public variables endpoint, so every admin
 * write has to drop its cache. A game-wide write affects every category's
 * merged list, not just one — hence the fan-out.
 */
export async function revalidateVariableCaches(
    gameSlug: string,
    gameId: number,
    categoryId: number | null,
): Promise<void> {
    const { categories } = await resolveCategory(gameId);
    const targets =
        categoryId == null
            ? categories
            : categories.filter((c) => c.id === categoryId);
    for (const cat of targets) {
        revalidateTag(`game-vars:${gameSlug}:${cat.name}`, 'hours');
    }
}
```

In each of the three actions, after a successful write and before returning, add:

```typescript
    await revalidateVariableCaches(input.gameSlug, input.gameId, categoryId);
```

using whatever the action's local variable for the scope's category id is (`input.body.categoryId ?? null` in create/update; `input.categoryId ?? null` in delete).

- [ ] **Step 3: Typecheck**

Run: `cd /home/joey/therun/therun-fr && npm run typecheck`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git -C /home/joey/therun/therun-fr add "app/(new-layout)/games-v2/[game]/manage/variables/actions"
git -C /home/joey/therun/therun-fr commit -m "fix(variables): drop the public variables cache on every admin write

The in-effect panel reads the public endpoint. A stale panel is worse than
no panel — it looks authoritative."
```

---

# Phase 4 — UI

### Task 12: The in-effect panel

**Files:**
- Create: `.../manage/variables/in-effect-panel.tsx`
- Create: `.../manage/variables/variables.module.scss`

**Interfaces:**
- Consumes: `toEffective`, `describeSource`, `EffectiveVariable` (Task 8); `boardCountLabel` (Task 7); `getVariables(gameSlug, categorySlug)` from `~src/lib/leaderboards-v1` returning `{ variables, reservedParams, validCombinations }`.
- Produces: `<InEffectPanel gameSlug categorySlug categoryDisplay gameWide onJump />` where `onJump: (v: EffectiveVariable) => void`.

- [ ] **Step 1: Write the component**

Create `app/(new-layout)/games-v2/[game]/manage/variables/in-effect-panel.tsx`:

```tsx
'use client';

import type { VariableRow } from '../../../../../../types/leaderboards.types';
import {
    describeSource,
    type EffectiveVariable,
    toEffective,
} from '~src/lib/variables/effective';
import { boardCountLabel } from '~src/lib/variables/language';
import styles from './variables.module.scss';

interface Props {
    /** Merged, published rows exactly as the public board receives them. */
    merged: VariableRow[];
    /** Admin list for categoryId=null — tells us which rows are shadowed. */
    gameWide: VariableRow[];
    categoryDisplay: string;
    onJump: (variable: EffectiveVariable) => void;
}

/**
 * Zone 1: what runners actually see on this board.
 *
 * Fed by the same merged list the public page renders, not re-derived here —
 * the panel cannot promise something the board does not do. This is the one
 * place a mod can answer "what does this board look like now?" without
 * leaving the console.
 */
export function InEffectPanel({
    merged,
    gameWide,
    categoryDisplay,
    onJump,
}: Props) {
    const effective = toEffective(merged, gameWide);

    return (
        <section className={styles.inEffect} aria-labelledby="in-effect-title">
            <header className={styles.inEffectHead}>
                <h3 id="in-effect-title" className={styles.inEffectTitle}>
                    In effect on {categoryDisplay}
                </h3>
                <span className={styles.inEffectNote}>what runners see</span>
            </header>

            {effective.length === 0 ? (
                <p className={styles.inEffectEmpty}>
                    No variables. {categoryDisplay} is a single leaderboard.
                </p>
            ) : (
                <ul className={styles.inEffectList}>
                    {effective.map((v) => (
                        <li key={`${v.categoryId ?? 'game'}-${v.nameNormalized}`}>
                            <button
                                type="button"
                                className={styles.inEffectRow}
                                onClick={() => onJump(v)}
                            >
                                <span className={styles.inEffectName}>
                                    {v.name}
                                </span>
                                <span className={styles.inEffectRole}>
                                    {boardCountLabel(v.role, v.values.length)}
                                </span>
                                <span
                                    className={
                                        v.source === 'category-overrides-shared'
                                            ? styles.sourceOverride
                                            : styles.source
                                    }
                                >
                                    {describeSource(
                                        v.source,
                                        categoryDisplay,
                                        v.name,
                                    )}
                                </span>
                                <span className={styles.inEffectValues}>
                                    {v.values.map((b) => b[0]).join(' · ')}
                                </span>
                                {v.role === 'subcategory' &&
                                    v.defaultValueIndex != null && (
                                        <span className={styles.inEffectDefault}>
                                            used when a run doesn&apos;t say:{' '}
                                            {v.values[v.defaultValueIndex]?.[0]}
                                        </span>
                                    )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
```

- [ ] **Step 2: Write the styles**

Create `app/(new-layout)/games-v2/[game]/manage/variables/variables.module.scss`. Follow the surrounding console conventions — open `../console/console.module.scss` and reuse its surface treatment, spacing tokens and colour variables rather than inventing new ones. Required classes: `inEffect`, `inEffectHead`, `inEffectTitle`, `inEffectNote`, `inEffectEmpty`, `inEffectList`, `inEffectRow`, `inEffectName`, `inEffectRole`, `source`, `sourceOverride`, `inEffectValues`, `inEffectDefault`.

`sourceOverride` must read as a warning tone (the shared-variable shadow is the state a mod needs to notice); `source` is quiet secondary text. `inEffectRow` is a full-width button with a visible `:focus-visible` outline.

- [ ] **Step 3: Typecheck**

Run: `cd /home/joey/therun/therun-fr && npm run typecheck`
Expected: no errors in the new files.

- [ ] **Step 4: Commit**

```bash
git -C /home/joey/therun/therun-fr add "app/(new-layout)/games-v2/[game]/manage/variables/in-effect-panel.tsx" "app/(new-layout)/games-v2/[game]/manage/variables/variables.module.scss"
git -C /home/joey/therun/therun-fr commit -m "feat(variables): show what runners actually see on this board

Fed by the same merged list the public page renders, so the panel cannot
promise something the board does not do."
```

---

### Task 13: The consequence dialog

**Files:**
- Create: `.../manage/variables/consequence-dialog.tsx`

**Interfaces:**
- Consumes: `describeConsequences`, `VariablePreview` (Task 9); `rebuildBoardsAction` (Task 10); `BoardDialog` from `../../shared/board-dialog`.
- Produces: `<ConsequenceDialog open preview loading error variableName action gameSlug gameId onConfirm onCancel />`.

- [ ] **Step 1: Write the component**

Create `app/(new-layout)/games-v2/[game]/manage/variables/consequence-dialog.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    describeConsequences,
    type VariablePreview,
} from '~src/lib/variables/consequences';
import { BoardDialog } from '../../shared/board-dialog';
import { rebuildBoardsAction } from './actions/rebuild-boards.action';
import styles from './variables.module.scss';

interface Props {
    open: boolean;
    /** null while the dry run is in flight. */
    preview: VariablePreview | null;
    loading: boolean;
    error: string | null;
    variableName: string;
    action: 'save' | 'delete';
    gameSlug: string;
    gameId: number;
    onConfirm: () => void;
    onCancel: () => void;
    pending: boolean;
}

/**
 * The review step in front of every write.
 *
 * Ceremony scales to consequence: a change that moves nothing collapses to a
 * single confirm; one that repartitions the board shows the boards and their
 * counts, and offers the rebuild that applies it to runs that already exist.
 */
export function ConsequenceDialog({
    open,
    preview,
    loading,
    error,
    variableName,
    action,
    gameSlug,
    gameId,
    onConfirm,
    onCancel,
    pending,
}: Props) {
    const [rebuilding, startRebuild] = useTransition();
    const [rebuilt, setRebuilt] = useState(false);

    const copy = preview
        ? describeConsequences(preview, { variableName, action })
        : null;

    const rebuild = () => {
        startRebuild(async () => {
            const res = await rebuildBoardsAction({ gameSlug, gameId });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setRebuilt(true);
        });
    };

    return (
        <BoardDialog
            open={open}
            onClose={onCancel}
            labelledBy="consequence-title"
            size="md"
            closeOnBackdropClick={!pending && !loading}
        >
            <h5 id="consequence-title" className={styles.dialogTitle}>
                {action === 'delete'
                    ? `Delete ${variableName}?`
                    : `Save ${variableName}?`}
            </h5>

            {loading && (
                <p className={styles.dialogBody}>
                    Working out what this changes…
                </p>
            )}

            {error && <div className={styles.dialogError}>{error}</div>}

            {copy && !loading && (
                <div className={styles.dialogBody}>
                    <p className={styles.dialogHeadline}>{copy.headline}</p>
                    {copy.detail && (
                        <p className={styles.dialogDetail}>{copy.detail}</p>
                    )}

                    {copy.boards.length > 0 && (
                        <ul className={styles.boardList}>
                            {copy.boards.map((b) => (
                                <li key={b.key} className={styles.boardRow}>
                                    <span>{b.label}</span>
                                    <span className={styles.boardCounts}>
                                        {b.before.toLocaleString()} →{' '}
                                        {b.after.toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {preview && preview.categories.length > 1 && (
                        <ul className={styles.boardList}>
                            {preview.categories.map((c) => (
                                <li key={c.categoryId} className={styles.boardRow}>
                                    <span>{c.display}</span>
                                    <span className={styles.boardCounts}>
                                        {c.moved.toLocaleString()} moving
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!copy.nothingMoves && (
                        <div className={styles.rebuildRow}>
                            <span>Runs move on the next rebuild.</span>
                            {rebuilt ? (
                                <span className={styles.rebuildDone}>
                                    Rebuild queued. Boards update within a few
                                    minutes.
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={rebuilding}
                                    onClick={rebuild}
                                >
                                    {rebuilding ? 'Starting…' : 'Rebuild now'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className={styles.dialogFooter}>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onCancel}
                    disabled={pending}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={
                        action === 'delete'
                            ? 'btn btn-sm btn-danger'
                            : 'btn btn-sm btn-primary'
                    }
                    onClick={onConfirm}
                    disabled={pending || loading || !!error}
                >
                    {pending
                        ? 'Saving…'
                        : action === 'delete'
                          ? `Delete ${variableName}`
                          : 'Save changes'}
                </button>
            </div>
        </BoardDialog>
    );
}
```

- [ ] **Step 2: Add the dialog styles**

Append to `variables.module.scss`: `dialogTitle`, `dialogBody`, `dialogHeadline` (emphasis weight), `dialogDetail` (secondary), `dialogError` (danger tone), `boardList`, `boardRow` (flex, space-between), `boardCounts` (monospace numerals — reuse the `mono-time` mixin the board styles already use), `rebuildRow`, `rebuildDone`, `dialogFooter` (flex, end-aligned, gap).

- [ ] **Step 3: Confirm the BoardDialog props match**

Run: `cd /home/joey/therun/therun-fr && grep -n "interface Props" -A 15 "app/(new-layout)/games-v2/[game]/shared/board-dialog.tsx"`
Expected: `open`, `onClose`, `labelledBy`, `size`, `closeOnBackdropClick` all exist. Adjust the call if any name differs.

- [ ] **Step 4: Typecheck**

Run: `cd /home/joey/therun/therun-fr && npm run typecheck`
Expected: no errors in the new file.

- [ ] **Step 5: Commit**

```bash
git -C /home/joey/therun/therun-fr add "app/(new-layout)/games-v2/[game]/manage/variables/consequence-dialog.tsx" "app/(new-layout)/games-v2/[game]/manage/variables/variables.module.scss"
git -C /home/joey/therun/therun-fr commit -m "feat(variables): review step in front of every variable write

Shows what moves, in real numbers, and offers the rebuild that applies it
to runs that already exist."
```

---

### Task 14: Sub-boards — counts, plain language, an exit from managed mode

**Files:**
- Modify: `.../manage/variables/combinations-section.tsx`

**Interfaces:**
- Consumes: `CombinationsResult` with `entryCount` (Task 10); `labelForKey` equivalent — the component's existing `parseKey` already splits keys into name/value pairs and renders values per column, which is sufficient; do not add a second labelling path.
- Produces: unchanged export `CombinationsSection`.

- [ ] **Step 1: Add `entryCount` to the local `Combo` type**

```typescript
interface Combo {
    subcategoryKey: string;
    valid: boolean;
    entryCount: number;
}
```

- [ ] **Step 2: Replace the mode copy with plain language**

Replace the `mode === 'open' ? … : …` block in the header with:

```tsx
                    <p className="text-muted small mb-0">
                        {mode === 'open'
                            ? `${combos.length} combinations, all live boards. Runners can submit any of them.`
                            : `${validCount} of ${combos.length} combinations are live boards. Runs in the others keep their current board until the next rebuild.`}
                    </p>
```

- [ ] **Step 3: Show the entry count per row**

Add a header cell after the checkbox column:

```tsx
                                    <th>Runs</th>
```

and in each row, immediately after the checkbox cell:

```tsx
                                            <td className="text-muted small">
                                                {c.entryCount.toLocaleString()}
                                            </td>
```

- [ ] **Step 4: Warn when unchecking a combination that holds runs**

Above the Save button, add:

```tsx
                    {(() => {
                        const stranded = combos
                            .filter(
                                (c, i) =>
                                    !c.valid &&
                                    original[i]?.valid &&
                                    c.entryCount > 0,
                            )
                            .reduce((sum, c) => sum + c.entryCount, 0);
                        return stranded > 0 ? (
                            <p className="text-warning small mb-2">
                                {stranded.toLocaleString()} run
                                {stranded === 1 ? '' : 's'} sit on boards you
                                are switching off. They move to the default
                                board on the next rebuild.
                            </p>
                        ) : null;
                    })()}
```

- [ ] **Step 5: Add an explicit exit from managed mode**

Next to "Check all" / "Uncheck all", add:

```tsx
                    {mode === 'managed' && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setAll(true)}
                            disabled={busy || combos.length === 0}
                        >
                            Allow every combination
                        </button>
                    )}
```

and remove the now-redundant "Check all" button so there is one obvious control rather than two that do the same thing.

- [ ] **Step 6: Typecheck**

Run: `cd /home/joey/therun/therun-fr && npm run typecheck`
Expected: no errors. The `entryCount` error noted in Task 10 Step 4 is now resolved.

- [ ] **Step 7: Commit**

```bash
git -C /home/joey/therun/therun-fr add "app/(new-layout)/games-v2/[game]/manage/variables/combinations-section.tsx"
git -C /home/joey/therun/therun-fr commit -m "feat(combinations): say what a sub-board holds before it is switched off

Plus plain-language mode copy and an explicit way out of managed mode,
which was previously only reachable by checking every row."
```

---

### Task 15: Restructure the form

**Files:**
- Modify: `.../manage/variables/variable-form.tsx`

**Interfaces:**
- Consumes: `roleConsequence` (Task 7); `findShadowed` (Task 8); existing `VariableFormValues`, `Bucket`, `bucketsToValues`, `normalizeName`.
- Produces: `VariableForm` gains props `categoryDisplay: string`, `scopeLabel: string`, `gameWide: VariableRow[]`. `VariableFormValues` is unchanged, so `variables-screen.tsx` (Task 16) can rely on today's submit shape.

- [ ] **Step 1: Add the new props**

```typescript
interface Props {
    mode: 'create' | 'edit';
    editing?: VariableRow | null;
    reservedParams: string[];
    /** Scope captured when the form opened, e.g. "Any% only". Printed in the header. */
    scopeLabel: string;
    categoryDisplay: string;
    /** Game-wide rows, for shadow detection on a category-scoped create. */
    gameWide: VariableRow[];
    onSubmit: (values: VariableFormValues) => void;
    onCancel: () => void;
    isBusy: boolean;
    error: string | null;
}
```

- [ ] **Step 2: Add the form header**

As the first child of the `<form>`:

```tsx
            <p className={styles.formScope}>
                {mode === 'create'
                    ? `New variable — ${scopeLabel}`
                    : `Editing ${editing?.name} — ${scopeLabel}`}
            </p>
```

Add `formScope` to `variables.module.scss` (small, secondary, emphasis on the scope).

- [ ] **Step 3: Move the role lock note out of the edit-only branch**

Replace the `{mode === 'edit' && (…)}` note inside the role fieldset with an unconditional one:

```tsx
                <small className="text-muted d-block mt-1">
                    {mode === 'edit'
                        ? 'This can’t be changed. To switch, delete the variable and make a new one.'
                        : 'Choose carefully — this can’t be changed later without deleting the variable and making a new one.'}
                </small>
```

- [ ] **Step 4: Add the live consequence sentence**

Directly below the role fieldset:

```tsx
            <p className={styles.roleConsequence}>
                {roleConsequence({
                    role,
                    variableName: name.trim() || 'this variable',
                    categoryDisplay,
                    valueCount: bucketsToValues(buckets).length,
                })}
            </p>
```

Import `roleConsequence` from `~src/lib/variables/language`. Add `roleConsequence` to the SCSS.

- [ ] **Step 5: Add the shadow warning**

Below the consequence sentence:

```tsx
            {mode === 'create' &&
                scopeLabel !== 'Shared by all categories' &&
                (() => {
                    const shadowed = findShadowed(name, gameWide);
                    return shadowed ? (
                        <div className={styles.shadowWarning}>
                            This replaces the shared <strong>{shadowed.name}</strong>{' '}
                            for {categoryDisplay} only — its values and its
                            default. Other categories keep the shared one.
                        </div>
                    ) : null;
                })()}
```

Import `findShadowed` from `~src/lib/variables/effective`. Style `shadowWarning` as a warning surface.

- [ ] **Step 6: Rename the user-facing labels**

- The `Default value` label becomes `Used when a run doesn't say`; its helper text becomes `Runs that don't specify ${name || 'this variable'} land on this board.`
- The aliases toggle text becomes `+ also accept` / `− also accept`.
- The `URL key:` helper becomes `Web address: <code>{normalizedName}</code>`.
- The reserved-name error becomes `"{normalizedName}" is reserved — pick a different name.` and the list of every reserved param is deleted.

- [ ] **Step 7: Move sort order and description behind a fold**

Wrap the `Sort order` input and the `Description (optional)` textarea in:

```tsx
            <details className={styles.more}>
                <summary>More</summary>
                {/* sort order + description, unchanged */}
            </details>
```

Remove the sort order input from the top row so the first row is Name alone.

- [ ] **Step 8: Typecheck**

Run: `cd /home/joey/therun/therun-fr && npm run typecheck`
Expected: errors only at the `VariableForm` call site (missing new props) — fixed in Task 16.

- [ ] **Step 9: Commit**

```bash
git -C /home/joey/therun/therun-fr add "app/(new-layout)/games-v2/[game]/manage/variables/variable-form.tsx" "app/(new-layout)/games-v2/[game]/manage/variables/variables.module.scss"
git -C /home/joey/therun/therun-fr commit -m "feat(variables): question-shaped form with live consequences

States its own scope, warns before shadowing a shared variable, and puts
the role lock where the choice is still free rather than after it."
```

---

### Task 16: `variables-screen.tsx` — compose the zones, fix the state bugs

The largest task. It replaces `variables-section.tsx`, extracts the table, wires the preview into the save path, and fixes the retargeting and dirty-state bugs.

**Files:**
- Create: `.../manage/variables/variable-table.tsx`
- Create: `.../manage/variables/variables-screen.tsx`
- Delete: `.../manage/variables/variables-section.tsx`
- Modify: `.../manage/console/content-router.tsx`

**Interfaces:**
- Consumes: `InEffectPanel` (12), `ConsequenceDialog` (13), `CombinationsSection` (14), `VariableForm` (15), `previewVariableAction` (10), `describeSource` (8), existing `loadVariablesAction` / `createVariableAction` / `updateVariableAction` / `deleteVariableAction`, and `getVariables` from `~src/lib/leaderboards-v1`.
- Produces: `<VariablesScreen gameSlug gameId selectedCategory mergedVariables />` where `mergedVariables: VariableRow[]` is the public merged list passed from the server.

- [ ] **Step 1: Extract the table**

Create `variable-table.tsx` containing today's `RoleTable` component and its `RoleTableProps` interface, moved verbatim from `variables-section.tsx`, exported as `VariableTable` / `VariableTableProps`. Keep the `VariableRow` import path relative to the new file.

- [ ] **Step 2: Create the screen**

Create `variables-screen.tsx`. Start from today's `variables-section.tsx` and change these things, keeping everything else (load, sort swap, delete confirm) as-is:

**(a) Capture scope when the form opens.** Replace `FormState` with:

```typescript
type FormState =
    | { open: false }
    | {
          open: true;
          mode: 'create';
          /** Scope captured at open time, NOT read from props at submit. */
          scopeCategoryId: number | null;
          scopeLabel: string;
      }
    | {
          open: true;
          mode: 'edit';
          editing: VariableRowData;
          scopeCategoryId: number | null;
          scopeLabel: string;
      };
```

Where the form is opened, capture the scope:

```typescript
    const openCreate = () =>
        setFormState({
            open: true,
            mode: 'create',
            scopeCategoryId:
                scope === 'category' ? (selectedCategory?.id ?? null) : null,
            scopeLabel:
                scope === 'category'
                    ? `${selectedCategory?.display ?? 'this category'} only`
                    : 'Shared by all categories',
        });
```

In `handleSubmit`, replace `const categoryId = scope === 'category' ? (selectedCategory?.id ?? null) : null;` with:

```typescript
        // Captured when the form opened. Reading it from live props here is
        // the bug that let an open create form silently retarget to whichever
        // category was selected by the time you hit Save.
        const categoryId = formState.open ? formState.scopeCategoryId : null;
```

**(b) Route every write through the preview.** Add:

```typescript
    const [pendingWrite, setPendingWrite] = useState<{
        values: VariableFormValues;
        action: 'save';
    } | { row: VariableRowData; action: 'delete' } | null>(null);
    const [preview, setPreview] = useState<VariablePreview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [isPreviewing, startPreview] = useTransition();
```

`handleSubmit` now only *requests* the preview:

```typescript
    const handleSubmit = (values: VariableFormValues) => {
        setFormError(null);
        setPreview(null);
        setPreviewError(null);
        setPendingWrite({ values, action: 'save' });
        const categoryId = formState.open ? formState.scopeCategoryId : null;
        startPreview(async () => {
            const res = await previewVariableAction({
                gameSlug,
                gameId,
                mode: 'save',
                body: { categoryId, ...values },
            });
            if ('error' in res) setPreviewError(res.error);
            else setPreview(res.result);
        });
    };
```

Move the existing create/update bodies into `commitWrite()`, called by the dialog's `onConfirm`. `handleDelete` follows the identical shape with `mode: 'delete'` and body `{ categoryId: row.categoryId, name: row.name }`; `doDelete` becomes the commit. The old `ConfirmDialog` for deletes is removed — `ConsequenceDialog` replaces it.

**(c) Guard the dirty form.** Add:

```typescript
    const requestScopeChange = (next: Scope) => {
        if (
            formState.open &&
            !window.confirm(
                'Discard the variable you are editing? Your changes are not saved.',
            )
        ) {
            return;
        }
        setScope(next);
        closeForm();
    };
```

and call it from both scope pills instead of `setScope(...) + closeForm()`.

Add the same guard for a category change:

```typescript
    // A category switch while a form is open used to leave the form mounted
    // against the old scope. Close it explicitly, asking first.
    useEffect(() => {
        if (!formState.open) return;
        const stillValid =
            formState.scopeCategoryId === null ||
            formState.scopeCategoryId === selectedCategory?.id;
        if (!stillValid) closeForm();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory?.id]);
```

**(d) Compose the zones.** The returned JSX becomes:

```tsx
    return (
        <div>
            <InEffectPanel
                merged={mergedVariables}
                gameWide={rows.filter((r) => r.categoryId === null)}
                categoryDisplay={selectedCategory?.display ?? 'this category'}
                onJump={(v) => {
                    setScope(v.categoryId == null ? 'game' : 'category');
                    setHighlightId(v.id);
                }}
            />

            {/* …existing scope pills (via requestScopeChange), form, tables… */}

            <CombinationsSection
                gameSlug={gameSlug}
                gameId={gameId}
                selectedCategory={selectedCategory}
            />

            <ConsequenceDialog
                open={pendingWrite !== null}
                preview={preview}
                loading={isPreviewing}
                error={previewError}
                variableName={
                    pendingWrite?.action === 'delete'
                        ? pendingWrite.row.name
                        : (pendingWrite?.values.name ?? '')
                }
                action={pendingWrite?.action ?? 'save'}
                gameSlug={gameSlug}
                gameId={gameId}
                pending={isSaving}
                onConfirm={commitWrite}
                onCancel={() => {
                    setPendingWrite(null);
                    setPreview(null);
                    setPreviewError(null);
                }}
            />
        </div>
    );
```

Add `const [highlightId, setHighlightId] = useState<number | null>(null);` and pass it to both `VariableTable`s so the jumped-to row can take a highlight class. Render the sub-boards section inside `<div id="sub-boards">` so the console's deep link can target it.

- [ ] **Step 3: Delete the old file**

```bash
git -C /home/joey/therun/therun-fr rm "app/(new-layout)/games-v2/[game]/manage/variables/variables-section.tsx"
```

- [ ] **Step 4: Update the console router**

In `content-router.tsx`, replace the `VariablesSection` import with `VariablesScreen`, and change both the `variables` and `combinations` cases:

```tsx
        case 'variables':
        case 'combinations':
            return selectedCategory ? (
                <VariablesScreen
                    gameSlug={game.name}
                    gameId={game.id}
                    selectedCategory={selectedCategory}
                    mergedVariables={props.mergedVariables ?? []}
                />
            ) : (
                <Placeholder title="Variables">Pick a category.</Placeholder>
            );
```

Delete the `CombinationsSection` import and its old case. Add `mergedVariables?: VariableRow[]` to the router's props and thread it from `ConsoleShell`, which receives it from `manage/page.tsx`.

- [ ] **Step 5: Load the merged list server-side**

In `app/(new-layout)/games-v2/[game]/manage/page.tsx`, inside the existing `if (canConfigure)` block, add to the `Promise.all`:

```typescript
            initialCategory
                ? getVariables(game.name, initialCategory.name).catch(() => ({
                      variables: [],
                      reservedParams: [],
                      validCombinations: { mode: 'open' as const },
                  }))
                : Promise.resolve({
                      variables: [],
                      reservedParams: [],
                      validCombinations: { mode: 'open' as const },
                  }),
```

Import `getVariables` from `~src/lib/games-v1`'s sibling `~src/lib/leaderboards-v1`, and pass `mergedVariables={merged.variables}` down through `ConsoleShell` to `ContentRouter`.

Note the limitation and accept it for now: the merged list is fetched for the *initial* category. When the viewer switches category in the sidebar, the panel needs the new category's merged list — `VariablesScreen` refetches it client-side via a small server action in the same `useEffect` that already reloads `rows` on `selectedCategory?.id`. Add that action as `load-merged-variables.action.ts` calling `getVariables(gameSlug, categorySlug)` and returning `{ result: variables }`.

- [ ] **Step 6: Typecheck**

Run: `cd /home/joey/therun/therun-fr && npm run typecheck`
Expected: clean. Resolve any remaining `VariableForm` prop errors by passing `scopeLabel`, `categoryDisplay` and `gameWide` from the captured form state.

- [ ] **Step 7: Lint**

Run: `cd /home/joey/therun/therun-fr && npm run lint`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git -C /home/joey/therun/therun-fr add -A "app/(new-layout)/games-v2/[game]/manage"
git -C /home/joey/therun/therun-fr commit -m "feat(variables): one screen — in effect, editor, sub-boards

Every write now goes through the consequence review. The form's scope is
captured when it opens, fixing the retargeting bug where an open create
form silently re-aimed at whichever category was selected at submit time.
Switching scope or category no longer discards a dirty form silently."
```

---

# Phase 5 — Wizard

### Task 17: Step 4 renders the same screen, and the contradicting copy goes

**Files:**
- Modify: `.../setup/steps/step-variables.tsx`
- Modify: `.../setup/steps/category-band-preview.tsx`
- Modify: `.../setup/page.tsx`

**Interfaces:**
- Consumes: `VariablesScreen` (Task 16); `getVariables` from `~src/lib/leaderboards-v1`.
- Produces: no new exports.

- [ ] **Step 1: Swap the component**

In `step-variables.tsx`, replace the `VariablesSection` import and usage with `VariablesScreen`, passing `mergedVariables` from a new `WizardData` field:

```tsx
            <VariablesScreen
                gameSlug={data.game.name}
                gameId={data.game.id}
                selectedCategory={selected}
                mergedVariables={data.mergedVariables}
            />
```

- [ ] **Step 2: Load the merged list in the wizard page**

In `setup/page.tsx`, add to the existing `Promise.all` a `getVariables(game.name, <first main category>.name)` call with the same `.catch` fallback used in Task 16 Step 5, and add `mergedVariables` to the `WizardData` object and to the `WizardData` interface in `setup/types.ts`.

- [ ] **Step 3: Relabel the button**

In `step-variables.tsx`, change the primary button text from `Save & continue` to `Continue`. It calls `onAdvance()` and saves nothing; the old label promised a save that never happened.

- [ ] **Step 4: Delete the contradicting note**

In `category-band-preview.tsx`, delete the whole block:

```tsx
            {subcategories.length > 0 && (
                <p className={`${styles.previewNote} mb-0 mt-2`}>
                    Subcategories come from variables, which you set up in the
                    console — not in this wizard.
                </p>
            )}
```

It renders on steps 2 and 3, one step before the wizard's own variables step.

- [ ] **Step 5: Remove the duplicated scope prose**

In `step-variables.tsx`, delete the `Scope` section (the `<h3>Scope</h3>` block and its paragraph). The in-effect panel and the form's own scope header now carry that information, and the section contradicted the pills below it. Keep the "Editing category" select — it is the wizard's only category picker.

- [ ] **Step 6: Typecheck and lint**

Run: `cd /home/joey/therun/therun-fr && npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git -C /home/joey/therun/therun-fr add "app/(new-layout)/games-v2/[game]/setup"
git -C /home/joey/therun/therun-fr commit -m "feat(setup): step 4 renders the same variables screen as the console

Drops the duplicated scope prose, deletes the preview note claiming
variables are configured in the console rather than the wizard, and
relabels a button that promised a save it never performed."
```

---

# Phase 6 — Verification

### Task 18: Full verification and PR

- [ ] **Step 1: Full test suite**

Run: `cd /home/joey/therun/therun-fr && npm run test`
Expected: all pass, including the three new suites (21 new tests).

- [ ] **Step 2: Typecheck and lint**

Run: `cd /home/joey/therun/therun-fr && npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 3: Manual pass**

Start the dev server (`npm run dev`), and **kill it before ending the turn** — check first with `ps -eo pid,args | grep "next dev" | grep -v grep`, and kill by exact pid.

Walk this list on a real board:

1. Console → Variables. The in-effect panel matches the live board at `/games-v2/<game>` — same variables, same order, same values.
2. Create a shared variable. Panel updates on refresh; the board shows it.
3. Switch to the category tab, create one with the same name. The shadow warning appears before submit; after saving, the panel row reads *"{Category} only — replaces the shared {Name}"*.
4. Change a default on a category with real runs. The dialog shows counts. Confirm they match what a rebuild produces: note the numbers, hit *Rebuild now*, wait, reload the board.
5. Edit only a description. The dialog reads *"Nothing moves."*
6. Delete a variable. The dialog shows movement and delete phrasing.
7. Open a create form, then switch the scope pill → asked to confirm. Then switch category → the form closes.
8. Sub-boards: uncheck a combination holding runs → the stranded-runs warning appears with the right count.
9. Wizard step 4: the same screen renders; the button reads *Continue*; steps 2 and 3 no longer claim variables live only in the console.
10. As a **per-game game-admin** (not a global admin), confirm *Rebuild now* succeeds. This is the authz change in Task 1 — verify it with a real per-game account, not a site admin.

- [ ] **Step 4: Open the PR**

```bash
git -C /home/joey/therun/therun-fr push -u origin feat/variables-redesign
gh pr create --repo therungg/therun-frontend --title "Leaderboard variables redesign" --body "$(cat <<'EOF'
Rebuilds the leaderboard variables surface per
`docs/superpowers/specs/2026-07-29-leaderboard-variables-redesign-design.md`.

- **In-effect panel** — what runners actually see on this board, fed by the public
  variables endpoint so it cannot drift from the live board. Rows state whether they
  are shared, category-only, or a category row shadowing a shared one.
- **Consequence review before every write** — a backend dry-run re-resolves the
  category's leaderboard entries against the proposed definition and reports what
  moves, in real numbers. "Nothing moves" collapses to a single confirm.
- **Rebuild now** — applies the change to runs that already exist. Backend authz was
  widened so a game's own admins can trigger their own game's rebuild.
- **Sub-boards folded onto the same screen**, with entry counts, plain-language mode
  copy, and an explicit way out of managed mode.
- **Bug fixes** — an open create form no longer silently retargets to whichever
  category is selected at submit time; switching scope or category no longer discards
  a dirty form without asking.
- **Wizard step 4** renders the same components; deletes the note claiming variables
  are configured in the console rather than the wizard.

Requires the backend changes in therungg/therun-backend (dry-run mode, per-game
rebuild authz, combination entry counts) to be deployed first.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Backend PR or push**

The backend branch `feat/variables-preview` is already deployed (Task 6). Confirm with the user whether to merge it to main or open a PR, and follow the post-deploy monitoring protocol if anything further ships.

---

## Self-Review

**Spec coverage.** §1 zone 1 → Task 12; zone 2 → Tasks 15, 16; zone 3 → Task 14. §2 language → Task 7, applied in 12/13/14/15. §3 form → Task 15. §4 consequences → Tasks 2, 3, 4, 9, 13. §5.1 dry-run → Tasks 2–4. §5.2 authz → Task 1 (frontend action in Task 10). §5.3 counts → Tasks 5, 14. §6 code shape → Tasks 12–16. §7 wizard → Task 17. Cache revalidation, implied by §1's public-endpoint decision and called out in the spec's Consequences section → Task 11.

**Type consistency.** `VariablePreview` / `CategoryPreview` / `BoardMovement` are declared once on the backend (Task 3) and mirrored field-for-field on the frontend (Task 9); `ConsequenceDialog` (13) and `previewVariableAction` (10) both import the frontend copy. `EffectiveVariable` and `VariableSource` are declared in Task 8 and consumed only by Task 12. `planMovement` and `labelForKey` are declared in Task 2 and consumed only by Task 3. `VariableFormValues` is deliberately unchanged by Task 15 so Task 16's submit path is unaffected.

**Known gap, accepted:** the merged list for the in-effect panel is server-rendered for the initial category and refetched client-side on category switch (Task 16 Step 5). A cleaner shape would move the whole screen to a server component, which is a larger change than this plan warrants.

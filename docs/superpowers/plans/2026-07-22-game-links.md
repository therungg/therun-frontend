# Game Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let game moderators add misc links (Twitch, wiki, speedrun.com, …) to a game via the console; render them as quiet chips in the GameHero next to Discord.

**Architecture:** `links: { label, url }[]` jsonb column on `games_pg` (backend repo `../therun`, mirroring the `platforms` jsonb + `discordUrl` patterns end-to-end: schema → drizzle migration → `updateGame` validation → `rebuildGamePageData` → PUT whitelist). Frontend threads the field through `GameMetadata`, the setup form (repeatable label+URL editor), and the hero chips. Field is optional everywhere → frontend ships before backend deploys.

**Tech Stack:** Backend: Drizzle ORM, raw-SQL migrations via `drizzle-kit generate`, manual `ValidationError` validation (no zod). Frontend: Next.js 16, React 19, Bootstrap console forms, SCSS modules.

## Global Constraints

- Permission tier: `links` joins `metadataOnlyFields` in the PUT handler (same `edit-category-settings`-gated tier as `discordUrl`); frontend action keeps its existing `confirmPermission(user, 'edit', 'category-settings', { game })`.
- Validation (both repos, same rules): array, max 10 entries; each entry `label` non-empty trimmed string ≤ 40 chars; `url` starts with `https://`, ≤ 2048 chars. Empty array is valid (clears links).
- No gradient washes or decoration in the hero — links are `quietChip`s, matching Discord exactly.
- Backend: do NOT hand-write the drizzle journal/snapshot — use `npx drizzle-kit generate`. Do NOT deploy; deploy is Joey's.
- Branches: frontend work continues on `overview-record-wall` tip as new branch `game-links` (stacked — it edits the just-amended hero); backend repo gets branch `game-links` off its main. No worktrees, no PRs, no co-author lines.
- Biome (frontend): 4-space indent, single quotes, trailing commas, semicolons.

---

### Task 1: Backend — schema, migration, validation, pageData, PUT whitelist

**Files (all in /home/joey/therun/therun):**
- Modify: `src/db/schema.ts` (~line 60, games table, after `discordUrl`)
- Generate: `drizzle/0073_*.sql` via `npx drizzle-kit generate`
- Modify: `src/services/game-mgmt-service.ts` (`updateGame` params ~103-127, validation blocks ~198-232, `rebuildGamePageData` pageData.game ~528)
- Modify: `src/api/game-mgmt/handler.ts` (`metadataOnlyFields` ~328, `updatableFields` ~329-351, service call ~385)

**Interfaces:**
- Produces: `games.links` jsonb `{label: string; url: string}[]` default `[]`; PUT `/v1/games/:id` accepts `links`; pageData `game.links` serves it.

- [ ] **Step 1:** `git checkout -b game-links` off main in /home/joey/therun/therun (verify clean tree first; if dirty, report BLOCKED).
- [ ] **Step 2:** Schema: after `discordUrl: text("discord_url"),` add:

```typescript
    links: jsonb().$type<{ label: string; url: string }[]>()
        .default(sql`'[]'::jsonb`),
```

(match the file's existing `platforms` jsonb style/imports exactly).
- [ ] **Step 3:** Run `npx drizzle-kit generate`; confirm it emits only the one ALTER TABLE for `games_pg.links` plus journal/snapshot. If it emits unrelated drift, STOP and report BLOCKED with the diff.
- [ ] **Step 4:** `updateGame` params: add `links?: { label: string; url: string }[];`. Validation block, modeled on the `platforms` block (~198-210) and the repo's manual-throw convention:

```typescript
    if (params.links !== undefined) {
        if (!Array.isArray(params.links) || params.links.length > 10) {
            throw new ValidationError("Links must be an array of at most 10 entries");
        }
        for (const link of params.links) {
            const label = typeof link?.label === "string" ? link.label.trim() : "";
            const url = typeof link?.url === "string" ? link.url : "";
            if (!label || label.length > 40) {
                throw new ValidationError("Each link needs a label of at most 40 characters");
            }
            if (!url.startsWith("https://") || url.length > 2048) {
                throw new ValidationError("Link URLs must be https:// and at most 2048 characters");
            }
        }
        updates.links = params.links.map((l) => ({
            label: l.label.trim(),
            url: l.url,
        }));
    }
```

(match the backend file's real quote/indent style, which may differ from frontend Biome).
- [ ] **Step 5:** `rebuildGamePageData`: add `links: game.links,` to the `pageData.game` object next to `discordUrl`.
- [ ] **Step 6:** Handler: add `"links"` to `metadataOnlyFields` and `updatableFields`; pass `links: body.links,` in the service call.
- [ ] **Step 7:** Run the backend's own check/test commands (inspect package.json scripts; run typecheck/build + any unit tests near game-mgmt). Zero new failures.
- [ ] **Step 8:** Commit `feat(game-mgmt): moderator-set misc links on games` and push `game-links`. Do NOT deploy, do NOT run the migration.

---

### Task 2: Frontend — types + read path

**Files (all in /home/joey/therun/therun-fr, branch `game-links` stacked on `overview-record-wall`):**
- Modify: `src/lib/game-mgmt.ts` (`UpdateGameBody`, `GameMetadata`, `GameMetadataPageData`, `getGameMetadata` mapping)
- Modify: `src/lib/game-metadata.ts` (`EMPTY_GAME_METADATA`)

**Interfaces:**
- Produces: `GameLink = { label: string; url: string }` (exported from `src/lib/game-mgmt.ts`); `GameMetadata.links: GameLink[]` (default `[]`); `UpdateGameBody.links?: GameLink[]`.

- [ ] **Step 1:** `git checkout overview-record-wall && git pull && git checkout -b game-links`.
- [ ] **Step 2:** Add `export interface GameLink { label: string; url: string; }`; `links?: GameLink[];` on `UpdateGameBody`; `links: GameLink[];` on `GameMetadata`; `links?: GameLink[] | null;` on `GameMetadataPageData['game']`; map `links: data?.game?.links ?? [],` in `getGameMetadata`; `links: [],` in `EMPTY_GAME_METADATA`.
- [ ] **Step 3:** `npm run typecheck` — zero new errors vs. 356-error baseline. Commit `feat(games-v2): game links read path`.

---

### Task 3: Console — links editor in game details form

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/setup/game-details-form.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/actions/update-game-metadata.action.ts`

**Interfaces:**
- Consumes: `GameLink`, `UpdateGameBody.links` from Task 2.

- [ ] **Step 1:** Form: `const [links, setLinks] = useState<GameLink[]>(metadata.links ?? []);`. Under the Discord field, a "Links" section listing each entry as a row: label input (`maxLength={40}`, placeholder "Twitch") + URL input (`type="url"`, placeholder "https://…") + remove button; an "Add link" button (`btn btn-sm btn-outline-secondary`, hidden/disabled at 10 entries); helper text "Shown as chips on the game page. Label + https URL." Follow the form's existing Bootstrap markup/state conventions; include `links` in the submit payload (send trimmed labels; drop fully-empty rows).
- [ ] **Step 2:** Action: accept `links?: GameLink[]`, re-validate server-side (same rules as backend: ≤10, label 1–40 trimmed, url https:// ≤2048 — return `{ error }` on violation, matching the action's existing error style), pass through to `updateGame` body.
- [ ] **Step 3:** `npm run typecheck` + `npm run lint` — no new errors. Commit `feat(games-v2): console links editor`.

---

### Task 4: Hero chips + verification

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/game-hero.tsx`

**Interfaces:**
- Consumes: `gameMeta.links` (Task 2). `GameHero` prop signature unchanged (links ride the existing `gameMeta` prop).

- [ ] **Step 1:** In the actions block, after the Discord chip, render:

```tsx
                    {gameMeta.links.map((link) => (
                        <a
                            key={`${link.label}-${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.quietChip}
                        >
                            {link.label}
                        </a>
                    ))}
```

- [ ] **Step 2:** Full sweep: `npm run typecheck`, `npm run lint`, `npm run test` — zero new failures. Commit `feat(games-v2): game link chips in hero`, push `game-links`.
- [ ] **Step 3 (manual, Joey):** browser pass with several links (desktop column stack + mobile row wrap); run backend migration 0073 + deploy before expecting chips to render with real data.

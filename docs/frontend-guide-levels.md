# Frontend guide — individual levels

Design: `docs/plans/2026-08-19-levels-design.md`. Base `NEXT_PUBLIC_DATA_URL`, `apiFetch<T>()`, bearer session.
No new routes: everything rides `/v1/games/{id}/groups[/{groupId}]`, `/v1/games/{id}/categories[/{catId}]`, `/v1/games/{id}/variables`.

## Model
- **Level** = category group with `kind: 'level'` (+ `rules`). Order = `sortOrder`.
- **Level category (template)** = category with `isLevelTemplate: true`; never a board, never in `groups[].categories` / `ungroupedCategories` — served under `pageData.levelTemplates`.
- **Level board (instance)** = category inside a level group with `levelTemplateId`.

  **Naming/slugging is asymmetric between templates and instances — read this carefully:**
  - A template's `name` (slug) is namespaced as `level-template:<searchable display>` (e.g. `level-template:any%`), so a template can coexist with a full-game category of the same display name. **Never use a template's `name` as a URL slug or route param** — it isn't one.
  - An instance's `name` is `<levelslug>-<templateslug>` (e.g. `e1m1-any%`, `bob-ombbattlefield-any%`) — this *is* a real, unique-per-game board slug, safe to use in URLs like any other category.
  - An instance's `display` is always `"<Level> — <Template>"` (em dash) and is **not directly editable** — see Writes/Errors below. Inside a level context, show the template's own `display` (e.g. "Any%"); on run pages, search, and anywhere else the board could appear standalone, show the instance's full `display` ("E1M1 — Any%").
- State: synced ⇔ `levelTemplateId != null && !levelOverride`; excluded ⇔ `!active && levelOverride`; level-only ⇔ in a level group with `levelTemplateId == null`.

## pageData (GET /v1/games/{id}) additions
- categories (ungrouped + grouped, and `levelTemplates` entries): `name: string`, `levelTemplateId: number|null`, `levelOverride: boolean`
- groups: `kind: 'normal'|'level'`, `rules: string|null`
- `levelTemplates: CategoryEntry[]` (same entry shape as ungrouped/grouped categories) — templates are **never** present in `ungroupedCategories` or any `groups[].categories`, only here.

## Writes
| Action | Call | Body | Returns |
|---|---|---|---|
| Create level | `POST /groups` | `{ name, kind: 'level', rules?, sortOrder?, hiddenByDefault?, displayMode? }` | `{ id, created }` |
| Rename level / level rules | `PUT /groups/{groupId}` | `{ name?, rules? }` (+ `sortOrder`, `hiddenByDefault`, `displayMode` as before) | `{ updated: true }` |
| Reorder levels | `PUT /groups/reorder` | `{ groupIds }` (levels and normal groups share one order) | |
| Delete level | `DELETE /groups/{groupId}` | — | archives its boards (they don't come back on re-push) |
| Create level category | `POST /categories` | `{ isLevelTemplate: true, display, …board fields, isMain? }` | `{ id, created }` |
| Edit level category | `PUT /categories/{templateId}` | board fields | pushed to synced boards only when the body includes at least one pushable field: `primaryTiming`, `gameTimeLabel`, `hideRealTime`, `hideGameTime`, `rtaFallback`, `rules`, `requireVideo`, `requireVideoTopN`, `sortAscending`, `showMilliseconds`, `isExtension`, `imageUrl`. Changing `isMain`/`sortOrder` on a template does **not** push — those are per-board. |
| Archive level category | `POST /categories/{templateId}/archive` | — | archives synced boards |
| Level-category variables | `POST /variables` `{ changes: [{ categoryId: templateId, … }] }` | | pushed to synced boards |
| Overview | `POST /categories` | `{ op: 'level-overview' }` | `LevelOverview` |
| Exclude/include | `POST /categories` | `{ op: 'level-exclusion', groupId, templateId, excluded }` | |
| Detach / resync a board | `POST /categories` | `{ op: 'level-detach' \| 'level-resync', categoryId }` | |
| Push now / materialise | `POST /categories` | `{ op: 'level-push', templateId }` / `{ op: 'level-materialise' }` | |

Also worth knowing:
- `POST /groups` with `kind: 'level'` accepts `hiddenByDefault` and `displayMode` in addition to `name`/`rules`/`sortOrder` — same semantics as normal groups.
- `PUT /groups/{groupId}` rejects a `kind` that differs from the group's stored `kind` (see Errors). A missing group is also a 400, not a 404.
- On a category (template or instance), `groupId` cannot be changed via `PUT /categories/{id}` — templates aren't grouped and instances stay pinned to their level.
- An instance's `display` cannot be edited via `PUT /categories/{id}` — not even after it's been detached from its template (detaching only stops pushes; the name still "belongs" to the level+template pairing). Templates' `display` remains editable as before.
- **Renaming a level category (`PUT /categories/{templateId}` `{ display }`) renames every one of its boards.** The template gets a fresh `level-template:`-namespaced slug, and every instance — synced, overridden, and excluded alike — gets a new `display` (`"<Level> — <new template display>"`) and `name` slug, so search/URLs/`resolveCategory` stay consistent immediately, with no separate push step. The whole rename is checked for slug collisions up front and 400s (doesn't 500) if any instance's new slug would collide with an existing category.
- `isMain` can be set per instance (e.g. mark one level board within a level as the "main" one for that level) independently of the template's own `isMain`.
- **Editing a level board's config or variables directly detaches it (`levelOverride = true`); a later template push skips it until you resync.** This covers `PUT /categories/{instanceId}` with any pushable field, the bulk field write (`POST /categories` `{ op: 'bulk-update' }`), and any direct variable write on the instance (`POST /variables`, `PUT`/`DELETE`). The UI should say so before the edit, and surface "Overridden — resync" (`{ op: 'level-resync' }`) afterwards.
- Unarchiving a level category (`PUT /categories/{templateId}` `{ active: true }`) brings its boards back — but only those its archive took down. Excluded boards stay excluded.
- Deleting a level archives its boards and unlinks them from their templates; the level's name is then free to reuse, and recreating it materialises fresh boards.

```ts
export type LevelInstanceState = 'synced' | 'overridden' | 'excluded' | 'level-only';
export interface LevelOverview {
  levels: Array<{ id: number; name: string; rules: string | null; sortOrder: number;
    instances: Array<{ categoryId: number; templateId: number | null; state: LevelInstanceState; display: string }> }>;
  templates: Array<{ id: number; display: string; isMain: boolean; synced: number; overridden: number; excluded: number; total: number }>;
}
```
Errors: 400 `A group's kind cannot be changed`, `Level boards cannot be moved between groups`, `A level board's name follows its level and category`, `Level categories cannot hold runs; pick a level board`; 403 on permission (same actions as groups/categories/variables).

## UI expectations (frontend plan)
- Leaderboard: full-game tabs as now; a Levels dropdown (level groups) → category pills (template display) inside the level; level `rules` shown above category rules.
- Console: *Levels* pane (list + per-level template checklist + level-only + detached), *Level categories* pane (templates with N/M synced); category index collapses level boards behind a disclosure.
- `isLowActivityCategory` must not hide level boards (they start empty).

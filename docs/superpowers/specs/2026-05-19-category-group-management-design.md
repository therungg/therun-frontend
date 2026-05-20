# Category Group Management — Design

Date: 2026-05-19
Status: Implemented

## Goal

Let mods manage category groups on the game manage page (create, rename, delete, reorder, assign categories), and visually separate the public game page's category pills by group when more than one group exists.

## Background

The backend already returns `groups` and `ungroupedCategories` from `/v1/games/{id}`, and full CRUD endpoints for groups exist. Each `ManageCategoryRow` already carries `groupId` and `groupName`. Today the manage UI shows a read-only "Group" column and the public pills render flat, ignoring groups entirely.

## Scope

### In scope

- Group management UI (list / create / rename / delete / reorder) on the Game tab of the manage page.
- Category-to-group assignment via inline `<select>` and bulk-assign with checkboxes.
- Public game-page pill grouping with labeled sections.
- New server actions for each mutation, gated on `create-edit-group`.

### Out of scope (explicit non-goals)

- `hiddenByDefault` flag on groups — backend supports it; not exposing it. All groups render expanded.
- Visual grouping in the manage-page category rail or categories table — grouping is **public only**.
- Drag-and-drop assignment of categories to groups (use inline `<select>` + bulk-assign).
- Reordering categories within a group (backend supports it; not in this spec).
- Leaderboard row / breadcrumb group labels.

## Backend (already exists)

| Endpoint | Body | Permission |
|---|---|---|
| `POST /v1/games/:gameId/groups` | `{ name, sortOrder?, hiddenByDefault? }` | `create-edit-group` |
| `PUT /v1/games/:gameId/groups/:groupId` | `{ name?, sortOrder?, hiddenByDefault? }` | `create-edit-group` |
| `DELETE /v1/games/:gameId/groups/:groupId` | — (categories revert to ungrouped) | `create-edit-group` |
| `PUT /v1/games/:gameId/groups/reorder` | `{ groupIds: number[] }` | `create-edit-group` |
| `PUT /v1/games/:gameId/categories/:catId` | `{ groupId: number \| null, ... }` | `edit-category-settings` |

No new backend work.

## Architecture

### New / modified files

- **New** `src/lib/category-group-mgmt.ts` — server-side data helpers:
  - `listManageGroups(gameId): Promise<{ id: number; name: string; sortOrder: number }[]>`
- **New** `src/actions/category-group/create-group.action.ts`
- **New** `src/actions/category-group/rename-group.action.ts`
- **New** `src/actions/category-group/delete-group.action.ts`
- **New** `src/actions/category-group/reorder-groups.action.ts`
- **New** `src/actions/category-group/assign-category-group.action.ts` (also used by bulk-assign, called in parallel)
- **New** `app/(new-layout)/games-v2/[game]/manage/game-tab/groups-section.tsx`
- **Modified** `app/(new-layout)/games-v2/[game]/manage/game-tab/categories-table.tsx` — Group column becomes editable, row checkboxes + bulk action bar added
- **Modified** `app/(new-layout)/games-v2/[game]/manage/page.tsx` — fetches groups and passes them in
- **Modified** `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx` — passes `groups` down (and through `data` shape)
- **Modified** `app/(new-layout)/games-v2/[game]/header/category-pills.tsx` — render mains split into labeled sections
- **Modified** `src/lib/games-v1.ts` (`resolveCategory`) — also return `groups: { id, name, sortOrder }[]` and ensure each `ResolvedCategory` carries `groupId` and `groupName`
- **Modified** `types/leaderboards.types.ts` — extend `ResolvedCategory` with `groupId: number | null` and `groupName: string | null`

### Server actions

Each action:

1. `const user = await getSession()`
2. `confirmPermission(user, 'edit', 'create-edit-group', { game: gameSlug })` (align subject string with `src/rbac/ability.ts`).
3. `apiFetch(..., { sessionId: user.id, method, body })`.
4. On success, `revalidateTag` for the affected game's pageData tag (same tag used by `loadPageData` in `src/lib/category-mgmt.ts` — align to existing value).
5. Returns `{ ok: true }` or `{ error: string }`.

`assignCategoryGroupAction` is invoked once per row in bulk-assign (`Promise.all`). On partial failure, roll back the failed rows and toast the count.

## UI — Manage page

### Groups section (new), Game tab, above Categories table

```
┌─ Category groups ─────────────────────────────────┐
│  [+ New group  ___________________ Create ]       │
│                                                    │
│  ⠿  ▲▼  Full Game           5 categories  ✎  🗑   │
│  ⠿  ▲▼  Individual Levels   12 categories ✎  🗑   │
│  ⠿  ▲▼  Meme runs           0 categories  ✎  🗑   │
└────────────────────────────────────────────────────┘
```

- **Reorder:** both up/down arrows AND drag handle. Drag uses native HTML5 drag events (no new dependency). Both call `reorderGroupsAction` with the full ordered ID list.
- **Rename:** pencil icon swaps the label into an inline `<input>`; Enter commits, Escape cancels. Server validation surfaces as a toast.
- **Delete:** confirm dialog (`Delete "{name}"? Its {N} categories will become ungrouped.`).
- **Create:** inline input + Create button. Validation: 1–100 chars; uniqueness enforced server-side; 400 surfaces as toast.
- **Counts:** "{N} categories" derived client-side from the existing `rows: ManageCategoryRow[]` — no extra fetch.
- **Empty state:** "No groups yet — create one to organize categories on the public page."

### Categories table changes

1. **Group column becomes a `<select>`:**
   - Options: `Ungrouped` (value `null`) + each group by `sortOrder` + trailing `+ Create group…`.
   - On change: optimistic row update + `assignCategoryGroupAction`; toast on success/failure (same pattern as the existing `toggle()` in `categories-table.tsx`).
   - `+ Create group…` opens a small inline prompt (text input that replaces the row's select) → creates the group then assigns the row in one flow.

2. **Bulk-assign:**
   - Leading checkbox column. Header checkbox = select-all-visible (respects current filter/search).
   - When ≥1 row selected, sticky action bar above the table:
     ```
     3 selected   Move to: [ Group ▾ ]  [Clear]
     ```
   - "Move to" dropdown has the same options as the per-row select.
   - Selection state is local; cleared on filter/search change.

Both controls are disabled when the user lacks `create-edit-group`.

## UI — Public game page (`category-pills.tsx`)

### Inputs

`CategoryPills` gains a `groups: { id, name, sortOrder }[]` prop, and `ResolvedCategory` carries `groupId` / `groupName`.

### Render logic

1. Compute `mains = categories.filter(c => c.isMain)`.
2. **No mains:** fallback to top 5 by playtime, rendered as a single unlabeled row (no group split).
3. **Trivial group structure** (`groups.length <= 1` and all mains share that group or are ungrouped): render flat, exactly as today.
4. **Otherwise:** labeled sections in `sortOrder` order, then ungrouped mains as a trailing unlabeled section.
   - Each group renders its name as a small uppercase muted heading.
   - **Empty groups still render** the heading + a muted line: `No categories enabled for this group.`
   - Within each section, sort pills by playtime desc.
5. **Selected non-main override:** if the user has navigated to a non-main category, it's appended to its own group's section (or to the ungrouped section if it has no group).

### Visual

```
Full Game
[ Any% ] [ 100% ] [ Glitchless ]

Individual Levels
[ Level 1 ] [ Level 2 ] [ Level 3 ] [ Level 4 ]

Meme runs
No categories enabled for this group.

[ All Bosses ]            ← ungrouped mains, no header
```

Heading classes: `text-muted text-uppercase small fw-bold mb-1`. Section spacing: `mb-2`. Pills unchanged.

## Data flow

```
manage/page.tsx
  ├─ listManageCategories(gameId)  → rows
  └─ listManageGroups(gameId)      → groups
       └─ ManagePage(data={..., groups})
            ├─ GroupsSection(groups, rows)
            └─ CategoriesTable(rows, groups)

Public game page
  resolveCategory(gameId) → { categories, groups }
       └─ CategoryPills(categories, groups, ...)
```

## Permissions

- All group mutations require `create-edit-group` (server-enforced; frontend mirrors with `confirmPermission` in actions and disables controls in the UI).
- Assigning a category to a group requires `edit-category-settings` (existing).

## Error handling

- Network/server errors on mutations: optimistic update rolled back, `toast.error(message)`.
- Server validation (e.g. duplicate group name): same — toast the server's `error` string.
- Bulk-assign partial failure: roll back failed rows only; toast `"{N} of {M} could not be moved"`.

## Testing

- Manual: create / rename / delete / reorder groups (both arrow and drag paths); assign category via inline select; bulk-assign 3+ categories; verify public pills group correctly across the four render branches (no mains, single group, multi-group with empty group, ungrouped mains trailing).
- Permission: as a user without `create-edit-group`, confirm the section/controls are disabled and the actions reject server-side.

# Row-level moderation model (runner/run menus) — design

Date: 2026-07-31 · Status: approved — Phase A implemented (this branch); Phases B/C pending backend
Predecessor: `2026-07-31-boards-anonymize-design.md` (shipped)

## Goal

Every board-curation entry offers two moderation targets: the **run** and
the **runner**. Runner actions apply an effect at a chosen scope; run
actions curate this board. This replaces the flat six-button cluster
(Later / Remove / Ban / Anonymize / Fix time / Move…).

## Decisions (settled with Joey, 2026-07-31)

- Runner dialog is **effect × scope**, not overloaded verbs (a "ban" that
  means exclusion at game scope but account-lockout at site scope is a
  trap).
- Scoped hide-name is presentation-level anonymity, not privacy — wording
  reflects that. Needed scopes: **one board** and **one game** (+ site,
  which already exists as the anonymize ban).
- No category-level permission tier — mods get game scope and below,
  admins get site. (Category-wide *scope* is also dropped for now: board
  and game are the two sub-site scopes.)
- Adjust must preview its destructive consequence (picking run #3 as valid
  excludes faster runs #1–#2).
- **Remove stays one click.** **Later is dropped** from the cluster (the
  mark-for-later backend flag and any other surfaces are untouched; only
  this button goes).

## Row UI

Per row: `Remove · Run… · Runner…` (+ the time cell as today).

- **Remove** — unchanged one-click exclude with the next-run slip.
- **Run…** opens a small menu/dialog:
  - **Approve** — verify the run (existing verdict endpoint).
  - **Move…** — existing move dialog.
  - **Adjust…** — the new screen (below). Subsumes Fix time.
- **Runner…** (hidden for guest rows) opens one dialog:
  - **Scope** segmented: `This board` / `Whole game` / `Entire site`
    (site: admins only; mods don't see it).
  - **Effect** at board/game scope: `Remove runs` (exclusion rule) or
    `Hide name` (new mask rule). At site scope the dialog becomes the
    existing site-ban flow: account lockout + treatment
    (remove runs / hide name / keep) — reusing `POST /admin/bans`
    verbatim.
  - Reason required; preview (affected-run counts) shown for scoped
    effects, reusing the exclude-preview pattern.
  - Copy for Hide name states plainly: name/avatar hidden on the covered
    public boards only; profile and other boards still show them.

Guests (`userId == null`): Runner… and Adjust… hidden (no account, no
"their runs"); Remove/Approve/Move remain.

## Adjust screen

Opens listing the runner's eligible finished runs for this board (the
existing `UserEligibleRunRow` roster source), current entry marked.

- **Pick the valid run**: selecting a run previews exactly which
  faster/better runs will be excluded ("this removes 2 faster runs"),
  because boards always surface the best eligible run — pinning without
  excluding is impossible. Confirm = bulk-exclude those run ids (existing
  preview + bulk exclude endpoints). Undo = restore.
- **Set a time instead**: the existing manual-time form (today's Fix
  time), folded in as the second tab/section.

Adjust is **frontend-composable**: eligible-runs fetch, exclude preview,
bulk exclude, and manual times all exist. No backend work.

## Permissions

| Role | This board / Whole game | Entire site |
|------|------------------------|-------------|
| Game moderator | ✅ Remove runs, Hide name | ❌ |
| Admin | ✅ | ✅ site ban (all three treatments) |

Frontend gates via existing `canModerateGame` + the `canSiteBan` flag
already threaded to `RowActions`. Backend enforces per-endpoint as today.

## Backend handoff (the one real backend project)

Scoped **Hide name** does not exist. Proposed shape (backend's call on
final form):

1. **Generalize `exclusion_rules`** with an `effect` column
   (`'exclude' | 'mask'`) instead of a parallel table — reuses the
   existing propagation/unpropagation machinery, scope CHECKs, and admin
   listing. Default `'exclude'` keeps every existing row valid.
2. **Add `subcategory_key` scope column** (nullable) — required for
   "one single board": today's finest scope is `category_id`, which on a
   subcategoried board covers *all* its subcategory boards. Applies to
   both effects (board-scoped Remove runs gets it for free).
3. **Mask propagation**: a `masked` boolean on `speedrun_runs` /
   `finished_runs` (mirror of `excluded`), set/cleared by rule
   propagation. Read sites extend the existing mask predicate to
   `users.anonymized OR <run>.masked` wherever `displayUsernameSql` /
   `hideIfAnonymized` is applied; mask token stays
   `'Anonymous Runner ' || users.id` (rules are user-scoped, so the
   per-user token is correct). Manual times need the same treatment via
   their own rule coverage or are out of scope for v1 (backend to
   decide — flag in the guide either way).
4. **Stats views**: `user_game_stats` must respect run-level masks for
   covered games; global `user_stats` is untouched by scoped masks
   (only the site-wide `users.anonymized` renames there). This is the
   subtlest read-site change — needs its own look.
5. Endpoints: extend the existing mod mass-mgmt exclude/preview/rules
   routes with `effect` (mod-gated, game-scoped as today) rather than new
   admin routes. Lift = delete rule, as today.

Deliverable per cross-repo convention: `docs/frontend-guide-*.md` +
mirrored types once the backend surface lands.

## Phasing

- **Phase A (frontend only, no backend dependency):** restructure the
  cluster (Remove / Run… / Runner…), drop Later, build Adjust, wire
  Runner… for `Remove runs` and site ban. Board scope note: existing
  rules scope to category, so "This board" is exact for categories
  without subcategory variables and covers all sibling subcategory
  boards otherwise (dialog says so); exact single-board scope arrives
  with Phase B's `subcategory_key`. Ships value immediately.
- **Phase B (backend):** effect column, subcategory scope, mask
  propagation, read sites, stats views, guide doc.
- **Phase C (frontend):** Hide name + true single-board scope in the
  Runner… dialog, from the Phase B guide.

## Out of scope

- Category-wide scope tier and any category-mod role.
- Real privacy guarantees for scoped hide-name.
- Site-ban management page (`/admin/bans` list) — still deferred.
- Removing the mark-for-later *backend* flag or its other surfaces.

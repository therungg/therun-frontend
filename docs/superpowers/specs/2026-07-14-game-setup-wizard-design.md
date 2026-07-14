# Game Setup Wizard + Board Claim Flow — Design

**Date:** 2026-07-14
**Status:** Approved design, not yet implemented
**Roadmap:** Tier 1 items 5 (wizard) and part of 7 (mod application flow) from `2026-07-13-leaderboards-vs-src-roadmap.md`

---

## Problem

Boards auto-exist from timer ingestion, but nobody owns them: there is no way for a user to become a game's moderator, and a mod who does get access (today: backend-set `moderatedGames`) lands in the raw management console with a dozen dense panes and no guidance. SRC's equivalent (game request queue) is slow and hated — a fast claim path plus a guided setup is a real wedge.

Grounding facts from code exploration:

- **No claim flow exists.** Nothing in the frontend writes `moderatedGames` or per-game roles. `self-claim` is unrelated (runners claiming own times).
- **Moderator management is a stub** — console `moderators` pane is a "coming in a later phase" placeholder; the only role UI is global-admin-only (`admin/role-assignments`).
- **No board-level published/configured flag** — visibility is per-category `active`/`isMain` via `updateCategory`.
- **Categories are ingested, not created** — there is no create-category action; the wizard curates discovered categories.
- **Stepper precedent:** `manage/reassignments/game-wizard.tsx` (STEPS array, stepDot/stepDone/stepCurrent, per-step validity gating).
- **Console IA:** data-driven via `manage/console/nav-model.ts` + `content-router.tsx`; server actions per section already exist and are the wizard's write path.

## Decisions (settled during brainstorming)

| Question | Decision |
|---|---|
| Claim flow | In scope: runner-facing claim request + global-admin approval queue. Backend contract documented and handed off (frontend-lane rule). |
| Audience | Both fresh claims and existing incomplete boards ("Finish setup" resume via completeness checks). |
| Moderators step | In scope; per-game mod management shares the same backend handoff. |
| "Publish" semantics | Backend board-level `configured` flag, flipped by the wizard's final step. |
| Approval role | Admin picks tier in the approve dialog; defaults to `board-admin` for a first claim. |
| Apply requirements | None — any logged-in user can apply. Judgment signals shown on the request card instead. |
| Queue ownership | Global admins only. |
| Contested claims | Rival requests grouped on one queue card; admin approves one, several (co-mods), or none. |
| Already-moderated boards | CTA becomes "apply to join the mod team"; request routes to that board's board-admins (console attention pane), not the global queue. |
| Metadata scope | Full: cover override, platforms, release year, discord link (backend contract), plus slug/abbreviation (existing action). |
| Structure | **Approach A** — dedicated `/setup` route with purpose-built plain-language step UIs writing through the same server actions the console uses. Console stays the power-user surface. |

## Flows

### Claim request (runner-facing)

- On `games-v2/[game]`, a logged-in non-mod sees a CTA in the header area:
  - Board has no mods → "This board is unmoderated — apply to moderate it".
  - Board has mods → "Apply to join the mod team".
- CTA opens a modal: motivation textarea only. Submitting creates a pending claim request. One open request per user per game; afterwards the CTA shows "application pending".
- Knowing whether a board has mods requires the backend mod-list on the public game payload (contract §2).

### Admin approval queue

- New page `admin/board-claims` (sibling of `admin/role-assignments`), global admins only (new CASL ability `manage board-claims`).
- One card per *board*, grouping rival requests side-by-side. Each request shows: requester, motivation, and backend-inlined signals — runs on this game, total ingested runs, account age, prior request outcomes. Card header shows board activity (runners/runs) to judge stakes.
- Approve dialog: role selector (`board-admin` default for first claim | `board-moderator`), confirm. Deny: optional reason.
- Both outcomes notify the requester via the existing bell system; approval notification links to `/setup`.
- Admin may approve one, several (co-mods), or none of a card's requests.

### Join-team requests

Requests against an already-moderated board skip the global queue and surface as a new item type in that board's console **attention** pane, actionable by its board-admins (same approve-with-role / deny mechanics).

### Wizard entry

Route `games-v2/[game]/setup`, gated on `canConfigure` (else `notFound()`). Entry points:

1. Approval notification link.
2. Console: when the board is unconfigured, a prominent "Set up this board" card; the wizard is suggested, never forced.
3. Console: persistent `SetupChecklistCard` ("Finish setup — N of 8 done") for any board failing completeness checks, deep-linking to the first incomplete step (`setup?step=<id>`).

### Completeness + configured flag

`src/lib/setup-completeness.ts` — a pure module computing per-step status (`done | skipped | blocked | warning`) from resolved game + categories + variables + policies + mod list. Consumers: wizard resume, `SetupChecklistCard`, and later the Tier 1 health score. The wizard's final step flips the backend `configured` flag; the checklist card relies on derived checks so it also works for boards configured before the flag existed.

## Wizard frame (shared)

- Slim game header (cover, title) on top; horizontal 8-dot stepper with done/current/upcoming states (visual language from `reassignments/game-wizard.tsx`).
- Content left; slim right rail with a running summary of decisions ("Main category: Any% · Timing: RTA · 2 variables").
- Bottom bar: **Back** · **Skip this step** (where allowed) · **Save & continue** (performs the step's server writes, then advances).
- No client-only cross-step state: every step commits real writes on advance. Abandoning mid-way loses nothing; re-entry resumes at the first incomplete step. Stepper allows free navigation to any step (all steps are idempotent edits of live state).

## Steps

### 1. Welcome & board snapshot (read-only)

Hero card: cover (3:4), title, stat tiles — categories discovered (`resolveCategory`), unique runners, total finished runs (`getQuickStats`). Ordered list previewing the remaining steps. Footnote: data comes from auto-ingested timer runs.
**Empty board variant** (zero ingested runs): "No runs ingested yet — you'll be setting this board up from scratch"; step 3 switches to its empty state.
**Writes:** none.

### 2. Game details

Two-column form. Left: display cover (IGDB shown; replace via existing S3 presigned-URL upload path → `coverUrl`), release year, platforms (chips; IGDB pre-fill). Right: slug + abbreviation (pre-filled, inline validation matching the identifiers pane), Discord invite URL (validated discord.gg link).
**Writes:** slug/abbreviation → existing `updateIdentifiersAction`; cover/platforms/releaseYear/discordUrl → new `updateGameMetadataAction` (contract §3). Partial failure keeps the step open with the failing field marked.
**Skip:** allowed (IGDB defaults).

### 3. Categories (flagship)

Table of ingested categories sorted by `totalRunTime` desc. Columns: show-on-board checkbox (`active`), name, runners, finished runs, last activity, main-category radio. Pre-checks rows above the low-activity cutoff (`isLowActivityCategory` inverted); top category pre-selected as main. Banner explains the pre-selection ("4 categories with the most activity — 96% of this board's runs"). Optional collapsed groups mini-editor (create groups, assign categories). Live count "7 shown / 12 hidden". Main radio enabled only on checked rows.
**Writes:** `updateCategorySettingsAction` per changed category (sequential batch with progress, per-row failure retry); groups via `category-mgmt` group actions.
**Validation:** ≥1 active + exactly one main to be *done*; skippable but flagged as a **blocker** in review (Finish disabled) — except on empty boards, where the step is treated as completable and shows guidance linking to the run submission form (categories appear via ingestion/submission; no create-category exists).

### 4. Timing

Recommendation callout derived from ingested RT/GT presence ("93% of runs have real time only — we suggest RTA"). Per-category table (active categories only): primary timing, show RT, show GT, milliseconds; header row acts as set-all.
**Writes:** `updateTimingSettingsAction` per changed category; the can't-hide-both-RT-and-GT invariant enforced inline.
**Skip:** allowed.

### 5. Variables

Three zones:
1. Explainer strip — two cards: **Subcategory** (splits the board; own rankings per value) vs **Filter** (one board, viewers narrow it), each with a small inline-SVG illustration.
2. Templates row — one-click cards: Platform, Version, Difficulty, Character; clicking pre-fills the editor (nothing created until saved).
3. Variables list + editor — simplified console variable form: name, subcategory/filter radio (using the explainer labels), values as chip input, category scope (all/selected).

**Writes:** `createVariableAction` on each save (immediate, independent entities); `deleteVariableAction` for removals.
**Out of scope:** managed combinations / alias buckets — footnote links to Manage → Combinations.
**Skip:** allowed and expected for simple games.

### 6. Rules

Left: active-category list with done-checks. Right: markdown textarea + preview for the selected category, pre-filled with a starter template (timing start/end placeholders, video requirement mention, platform/version reference, no-cheating clause). "Copy these rules to all remaining categories" + per-category save.
**Writes:** `updateCategorySettingsAction({rules})` per category.
**Skip:** allowed; review shows "N categories have no rules" as a **warning**.

### 7. Standards

Cards with an "all categories | specific category" scope selector ("all" writes game-wide `categoryId=null` policies):

- **Video proof:** require-video toggle + optional top-N (`requireVideo`/`requireVideoTopN` via category settings).
- **Minimum time:** toggle + time input with a suggestion — ~70% of current WR from `getLeaderboard`, client-side, rounded, shown only when the board has ≥10 runs ("Fastest verified run is 14:32 — we suggest a 10:00 minimum"). Written as a min_time policy with `{minTimeMs, minGameTimeMs}` value keys.
- **Auto-flag thresholds:** existing policy knobs with plain-language labels, mapped to the policy types the standards pane manages.

**Writes:** `createPolicyAction`/`updatePolicyAction` per card on Save & continue; video fields via `updateCategorySettingsAction`.
**Skip:** allowed; review warns "no video requirement · no minimum time".

### 8. Moderators & finish

1. **Mod team:** current mods (new mod-list endpoint; at minimum the requester). Add: user search → role picker (board-admin/board-moderator) → confirm, via new `addGameModeratorAction`. Remove allowed, except removing yourself when you are the only board-admin. Section skippable.
2. **Review & finish:** checklist mirroring steps 2–7 — status (done/skipped/needs attention), one-line summary, edit link back to the step. Blockers (no active categories / no main) render red and disable Finish; warnings render amber. **Finish setup** calls new `setGameConfiguredAction` (flips `configured`), then a success screen — "Your board is live" — with CTAs to the public board and the console.

## Architecture

### New frontend code

| Piece | Location |
|---|---|
| Wizard route (server, `canConfigure` gate, loads console-equivalent data + completeness) | `app/(new-layout)/games-v2/[game]/setup/page.tsx` |
| Client stepper shell + step components | `setup/wizard-shell.tsx`, `setup/steps/step-*.tsx` |
| Completeness module (pure) | `src/lib/setup-completeness.ts` |
| Console checklist card | `SetupChecklistCard` at top of console landing pane when unconfigured or warnings exist |
| Claim CTA + modal (hidden for mods / apply / pending states) | game header area of `games-v2/[game]` |
| Admin queue | `app/(new-layout)/admin/board-claims/page.tsx` |
| Join-team requests | new item type in console attention pane |
| Libs | `src/lib/board-claims.ts`, `src/lib/game-moderators.ts`, metadata additions in `src/lib/game-mgmt.ts` |
| Actions | alongside consumers; house pattern: `getSession` → permission check → lib call → `revalidateTag(tag, profile)`. New fetchers use `'use cache'` + `cacheTag`. |
| RBAC | new `manage board-claims` ability for global `admin`; existing `board-admin → edit moderators` ability gains its first consumer |

Existing write path reused per step: `updateIdentifiersAction`, `updateCategorySettingsAction`, `updateTimingSettingsAction`, `createVariableAction`/`deleteVariableAction`, `createPolicyAction`/`updatePolicyAction`, group actions from `category-mgmt`.

### Backend handoff contract (documented, not built here)

1. **Board claims:** create (gameId, motivation); list for admin queue with inlined signals (requester's runs on the game, total ingested runs, account age, prior request outcomes); per-game list for join-team routing; approve (role param → writes per-game role/`moderatedGames`, fires bell notification linking to `/setup`); deny (optional reason, notification). Reject duplicate open requests per user+game.
2. **Per-game moderators:** list with roles; add (userId, role); remove. Public game payload exposes mod presence (for CTA state).
3. **Game metadata:** extend game update body with `coverUrl`, `platforms`, `releaseYear`, `discordUrl`.
4. **Configured flag:** board-level `configured` boolean, settable by board mods, returned on game resolve.

### Error handling

- Step writes fail inline on the step (field-level where distinguishable); never advance on failure.
- Batched category writes report per-row failures with retry of just the failed rows.
- Claim double-submit: backend rejects second open request; CTA flips to pending.
- Concurrent console edits by co-mods: wizard re-reads server state on each step mount; last write wins (console parity).

### Testing

- Unit tests: `setup-completeness.ts` and the min-time suggestion math (pure functions, plain fixtures).
- `npm run typecheck` + `npm run lint`.
- Manual browser pass by Joey (sandbox can't run `next dev`).
- Backend-contract-dependent UI built against typed stubs so it is reviewable before the backend lands.

## Out of scope

- Managed combinations / alias buckets in the wizard (console link instead).
- Health score (Tier 1 item 6) — but `setup-completeness.ts` is deliberately its foundation.
- Full moderator activity stats / ownership transfer (rest of Tier 1 item 7).
- Auto-approval or approval requirement gates (decided against; signals only).
- Legacy `manage-page.tsx` tab-shell cleanup (roadmap item 9) — separate task, though the dual console/tab structure was noted during exploration.

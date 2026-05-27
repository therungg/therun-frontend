# Unified Game Admin Console — Design

**Date:** 2026-05-27
**Status:** Design — approved in brainstorming, pending spec review.
**Reads with:**
- Moderation vision: `docs/superpowers/specs/2026-05-23-moderation-leaderboard-editing-vision.md`
- Backend requirements (policies/minimums §4): `docs/superpowers/specs/2026-05-23-moderation-backend-requirements.md`
- Backend API contract (policies §D): `docs/superpowers/specs/2026-05-23-moderation-backend-api-contract.md`

---

## Problem

A game currently has **two** separate admin surfaces:

- **`/games-v2/[game]/manage`** — game/category configuration (Game tab + Category tab: identifiers, groups, visibility, timing, rules, variables, combinations, **minimums**). Gated on `category-settings`.
- **`/games-v2/[game]/manage/moderation`** — the redesigned moderation view (Moderate queue + Configure: Standards policies, bans, history; plus roster/runner/run drill-downs). Gated on `canModerateGame` / `moderators`.

These overlap and confuse. The clearest symptom: a **leaderboard minimum exists in two systems**:

- Legacy: `/v1/games/{id}/categories/{cid}/minimums`, keyed by `subcategoryHash`, surfaced by the manage-page `MinimumsSection`.
- New: `/v1/leaderboards/games/{id}/policies` (`min_time`), surfaced by the moderation `Standards` tab as "Reject runs faster than".

A minimum set on the legacy manage-page UI can read back blank — a direct consequence of the two-store split (writing/reading one store while the live behavior is driven by the other). The backend requirements doc already intends policies to **generalize and replace** minimums (§4), but that migration was left half-done and the old UI was never removed.

## Goal

Replace both surfaces with **one sidebar-driven admin console**, retire the old manage page, and collapse minimums to a **single category-level policy store**.

## Non-goals

- No separate/custom design system — stay on the app's Bootstrap foundation.
- No per-subcategory minimums (see Minimums below).
- Net-new surfaces (game metadata, moderator assignment) are **reserved slots only** in this design; their implementation is a later slice.
- Backend changes are **documented as asks here**, not implemented in this frontend work (see Backend dependencies).

---

## Route

- The console lives at **`/games-v2/[game]/manage`**.
- `/games-v2/[game]/manage/moderation` **redirects** to the console. Its sub-routes (`roster`, `runner/[userId]`, `run/[runId]`) move under `/manage`.
- The old Game/Category tabbed page (`ManagePage`, `TabStrip`, `GameTab`, `CategoryTab`) is removed once parity is reached.

## Layout & information architecture

Left **sidebar** + content pane. Sidebar grouped into two areas:

```
Super Mario 64 · Admin
═══════════════════════════════
▍MODERATE                     (any moderator)
   • Needs attention    ⚠ n
   • Roster
   • Reports
   • Bans
   • History / audit

▍CONFIGURE
   Game ─────────────         (board-admin / game admin)
   • Details & metadata        ← reserved slot (later)
   • Moderators (assign)       ← reserved slot (later)
   • Groups
   • Categories & visibility
   • Identifiers (slug/abbrev)

   Per category  [▾ picker]    (category-settings)
   • Standards (min/max · video · auto-flag)
   • Timing
   • Rules
   • Variables
   • Combinations
──────────────────────────────
↩ Back to leaderboards
```

### Category context

A single **category picker** at the top of the **Per category** group sets the working category for every page in that group. **Moderate** and **Game** are game-wide and ignore the picker. The Roster page keeps its own board browser (it spans categories by design).

### Permission model

Gating is **per-item**, not per-group: each sidebar item is shown when the viewer can use it, and a group renders only if it has at least one visible item. This matters because the **Per category** group mixes abilities — Standards is board-admin while the other category items are `category-settings`.

| Sidebar item(s) | Visible when | Edit when |
|---|---|---|
| MODERATE → all | `canModerateGame` | per-action (existing moderation gates) |
| Per category → **Standards** | `canModerateGame` | `edit` on `moderators` (board-admin) |
| Per category → Timing / Rules / Variables / Combinations / settings | `category-settings` | `category-settings` |
| Game → all | `category-settings` | `category-settings` |

Consequences: a plain per-game moderator sees **MODERATE** plus **Per category → Standards** only; a category-settings admin who is not a moderator sees the Per category config items and Game, but not Standards. Reconcile the exact CASL subjects during build; do not invent new abilities unless a gap is found.

## Design language

Consistent **Bootstrap console**:

- A real sidebar shell + content pane (responsive: sidebar collapses to a drawer/offcanvas on narrow viewports).
- Re-housed sections restyled to **one** pattern: page header, section cards, shared form controls, a shared category picker.
- The `interface-design` skill drives those shared patterns at build time.

## Minimums consolidation

- **Single store:** the `min_time` board policy. **Migrate fully off** the legacy `/minimums` endpoint — remove `src/lib/leaderboard-minimums.ts`, `types/leaderboard-minimums.types.ts`, the `manage/minimums/` actions + `MinimumsSection`, and the manage-page Category-tab entry.
- **Category-level only:** one `min_time` policy per category with `subcategoryKey = null`, applied by the backend across **all** subcategory slices of the category. No subcategory selector, no per-platform minimum. The `Standards` UI's existing `subcategoryKey == null` (category-scoped) filter is correct and sufficient.
- Minimums are edited under **CONFIGURE → Per category → Standards** (board-admin), alongside max/video/auto-flag.

## Migration map (existing → console)

| Existing | Lands at |
|---|---|
| `moderation/attention/*` (queue) | MODERATE → Needs attention |
| `moderation/roster/*` | MODERATE → Roster |
| `moderation/reports` view | MODERATE → Reports |
| `moderation/configure/active-bans` | MODERATE → Bans |
| `moderation/configure/history-drawer` | MODERATE → History |
| `moderation/configure/standards` (+ minimums) | CONFIGURE → Per category → Standards |
| `manage/timing` | CONFIGURE → Per category → Timing |
| `manage/category-tab/rules-section` | CONFIGURE → Per category → Rules |
| `manage/variables` (variables + combinations) | CONFIGURE → Per category → Variables / Combinations |
| `manage/category-tab/category-settings-section` | CONFIGURE → Per category (settings) |
| `manage/game-tab` (groups, category list, visibility) | CONFIGURE → Game |
| `manage/identifiers` | CONFIGURE → Game → Identifiers |
| `manage/minimums/*` | **removed** (folded into Standards) |
| — | CONFIGURE → Game → Details & metadata *(reserved)* |
| — | CONFIGURE → Game → Moderators *(reserved)* |

## Backend dependencies (asks — hand off, do not implement here)

1. **Retire legacy minimums.** The `min_time` policy must fully replace `/categories/{cid}/minimums`, including the side effect the legacy upsert had (flagging/unflagging affected runs on change — legacy returned `{ flagged, unflagged }`). Confirm the policy write triggers the same rebuild + flag resolution.
2. **Category-level scope.** Confirm a `subcategoryKey = null` `min_time` policy is evaluated across **all** subcategory slices of the category (contract §D line 228: `NULL => all subcategories`). This is the intended semantics; verify it is implemented.
3. *(Later slices)* endpoints for **moderator assignment** (grant/revoke the per-game moderator role) and **game metadata** fields.

## Phasing (build order)

1. **Shell** — route at `/manage`, sidebar + content pane, permission gating, redesign patterns, redirects from `/manage/moderation`.
2. **Re-house MODERATE** surfaces.
3. **Re-house CONFIGURE** surfaces, including the **minimums consolidation** (after backend deps 1–2 are confirmed).
4. **Retire `/manage`** old page + delete legacy minimums code.
5. **Net-new** Details & metadata + Moderators.

Each phase becomes its own implementation plan.

## Out of scope

- Implementing metadata / moderator-assignment surfaces (reserved only).
- Any backend implementation (asks documented above).
- Per-subcategory minimums.

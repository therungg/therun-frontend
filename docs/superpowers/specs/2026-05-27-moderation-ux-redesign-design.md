# Moderation UX Redesign — One Surface, Two Verbs

**Date:** 2026-05-27
**Status:** Design — approved in brainstorming, pending spec review.
**Type:** Frontend UX consolidation. **No backend changes required** for the core; a short list of backend coordination asks is called out in §11.

**Supersedes (frontend IA only):** the surface layout described across the 10 build phases in `MODERATION_FRONTEND_STATUS.md`. The backend contract (`2026-05-24-moderation-backend-contract-actual.md`) and the vision's principles (`2026-05-23-moderation-leaderboard-editing-vision.md`) are **unchanged and still authoritative.** This redesign reorganizes how those shipped capabilities are presented; it does not alter the 4-record model.

---

## 1. The problem

The moderation feature works, but the experience is fragmented to the point of being unusable for its purpose. Concretely, what shipped:

- **9 separate pages** under `/manage/moderation/`: hub, queue, reports, manual-times, rules, policies, roster, runner, log.
- **6+ entry points for the same action.** Rejecting or excluding a run can be done from the leaderboard row menu, the queue, the reports view, the roster view, the runner view, and the run-detail page — each with its own dialog and slightly different behavior.
- **Three different "exclusions"** a moderator must choose between, all of which produce the same visible result ("the run is off the board") but mean different things internally: a **reject verdict** (changes verification status, notifies the runner, appealable), an **ad-hoc run exclusion** (silent, no status change), and a **standing user rule** (hides all of a runner's runs).
- **Admin/configuration jargon.** Setting a minimum time lives on an abstract "policies" page divorced from the board it governs, exposing raw fields like `min_time`, `require_video_top_n`, `auto_flag_pb_jump_pct`.

The result: too many places, too many menus, and a decision ("which kind of removal?") the moderator should never have had to make. The bar is **speedrun.com**; the goal is an experience with the clarity of something Apple would ship.

## 2. Goals & non-goals

**Goals**
- Collapse the nine pages to **one page with two tabs**, plus inline actions on the real leaderboard.
- Reduce the moderator's vocabulary to **two destructive verbs** (Remove, Ban) and three supporting ones (Approve, Restore, Add time), with the *consequence* of each derived from a plain-language reason rather than chosen as a mechanism.
- Make **proactive bulk cleanup** (a board full of fake runs) as easy as **reactive triage** (the daily flag inbox).
- Make a correctly-configured board produce a **near-empty inbox and almost no runner notifications.** Silence is the success metric.
- Keep every backend capability that shipped; change only how it's surfaced.

**Non-goals**
- No change to the backend data model, the 4-record system, or the eligibility/`min`-derivation math.
- No change to runner-facing self-service (self-claim, self-hide, appeal, report) beyond where its *outputs* land in the moderator inbox. Those surfaces stay as built.
- Not a visual restyle of unrelated leaderboard UI; this is the moderation surface only.

## 3. The action model — five verbs, two destructive

Everything a moderator can do to a run is one of five verbs, behaving **identically** whether invoked from the attention list, a board row, or a runner's view:

| Verb | Meaning | Destructive | Backend mapping |
|---|---|---|---|
| **Approve** | "I checked this — it's legit." Clears it from Needs Attention and **immunizes it against re-flagging.** | no | `verify` verdict (`POST .../verdicts`, action `verify`) |
| **Remove** | Takes the run off the board. Loud or quiet by reason (§4). | **yes** | reject verdict **or** exclude — routed by reason (§4) |
| **Restore** | Puts a removed run back. Only shown on removed runs. | no | `unreject` verdict or `include` — matches how it was removed |
| **Ban runner** | Standing rule: hides all of a runner's runs, current and future, board- or category-wide. | **yes** | exclusion **rule** (`POST .../exclude` with rule shape) |
| **Add time** | Mod asserts a time (e.g. from a VOD) not backed by a `finished_run`. | no | manual time (`POST .../manual-times`, mod-added = verified) |

This directly retires the "three exclusions" problem: there is **one Remove action.** Whether it notifies the runner, sets a rejected status, and grants an appeal is a *readable consequence of the reason chosen*, not a separate tool.

## 4. Remove: the reason picks loud vs. quiet

When a moderator Removes a run (or selection), they pick a reason. The reason sets a smart default for whether the runner hears about it, and that default routes to the correct backend mechanism. The default is overridable with a single "Notify runner" toggle, but the routing is otherwise invisible.

| Reason | Default | Runner notified? | Appealable? | Routes to |
|---|---|---|---|---|
| **Cheating / falsified** | **Loud** | yes | yes | reject verdict |
| **Breaks the rules** (wrong version, illegal strat, missed requirement) | **Loud** | yes | yes | reject verdict |
| **Doesn't belong** (duplicate, test/joke run, superseded by a better time) | **Quiet** | no | no | exclude (ad-hoc) |

Rationale for the mapping: the backend already has exactly two removal paths (vision §3a) — `reject` (promotion-aware, status-changing, the runner-visible verdict) and `exclude` (silent bulk removal). Loud reasons are accusations and belong on the verdict path; quiet reasons are housekeeping and belong on the exclusion path. The moderator picks intent in plain language; the system picks the mechanism.

**Reason is required** on every destructive action (the existing 10-character minimum stays). For quiet removals the reason is internal/audit-only; for loud removals it is shown to the runner.

## 5. Information architecture — one page, two tabs, three depths

A single **"Moderate"** button in the game header opens **one page** with two tabs. Moderation actions *also* appear inline on the real public leaderboard via a mod-mode toggle. Configuration actions exist *only* in the page's Configure tab — never on a board row.

### Tab 1 — **Moderate** (the daily work)

Three depths of zoom, no sub-page menu:

**Depth 1 — Game home: "Needs Attention" (§6).** The default landing. One prioritized list of everything across the whole game waiting on a human, regardless of category.

**Depth 2 — A category board (§7).** Click a category (or a run's category) → that category's leaderboard in mod mode: per-row select, a bulk action bar, and a **filter bar** for constructing proactive sweeps. This single surface replaces today's roster view, runner view's per-category browsing, and the inline row menu's mod section.

**Depth 3 — A runner, or a run (§8).** Click a runner → their full finished-run set in a slide-over with mass actions (this is where Ban lives). Click a run → its detail + history timeline.

### Tab 2 — **Configure** (the board's rules)

Holds everything that is *setup*, not *triage*, and is **never reachable from a board row**:
- **Standards (§9)** — minimum/maximum time, video-required threshold, auto-flag sensitivity. Plain language, scoped to a category, with a live preview of what the rule catches.
- **Active bans** — the list of standing exclusion rules; lifting one = Restore.

**History** is *not* a tab. It is a read-only audit slide-over reachable from a header icon in **both** tabs (§10).

### Why this shape

It refuses to invent surfaces. There is one object — the board — and moderation is a lens over it; the inbox is the board filtered to "needs attention," the runner view is the board filtered to one person, Standards are the board's rules shown against the board. Nine destinations become **two tabs + the board itself.**

## 6. Needs Attention — the merged inbox

The four review streams that shipped as separate pages (queue, reports, appeals, pending self-claims) are all "a run waiting for a human decision." They merge into **one prioritized list**, sorted by severity then age.

Each row is one run and reads at a glance: runner, time, category, rank, VOD presence, **why it's here**, and the inline verbs from §3.

- **Source tag** identifies who raised it: ⚙ system flag · 🚩 user report · ⚖ appeal · ✋ self-claim. A run raised by multiple sources **collapses into one row** (no duplicate work).
- **Multiple flags from the same runner collapse into one expandable group** — clear all of a spammer's entries in one action (§8).
- **Acting resolves the item.** Approve/Remove/Restore removes it from the list.
- **Filters:** source and category (default: all categories).
- The **count on the Moderate button** is this list's length (the attention badges already built are retained).

Backed by the shipped `GET .../queue` (flags, with severity + suggested action), `GET .../reports`, appeal queue items, and pending self-claim manual times. No new read endpoints; this is a client-side merge + unified presentation.

## 7. Category board in mod mode — reactive *and* proactive

Depth 2 is the real category leaderboard with mod mode on. It serves both the "I see one bad run" case and the "this board is full of garbage" case.

- **Per-row select + bulk action bar:** Approve · Remove · Ban runner · Add time, operating on the current multi-select.
- **Needs-Attention items for this category are pinned/highlighted in place**, so triage and browsing are the same surface.
- **Filter bar for constructing sweeps** — the proactive-cleanup tool. A moderator builds a query ("top 20 · no VOD · account younger than 7 days") and bulk-acts on the result. Filters map to the shipped `GET .../categories/{categoryId}/eligible-runs` query params (`subcategoryKey`, `verificationStatus`, `hasVod`, `runnerName`, `endedAfter/Before`). Filters not yet backed by a query param (account age, faster-than-WR%) are applied client-side over the fetched roster, or flagged as a backend ask (§11).

### Cold-start workflow (the "board full of fakes" case)

When a moderator first takes a junk-filled board, the inbox is the wrong tool — it's reaction-based. The intended sequence:

1. **Set a minimum time** in Configure (§9). This mass-auto-removes the obviously-invalid runs **silently** (objective housekeeping, no notifications).
2. **Filtered sweep** on the board for the rest (no-VOD, fresh-account, etc.) → bulk Remove or Ban.
3. **Ongoing**, the board is quiet and the (now-short) inbox is the only surface that needs daily attention.

"Standards do the work" *is* the bulk-cleanup strategy, not a separate feature.

## 8. Runner view — mass action by person

Reached by clicking a runner anywhere. Opens their full finished-run set in this game in a slide-over (the shipped `GET .../users/{userId}/eligible-runs`, with live rank), with its own filters.

- **Primary buttons: "Remove all N runs" and "Ban runner"** — one confirm, one preview.
- **Guidance toward Ban for bad actors:** when a moderator Removes several runs from one runner, the confirm offers **"Ban this runner instead?"** — because Ban (a rule) also covers their *future* uploads, while removing N runs leaves the N+1th arriving tomorrow. (This strengthens the shipped "rule-shape hint.")
- A faked-entry pile is the motivating case: a runner with 10 fake runs is one Ban, or one "Remove all," not ten gestures.

## 9. Standards — the configuration fix (Configure tab)

The abstract "policies" page is replaced by **Standards**, scoped to a category and always shown against the board it governs. Every setting is a plain sentence with a **live preview**, not a typed policy record:

```
Standards · 120 Star

  Reject runs faster than        [ 14:35.0 ]   ← nobody has legitimately gone sub-14:35
  Flag runs missing video in the top [ 10 ]
  Auto-flag suspicious jumps     Sensitivity:  ○ Off   ● Normal   ○ Strict

  ┌ Preview ───────────────────────────────────┐
  │ With these standards: 2 runs auto-removed,   │
  │ 5 flagged for review.   [see them]           │
  └──────────────────────────────────────────────┘
```

Two deliberate choices:
- **Sensitivity, not percentages.** The raw `auto_flag_pb_jump_pct` / `auto_flag_faster_than_wr_pct` knobs collapse into **Off / Normal / Strict**. Moderators reason about "how paranoid should the system be," not about tuning percentages. (Frontend maps the three levels to concrete percentages when writing the policy.)
- **Live preview before save.** Setting a minimum immediately shows what it catches on this board, so a standard is never abstract.

Standards default game-wide and can be overridden per category. Maps to the shipped `.../policies` CRUD (`min_time`, `max_time`, `require_video_top_n`, `auto_flag_*`).

**Access:** **board-admins set Standards; moderators get read-only preview.** A moderator can open Standards and see the live "this catches N runs" preview (so they understand *why* runs are being flagged), but cannot save changes. This is a deliberate tightening of the vision's §9 (which granted policies to per-game mods); a single mistimed minimum could mass-remove legitimate runs, so editing is gated to board-admin. Enforced in the CASL frontend gate; the backend policy-write endpoints must match (§11).

## 10. History — audit slide-over

Read-only timeline of every moderation action, reachable from a header icon in both tabs. Reversible recent actions (the shipped 24-hour undo on exclude/include/rule changes) carry an Undo control here. Not a daily surface; consulted to review or reverse. Maps to the shipped `GET .../mod-actions` feed.

## 11. Cross-cutting requirements

- **Approve must stick.** Approving a run sets `verified`, which (per vision §3a) immunizes it against auto-flags re-queuing it. Without this the inbox refills with already-cleared runs and the silence goal fails. Verify this holds end-to-end; it is the backend's stated behavior.
- **Batched notifications.** A loud Remove of 5 of one runner's runs must produce **one** notification, not five. The vision's deferred "notification emit on bulk exclude" item must emit **per runner per batch**, not per run. **Backend coordination ask.**
- **Bulk safety net.** Every destructive bulk action shows an impact preview with a **real sample** (not just a count) before confirm — "Removes 47 runs across 2 leaderboards · bumps 11 runners up a rank · notifies 1." After it executes, a persistent **"Removed 47 runs · Undo"** affordance. Backed by the shipped `/exclude/preview` and `/verdicts/preview`.
- **Ban-not-Remove guidance** — §8.
- **Cold-start = standards first** — §7.

## 12. Permissions

Built on the existing CASL mirror (`src/rbac/ability.ts`); no new gating model.

| Persona | Moderate tab | Configure tab |
|---|---|---|
| **Per-game moderator** (`verify-reject-run` / CASL `edit` on `leaderboard` with `{ game }`) | full — all five verbs, inbox, board, runner view | **read-only** — can open Standards & see previews, cannot save; can view Active bans |
| **board-admin** | full | full — set Standards, manage bans |
| **admin** | full | full |

The backend re-checks every endpoint regardless of UI gating. The only change from today's gating: **policy writes move from per-game mod to board-admin** (§9) — backend coordination ask (§11 list below).

## 13. Backend coordination asks

This redesign is frontend-only **except** for these, which are documented here and handed off (per the project's frontend-lane convention — do not edit `../therun`):

1. **Batched notifications** — emit one notification per runner per batch on bulk loud-Remove, not one per run (§11). Ties into the vision's deferred "notification emit on bulk exclude."
2. **Policy-write gating** — restrict `.../policies` writes to board-admin to match the UI (§9, §12). Reads/preview stay open to per-game mods.
3. **(Optional) roster filter params** — if account-age and faster-than-WR% sweeps prove common, add them as `eligible-runs` query params; until then they're client-side over the fetched roster (§7).

None block the build: the UI degrades gracefully (filters apply client-side, notification batching is a backend-side refinement, policy gating is enforced UI-side immediately).

## 14. Migration — nine pages to two tabs

| Today | Becomes |
|---|---|
| `moderation` hub, `queue`, `reports` | **Moderate tab** → Needs Attention (§6) |
| `roster`, `runner` | **Moderate tab** → category board (§7) + runner slide-over (§8) |
| `manual-times` | self-claims → Needs Attention; mod adds → **Add time** verb |
| `rules` | **Configure tab** → Active bans (§9) |
| `policies` | **Configure tab** → Standards (§9) |
| `log` | **History** slide-over (§10) |
| inline row menu (mod section) | unified verbs, same as everywhere (§3) |

Existing route paths under `/manage/moderation/*` either redirect into the new page (preserving any bookmarks) or are removed once the new page is the entry point; decided during planning. The shared dialog components (verdict/exclude/include/manual-time/reason) are consolidated into the single reason-driven action flow of §3–§4 rather than kept as separate dialogs.

## 15. Success criteria

- A moderator never chooses between "reject," "exclude run," and "user rule" — they Remove (with a reason) or Ban. Two verbs.
- A board full of fakes is cleaned by: set a minimum (silent mass-removal) → one filtered sweep → done — not dozens of clicks.
- A correctly-configured board produces a near-empty inbox and almost no runner notifications.
- Every destructive action previews its blast radius and is undoable.
- There is one place to moderate, reachable from one button — not nine pages and six menus.

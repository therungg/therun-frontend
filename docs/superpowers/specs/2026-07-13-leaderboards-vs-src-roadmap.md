# Leaderboards vs speedrun.com — Gap Analysis & Roadmap

**Date:** 2026-07-13
**Status:** North-star roadmap. Each item gets its own design + plan before code.

---

## Where we stand

The v2 leaderboards (`games-v2`) are structurally strong: variables/subcategories with alias buckets, managed combinations, category groups, rules, timing config, a full moderation stack (triage inbox, bulk verdicts, manual times, exclusions, policies/standards, reports, appeals, notifications, audit + undo), and reassignment. That moderation depth already *exceeds* speedrun.com's tooling.

What's missing is everything around the board: the entire surface is admin-gated and unlinked, runners can't submit runs properly, profiles don't show ranks, there are no ILs/platforms/co-op, and there's zero community layer (guides, resources, comments, themes). SRC wins today on completeness and community, not on tech.

Our structural advantages to press: **auto-ingestion from timers** (zero-friction entries, real attempt counts), **live data**, and **splits-level stats** SRC cannot show.

---

## Tier 0 — Launch blockers (v2 is invisible today)

1. **Un-gate and launch v2.** `games-v2/[game]/page.tsx` hard-404s non-admins and nothing links to it. Needs: nav/search integration, redirects or coexistence story with v1 game pages, SEO (metadata, OG images, sitemap). **Decision (2026-07-13): launch all at once**, not per-game opt-in.
2. **Public run detail page.** Today only mods have a run page. Runners need a shareable page per entry: video embed, time(s), variables, date, verification status + history, and — the killer nobody else has — **the actual splits** when the entry came from a timer.
3. **Run submission form.** The single biggest functional gap. Most console/retro runners don't use LiveSplit. Need a real "Submit a run" flow: category → subcategory variables (guided pickers, not the raw-text field self-claim uses today) → time(s) per timing method → date achieved → video URL (validated/embeddable) → description. Lands as a pending manual-time/run in the existing verify queue. Consume the already-typed `SubmitWarning`s in the UI.
4. **Profile integration.** `getUserRankings` + `UserRanking` exist with zero consumers. Profiles need a PB table: game / category / time / rank / verified badge. This is the retention loop — runners come back to see their name.

## Tier 1 — Game setup wizard + setup completeness (the mod experience)

5. **Game setup wizard.** Guided first-run flow when someone claims/creates a board. Steps:
   - **Claim & metadata** — cover art, platforms, release year, abbreviation/slug (identifiers exist).
   - **Categories** — *suggest from already-ingested runs* (we have the data; SRC starts blank). Mark main category, ordering, groups.
   - **Timing** — primary timing, RT/GT visibility, milliseconds.
   - **Variables** — offer templates (Platform, Version, Difficulty, Character) instead of the blank form; explain subcategory vs filter in plain language.
   - **Rules** — per-category, with a starter template.
   - **Standards** — require-video, min/max time *suggested from the ingested time distribution*, auto-flag thresholds.
   - **Moderators** — invite co-mods.
   - **Review & publish** — checklist summary, board goes live.
   Wizard is a sequenced front over existing console sections — each step writes through the same actions the console uses.
6. **Board readiness / health score.** On the console: "Rules missing on 2 categories · no minimum set · 14 runs pending > 7 days · no video requirement." Same checks the wizard runs, ongoing. Nudges mods toward complete boards; gives us a quality signal for discovery ranking.
7. **Moderator management.** Console pane is a "coming later" stub. Need: list/add/remove per-game mods, role tiers (verifier vs super-mod), transfer ownership, activity stats (verifications this month), and a **mod application / game request flow** — how does a new game get a moderator at all? SRC's request queue is slow and hated; a fast path here is a real wedge.
8. **Game details & metadata pane.** Also stubbed. Cover, platforms, release date, IGDB link/overrides, discord link.
9. **Setup debt cleanup.** Fold or delete the orphaned `manage/minimums/` section (superseded by Standards); surface game-wide (`categoryId=null`) policies in Standards; delete legacy `manage-page.tsx` tab shell.

## Tier 2 — Data model gaps vs SRC

10. **Individual levels (ILs).** No level concept exists. SRC games with IL boards are a large share of activity. Needs: level entity per game, level leaderboards, level-grid view ("all levels × categories" table), IL runs in submission + moderation.
11. **Platforms / regions / emulator as first-class presets.** Modeling them as variables is fine mechanically, but we should ship them as canonical, cross-game presets (shared platform list, emu flag) so filters are consistent, discoverable, and usable for site-wide browse ("all N64 boards"). Wizard offers them as one-click template variables backed by the shared lists.
12. **Co-op / multi-runner entries.** SRC supports multiple players per run. Boards, submission, and profiles all need `runners[]` instead of one runner.
13. **Load-removed time (LRT).** Only RT/GT exist. Many PC communities rank on LRT as a third method. Verify backend appetite; at minimum let a category label GT as "LRT" for display.
14. **Obsolete runs.** SRC shows a runner's full history per board (beaten PBs), not just current best. We *have* every run via ingestion — expose "show obsolete" toggle and per-runner progression (sparkline of PBs over time — SRC can't do this well).
15. **Guest → account claiming.** `move-user` exists mod-side; add a runner-facing "claim these runs" flow with mod confirmation.

## Tier 3 — Page improvements

16. **Game page.** Theme/branding (see 21), IL grid tab, stats tab (aggregate attempt counts, completion rates, gold splits — our data, unfair advantage), WR progression chart front-and-center (drawer exists), streams-live row, obsolete toggle, per-row expand with run history, better empty states for unconfigured boards.
17. **Games directory (v2).** Current browse is v1 stats-cards. Need a real directory: search-as-you-type, filter by platform/genre/recently-active, sort by runner count, "new boards", "recently verified WRs" feed.
18. **Series pages.** No series/franchise concept. Series page = shared moderators, aggregated boards, cross-game rules inheritance. SRC series mods are a real organizational unit.
19. **Frontpage feeds.** Latest verified WRs, recently verified runs, trending boards — the "what's happening in speedrunning" loop SRC's frontpage barely does.
20. **SEO + share cards.** Per-board and per-run OG images (rank, time, game art). Runs shared on socials should look great — free acquisition.

## Tier 4 — Community layer (SRC's real moat)

21. **Game theming.** Per-game background, accent colors, logo, trophy icons (1st–4th). Mods deeply care; it's cheap identity investment that locks communities in.
22. **Run comments.** Comments on run pages. Moderated by game mods, rate-limited by trust tier (reuse moderation trust model).
23. **Guides & resources.** Per-game guides (rich text, versioned) and resources (files/links: save files, splits templates, practice hacks, trackers). Splits templates integrate with our timer ecosystem — SRC can't do that.
24. **Game news/announcements.** Mod-posted announcements ("rules change", "leaderboard reset"), surfaced on game page + follower notifications.
25. **Forums — deliberately skip.** Full forums are a swamp; comments + announcements + Discord links cover the need. Revisit only if demand is loud.
26. **Followers.** Follow games and runners → notification feed (bell exists) for new WRs, verified runs, announcements.

## Tier 5 — Growth & ecosystem

27. **Public leaderboards API.** SRC's API is the reason every tool/bot/overlay integrates with them. Documented public read API (we have `docs/openapi/leaderboards.yaml` as the seed) + embeddable board widgets.
28. **Import from SRC.** One-time importer (game config + historical runs, credited) to de-risk migration for communities. Politically sensitive — design carefully, but it's how boards actually move.
29. **Global/site-wide runner stats.** Cross-game rank summaries, "most verified runs", per-country boards (we already have country on entries).

---

## What NOT to copy from SRC

- Forums (see 25).
- Their verification-lag culture — our auto-ingestion + triage queue is the pitch: *your run is on the board the moment you finish it; moderation curates instead of gatekeeping*.
- Their static boards — live data (who's running now, live splits) should be visible on every board.

## Suggested attack order

Tier 0 items 1–4 first (launch + submission + profiles = a functioning competitor), then the wizard (5–7) since mod acquisition is the flywheel: no mods → no trusted boards → no runners. ILs (10) and platforms (11) before any Tier 4 community work — communities won't migrate if their board structure can't be represented.

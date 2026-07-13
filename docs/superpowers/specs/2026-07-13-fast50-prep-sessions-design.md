# fast50 Prep Sessions — Design

**Date:** 2026-07-13
**Status:** Approved design, pending implementation plan
**Builds on:** `2026-07-08-fast50-stats-panel-design.md` (branch `fast50-stats-screen`)

## Context

The fast50 stats screen composes presenter decks purely from runner statistics. That
makes every deck structurally identical — same slide types, different numbers — and the
format goes stale across an event. The fix is a human layer on top of the data layer:
before each run, Joey interviews the runner, captures what's genuinely interesting
(goals, stories, a clip of the trick to watch for), and curates the deck. That prep is
saved per run as a **prep session**, stored on the backend so prep can happen anywhere
and the presentation machine just loads it.

Backend work is in scope for this task (granted 2026-07-13); the backend repo is
`../therun`.

### Decisions from brainstorming

- **Storage:** backend-persisted sessions (not localStorage) — prep machine and
  presentation machine may differ.
- **Content types:** all six — Runner's Words (quotes), clip slides, The Called Shot
  (goal + auto post-run callback), roadmap annotations, fact cards, deck curation.
- **Video:** uploaded mp4 to S3 via presigned URL (mirrors event-image upload). No
  YouTube/Twitch embeds — native `<video>` is broadcast-clean and offline-safe.
- **Prep UX:** dedicated prep studio route with guided interview form, deck builder,
  and live slide preview.
- **Session model:** named sessions — a runner/game/category has a *list* of sessions
  (e.g. "fast50 #3 — July"); old preps stay as reference so the next event can
  deliberately differ.
- **Curation model:** **frozen deck** — the saved session stores an explicit ordered
  slide list. At showtime the deck renders exactly that structure; slides still pull
  live dossier numbers. Predictability over adaptivity: what you rehearsed is what you
  present. Runners with no prep session keep today's pure auto-compose behavior.

## Data model

```typescript
interface PrepSession {
    id: number;                    // backend identity pk
    username: string;
    game: string;
    category: string;
    label: string;                 // "fast50 #3 — July"
    createdAt: string;
    updatedAt: string;
    interview: {
        goal?: { text: string; targetTimeMs?: number };            // The Called Shot
        quotes: { id: string; text: string; context?: string }[];  // Runner's Words
        facts: {
            id: string;
            template: 'fact' | 'versus' | 'history';
            title?: string;
            body: string;
        }[];
    };
    clips: { id: string; videoUrl: string; title: string; caption?: string }[];
    roadmapNotes: { splitIndex: number; text: string }[];
    deckOrder?: {                  // frozen lists; absent → auto-compose + default interleave
        pre?: PrepSlideRef[];
        post?: PrepSlideRef[];
    };
}

type PrepSlideRef =
    | { kind: 'stat'; id: SlideId }    // existing evaluator slides
    | { kind: 'custom'; id: string };  // references a quote/clip/fact/goal by id
```

Custom content is stored once and *referenced* from the frozen order: the same clip can
appear in both pre and post decks, and removing a slide from the order does not delete
the content.

## Backend (`../therun`)

### Table `fast50_prep_sessions` (drizzle migration)

```
id          integer pk generatedAlwaysAsIdentity
username    varchar(255) notnull
game        varchar(255) notnull
category    varchar(255) notnull
label       varchar(255) notnull
data        json  $type<PrepSessionData>  notnull   // interview, clips, roadmapNotes, deckOrder
isDeleted   boolean default false notnull
createdAt   timestamp defaultNow notnull
updatedAt   timestamp defaultNow notnull
createdBy   varchar(255)
index (username, game, category); index (isDeleted)
```

Content lives in the single `json` column: nothing queries inside quotes/clips
relationally, and the shape will evolve during rehearsal — a blob keeps migrations out
of the iteration loop. Identity/lookup fields are real columns.

### API module `src/api/fast50/handler.ts`

Wired into `api-entry.ts` via `path.startsWith("/fast50")`.

| Route | Method | Behavior |
|---|---|---|
| `/fast50/prep?username=&game=&category=` | GET | Session summaries (id, label, updatedAt), newest first |
| `/fast50/prep` | POST | Create session |
| `/fast50/prep/{id}` | GET | Full session |
| `/fast50/prep/{id}` | PUT | Update (label + data) |
| `/fast50/prep/{id}` | DELETE | Soft delete |
| `/fast50/prep/upload-url` | POST | Presigned S3 PUT for a clip |

- All routes authenticated (`Bearer {sessionId}`) and gated via `confirmPermission`
  against the event subject (event-admin / admin). **Reads included** — prep content is
  not public.
- `upload-url` mirrors `src/api/events/upload-event-image.ts`: body
  `{ contentType, contentLength }`, `video/mp4` only, 200MB cap, key
  `fast50/clips/{uuid}.mp4` in the media bucket, 300s expiry, returns
  `{ uploadUrl, videoUrl }` with `videoUrl` on the media CloudFront domain.
- `services/fast50-prep-db.ts` holds the drizzle CRUD, following `events-db.ts`
  conventions.

## Frontend (`therun-fr`)

### API client

`src/lib/fast50/prep.ts` — `apiFetch()` CRUD + upload-URL helper. Prep reads are
uncached or `cacheLife('seconds')`: sessions get edited up to showtime, and a stale
cached session on the deck route is a show-killer.

The dossier stays pure stats. Prep is a separate object passed alongside it; slides
still never fetch.

### Prep studio

Routes (chromeless group, denser tool styling — this is not a broadcast surface):

- `/fast50/prep` — runner search + run pick (reuses `lookupRunner`), session list per
  run, create/duplicate/delete.
- `/fast50/prep/[username]/[game]/[category]?session={id}` — the studio, three panes:

1. **Interview panel** — guided prompts mapping 1:1 to slides: goal (text + optional
   target time), quotes (multiple, with context), fact cards (template picker), clip
   upload (file → presigned PUT with progress, then title/caption), roadmap notes
   (split dropdown from dossier split names + note text).
2. **Deck builder** — pre/post tabs; vertical strip of slide cards (stat slides seeded
   from `composeDeck` with their scores, custom slides from the interview panel);
   include/exclude toggles, reorder, "reset to auto". The strip is the frozen
   `deckOrder` being edited.
3. **Live preview** — selected slide rendered by the real slide component at
   1920×1080, CSS-scaled to fit, with stage-step buttons to rehearse the reveal.

Explicit **Save** (+ Ctrl+S, unsaved-changes guard), not autosave — a half-typed quote
must not silently persist before a show. Header: runner/run, editable session label,
last-saved time.

### Picker integration

`/fast50/screen` rows show a prep badge when sessions exist; a session selector
(default: latest) makes deck links carry `?session={id}`; "prep this runner" links to
the studio. Deck readiness reporting includes prep-related warnings (see Failure
handling).

### New slides

All five reuse the existing stage-reveal primitives — identical clicker vocabulary.

| Slide | Kind | Stages / behavior |
|---|---|---|
| **Runner's Words** | `quote` | context line → quote in huge type, drawing in → attribution with avatar. One quote per slide. |
| **Watch For This** | `clip` | title + caption card → advance starts playback → holds on final frame. Full-bleed native `<video>`; keypress-triggered `play()` avoids autoplay restrictions; audio plays (venue decides audibility). All clip videos mount `preload="auto"` at deck load — zero network at showtime holds. |
| **The Called Shot** | `called-shot` (pre) | "His target tonight" → the goal, huge → auto-generated dossier context ("he's beaten 1:40 in 3 of his last 50 finishes"). |
| **The Verdict** | `called-shot-result` (post) | goal restated → final time drops in → verdict treatment: HIT / MISSED / DEMOLISHED (margin threshold lives in the existing `THRESHOLDS` config for rehearsal tuning). If the run died: "He called sub-1:40. Water Temple had other plans." The callback lands in every outcome. |
| **Fact Card** | `fact` | template-specific: Fact (headline + body), Versus (two-value split layout), History (dated, archival treatment). |

**Roadmap annotations** are not a new slide: `RoadmapSlide` gains an optional prep prop
and renders notes as landmark callouts on the timeline, revealed as an extra stage.

### Deck integration

`composePreppedDeck(dossier, prep)` wraps `composeDeck`:

- **Frozen order present** for the deck type → map each ref. Stat slides re-run
  `evaluate()` (live numbers, frozen structure); `null` → slide dropped, warning
  surfaced in picker readiness. Custom slides always render — content is embedded in
  the prep object.
- **No frozen order** (content prepped but never curated) → auto-compose, then default
  interleave: quote after intro, clip after roadmap, Called Shot closes the pre deck;
  Verdict immediately after Result in post.
- `ComposedSlide` becomes a stat/custom union; the slide registry gains the five custom
  components. No prep session → byte-identical to today's auto-compose.

The deck page resolves `?session={id}` (or latest for the run) server-side alongside
the dossier.

## Failure handling

- Prep fetch fails → deck auto-composes; picker warns "prep unavailable".
- Frozen ref to deleted content → skipped, warning in picker readiness.
- Stat slide in frozen order evaluates `null` at showtime → dropped, warning.
- Video error/404 at showtime → clip slide degrades to its title/caption card; the
  presenter can still tell the story.
- Prep JSON parsed leniently with defaults — schema evolution never bricks a saved
  session.

## Testing

- `composePreppedDeck` unit suite: frozen mapping, null-evaluate drops, deleted-ref
  skips, default interleave, cross-deck clip reuse, no-prep passthrough.
- Verdict-line logic (hit / missed / demolished / run died) unit-tested.
- Fixture prep session: `/fast50/screen/demo?fixture=grinder&prep=full` demos every
  custom slide with zero backend.
- Backend handler tests following existing jest patterns (validation, RBAC, CRUD).

## Out of scope

- Editing prep from inside the deck (edit-in-deck overlay).
- YouTube/Twitch URL embeds as an alternative clip source.
- Non-mp4 video transcoding.
- Event-schedule integration (`event_participants`) — unchanged from the base design's
  follow-up list.

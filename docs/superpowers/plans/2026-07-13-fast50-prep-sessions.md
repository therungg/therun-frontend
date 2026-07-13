# fast50 Prep Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-run customizable prep sessions for the fast50 presenter deck — runner interviews (goal, quotes, facts), uploaded clip videos, roadmap annotations, and frozen deck curation, stored on the backend and edited in a new prep studio.

**Architecture:** A new `fast50_prep_sessions` table + `/fast50/prep` API module in the backend repo (`/home/joey/therun/therun`); in the frontend, prep data flows as a `PrepSessionData` object alongside the existing `RunnerDossier` — `composePreppedDeck(dossier, prep)` wraps `composeDeck` (frozen order or default interleave), five new custom slide components render prep content, and a three-pane prep studio at `/fast50/prep/...` edits and saves sessions.

**Tech Stack:** Backend: AWS Lambda handlers, drizzle-orm/Postgres, CDK (api-stack), jest. Frontend: Next.js 16 App Router, React 19, SCSS modules, vitest.

**Spec:** `docs/superpowers/specs/2026-07-13-fast50-prep-sessions-design.md`

## Global Constraints

- Frontend repo: `/home/joey/therun/therun-fr`, work on the existing branch `fast50-stats-screen`. Backend repo: `/home/joey/therun/therun`, create branch `fast50-prep-sessions` from its current default branch. Branches only — never `git worktree add`.
- Frontend style: Biome — 4-space indent, single quotes, trailing commas, semicolons. Unused vars prefixed `_`. Backend style: double quotes, 4-space indent (match `src/api/events/`).
- Frontend verification: `npm run typecheck`, `npm run lint`, `npm run test` (vitest). Backend verification: `npx tsc --noEmit`, `npx jest test/automated/unit/<file>`.
- Commit messages: conventional style (`feat(fast50): ...`), **no co-author lines**.
- Do NOT run `cdk deploy` or `npm run migrate` in the backend — generating the migration file and CDK code is in scope; applying/deploying is Joey's step (flag it at handoff).
- Backend `respond()` (from `src/api/api-entry.ts`) wraps results as `{ result }` and turns `null`/`undefined` into a 404 — the frontend `apiFetch` unwraps `json.result`.
- All prep API routes (reads included) require auth: `getAuthenticatedUserFromEvent` + `confirmPermission(user, "edit", "event")` (event-admin/admin).
- Slides never fetch; prep content reaches them via props.

---

### Task 1: Backend — schema, types, migration

**Files:**
- Modify: `/home/joey/therun/therun/src/db/schema.ts` (append after `eventParticipants` table, ~line 445)
- Create: `/home/joey/therun/therun/src/types/fast50.ts`
- Create (generated): `/home/joey/therun/therun/drizzle/00NN_*.sql` via drizzle-kit

**Interfaces:**
- Produces: `fast50PrepSessions` drizzle table; types `PrepSessionData`, `PrepGoal`, `PrepQuote`, `PrepFact`, `PrepClip`, `PrepRoadmapNote`, `PrepSlideRef` from `src/types/fast50.ts`. Row type is `typeof fast50PrepSessions.$inferSelect`.

- [ ] **Step 1: Create the backend branch**

```bash
cd /home/joey/therun/therun && git checkout -b fast50-prep-sessions
```

- [ ] **Step 2: Create `src/types/fast50.ts`**

```typescript
export interface PrepGoal {
    text: string;
    targetTimeMs?: number;
}

export interface PrepQuote {
    id: string;
    text: string;
    context?: string;
}

export interface PrepFact {
    id: string;
    template: "fact" | "versus" | "history";
    title?: string;
    body: string;
    secondary?: string; // right-hand value for the "versus" template
}

export interface PrepClip {
    id: string;
    videoUrl: string;
    title: string;
    caption?: string;
}

export interface PrepRoadmapNote {
    splitIndex: number;
    text: string;
}

export type PrepSlideRef =
    | { kind: "stat"; id: string }
    | { kind: "custom"; id: string };

export interface PrepSessionData {
    interview: {
        goal?: PrepGoal;
        quotes: PrepQuote[];
        facts: PrepFact[];
    };
    clips: PrepClip[];
    roadmapNotes: PrepRoadmapNote[];
    deckOrder?: {
        pre?: PrepSlideRef[];
        post?: PrepSlideRef[];
    };
}
```

- [ ] **Step 3: Add the table to `src/db/schema.ts`**

Add the import at the top of the file (extend the existing drizzle import if the symbols are already there) and append after the `eventParticipants` table definition:

```typescript
import { PrepSessionData } from "../types/fast50";

export const fast50PrepSessions = pgTable(
    "fast50_prep_sessions",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        username: varchar({ length: 255 }).notNull(),
        game: varchar({ length: 255 }).notNull(),
        category: varchar({ length: 255 }).notNull(),
        label: varchar({ length: 255 }).notNull(),
        data: json().$type<PrepSessionData>().notNull(),
        isDeleted: boolean().default(false).notNull(),
        createdAt: timestamp().defaultNow().notNull(),
        updatedAt: timestamp().defaultNow().notNull(),
        createdBy: varchar({ length: 255 }),
    },
    (table) => [
        index("fast50_prep_run_idx").on(
            table.username,
            table.game,
            table.category,
        ),
        index("fast50_prep_is_deleted_idx").on(table.isDeleted),
    ],
);
```

- [ ] **Step 4: Generate the migration**

Run: `cd /home/joey/therun/therun && npm run generate-migration`
Expected: a new file `drizzle/00NN_<name>.sql` containing `CREATE TABLE "fast50_prep_sessions"` with both indexes. Do NOT run `npm run migrate`.

- [ ] **Step 5: Typecheck**

Run: `cd /home/joey/therun/therun && npx tsc --noEmit`
Expected: exit 0 (pre-existing errors, if any, must not involve the new files).

- [ ] **Step 6: Commit**

```bash
cd /home/joey/therun/therun && git add src/db/schema.ts src/types/fast50.ts drizzle/ && git commit -m "feat(fast50): prep sessions table and types"
```

---

### Task 2: Backend — prep DB service

**Files:**
- Create: `/home/joey/therun/therun/src/services/fast50-prep-db.ts`

**Interfaces:**
- Consumes: `fast50PrepSessions` from `../db/schema`, `PrepSessionData` from `../types/fast50`, `getDb` from `../db`.
- Produces:
  - `type PrepSessionRow = typeof fast50PrepSessions.$inferSelect`
  - `listPrepSessions(username: string, game: string, category: string): Promise<{id: number; label: string; updatedAt: Date}[]>`
  - `getPrepSession(id: number): Promise<PrepSessionRow | null>`
  - `createPrepSession(input: {username: string; game: string; category: string; label: string; data: PrepSessionData; createdBy: string}): Promise<PrepSessionRow>`
  - `updatePrepSession(id: number, input: {label?: string; data?: PrepSessionData}): Promise<PrepSessionRow | null>`
  - `softDeletePrepSession(id: number): Promise<boolean>`

- [ ] **Step 1: Write `src/services/fast50-prep-db.ts`**

```typescript
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { fast50PrepSessions } from "../db/schema";
import { PrepSessionData } from "../types/fast50";

export type PrepSessionRow = typeof fast50PrepSessions.$inferSelect;

const notDeleted = (id: number) =>
    and(eq(fast50PrepSessions.id, id), eq(fast50PrepSessions.isDeleted, false));

export const listPrepSessions = async (
    username: string,
    game: string,
    category: string,
) => {
    const db = await getDb();
    return db
        .select({
            id: fast50PrepSessions.id,
            label: fast50PrepSessions.label,
            updatedAt: fast50PrepSessions.updatedAt,
        })
        .from(fast50PrepSessions)
        .where(
            and(
                eq(fast50PrepSessions.username, username),
                eq(fast50PrepSessions.game, game),
                eq(fast50PrepSessions.category, category),
                eq(fast50PrepSessions.isDeleted, false),
            ),
        )
        .orderBy(desc(fast50PrepSessions.updatedAt));
};

export const getPrepSession = async (
    id: number,
): Promise<PrepSessionRow | null> => {
    const db = await getDb();
    const rows = await db
        .select()
        .from(fast50PrepSessions)
        .where(notDeleted(id));
    return rows[0] ?? null;
};

export const createPrepSession = async (input: {
    username: string;
    game: string;
    category: string;
    label: string;
    data: PrepSessionData;
    createdBy: string;
}): Promise<PrepSessionRow> => {
    const db = await getDb();
    const rows = await db.insert(fast50PrepSessions).values(input).returning();
    return rows[0];
};

export const updatePrepSession = async (
    id: number,
    input: { label?: string; data?: PrepSessionData },
): Promise<PrepSessionRow | null> => {
    const db = await getDb();
    const rows = await db
        .update(fast50PrepSessions)
        .set({ ...input, updatedAt: new Date() })
        .where(notDeleted(id))
        .returning();
    return rows[0] ?? null;
};

export const softDeletePrepSession = async (id: number): Promise<boolean> => {
    const db = await getDb();
    const rows = await db
        .update(fast50PrepSessions)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(notDeleted(id))
        .returning({ id: fast50PrepSessions.id });
    return rows.length > 0;
};
```

- [ ] **Step 2: Typecheck**

Run: `cd /home/joey/therun/therun && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /home/joey/therun/therun && git add src/services/fast50-prep-db.ts && git commit -m "feat(fast50): prep session db service"
```

---

### Task 3: Backend — validation (TDD), handler, wiring, CDK routes

**Files:**
- Create: `/home/joey/therun/therun/src/api/fast50/validate-prep.ts`
- Create: `/home/joey/therun/therun/src/api/fast50/handler.ts`
- Modify: `/home/joey/therun/therun/src/api/api-entry.ts` (add `/fast50` dispatch before the final fallthrough)
- Modify: `/home/joey/therun/therun/aws/lib/api-stack.ts` (add resources after the events block, ~line 282)
- Test: `/home/joey/therun/therun/test/automated/unit/fast50-validate-prep.test.ts`

**Interfaces:**
- Consumes: Task 2's db service; `respond` from `../api-entry`; `forbidden/methodNotAllowed/notFound/serverError/yourFault` from `../responses`; `getAuthenticatedUserFromEvent` from `../../session/getAuthenticatedUserFromEvent`; `confirmPermission` from `../../rbac/confirm-permission`; `s3Client` from `../../services/s3-client`.
- Produces:
  - `sanitizePrepData(raw: unknown): PrepSessionData` — lenient, never throws
  - `validateCreatePrep(body: unknown): { ok: true; value: CreatePrepInput } | { ok: false; error: string }`
  - `validateUpdatePrep(body: unknown): { ok: true; value: { label?: string; data?: PrepSessionData } } | { ok: false; error: string }`
  - `handleFast50(event: APIGatewayProxyEvent)` — HTTP routes per the spec table
  - Upload response body: `{ uploadUrl: string; videoUrl: string }` (wrapped in `{ result }` by `respond`)

- [ ] **Step 1: Write the failing validation tests**

Create `test/automated/unit/fast50-validate-prep.test.ts`:

```typescript
import {
    sanitizePrepData,
    validateCreatePrep,
    validateUpdatePrep,
} from "../../../src/api/fast50/validate-prep";

describe("sanitizePrepData", () => {
    it("returns empty structure for garbage", () => {
        expect(sanitizePrepData(null)).toEqual({
            interview: { quotes: [], facts: [] },
            clips: [],
            roadmapNotes: [],
        });
        expect(sanitizePrepData("nope")).toEqual({
            interview: { quotes: [], facts: [] },
            clips: [],
            roadmapNotes: [],
        });
    });

    it("keeps valid entries and drops malformed ones", () => {
        const result = sanitizePrepData({
            interview: {
                goal: { text: "sub 1:40", targetTimeMs: 6000000 },
                quotes: [
                    { id: "q1", text: "hello" },
                    { id: 42, text: "bad id" },
                    { text: "no id" },
                ],
                facts: [
                    { id: "f1", template: "versus", body: "a", secondary: "b" },
                    { id: "f2", template: "nonsense", body: "x" },
                ],
            },
            clips: [
                { id: "c1", videoUrl: "https://cdn/x.mp4", title: "trick" },
                { id: "c2", title: "missing url" },
            ],
            roadmapNotes: [
                { splitIndex: 2, text: "note" },
                { splitIndex: "two", text: "bad" },
            ],
            deckOrder: {
                pre: [
                    { kind: "stat", id: "intro" },
                    { kind: "custom", id: "q1" },
                    { kind: "wat", id: "x" },
                ],
            },
        });
        expect(result.interview.goal).toEqual({
            text: "sub 1:40",
            targetTimeMs: 6000000,
        });
        expect(result.interview.quotes).toEqual([{ id: "q1", text: "hello" }]);
        expect(result.interview.facts).toEqual([
            { id: "f1", template: "versus", body: "a", secondary: "b" },
        ]);
        expect(result.clips).toEqual([
            { id: "c1", videoUrl: "https://cdn/x.mp4", title: "trick" },
        ]);
        expect(result.roadmapNotes).toEqual([{ splitIndex: 2, text: "note" }]);
        expect(result.deckOrder).toEqual({
            pre: [
                { kind: "stat", id: "intro" },
                { kind: "custom", id: "q1" },
            ],
        });
    });
});

describe("validateCreatePrep", () => {
    it("rejects missing fields", () => {
        expect(validateCreatePrep({}).ok).toBe(false);
        expect(
            validateCreatePrep({ username: "a", game: "b", category: "c" }).ok,
        ).toBe(false);
    });

    it("accepts a minimal valid body and sanitizes data", () => {
        const result = validateCreatePrep({
            username: "joeys",
            game: "Hollow Knight",
            category: "Any%",
            label: "fast50 #3",
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.data).toEqual({
                interview: { quotes: [], facts: [] },
                clips: [],
                roadmapNotes: [],
            });
        }
    });
});

describe("validateUpdatePrep", () => {
    it("rejects a body with neither label nor data", () => {
        expect(validateUpdatePrep({}).ok).toBe(false);
    });
    it("accepts label-only and data-only updates", () => {
        expect(validateUpdatePrep({ label: "renamed" }).ok).toBe(true);
        expect(validateUpdatePrep({ data: {} }).ok).toBe(true);
    });
});
```

- [ ] **Step 2: Run the test — expect failure**

Run: `cd /home/joey/therun/therun && npx jest test/automated/unit/fast50-validate-prep.test.ts`
Expected: FAIL — cannot find module `../../../src/api/fast50/validate-prep`.

- [ ] **Step 3: Write `src/api/fast50/validate-prep.ts`**

```typescript
import {
    PrepClip,
    PrepFact,
    PrepGoal,
    PrepQuote,
    PrepRoadmapNote,
    PrepSessionData,
    PrepSlideRef,
} from "../../types/fast50";

const MAX_STR = 2000;

const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() && v.length <= MAX_STR ? v : undefined;

const num = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : {};

const parseGoal = (raw: unknown): PrepGoal | undefined => {
    const g = obj(raw);
    const text = str(g.text);
    if (!text) return undefined;
    const targetTimeMs = num(g.targetTimeMs);
    return targetTimeMs ? { text, targetTimeMs } : { text };
};

const parseQuote = (raw: unknown): PrepQuote | undefined => {
    const q = obj(raw);
    const id = str(q.id);
    const text = str(q.text);
    if (!id || !text) return undefined;
    const context = str(q.context);
    return context ? { id, text, context } : { id, text };
};

const FACT_TEMPLATES = ["fact", "versus", "history"] as const;

const parseFact = (raw: unknown): PrepFact | undefined => {
    const f = obj(raw);
    const id = str(f.id);
    const body = str(f.body);
    const template = FACT_TEMPLATES.find((t) => t === f.template);
    if (!id || !body || !template) return undefined;
    const fact: PrepFact = { id, template, body };
    const title = str(f.title);
    if (title) fact.title = title;
    const secondary = str(f.secondary);
    if (secondary) fact.secondary = secondary;
    return fact;
};

const parseClip = (raw: unknown): PrepClip | undefined => {
    const c = obj(raw);
    const id = str(c.id);
    const videoUrl = str(c.videoUrl);
    const title = str(c.title);
    if (!id || !videoUrl || !title) return undefined;
    const caption = str(c.caption);
    return caption ? { id, videoUrl, title, caption } : { id, videoUrl, title };
};

const parseNote = (raw: unknown): PrepRoadmapNote | undefined => {
    const n = obj(raw);
    const text = str(n.text);
    if (
        typeof n.splitIndex !== "number" ||
        !Number.isInteger(n.splitIndex) ||
        n.splitIndex < 0 ||
        !text
    )
        return undefined;
    return { splitIndex: n.splitIndex, text };
};

const parseRef = (raw: unknown): PrepSlideRef | undefined => {
    const r = obj(raw);
    const id = str(r.id);
    if (!id) return undefined;
    if (r.kind === "stat") return { kind: "stat", id };
    if (r.kind === "custom") return { kind: "custom", id };
    return undefined;
};

const parseRefs = (raw: unknown): PrepSlideRef[] | undefined => {
    if (!Array.isArray(raw)) return undefined;
    const refs = raw
        .map(parseRef)
        .filter((r): r is PrepSlideRef => r !== undefined);
    return refs;
};

export const sanitizePrepData = (raw: unknown): PrepSessionData => {
    const root = obj(raw);
    const interview = obj(root.interview);
    const data: PrepSessionData = {
        interview: {
            quotes: arr(interview.quotes)
                .map(parseQuote)
                .filter((q): q is PrepQuote => q !== undefined),
            facts: arr(interview.facts)
                .map(parseFact)
                .filter((f): f is PrepFact => f !== undefined),
        },
        clips: arr(root.clips)
            .map(parseClip)
            .filter((c): c is PrepClip => c !== undefined),
        roadmapNotes: arr(root.roadmapNotes)
            .map(parseNote)
            .filter((n): n is PrepRoadmapNote => n !== undefined),
    };
    const goal = parseGoal(interview.goal);
    if (goal) data.interview.goal = goal;
    const order = obj(root.deckOrder);
    const pre = parseRefs(order.pre);
    const post = parseRefs(order.post);
    if (pre || post) {
        data.deckOrder = {};
        if (pre) data.deckOrder.pre = pre;
        if (post) data.deckOrder.post = post;
    }
    return data;
};

export interface CreatePrepInput {
    username: string;
    game: string;
    category: string;
    label: string;
    data: PrepSessionData;
}

type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

const shortStr = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() && v.length <= 255 ? v.trim() : undefined;

export const validateCreatePrep = (
    body: unknown,
): Validation<CreatePrepInput> => {
    const b = obj(body);
    const username = shortStr(b.username);
    const game = shortStr(b.game);
    const category = shortStr(b.category);
    const label = shortStr(b.label);
    if (!username || !game || !category || !label) {
        return {
            ok: false,
            error: "username, game, category and label are required (max 255 chars)",
        };
    }
    return {
        ok: true,
        value: { username, game, category, label, data: sanitizePrepData(b.data) },
    };
};

export const validateUpdatePrep = (
    body: unknown,
): Validation<{ label?: string; data?: PrepSessionData }> => {
    const b = obj(body);
    const label = shortStr(b.label);
    const hasData = b.data !== undefined;
    if (!label && !hasData) {
        return { ok: false, error: "provide label and/or data" };
    }
    const value: { label?: string; data?: PrepSessionData } = {};
    if (label) value.label = label;
    if (hasData) value.data = sanitizePrepData(b.data);
    return { ok: true, value };
};
```

- [ ] **Step 4: Run the test — expect pass**

Run: `cd /home/joey/therun/therun && npx jest test/automated/unit/fast50-validate-prep.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Write `src/api/fast50/handler.ts`**

```typescript
import { randomUUID } from "crypto";
import { APIGatewayProxyEvent } from "aws-lambda";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAuthenticatedUserFromEvent } from "../../session/getAuthenticatedUserFromEvent";
import { confirmPermission } from "../../rbac/confirm-permission";
import { s3Client } from "../../services/s3-client";
import {
    createPrepSession,
    getPrepSession,
    listPrepSessions,
    softDeletePrepSession,
    updatePrepSession,
} from "../../services/fast50-prep-db";
import { respond } from "../api-entry";
import {
    forbidden,
    methodNotAllowed,
    notFound,
    serverError,
    yourFault,
} from "../responses";
import { validateCreatePrep, validateUpdatePrep } from "./validate-prep";

const MAX_CLIP_BYTES = 200 * 1024 * 1024;

const parseBody = (event: APIGatewayProxyEvent): unknown => {
    try {
        return JSON.parse(event.body ?? "");
    } catch {
        return undefined;
    }
};

export const handleFast50 = async (event: APIGatewayProxyEvent) => {
    const user = await getAuthenticatedUserFromEvent(event);
    try {
        confirmPermission(user, "edit", "event");
    } catch {
        return forbidden("You do not have permission to manage fast50 prep");
    }

    try {
        const path = event.path;
        const method = event.httpMethod;

        if (path === "/fast50/prep/upload-url") {
            if (method !== "POST") return methodNotAllowed(["POST"]);
            return handleClipUploadUrl(event);
        }

        if (path === "/fast50/prep") {
            if (method === "GET") return handleList(event);
            if (method === "POST") return handleCreate(event, user.user);
            return methodNotAllowed(["GET", "POST"]);
        }

        const prepIdParam = event.pathParameters?.prepId;
        if (prepIdParam) {
            const prepId = Number(prepIdParam);
            if (!Number.isInteger(prepId) || prepId <= 0) {
                return yourFault("prepId must be a positive integer");
            }
            if (method === "GET") return respond(await getPrepSession(prepId));
            if (method === "PUT") return handleUpdate(event, prepId);
            if (method === "DELETE") {
                const deleted = await softDeletePrepSession(prepId);
                return deleted
                    ? respond({ deleted: true })
                    : notFound(JSON.stringify({ error: "Prep session not found" }));
            }
            return methodNotAllowed(["GET", "PUT", "DELETE"]);
        }

        return notFound(JSON.stringify({ error: "Not found" }));
    } catch (e) {
        console.error("fast50 handler error:", e);
        return serverError("Internal error");
    }
};

const handleList = async (event: APIGatewayProxyEvent) => {
    const q = event.queryStringParameters ?? {};
    const { username, game, category } = q;
    if (!username || !game || !category) {
        return yourFault("username, game and category query params are required");
    }
    return respond(await listPrepSessions(username, game, category));
};

const handleCreate = async (
    event: APIGatewayProxyEvent,
    createdBy: string,
) => {
    const validation = validateCreatePrep(parseBody(event));
    if (!validation.ok) return yourFault(validation.error);
    return respond(await createPrepSession({ ...validation.value, createdBy }));
};

const handleUpdate = async (event: APIGatewayProxyEvent, prepId: number) => {
    const validation = validateUpdatePrep(parseBody(event));
    if (!validation.ok) return yourFault(validation.error);
    const updated = await updatePrepSession(prepId, validation.value);
    return updated
        ? respond(updated)
        : notFound(JSON.stringify({ error: "Prep session not found" }));
};

const handleClipUploadUrl = async (event: APIGatewayProxyEvent) => {
    const body = parseBody(event) as
        | { contentType?: unknown; contentLength?: unknown }
        | undefined;
    if (!body) return yourFault("Invalid JSON body");
    const { contentType, contentLength } = body;
    if (contentType !== "video/mp4") {
        return yourFault("contentType must be video/mp4");
    }
    if (
        typeof contentLength !== "number" ||
        !Number.isInteger(contentLength) ||
        contentLength <= 0 ||
        contentLength > MAX_CLIP_BYTES
    ) {
        return yourFault(
            `contentLength is required and must be a positive integer up to ${MAX_CLIP_BYTES} bytes`,
        );
    }

    const bucket = process.env.mediaBucketName;
    const distributionDomain = process.env.mediaDistributionDomain;
    const key = `fast50/clips/${randomUUID()}.mp4`;

    try {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
            ContentLength: contentLength,
        });
        const uploadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 300,
            unhoistableHeaders: new Set(["content-length"]),
        });
        const videoUrl = `https://${distributionDomain}/${key}`;
        return respond({ uploadUrl, videoUrl });
    } catch (e) {
        console.error("Failed to generate clip upload URL:", e);
        return serverError("Failed to generate upload URL");
    }
};
```

- [ ] **Step 6: Wire into `src/api/api-entry.ts`**

Add the import next to the other handler imports:

```typescript
import { handleFast50 } from "./fast50/handler";
```

Add the dispatch alongside the other `path.startsWith` blocks (e.g. right after the `/follows` block):

```typescript
    if (path.startsWith("/fast50")) {
        return handleFast50(event);
    }
```

- [ ] **Step 7: Register the routes in `aws/lib/api-stack.ts`**

After the events resources block (search for `eventParticipantsMeApi`), add:

```typescript
        const fast50Api = api.root.addResource("fast50");
        const fast50PrepApi = fast50Api.addResource("prep");
        fast50PrepApi.addMethod("GET", lambdaIntegration);
        fast50PrepApi.addMethod("POST", lambdaIntegration);

        const fast50PrepUploadUrlApi = fast50PrepApi.addResource("upload-url");
        fast50PrepUploadUrlApi.addMethod("POST", lambdaIntegration);

        const fast50PrepByIdApi = fast50PrepApi.addResource("{prepId}");
        fast50PrepByIdApi.addMethod("GET", lambdaIntegration);
        fast50PrepByIdApi.addMethod("PUT", lambdaIntegration);
        fast50PrepByIdApi.addMethod("DELETE", lambdaIntegration);
```

Use the same `lambdaIntegration` variable name that the surrounding events block uses (verify in-file; if the API lambda's S3 media-bucket write grant is scoped to a key prefix, extend it to cover `fast50/clips/*` — check how the events image upload grant is expressed and mirror it).

- [ ] **Step 8: Typecheck + run the unit test again**

Run: `cd /home/joey/therun/therun && npx tsc --noEmit && npx jest test/automated/unit/fast50-validate-prep.test.ts`
Expected: exit 0, tests PASS.

- [ ] **Step 9: Commit**

```bash
cd /home/joey/therun/therun && git add src/api/fast50 src/api/api-entry.ts aws/lib/api-stack.ts test/automated/unit/fast50-validate-prep.test.ts && git commit -m "feat(fast50): prep session API with clip upload presigning"
```

Do NOT deploy. Note for handoff: Joey must run the migration and `cdk deploy` before the frontend can talk to these routes.

---

### Task 4: Frontend — prep types, lenient parser (TDD), fixture prep

**Files:**
- Create: `src/lib/fast50/prep.types.ts`
- Modify: `src/lib/fast50/fixtures.ts` (append `fixturePrep` export)
- Test: `src/lib/fast50/__tests__/prep-types.test.ts`

**Interfaces:**
- Consumes: `DeckKind` from `./dossier.types`.
- Produces (all from `~src/lib/fast50/prep.types`):
  - Types: `PrepGoal`, `PrepQuote`, `PrepFact`, `PrepClip`, `PrepRoadmapNote`, `PrepSlideRef`, `PrepSessionData`, `PrepSessionSummary { id: number; label: string; updatedAt: string }`, `PrepSession extends PrepSessionSummary { username; game; category; createdAt: string; data: PrepSessionData }`
  - `type CustomSlideKind = 'quote' | 'clip' | 'fact' | 'called-shot' | 'called-shot-result'`
  - `type CustomSlideContent = { kind: 'quote'; quote: PrepQuote } | { kind: 'fact'; fact: PrepFact } | { kind: 'clip'; clip: PrepClip } | { kind: 'called-shot'; goal: PrepGoal } | { kind: 'called-shot-result'; goal: PrepGoal }`
  - `interface CustomSlideItem { id: string; content: CustomSlideContent }`
  - `emptyPrepData(): PrepSessionData`
  - `parsePrepData(raw: unknown): PrepSessionData` — lenient, never throws
  - `customSlidesFromPrep(data: PrepSessionData, deck: DeckKind): CustomSlideItem[]` — goal maps to id `'goal'` (pre → `called-shot`) or `'goal-result'` (post → `called-shot-result`); quotes/facts/clips map under their own ids in both decks
  - `headlineForCustom(content: CustomSlideContent): string`
- Also produces: `fixturePrep: PrepSessionData` from `~src/lib/fast50/fixtures`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/fast50/__tests__/prep-types.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import {
    customSlidesFromPrep,
    emptyPrepData,
    parsePrepData,
} from '../prep.types';

describe('parsePrepData', () => {
    test('garbage yields empty structure', () => {
        expect(parsePrepData(null)).toEqual(emptyPrepData());
        expect(parsePrepData(42)).toEqual(emptyPrepData());
    });

    test('keeps valid entries, drops malformed ones', () => {
        const parsed = parsePrepData({
            interview: {
                goal: { text: 'sub 1:40', targetTimeMs: 6_000_000 },
                quotes: [{ id: 'q1', text: 'hi' }, { text: 'no id' }],
                facts: [{ id: 'f1', template: 'fact', body: 'b' }],
            },
            clips: [{ id: 'c1', videoUrl: 'u', title: 't' }, { id: 'c2' }],
            roadmapNotes: [{ splitIndex: 1, text: 'n' }, { splitIndex: 'x' }],
            deckOrder: { pre: [{ kind: 'stat', id: 'intro' }, { kind: '?' }] },
        });
        expect(parsed.interview.quotes).toHaveLength(1);
        expect(parsed.clips).toHaveLength(1);
        expect(parsed.roadmapNotes).toEqual([{ splitIndex: 1, text: 'n' }]);
        expect(parsed.deckOrder?.pre).toEqual([{ kind: 'stat', id: 'intro' }]);
    });
});

describe('customSlidesFromPrep', () => {
    const data = parsePrepData({
        interview: {
            goal: { text: 'sub 1:40', targetTimeMs: 6_000_000 },
            quotes: [{ id: 'q1', text: 'hi' }],
            facts: [{ id: 'f1', template: 'fact', body: 'b' }],
        },
        clips: [{ id: 'c1', videoUrl: 'u', title: 't' }],
        roadmapNotes: [],
    });

    test('pre deck: goal becomes called-shot with id goal', () => {
        const items = customSlidesFromPrep(data, 'pre');
        const ids = items.map((i) => i.id);
        expect(ids).toEqual(['goal', 'q1', 'f1', 'c1']);
        expect(items[0].content.kind).toBe('called-shot');
    });

    test('post deck: goal becomes called-shot-result with id goal-result', () => {
        const items = customSlidesFromPrep(data, 'post');
        expect(items[0]).toMatchObject({
            id: 'goal-result',
            content: { kind: 'called-shot-result' },
        });
    });

    test('no goal: no called-shot item', () => {
        const noGoal = { ...data, interview: { ...data.interview, goal: undefined } };
        const kinds = customSlidesFromPrep(noGoal, 'pre').map((i) => i.content.kind);
        expect(kinds).not.toContain('called-shot');
    });
});
```

- [ ] **Step 2: Run tests — expect failure**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/lib/fast50/__tests__/prep-types.test.ts`
Expected: FAIL — cannot resolve `../prep.types`.

- [ ] **Step 3: Write `src/lib/fast50/prep.types.ts`**

Same parsing logic as the backend's `sanitizePrepData` (Task 3 Step 3), ported to frontend style (single quotes, `parsePrepData` as the export name), plus the frontend-only pieces:

```typescript
import type { DeckKind } from './dossier.types';

export interface PrepGoal {
    text: string;
    targetTimeMs?: number;
}

export interface PrepQuote {
    id: string;
    text: string;
    context?: string;
}

export interface PrepFact {
    id: string;
    template: 'fact' | 'versus' | 'history';
    title?: string;
    body: string;
    secondary?: string;
}

export interface PrepClip {
    id: string;
    videoUrl: string;
    title: string;
    caption?: string;
}

export interface PrepRoadmapNote {
    splitIndex: number;
    text: string;
}

export type PrepSlideRef =
    | { kind: 'stat'; id: string }
    | { kind: 'custom'; id: string };

export interface PrepSessionData {
    interview: {
        goal?: PrepGoal;
        quotes: PrepQuote[];
        facts: PrepFact[];
    };
    clips: PrepClip[];
    roadmapNotes: PrepRoadmapNote[];
    deckOrder?: {
        pre?: PrepSlideRef[];
        post?: PrepSlideRef[];
    };
}

export interface PrepSessionSummary {
    id: number;
    label: string;
    updatedAt: string;
}

export interface PrepSession extends PrepSessionSummary {
    username: string;
    game: string;
    category: string;
    createdAt: string;
    data: PrepSessionData;
}

export type CustomSlideKind =
    | 'quote'
    | 'clip'
    | 'fact'
    | 'called-shot'
    | 'called-shot-result';

export type CustomSlideContent =
    | { kind: 'quote'; quote: PrepQuote }
    | { kind: 'fact'; fact: PrepFact }
    | { kind: 'clip'; clip: PrepClip }
    | { kind: 'called-shot'; goal: PrepGoal }
    | { kind: 'called-shot-result'; goal: PrepGoal };

export interface CustomSlideItem {
    id: string;
    content: CustomSlideContent;
}

export const emptyPrepData = (): PrepSessionData => ({
    interview: { quotes: [], facts: [] },
    clips: [],
    roadmapNotes: [],
});

// --- lenient parsing (mirrors backend sanitizePrepData) ---

const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() ? v : undefined;

const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : {};

const parseGoal = (raw: unknown): PrepGoal | undefined => {
    const g = obj(raw);
    const text = str(g.text);
    if (!text) return undefined;
    const targetTimeMs = num(g.targetTimeMs);
    return targetTimeMs ? { text, targetTimeMs } : { text };
};

const parseQuote = (raw: unknown): PrepQuote | undefined => {
    const q = obj(raw);
    const id = str(q.id);
    const text = str(q.text);
    if (!id || !text) return undefined;
    const context = str(q.context);
    return context ? { id, text, context } : { id, text };
};

const FACT_TEMPLATES = ['fact', 'versus', 'history'] as const;

const parseFact = (raw: unknown): PrepFact | undefined => {
    const f = obj(raw);
    const id = str(f.id);
    const body = str(f.body);
    const template = FACT_TEMPLATES.find((t) => t === f.template);
    if (!id || !body || !template) return undefined;
    const fact: PrepFact = { id, template, body };
    const title = str(f.title);
    if (title) fact.title = title;
    const secondary = str(f.secondary);
    if (secondary) fact.secondary = secondary;
    return fact;
};

const parseClip = (raw: unknown): PrepClip | undefined => {
    const c = obj(raw);
    const id = str(c.id);
    const videoUrl = str(c.videoUrl);
    const title = str(c.title);
    if (!id || !videoUrl || !title) return undefined;
    const caption = str(c.caption);
    return caption ? { id, videoUrl, title, caption } : { id, videoUrl, title };
};

const parseNote = (raw: unknown): PrepRoadmapNote | undefined => {
    const n = obj(raw);
    const text = str(n.text);
    if (
        typeof n.splitIndex !== 'number' ||
        !Number.isInteger(n.splitIndex) ||
        n.splitIndex < 0 ||
        !text
    ) {
        return undefined;
    }
    return { splitIndex: n.splitIndex, text };
};

const parseRef = (raw: unknown): PrepSlideRef | undefined => {
    const r = obj(raw);
    const id = str(r.id);
    if (!id) return undefined;
    if (r.kind === 'stat') return { kind: 'stat', id };
    if (r.kind === 'custom') return { kind: 'custom', id };
    return undefined;
};

const parseRefs = (raw: unknown): PrepSlideRef[] | undefined =>
    Array.isArray(raw)
        ? raw.map(parseRef).filter((r): r is PrepSlideRef => r !== undefined)
        : undefined;

export const parsePrepData = (raw: unknown): PrepSessionData => {
    const root = obj(raw);
    const interview = obj(root.interview);
    const data: PrepSessionData = {
        interview: {
            quotes: arr(interview.quotes)
                .map(parseQuote)
                .filter((q): q is PrepQuote => q !== undefined),
            facts: arr(interview.facts)
                .map(parseFact)
                .filter((f): f is PrepFact => f !== undefined),
        },
        clips: arr(root.clips)
            .map(parseClip)
            .filter((c): c is PrepClip => c !== undefined),
        roadmapNotes: arr(root.roadmapNotes)
            .map(parseNote)
            .filter((n): n is PrepRoadmapNote => n !== undefined),
    };
    const goal = parseGoal(interview.goal);
    if (goal) data.interview.goal = goal;
    const order = obj(root.deckOrder);
    const pre = parseRefs(order.pre);
    const post = parseRefs(order.post);
    if (pre || post) {
        data.deckOrder = {};
        if (pre) data.deckOrder.pre = pre;
        if (post) data.deckOrder.post = post;
    }
    return data;
};

export const customSlidesFromPrep = (
    data: PrepSessionData,
    deck: DeckKind,
): CustomSlideItem[] => {
    const items: CustomSlideItem[] = [];
    const goal = data.interview.goal;
    if (goal) {
        items.push(
            deck === 'pre'
                ? { id: 'goal', content: { kind: 'called-shot', goal } }
                : {
                      id: 'goal-result',
                      content: { kind: 'called-shot-result', goal },
                  },
        );
    }
    for (const quote of data.interview.quotes) {
        items.push({ id: quote.id, content: { kind: 'quote', quote } });
    }
    for (const fact of data.interview.facts) {
        items.push({ id: fact.id, content: { kind: 'fact', fact } });
    }
    for (const clip of data.clips) {
        items.push({ id: clip.id, content: { kind: 'clip', clip } });
    }
    return items;
};

export const headlineForCustom = (content: CustomSlideContent): string => {
    switch (content.kind) {
        case 'quote':
            return content.quote.context ?? 'In their own words';
        case 'fact':
            return content.fact.title ?? content.fact.body;
        case 'clip':
            return content.clip.title;
        case 'called-shot':
            return 'The called shot';
        case 'called-shot-result':
            return 'The verdict';
    }
};
```

- [ ] **Step 4: Run tests — expect pass**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/lib/fast50/__tests__/prep-types.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `fixturePrep` to `src/lib/fast50/fixtures.ts`**

Append at the end of the file (import `PrepSessionData` from `./prep.types` at the top). Derive the goal target from the grinder post fixture so the demo Verdict slide reads HIT:

```typescript
export const fixturePrep: PrepSessionData = {
    interview: {
        goal: {
            text: 'beat his average — and survive Water Temple',
            // slightly above the fixture's final time so the demo verdict is HIT
            targetTimeMs: (fixturePost.grinder.postRun?.finalTimeMs ?? 0) + 45_000,
        },
        quotes: [
            {
                id: 'fixture-quote-1',
                text: "I've never made it past the danger split with a crowd watching.",
                context: 'On nerves',
            },
        ],
        facts: [
            {
                id: 'fixture-fact-1',
                template: 'versus',
                title: 'Attempts',
                body: '4,812 at home',
                secondary: '1 tonight',
            },
        ],
    },
    clips: [
        {
            id: 'fixture-clip-1',
            videoUrl: '/fast50-demo-clip.mp4',
            title: 'The wrong-warp',
            caption: 'Watch the camera flick — blink and you miss it',
        },
    ],
    roadmapNotes: [{ splitIndex: 2, text: 'He invented this skip' }],
};
```

(No `/fast50-demo-clip.mp4` is committed — the clip slide's graceful degradation path is exercised by the demo. Joey can drop a real mp4 into `public/` to see playback.)

- [ ] **Step 6: Typecheck, lint, full test run, commit**

Run: `cd /home/joey/therun/therun-fr && npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add src/lib/fast50/prep.types.ts src/lib/fast50/fixtures.ts src/lib/fast50/__tests__/prep-types.test.ts
git commit -m "feat(fast50): prep session types, lenient parser and fixture prep"
```

---

### Task 5: Frontend — composePreppedDeck (TDD)

**Files:**
- Modify: `src/components/fast50/deck/compose-deck.ts` (widen `ComposedSlide`)
- Create: `src/components/fast50/deck/compose-prepped-deck.ts`
- Test: `src/components/fast50/__tests__/compose-prepped-deck.test.ts`

**Interfaces:**
- Consumes: `composeDeck`, `evaluators`, `SlideId`, Task 4's prep types + `fixturePrep`.
- Produces:
  - `ComposedSlide` becomes `{ id: string; evaluation: SlideEvaluation; anchor: boolean; overflow: boolean; custom?: CustomSlideContent }` (id widened from `SlideId` to `string`; new optional `custom`)
  - `composePreppedDeck(d: RunnerDossier, prep: PrepSessionData | null | undefined): { slides: ComposedSlide[]; warnings: string[] }`

- [ ] **Step 1: Write the failing tests**

Create `src/components/fast50/__tests__/compose-prepped-deck.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import { FIXTURES, fixturePost, fixturePrep } from '~src/lib/fast50/fixtures';
import { composeDeck } from '../deck/compose-deck';
import { composePreppedDeck } from '../deck/compose-prepped-deck';

describe('composePreppedDeck', () => {
    test('no prep: identical to composeDeck', () => {
        const { slides, warnings } = composePreppedDeck(FIXTURES.grinder, null);
        expect(slides).toEqual(composeDeck(FIXTURES.grinder));
        expect(warnings).toEqual([]);
    });

    test('default interleave (pre): quote after intro, clip after roadmap, called-shot last before overflow', () => {
        const { slides } = composePreppedDeck(FIXTURES.grinder, fixturePrep);
        const ids = slides.map((s) => s.id);
        expect(ids[ids.indexOf('intro') + 1]).toBe('fixture-quote-1');
        expect(ids[ids.indexOf('roadmap') + 1]).toBe('fixture-clip-1');
        const nonOverflow = slides.filter((s) => !s.overflow);
        expect(nonOverflow[nonOverflow.length - 1].id).toBe('goal');
        expect(ids).toContain('fixture-fact-1');
    });

    test('default interleave (post): verdict directly after result', () => {
        const { slides } = composePreppedDeck(fixturePost.grinder, fixturePrep);
        const ids = slides.map((s) => s.id);
        expect(ids[ids.indexOf('result') + 1]).toBe('goal-result');
    });

    test('frozen order: exact structure, stat slides re-evaluated', () => {
        const prep = {
            ...fixturePrep,
            deckOrder: {
                pre: [
                    { kind: 'stat' as const, id: 'intro' },
                    { kind: 'custom' as const, id: 'fixture-quote-1' },
                    { kind: 'stat' as const, id: 'grind' },
                ],
            },
        };
        const { slides, warnings } = composePreppedDeck(FIXTURES.grinder, prep);
        expect(slides.map((s) => s.id)).toEqual([
            'intro',
            'fixture-quote-1',
            'grind',
        ]);
        expect(slides[2].evaluation.score).toBeGreaterThan(0);
        expect(warnings).toEqual([]);
    });

    test('frozen order: unavailable stat slide dropped with warning', () => {
        const prep = {
            ...fixturePrep,
            deckOrder: {
                // sparse fixture has no danger-zone story
                pre: [
                    { kind: 'stat' as const, id: 'intro' },
                    { kind: 'stat' as const, id: 'danger-zone' },
                ],
            },
        };
        const { slides, warnings } = composePreppedDeck(FIXTURES.sparse, prep);
        expect(slides.map((s) => s.id)).toEqual(['intro']);
        expect(warnings).toHaveLength(1);
    });

    test('frozen order: deleted custom content skipped with warning; unknown stat id tolerated', () => {
        const prep = {
            ...fixturePrep,
            deckOrder: {
                pre: [
                    { kind: 'custom' as const, id: 'deleted-quote' },
                    { kind: 'stat' as const, id: 'not-a-slide' },
                    { kind: 'stat' as const, id: 'intro' },
                ],
            },
        };
        const { slides, warnings } = composePreppedDeck(FIXTURES.grinder, prep);
        expect(slides.map((s) => s.id)).toEqual(['intro']);
        expect(warnings).toHaveLength(2);
    });
});
```

- [ ] **Step 2: Run tests — expect failure**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/components/fast50/__tests__/compose-prepped-deck.test.ts`
Expected: FAIL — cannot resolve `../deck/compose-prepped-deck`.

- [ ] **Step 3: Widen `ComposedSlide` in `compose-deck.ts`**

```typescript
import type { CustomSlideContent } from '~src/lib/fast50/prep.types';

export interface ComposedSlide {
    id: string;
    evaluation: SlideEvaluation;
    anchor: boolean;
    overflow: boolean;
    custom?: CustomSlideContent;
}
```

(The rest of `composeDeck` compiles unchanged — `SlideId` is assignable to `string`.)

- [ ] **Step 4: Write `compose-prepped-deck.ts`**

```typescript
import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import {
    type CustomSlideItem,
    customSlidesFromPrep,
    headlineForCustom,
    type PrepSessionData,
} from '~src/lib/fast50/prep.types';
import { type ComposedSlide, composeDeck } from './compose-deck';
import { evaluators, type SlideId } from './evaluators';

export interface PreppedDeck {
    slides: ComposedSlide[];
    warnings: string[];
}

const toSlide = (item: CustomSlideItem): ComposedSlide => ({
    id: item.id,
    evaluation: { score: 100, headline: headlineForCustom(item.content) },
    anchor: false,
    overflow: false,
    custom: item.content,
});

const insertAfter = (
    slides: ComposedSlide[],
    afterId: string,
    slide: ComposedSlide,
) => {
    const i = slides.findIndex((s) => s.id === afterId);
    slides.splice(i === -1 ? slides.length : i + 1, 0, slide);
};

export const composePreppedDeck = (
    d: RunnerDossier,
    prep: PrepSessionData | null | undefined,
): PreppedDeck => {
    if (!prep) return { slides: composeDeck(d), warnings: [] };

    const custom = customSlidesFromPrep(prep, d.deck);
    const frozen = d.deck === 'pre' ? prep.deckOrder?.pre : prep.deckOrder?.post;

    if (frozen && frozen.length > 0) {
        const warnings: string[] = [];
        const slides: ComposedSlide[] = [];
        for (const ref of frozen) {
            if (ref.kind === 'stat') {
                const evaluate = evaluators[ref.id as SlideId];
                const evaluation = evaluate ? evaluate(d) : null;
                if (!evaluation) {
                    warnings.push(`'${ref.id}' dropped — data unavailable`);
                    continue;
                }
                slides.push({
                    id: ref.id,
                    evaluation,
                    anchor: false,
                    overflow: false,
                });
            } else {
                const item = custom.find((c) => c.id === ref.id);
                if (!item) {
                    warnings.push(`custom slide '${ref.id}' skipped — content deleted`);
                    continue;
                }
                slides.push(toSlide(item));
            }
        }
        return { slides, warnings };
    }

    // No curated order: auto-compose, then interleave prepped content at
    // default positions. Overflow stays at the very end.
    const auto = composeDeck(d);
    const slides = auto.filter((s) => !s.overflow);
    const overflow = auto.filter((s) => s.overflow);
    const remaining = [...custom];
    const takeFirst = (kind: CustomSlideItem['content']['kind']) => {
        const i = remaining.findIndex((c) => c.content.kind === kind);
        return i === -1 ? undefined : remaining.splice(i, 1)[0];
    };

    if (d.deck === 'pre') {
        const quote = takeFirst('quote');
        if (quote) insertAfter(slides, 'intro', toSlide(quote));
        const clip = takeFirst('clip');
        if (clip) insertAfter(slides, 'roadmap', toSlide(clip));
        const shot = takeFirst('called-shot');
        for (const item of remaining) slides.push(toSlide(item));
        if (shot) slides.push(toSlide(shot));
    } else {
        const verdict = takeFirst('called-shot-result');
        if (verdict) insertAfter(slides, 'result', toSlide(verdict));
        for (const item of remaining) slides.push(toSlide(item));
    }
    return { slides: [...slides, ...overflow], warnings: [] };
};
```

- [ ] **Step 5: Run tests — expect pass, then full suite**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/components/fast50/__tests__/compose-prepped-deck.test.ts && npm run test && npm run typecheck`
Expected: PASS (existing compose-deck tests must still pass — the `ComposedSlide` widening is backward-compatible).

- [ ] **Step 6: Commit**

```bash
git add src/components/fast50/deck/compose-deck.ts src/components/fast50/deck/compose-prepped-deck.ts src/components/fast50/__tests__/compose-prepped-deck.test.ts
git commit -m "feat(fast50): composePreppedDeck — frozen order and default interleave"
```

---

### Task 6: Frontend — Called Shot verdict logic (TDD)

**Files:**
- Create: `src/lib/fast50/verdict.ts`
- Modify: `src/components/fast50/deck/evaluators.ts` (add `verdictDemolishMarginMs` to `THRESHOLDS`)
- Test: `src/lib/fast50/__tests__/verdict.test.ts`

**Interfaces:**
- Consumes: `PostRun` from `./dossier.types`, `PrepGoal` from `./prep.types`, `THRESHOLDS` from `~src/components/fast50/deck/evaluators`.
- Produces:
  - `THRESHOLDS.verdictDemolishMarginMs: 60_000`
  - `type VerdictKind = 'demolished' | 'hit' | 'missed' | 'died' | 'no-target'`
  - `calledShotVerdict(goal: PrepGoal, postRun: PostRun | null): { kind: VerdictKind; deltaMs: number | null }`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/fast50/__tests__/verdict.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import { fixturePost } from '~src/lib/fast50/fixtures';
import { calledShotVerdict } from '../verdict';

const postRunAt = (finalTimeMs: number) => ({
    ...fixturePost.grinder.postRun!,
    finalTimeMs,
});

const goal = { text: 'sub 100', targetTimeMs: 6_000_000 };

describe('calledShotVerdict', () => {
    test('no post run: died', () => {
        expect(calledShotVerdict(goal, null)).toEqual({
            kind: 'died',
            deltaMs: null,
        });
    });

    test('goal without target time: no-target', () => {
        expect(
            calledShotVerdict({ text: 'have fun' }, postRunAt(5_000_000)).kind,
        ).toBe('no-target');
    });

    test('exactly on target: hit', () => {
        expect(calledShotVerdict(goal, postRunAt(6_000_000))).toEqual({
            kind: 'hit',
            deltaMs: 0,
        });
    });

    test('beat target by the demolish margin: demolished', () => {
        expect(calledShotVerdict(goal, postRunAt(6_000_000 - 60_000)).kind).toBe(
            'demolished',
        );
        expect(calledShotVerdict(goal, postRunAt(6_000_000 - 59_999)).kind).toBe(
            'hit',
        );
    });

    test('over target: missed with positive delta', () => {
        expect(calledShotVerdict(goal, postRunAt(6_030_000))).toEqual({
            kind: 'missed',
            deltaMs: 30_000,
        });
    });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run src/lib/fast50/__tests__/verdict.test.ts`
Expected: FAIL — cannot resolve `../verdict`.

- [ ] **Step 3: Add the threshold and write `src/lib/fast50/verdict.ts`**

In `evaluators.ts`, add to the `THRESHOLDS` object:

```typescript
    verdictDemolishMarginMs: 60_000, // beat the called shot by this → DEMOLISHED
```

Create `src/lib/fast50/verdict.ts`:

```typescript
import { THRESHOLDS } from '~src/components/fast50/deck/evaluators';
import type { PostRun } from './dossier.types';
import type { PrepGoal } from './prep.types';

export type VerdictKind =
    | 'demolished'
    | 'hit'
    | 'missed'
    | 'died'
    | 'no-target';

export interface Verdict {
    kind: VerdictKind;
    deltaMs: number | null; // final - target; negative = beat it
}

export const calledShotVerdict = (
    goal: PrepGoal,
    postRun: PostRun | null,
): Verdict => {
    if (!postRun || postRun.finalTimeMs <= 0) {
        return { kind: 'died', deltaMs: null };
    }
    if (!goal.targetTimeMs) return { kind: 'no-target', deltaMs: null };
    const deltaMs = postRun.finalTimeMs - goal.targetTimeMs;
    if (deltaMs <= -THRESHOLDS.verdictDemolishMarginMs) {
        return { kind: 'demolished', deltaMs };
    }
    if (deltaMs <= 0) return { kind: 'hit', deltaMs };
    return { kind: 'missed', deltaMs };
};
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run src/lib/fast50/__tests__/verdict.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fast50/verdict.ts src/lib/fast50/__tests__/verdict.test.ts src/components/fast50/deck/evaluators.ts
git commit -m "feat(fast50): called-shot verdict logic"
```

---

### Task 7: Frontend — five custom slide components + styles

**Files:**
- Modify: `src/components/fast50/deck/deck.tsx` (add `CustomSlideComponent` type only — rendering changes come in Task 8)
- Create: `src/components/fast50/slides/quote-slide.tsx`, `fact-slide.tsx`, `clip-slide.tsx`, `called-shot-slide.tsx`, `called-shot-result-slide.tsx`
- Modify: `src/components/fast50/slides/slide-registry.tsx` (add `CUSTOM_SLIDE_COMPONENTS`)
- Modify: `src/components/fast50/deck/fast50.module.scss` (append custom-slide styles)

**Interfaces:**
- Consumes: `Reveal`, `TimeText` from `../deck/primitives`; `formatDelta`, `formatTimeMs` from `~src/components/live/commentary-drawer/format`; `calledShotVerdict`, `VerdictKind` from `~src/lib/fast50/verdict`; `CustomSlideContent`, `CustomSlideKind` from `~src/lib/fast50/prep.types`.
- Produces:
  - In `deck.tsx`: `export type CustomSlideComponent = React.ComponentType<{ dossier: RunnerDossier; content: CustomSlideContent; stage: number }>`
  - In `slide-registry.tsx`: `export const CUSTOM_SLIDE_COMPONENTS: Record<CustomSlideKind, CustomSlideComponent>`
- Stage vocabulary (3 stages, same as every slide): stage 0 = kicker + headline, stage 1 = the payload lands (quote text / video plays / target time / final time), stage 2 = the closer (attribution / caption / context line / verdict stamp).

- [ ] **Step 1: Add the type to `deck.tsx`**

Below the existing `SlideComponent` type:

```typescript
import type {
    CustomSlideContent,
    CustomSlideKind,
    PrepSessionData,
} from '~src/lib/fast50/prep.types';

export type CustomSlideComponent = React.ComponentType<{
    dossier: RunnerDossier;
    content: CustomSlideContent;
    stage: number;
}>;
```

(`CustomSlideKind` and `PrepSessionData` are used by Task 8's changes in this same file; importing them now is fine — prefix with `type` so Biome keeps them.)

- [ ] **Step 2: Write `quote-slide.tsx`**

```tsx
'use client';

import Image from 'next/image';
import React from 'react';
import type { CustomSlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal } from '../deck/primitives';

export const QuoteSlide: CustomSlideComponent = ({
    dossier,
    content,
    stage,
}) => {
    if (content.kind !== 'quote') return null;
    const { quote } = content;
    return (
        <div className={styles.slide}>
            <div className={styles.slideContent}>
                <div className={styles.kicker}>
                    {quote.context ?? 'In their own words'}
                </div>
                <Reveal when={stage >= 1}>
                    <blockquote className={styles.quoteText}>
                        “{quote.text}”
                    </blockquote>
                </Reveal>
                <Reveal when={stage >= 2}>
                    <div className={styles.quoteAttribution}>
                        {dossier.runner.picture ? (
                            <span className={styles.avatar}>
                                <Image
                                    src={dossier.runner.picture}
                                    alt=""
                                    fill
                                    sizes="120px"
                                />
                            </span>
                        ) : null}
                        — {dossier.runner.username}
                    </div>
                </Reveal>
            </div>
        </div>
    );
};
```

- [ ] **Step 3: Write `fact-slide.tsx`**

```tsx
'use client';

import React from 'react';
import type { CustomSlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal } from '../deck/primitives';

export const FactSlide: CustomSlideComponent = ({ content, stage }) => {
    if (content.kind !== 'fact') return null;
    const { fact } = content;
    return (
        <div className={styles.slide}>
            <div className={styles.slideContent}>
                <div className={styles.kicker}>
                    {fact.title ?? 'For the record'}
                </div>
                {fact.template === 'versus' && fact.secondary ? (
                    <div className={styles.factVersus}>
                        <Reveal when={stage >= 1}>
                            <span>{fact.body}</span>
                        </Reveal>
                        <Reveal when={stage >= 1} delayMs={250}>
                            <span className={styles.factVs}>vs</span>
                        </Reveal>
                        <Reveal when={stage >= 2}>
                            <span>{fact.secondary}</span>
                        </Reveal>
                    </div>
                ) : (
                    <Reveal when={stage >= 1}>
                        <div
                            className={styles.factBody}
                            data-history={
                                fact.template === 'history' || undefined
                            }
                        >
                            {fact.body}
                        </div>
                    </Reveal>
                )}
            </div>
        </div>
    );
};
```

- [ ] **Step 4: Write `clip-slide.tsx`**

Hooks run unconditionally (React rules) — the kind guard narrows via a variable and the early return sits after the hooks:

```tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { CustomSlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal } from '../deck/primitives';

export const ClipSlide: CustomSlideComponent = ({ content, stage }) => {
    const clip = content.kind === 'clip' ? content.clip : null;
    const videoRef = useRef<HTMLVideoElement>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (stage >= 1) {
            video.play().catch(() => setFailed(true));
        } else {
            video.pause();
            video.currentTime = 0;
        }
    }, [stage]);

    if (!clip) return null;
    const playing = stage >= 1 && !failed;
    return (
        <div className={styles.slide}>
            <div className={styles.clipFrame} data-playing={playing || undefined}>
                {!failed ? (
                    <video
                        ref={videoRef}
                        src={clip.videoUrl}
                        preload="auto"
                        playsInline
                        onError={() => setFailed(true)}
                    />
                ) : null}
            </div>
            <div className={styles.slideContent}>
                <div className={styles.kicker}>Watch for this</div>
                <Reveal when={stage >= 0}>
                    <h1 className={styles.headline}>{clip.title}</h1>
                </Reveal>
                {clip.caption ? (
                    <Reveal when={stage >= 2}>
                        <div className={styles.subStat}>{clip.caption}</div>
                    </Reveal>
                ) : null}
            </div>
        </div>
    );
};
```

If the video 404s or errors at showtime, `failed` flips and the slide degrades to its title/caption card — the presenter still tells the story.

- [ ] **Step 5: Write `called-shot-slide.tsx`**

```tsx
'use client';

import React from 'react';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import type { CustomSlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal, TimeText } from '../deck/primitives';

export const CalledShotSlide: CustomSlideComponent = ({
    dossier,
    content,
    stage,
}) => {
    if (content.kind !== 'called-shot') return null;
    const { goal } = content;
    const target = goal.targetTimeMs;
    const recent = dossier.finishedRuns.slice(-50);
    const under = target
        ? recent.filter((r) => r.timeMs <= target).length
        : 0;
    return (
        <div className={styles.slide}>
            <div className={styles.slideContent}>
                <div className={styles.kicker}>The called shot</div>
                <Reveal when={stage >= 0}>
                    <h1 className={styles.headline}>{goal.text}</h1>
                </Reveal>
                {target ? (
                    <>
                        <Reveal when={stage >= 1}>
                            <div className={styles.hero}>
                                <TimeText ms={target} />
                            </div>
                        </Reveal>
                        <Reveal when={stage >= 2}>
                            <div className={styles.subStat}>
                                {recent.length > 0
                                    ? `beaten ${formatTimeMs(target)} in ${under} of the last ${recent.length} finishes`
                                    : 'no finished runs on record — full send'}
                            </div>
                        </Reveal>
                    </>
                ) : null}
            </div>
        </div>
    );
};
```

- [ ] **Step 6: Write `called-shot-result-slide.tsx`**

```tsx
'use client';

import React from 'react';
import { formatDelta } from '~src/components/live/commentary-drawer/format';
import { calledShotVerdict, type VerdictKind } from '~src/lib/fast50/verdict';
import type { CustomSlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal, TimeText } from '../deck/primitives';

const VERDICT_COPY: Record<Exclude<VerdictKind, 'no-target'>, string> = {
    demolished: 'DEMOLISHED',
    hit: 'HIT',
    missed: 'MISSED',
    died: 'THE RUN HAD OTHER PLANS',
};

export const CalledShotResultSlide: CustomSlideComponent = ({
    dossier,
    content,
    stage,
}) => {
    if (content.kind !== 'called-shot-result') return null;
    const { goal } = content;
    const verdict = calledShotVerdict(goal, dossier.postRun);
    return (
        <div className={styles.slide}>
            <div className={styles.slideContent}>
                <div className={styles.kicker}>He called it: {goal.text}</div>
                {dossier.postRun ? (
                    <Reveal when={stage >= 1}>
                        <div className={styles.hero}>
                            <TimeText ms={dossier.postRun.finalTimeMs} />
                        </div>
                    </Reveal>
                ) : null}
                <Reveal when={stage >= 2}>
                    {verdict.kind !== 'no-target' ? (
                        <div
                            className={styles.verdictStamp}
                            data-kind={verdict.kind}
                        >
                            {VERDICT_COPY[verdict.kind]}
                            {verdict.deltaMs !== null ? (
                                <span className={styles.verdictDelta}>
                                    {formatDelta(verdict.deltaMs).text} vs the
                                    call
                                </span>
                            ) : null}
                        </div>
                    ) : (
                        <div />
                    )}
                </Reveal>
            </div>
        </div>
    );
};
```

- [ ] **Step 7: Append styles to `fast50.module.scss`**

```scss
// --- custom prep slides ---

.quoteText {
    font-size: 4.6vw;
    line-height: 1.15;
    font-weight: 700;
    max-width: 62vw;
    margin: 0;
}

.quoteAttribution {
    display: flex;
    align-items: center;
    gap: 1vw;
    font-size: 1.6vw;
    color: var(--muted);
}

.factVersus {
    display: flex;
    align-items: baseline;
    gap: 2.4vw;
    font-size: 4.2vw;
    font-weight: 700;
}

.factVs {
    font-size: 1.8vw;
    color: var(--muted);
}

.factBody {
    font-size: 4.2vw;
    font-weight: 700;
    max-width: 66vw;
    line-height: 1.15;

    &[data-history] {
        font-weight: 400;
        font-style: italic;
    }
}

.clipFrame {
    position: absolute;
    inset: 0;
    background: #000;
    opacity: 0;
    transition: opacity 400ms ease;

    video {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    &[data-playing] {
        opacity: 1;
    }
}

.verdictStamp {
    display: inline-flex;
    align-items: baseline;
    gap: 1.2vw;
    font-size: 5vw;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--accent);

    &[data-kind='missed'] {
        color: var(--danger);
    }

    &[data-kind='died'] {
        color: var(--danger);
        font-size: 3.2vw;
    }

    &[data-kind='demolished'] {
        color: var(--gold);
    }
}

.verdictDelta {
    font-size: 1.8vw;
    color: var(--muted);
}

.preloadVideos {
    display: none;
}

.roadNote {
    fill: var(--accent);
    font-size: 26px;
    font-weight: 600;
    opacity: 0;
    transition: opacity 500ms ease;

    &[data-visible] {
        opacity: 1;
    }
}

// .stage is position: fixed for the live deck; the prep studio preview
// embeds it inside a scaled wrapper, which needs absolute positioning.
.stageEmbedded {
    position: absolute !important;
}
```

- [ ] **Step 8: Add `CUSTOM_SLIDE_COMPONENTS` to `slide-registry.tsx`**

```typescript
import type { CustomSlideKind } from '~src/lib/fast50/prep.types';
import type { CustomSlideComponent } from '../deck/deck';
import { CalledShotResultSlide } from './called-shot-result-slide';
import { CalledShotSlide } from './called-shot-slide';
import { ClipSlide } from './clip-slide';
import { FactSlide } from './fact-slide';
import { QuoteSlide } from './quote-slide';

export const CUSTOM_SLIDE_COMPONENTS: Record<
    CustomSlideKind,
    CustomSlideComponent
> = {
    quote: QuoteSlide,
    clip: ClipSlide,
    fact: FactSlide,
    'called-shot': CalledShotSlide,
    'called-shot-result': CalledShotResultSlide,
};
```

- [ ] **Step 9: Typecheck, lint, commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass (Task 8 wires these into the Deck; unused-import warnings in deck.tsx are acceptable only if lint allows type-only imports — if lint complains, keep the import and add a `// used by Task 8` is NOT acceptable; instead move the `CustomSlideContent` import usage into the type declaration as shown, which uses all three).

```bash
git add src/components/fast50/slides src/components/fast50/deck/deck.tsx src/components/fast50/deck/fast50.module.scss
git commit -m "feat(fast50): custom prep slide components"
```

---

### Task 8: Frontend — Deck renders custom slides, roadmap annotations, demo prep mode

**Files:**
- Modify: `src/components/fast50/deck/deck.tsx`
- Modify: `src/components/fast50/deck/primitives.tsx` (RoadTrack `notes` prop)
- Modify: `src/components/fast50/slides/roadmap-slide.tsx` (forward notes)
- Modify: `app/(fast50)/fast50/screen/[username]/[game]/[category]/page.tsx` (pass `customComponents`)
- Modify: `app/(fast50)/fast50/screen/demo/page.tsx` (`?prep=full` mode)

**Interfaces:**
- Consumes: Tasks 5/7 outputs.
- Produces:
  - `SlideComponent` gains optional `prep?: PrepSessionData | null` prop (Deck passes it to every stat slide)
  - `Deck` props gain `customComponents?: Partial<Record<CustomSlideKind, CustomSlideComponent>>` and `prep?: PrepSessionData | null`
  - `RoadTrack` gains `notes?: PrepRoadmapNote[]`
  - Demo URL contract: `/fast50/screen/demo?fixture=grinder&deck=pre&prep=full`

- [ ] **Step 1: Update `deck.tsx`**

`SlideComponent` gains the prep prop:

```typescript
export type SlideComponent = React.ComponentType<{
    dossier: RunnerDossier;
    evaluation: SlideEvaluation;
    stage: number;
    prep?: PrepSessionData | null;
}>;
```

Replace the `composeDeck` import with `composePreppedDeck` and thread prep through `useEffectiveDossier` (the capture-override recompose must honor the frozen order too):

```typescript
import { composePreppedDeck } from './compose-prepped-deck';

const useEffectiveDossier = (
    dossier: RunnerDossier,
    slides: ComposedSlide[],
    prep: PrepSessionData | null | undefined,
): { dossier: RunnerDossier; slides: ComposedSlide[] } => {
    // ... unchanged until the recompose line:
        const effective = { ...dossier, postRun };
        setOverride({
            dossier: effective,
            slides: composePreppedDeck(effective, prep).slides,
        });
    }, [dossier, prep]);
    // ...
```

`Deck` signature and rendering:

```tsx
export const Deck = ({
    dossier,
    slides,
    components,
    customComponents,
    prep,
}: {
    dossier: RunnerDossier;
    slides: ComposedSlide[];
    components: Partial<Record<SlideId, SlideComponent>>;
    customComponents?: Partial<Record<CustomSlideKind, CustomSlideComponent>>;
    prep?: PrepSessionData | null;
}) => {
    const router = useRouter();
    const effective = useEffectiveDossier(dossier, slides, prep);
    const custom = customComponents ?? {};
    // ...
    const renderable = effective.slides.filter((s) =>
        s.custom ? custom[s.custom.kind] : components[s.id as SlideId],
    );
```

Replace the single `<Component ... />` render with:

```tsx
            {current.custom ? (
                (() => {
                    const CustomComponent = custom[
                        current.custom.kind
                    ] as CustomSlideComponent;
                    return (
                        <CustomComponent
                            key={current.id}
                            dossier={effective.dossier}
                            content={current.custom}
                            stage={state.stage}
                        />
                    );
                })()
            ) : (
                <Component
                    key={current.id}
                    dossier={effective.dossier}
                    evaluation={current.evaluation}
                    stage={state.stage}
                    prep={prep}
                />
            )}
```

(`const Component = components[current.id as SlideId] as SlideComponent;` — guard: only dereference when `!current.custom`, e.g. compute it inside the else branch or keep the cast after the custom check.)

Add the preload block just before the closing `</div>` of the stage (zero network at showtime — clips are fetched while the deck loads):

```tsx
            {prep && prep.clips.length > 0 ? (
                <div className={styles.preloadVideos} aria-hidden>
                    {prep.clips.map((c) => (
                        <video key={c.id} src={c.videoUrl} preload="auto" muted />
                    ))}
                </div>
            ) : null}
```

- [ ] **Step 2: RoadTrack notes in `primitives.tsx`**

Add to the RoadTrack props: `notes?: PrepRoadmapNote[]` (import the type from `~src/lib/fast50/prep.types`). Annotated splits must never be culled from the visible landmark set — add their indexes to `keep` right after `highlightIndex`:

```typescript
    if (highlightIndex !== undefined) keep.add(highlightIndex);
    for (const n of notes ?? []) keep.add(n.splitIndex);
```

Render the callouts after the visible-nodes map, inside the same `<svg>`:

```tsx
            {(notes ?? []).map((n) => {
                const node = road.find((r) => r.index === n.splitIndex);
                if (!node) return null;
                return (
                    <text
                        key={n.splitIndex}
                        x={xAt(node.atMs)}
                        y={TRACK_Y - 34}
                        textAnchor="middle"
                        className={styles.roadNote}
                        data-visible={stage >= 2 || undefined}
                    >
                        {n.text}
                    </text>
                );
            })}
```

- [ ] **Step 3: Forward notes in `roadmap-slide.tsx`**

Add `prep` to the component's destructured props (it's now part of `SlideComponent`) and pass `notes={prep?.roadmapNotes}` to its `<RoadTrack ...>` call.

- [ ] **Step 4: Demo page prep mode**

In `app/(fast50)/fast50/screen/demo/page.tsx`: read `prep` from searchParams, compose with it, pass through, and add a switcher toggle:

```tsx
import { composePreppedDeck } from '~src/components/fast50/deck/compose-prepped-deck';
import {
    CUSTOM_SLIDE_COMPONENTS,
    SLIDE_COMPONENTS,
} from '~src/components/fast50/slides/slide-registry';
import { FIXTURES, fixturePost, fixturePrep } from '~src/lib/fast50/fixtures';

// inside the component:
    const { fixture: fixtureParam, deck: deckParam, prep: prepParam } =
        await searchParams;
    // ...
    const prep = prepParam === 'full' ? fixturePrep : null;
    const dossier = (deck === 'post' ? fixturePost : FIXTURES)[fixture];
    const { slides } = composePreppedDeck(dossier, prep);

    <Deck
        key={`${fixture}-${deck}-${prepParam ?? 'off'}`}
        dossier={dossier}
        slides={slides}
        prep={prep}
        components={SLIDE_COMPONENTS}
        customComponents={CUSTOM_SLIDE_COMPONENTS}
    />
```

Update the searchParams type to `Promise<{ fixture?: string; deck?: string; prep?: string }>`, keep `deck` links carrying the current `prep` param, and add to the switcher:

```tsx
                <span className={styles.demoDivider} />
                <Link
                    href={`/fast50/screen/demo?fixture=${fixture}&deck=${deck}`}
                    data-active={!prep || undefined}
                >
                    no prep
                </Link>
                <Link
                    href={`/fast50/screen/demo?fixture=${fixture}&deck=${deck}&prep=full`}
                    data-active={!!prep || undefined}
                >
                    prep
                </Link>
```

- [ ] **Step 5: Pass customComponents on the real deck page**

In `app/(fast50)/fast50/screen/[username]/[game]/[category]/page.tsx`, import `CUSTOM_SLIDE_COMPONENTS` and add `customComponents={CUSTOM_SLIDE_COMPONENTS}` to the `<Deck>` (prep resolution lands in Task 9).

- [ ] **Step 6: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass, including the untouched `deck-state` and `compose-deck` suites.

```bash
git add src/components/fast50 "app/(fast50)"
git commit -m "feat(fast50): deck renders custom slides, roadmap notes, demo prep mode"
```

---

### Task 9: Frontend — prep API client + deck page session resolution

**Files:**
- Create: `src/lib/fast50/prep.ts`
- Modify: `app/(fast50)/fast50/screen/[username]/[game]/[category]/page.tsx`

**Interfaces:**
- Consumes: `apiFetch`/`ApiError` from `~src/lib/api-client`; `getSession` from `~src/actions/session.action` (verify the exact import path with a grep for `getSession` in `src/lib` — match existing usage); Task 4 types.
- Produces (all take `sessionId` first — callers pass `session.id` per the project's session shape, where `getSession()` returns the User directly and `.id` is the bearer token):
  - `listPrepSessions(sessionId: string, username: string, game: string, category: string): Promise<PrepSessionSummary[]>`
  - `getPrepSession(sessionId: string, id: number): Promise<PrepSession>`
  - `createPrepSession(sessionId: string, input: {username; game; category; label: string; data: PrepSessionData}): Promise<PrepSession>`
  - `updatePrepSession(sessionId: string, id: number, input: {label?: string; data?: PrepSessionData}): Promise<PrepSession>`
  - `deletePrepSession(sessionId: string, id: number): Promise<void>`
  - `getClipUploadUrl(sessionId: string, contentType: string, contentLength: number): Promise<{uploadUrl: string; videoUrl: string}>`

- [ ] **Step 1: Write `src/lib/fast50/prep.ts`**

No `'use cache'` anywhere in this file — prep is edited up to showtime; a stale cached session on the deck route is a show-killer. Every fetch is `cache: 'no-store'`.

```typescript
import { apiFetch } from '~src/lib/api-client';
import {
    parsePrepData,
    type PrepSession,
    type PrepSessionData,
    type PrepSessionSummary,
} from './prep.types';

interface RawPrepSession {
    id: number;
    username: string;
    game: string;
    category: string;
    label: string;
    data: unknown;
    createdAt: string;
    updatedAt: string;
}

const toSession = (raw: RawPrepSession): PrepSession => ({
    id: raw.id,
    username: raw.username,
    game: raw.game,
    category: raw.category,
    label: raw.label,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    data: parsePrepData(raw.data),
});

const runQuery = (username: string, game: string, category: string) =>
    `username=${encodeURIComponent(username)}&game=${encodeURIComponent(
        game,
    )}&category=${encodeURIComponent(category)}`;

export const listPrepSessions = (
    sessionId: string,
    username: string,
    game: string,
    category: string,
): Promise<PrepSessionSummary[]> =>
    apiFetch<PrepSessionSummary[]>(
        `/fast50/prep?${runQuery(username, game, category)}`,
        { sessionId, cache: 'no-store' },
    );

export const getPrepSession = async (
    sessionId: string,
    id: number,
): Promise<PrepSession> =>
    toSession(
        await apiFetch<RawPrepSession>(`/fast50/prep/${id}`, {
            sessionId,
            cache: 'no-store',
        }),
    );

export const createPrepSession = async (
    sessionId: string,
    input: {
        username: string;
        game: string;
        category: string;
        label: string;
        data: PrepSessionData;
    },
): Promise<PrepSession> =>
    toSession(
        await apiFetch<RawPrepSession>('/fast50/prep', {
            method: 'POST',
            body: input,
            sessionId,
        }),
    );

export const updatePrepSession = async (
    sessionId: string,
    id: number,
    input: { label?: string; data?: PrepSessionData },
): Promise<PrepSession> =>
    toSession(
        await apiFetch<RawPrepSession>(`/fast50/prep/${id}`, {
            method: 'PUT',
            body: input,
            sessionId,
        }),
    );

export const deletePrepSession = async (
    sessionId: string,
    id: number,
): Promise<void> => {
    await apiFetch(`/fast50/prep/${id}`, { method: 'DELETE', sessionId });
};

export const getClipUploadUrl = (
    sessionId: string,
    contentType: string,
    contentLength: number,
): Promise<{ uploadUrl: string; videoUrl: string }> =>
    apiFetch('/fast50/prep/upload-url', {
        method: 'POST',
        body: { contentType, contentLength },
        sessionId,
    });
```

- [ ] **Step 2: Resolve prep on the deck page**

Rewrite `app/(fast50)/fast50/screen/[username]/[game]/[category]/page.tsx`:

```tsx
import { getSession } from '~src/actions/session.action';
import { composePreppedDeck } from '~src/components/fast50/deck/compose-prepped-deck';
import { Deck } from '~src/components/fast50/deck/deck';
import {
    CUSTOM_SLIDE_COMPONENTS,
    SLIDE_COMPONENTS,
} from '~src/components/fast50/slides/slide-registry';
import { getRunnerDossier } from '~src/lib/fast50/dossier';
import { getPrepSession, listPrepSessions } from '~src/lib/fast50/prep';
import type { PrepSessionData } from '~src/lib/fast50/prep.types';

export const metadata = {
    robots: { index: false, follow: false },
};

export default async function DeckPage({
    params,
    searchParams,
}: {
    params: Promise<{ username: string; game: string; category: string }>;
    searchParams: Promise<{ deck?: string; session?: string }>;
}) {
    const { username, game, category } = await params;
    const { deck, session } = await searchParams;
    const kind = deck === 'post' ? 'post' : 'pre';
    const u = decodeURIComponent(username);
    const g = decodeURIComponent(game);
    const c = decodeURIComponent(category);
    const dossier = await getRunnerDossier(u, g, c, kind);
    if (!dossier) {
        return (
            <main style={{ padding: '20vh 10vw', fontSize: 24 }}>
                No data found for this runner/game/category.
            </main>
        );
    }

    // Prep is best-effort: any failure (no auth, backend down, bad session
    // id) falls back to the pure auto-composed deck.
    let prep: PrepSessionData | null = null;
    try {
        const user = await getSession();
        if (user.id) {
            const requested = session ? Number(session) : undefined;
            if (requested && Number.isInteger(requested) && requested > 0) {
                prep = (await getPrepSession(user.id, requested)).data;
            } else {
                const sessions = await listPrepSessions(user.id, u, g, c);
                if (sessions[0]) {
                    prep = (await getPrepSession(user.id, sessions[0].id)).data;
                }
            }
        }
    } catch {
        prep = null;
    }

    const { slides } = composePreppedDeck(dossier, prep);
    return (
        <Deck
            dossier={dossier}
            slides={slides}
            prep={prep}
            components={SLIDE_COMPONENTS}
            customComponents={CUSTOM_SLIDE_COMPONENTS}
        />
    );
}
```

- [ ] **Step 3: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add src/lib/fast50/prep.ts "app/(fast50)/fast50/screen/[username]/[game]/[category]/page.tsx"
git commit -m "feat(fast50): prep API client and deck session resolution"
```

---

### Task 10: Frontend — prep server actions, RBAC gate, studio index page

**Files:**
- Create: `app/(fast50)/fast50/prep/actions.ts`
- Create: `app/(fast50)/fast50/prep/page.tsx`
- Create: `app/(fast50)/fast50/prep/prep-index.tsx`
- Create: `src/components/fast50/prep/prep-studio.module.scss`
- Create: `src/lib/fast50/time-input.ts`
- Test: `src/lib/fast50/__tests__/time-input.test.ts`

**Interfaces:**
- Consumes: Task 9 client lib; `lookupRunner` from `../screen/actions`; `confirmPermission` from `~src/rbac/confirm-permission`.
- Produces:
  - Actions (all `'use server'`, all resolve session via `getSession()` internally): `listSessionsAction(username, game, category): Promise<PrepSessionSummary[]>`, `loadPrepAction(id): Promise<PrepSession>`, `createPrepAction({username, game, category, label, data?}): Promise<PrepSession>`, `savePrepAction(id, {label?, data?}): Promise<PrepSession>`, `deletePrepAction(id): Promise<void>`, `clipUploadUrlAction(contentType, contentLength): Promise<{uploadUrl, videoUrl}>`
  - `parseTimeInput(raw: string): number | undefined` — `'95'` → minutes, `'12:30'` → mm:ss, `'1:40:00'` → h:mm:ss
  - Route `/fast50/prep` — RBAC-gated runner search linking to the studio

- [ ] **Step 1: time-input TDD — failing test**

Create `src/lib/fast50/__tests__/time-input.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import { parseTimeInput } from '../time-input';

describe('parseTimeInput', () => {
    test('empty / garbage → undefined', () => {
        expect(parseTimeInput('')).toBeUndefined();
        expect(parseTimeInput('abc')).toBeUndefined();
        expect(parseTimeInput('1:-5')).toBeUndefined();
    });
    test('single number is minutes', () => {
        expect(parseTimeInput('95')).toBe(95 * 60_000);
    });
    test('two parts is mm:ss', () => {
        expect(parseTimeInput('12:30')).toBe((12 * 60 + 30) * 1000);
    });
    test('three parts is h:mm:ss', () => {
        expect(parseTimeInput('1:40:00')).toBe(
            (1 * 3600 + 40 * 60) * 1000,
        );
    });
    test('tolerates formatTimeMs decimals', () => {
        expect(parseTimeInput('1:40:00.0')).toBe(
            (1 * 3600 + 40 * 60) * 1000,
        );
    });
});
```

Run: `npx vitest run src/lib/fast50/__tests__/time-input.test.ts` — expect FAIL (module missing).

- [ ] **Step 2: Write `src/lib/fast50/time-input.ts`**

```typescript
// Parses presenter-entered target times. Convention: '95' = minutes,
// '12:30' = mm:ss, '1:40:00' = h:mm:ss. A trailing '.d+' (as produced by
// formatTimeMs round-trips) is tolerated and truncated.
export const parseTimeInput = (raw: string): number | undefined => {
    const trimmed = raw.trim().replace(/\.\d+$/, '');
    if (!trimmed || !/^\d+(:\d+)*$/.test(trimmed)) return undefined;
    const parts = trimmed.split(':').map(Number);
    if (parts.some((n) => Number.isNaN(n) || n < 0)) return undefined;
    if (parts.length === 1) return parts[0] * 60_000;
    if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    if (parts.length === 3) {
        return ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000;
    }
    return undefined;
};
```

Run the test again — expect PASS.

- [ ] **Step 3: Write `app/(fast50)/fast50/prep/actions.ts`**

```typescript
'use server';

import { getSession } from '~src/actions/session.action';
import {
    createPrepSession,
    deletePrepSession,
    getClipUploadUrl,
    getPrepSession,
    listPrepSessions,
    updatePrepSession,
} from '~src/lib/fast50/prep';
import {
    emptyPrepData,
    type PrepSession,
    type PrepSessionData,
    type PrepSessionSummary,
} from '~src/lib/fast50/prep.types';

export const listSessionsAction = async (
    username: string,
    game: string,
    category: string,
): Promise<PrepSessionSummary[]> => {
    const user = await getSession();
    if (!user.id) return [];
    return listPrepSessions(user.id, username, game, category);
};

export const loadPrepAction = async (id: number): Promise<PrepSession> => {
    const user = await getSession();
    return getPrepSession(user.id, id);
};

export const createPrepAction = async (input: {
    username: string;
    game: string;
    category: string;
    label: string;
    data?: PrepSessionData;
}): Promise<PrepSession> => {
    const user = await getSession();
    return createPrepSession(user.id, {
        ...input,
        data: input.data ?? emptyPrepData(),
    });
};

export const savePrepAction = async (
    id: number,
    input: { label?: string; data?: PrepSessionData },
): Promise<PrepSession> => {
    const user = await getSession();
    return updatePrepSession(user.id, id, input);
};

export const deletePrepAction = async (id: number): Promise<void> => {
    const user = await getSession();
    await deletePrepSession(user.id, id);
};

export const clipUploadUrlAction = async (
    contentType: string,
    contentLength: number,
): Promise<{ uploadUrl: string; videoUrl: string }> => {
    const user = await getSession();
    return getClipUploadUrl(user.id, contentType, contentLength);
};
```

(Authorization is enforced by the backend on every call; these actions just attach the caller's bearer token.)

- [ ] **Step 4: Write `src/components/fast50/prep/prep-studio.module.scss`**

```scss
// Prep studio — a TOOL, not a broadcast surface. Dense, px-based, dark.

.page {
    min-height: 100vh;
    background: #0b0e14;
    color: #e6ebf2;
    padding: 24px;
    font-family: var(--font-sans), sans-serif;
}

.denied {
    padding: 20vh 10vw;
    font-size: 24px;
}

.header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

.headerTitle {
    font-size: 18px;
    font-weight: 700;
    margin-right: auto;
}

.studio {
    display: grid;
    grid-template-columns: 380px 340px 1fr;
    gap: 16px;
    align-items: start;
}

.pane {
    background: #11151d;
    border: 1px solid #1e2530;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.paneTitle {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8a93a3;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;

    input,
    textarea,
    select {
        background: #0b0e14;
        border: 1px solid #2a3342;
        color: inherit;
        border-radius: 6px;
        padding: 8px;
        font: inherit;
    }
}

.row {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
}

.button {
    background: #21c96e;
    color: #06210f;
    border: 0;
    border-radius: 6px;
    padding: 8px 14px;
    font-weight: 600;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
}

.buttonGhost {
    background: transparent;
    color: #8a93a3;
    border: 1px solid #2a3342;
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
}

.itemCard {
    border: 1px solid #2a3342;
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.itemLabel {
    font-size: 13px;
    font-weight: 600;
}

.itemMeta {
    font-size: 12px;
    color: #8a93a3;
}

.deckList {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.deckItem {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #2a3342;
    border-radius: 6px;
    padding: 8px;

    &[data-selected] {
        border-color: #21c96e;
    }

    &[data-custom] {
        border-style: dashed;
    }
}

.deckItemLabel {
    flex: 1;
    font-size: 13px;
    cursor: pointer;
}

.iconButton {
    background: transparent;
    border: 0;
    color: #8a93a3;
    cursor: pointer;
    font-size: 14px;

    &:hover {
        color: #e6ebf2;
    }
}

.tabs {
    display: flex;
    gap: 4px;
}

.tab {
    background: transparent;
    border: 1px solid #2a3342;
    color: #8a93a3;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;

    &[data-active] {
        color: #e6ebf2;
        border-color: #21c96e;
    }
}

.preview {
    position: sticky;
    top: 24px;
}

.previewViewport {
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid #1e2530;
    position: relative;
}

.previewScale {
    position: absolute;
    top: 0;
    left: 0;
    width: 1920px;
    height: 1080px;
    transform-origin: top left;
}

.warning {
    color: #ffd24d;
    font-size: 13px;
}

.error {
    color: #ff4d5e;
    font-size: 13px;
}

.savedAt {
    font-size: 12px;
    color: #8a93a3;
}

.runList {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 720px;
}

.runRow {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #2a3342;
    border-radius: 6px;
    padding: 10px 14px;
}
```

- [ ] **Step 5: Write the index page + client**

`app/(fast50)/fast50/prep/page.tsx`:

```tsx
import { getSession } from '~src/actions/session.action';
import styles from '~src/components/fast50/prep/prep-studio.module.scss';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { PrepIndex } from './prep-index';

export const metadata = {
    robots: { index: false, follow: false },
};

export default async function PrepIndexPage() {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'event');
    } catch {
        return <main className={styles.denied}>Not authorized.</main>;
    }
    return (
        <main className={styles.page}>
            <PrepIndex />
        </main>
    );
}
```

`app/(fast50)/fast50/prep/prep-index.tsx`:

```tsx
'use client';

import Link from 'next/link';
import React, { useState, useTransition } from 'react';
import styles from '~src/components/fast50/prep/prep-studio.module.scss';
import { lookupRunner, type RunnerLookup } from '../screen/actions';

export const PrepIndex = () => {
    const [username, setUsername] = useState('');
    const [lookedUp, setLookedUp] = useState('');
    const [result, setResult] = useState<
        RunnerLookup | { error: string } | null
    >(null);
    const [pending, startTransition] = useTransition();

    const onLookup = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = username.trim();
        if (!trimmed) return;
        startTransition(async () => {
            try {
                setResult(await lookupRunner(trimmed));
                setLookedUp(trimmed);
            } catch {
                setResult({ error: 'Lookup failed — try again' });
            }
        });
    };

    return (
        <>
            <div className={styles.header}>
                <h1 className={styles.headerTitle}>fast50 — prep studio</h1>
                <Link className={styles.buttonGhost} href="/fast50/screen">
                    ← screen picker
                </Link>
            </div>
            <form className={styles.row} onSubmit={onLookup}>
                <input
                    className={styles.field}
                    type="text"
                    placeholder="Runner username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <button
                    className={styles.button}
                    type="submit"
                    disabled={pending}
                >
                    {pending ? 'Looking up…' : 'Lookup'}
                </button>
            </form>
            {result && 'error' in result ? (
                <p className={styles.error}>{result.error}</p>
            ) : null}
            {result && 'runs' in result ? (
                <ul className={styles.runList}>
                    {result.runs.map((r) => (
                        <li
                            key={`${r.game}-${r.category}`}
                            className={styles.runRow}
                        >
                            <span className={styles.itemLabel}>
                                {r.game} — {r.category}
                            </span>
                            <span className={styles.itemMeta}>
                                pre {r.preSlides} · post {r.postSlides}
                            </span>
                            <Link
                                className={styles.button}
                                href={`/fast50/prep/${encodeURIComponent(lookedUp)}/${encodeURIComponent(r.game)}/${encodeURIComponent(r.category)}`}
                            >
                                Open prep studio
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : null}
        </>
    );
};
```

- [ ] **Step 6: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add "app/(fast50)/fast50/prep" src/components/fast50/prep src/lib/fast50/time-input.ts src/lib/fast50/__tests__/time-input.test.ts
git commit -m "feat(fast50): prep actions, RBAC gate and studio index"
```

---

### Task 11: Frontend — studio editor page, interview panel, save

**Files:**
- Create: `app/(fast50)/fast50/prep/[username]/[game]/[category]/page.tsx`
- Create: `src/components/fast50/prep/studio.tsx`
- Create: `src/components/fast50/prep/interview-panel.tsx`

**Interfaces:**
- Consumes: Task 10 actions; `getRunnerDossier` from `~src/lib/fast50/dossier`; `parseTimeInput`; `formatTimeMs` from `~src/components/live/commentary-drawer/format`.
- Produces:
  - `Studio` client component: props `{ runner: {username; game; category}; dossierPre: RunnerDossier; dossierPost: RunnerDossier | null; sessions: PrepSessionSummary[]; initial: PrepSession | null }`
  - `InterviewPanel` client component: props `{ data: PrepSessionData; splits: {index: number; name: string}[]; onChange: (data: PrepSessionData) => void }`
  - In this task the Studio renders header (session select / create / duplicate / delete / save / saved-at) + InterviewPanel; the deck builder and preview panes are added by Task 12 (leave a `{/* Task 12: builder + preview */}` placeholder region in the grid).

- [ ] **Step 1: Write the studio route page**

`app/(fast50)/fast50/prep/[username]/[game]/[category]/page.tsx`:

```tsx
import { getSession } from '~src/actions/session.action';
import { Studio } from '~src/components/fast50/prep/studio';
import styles from '~src/components/fast50/prep/prep-studio.module.scss';
import { getRunnerDossier } from '~src/lib/fast50/dossier';
import { getPrepSession, listPrepSessions } from '~src/lib/fast50/prep';
import type { PrepSession } from '~src/lib/fast50/prep.types';
import { confirmPermission } from '~src/rbac/confirm-permission';

export const metadata = {
    robots: { index: false, follow: false },
};

export default async function PrepStudioPage({
    params,
    searchParams,
}: {
    params: Promise<{ username: string; game: string; category: string }>;
    searchParams: Promise<{ session?: string }>;
}) {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'event');
    } catch {
        return <main className={styles.denied}>Not authorized.</main>;
    }

    const { username, game, category } = await params;
    const { session } = await searchParams;
    const u = decodeURIComponent(username);
    const g = decodeURIComponent(game);
    const c = decodeURIComponent(category);

    const [dossierPre, dossierPost] = await Promise.all([
        getRunnerDossier(u, g, c, 'pre'),
        getRunnerDossier(u, g, c, 'post'),
    ]);
    if (!dossierPre) {
        return (
            <main className={styles.denied}>
                No data found for this runner/game/category.
            </main>
        );
    }

    const sessions = await listPrepSessions(user.id, u, g, c).catch(() => []);
    const requested = session ? Number(session) : sessions[0]?.id;
    let initial: PrepSession | null = null;
    if (requested && Number.isInteger(requested) && requested > 0) {
        initial = await getPrepSession(user.id, requested).catch(() => null);
    }

    return (
        <main className={styles.page}>
            <Studio
                runner={{ username: u, game: g, category: c }}
                dossierPre={dossierPre}
                dossierPost={dossierPost}
                sessions={sessions}
                initial={initial}
            />
        </main>
    );
}
```

- [ ] **Step 2: Write `src/components/fast50/prep/studio.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
    createPrepAction,
    deletePrepAction,
    savePrepAction,
} from '~app/(fast50)/fast50/prep/actions';
import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import {
    emptyPrepData,
    type PrepSession,
    type PrepSessionData,
    type PrepSessionSummary,
    type PrepSlideRef,
} from '~src/lib/fast50/prep.types';
import { InterviewPanel } from './interview-panel';
import styles from './prep-studio.module.scss';

export const Studio = ({
    runner,
    dossierPre,
    dossierPost,
    sessions,
    initial,
}: {
    runner: { username: string; game: string; category: string };
    dossierPre: RunnerDossier;
    dossierPost: RunnerDossier | null;
    sessions: PrepSessionSummary[];
    initial: PrepSession | null;
}) => {
    const router = useRouter();
    const [session, setSession] = useState<PrepSession | null>(initial);
    const [label, setLabel] = useState(initial?.label ?? '');
    const [data, setData] = useState<PrepSessionData>(
        initial?.data ?? emptyPrepData(),
    );
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [newLabel, setNewLabel] = useState('');
    const [deckTab, setDeckTab] = useState<'pre' | 'post'>('pre');
    const [selected, setSelected] = useState<PrepSlideRef | null>(null);

    const studioPath = `/fast50/prep/${encodeURIComponent(runner.username)}/${encodeURIComponent(runner.game)}/${encodeURIComponent(runner.category)}`;

    const onChange = (next: PrepSessionData) => {
        setData(next);
        setDirty(true);
    };

    const onSave = async () => {
        if (!session || saving) return;
        setSaving(true);
        setError(null);
        try {
            const updated = await savePrepAction(session.id, { label, data });
            setSession(updated);
            setDirty(false);
            setSavedAt(new Date());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const onCreate = async (duplicate: boolean) => {
        const trimmed = newLabel.trim();
        if (!trimmed) return;
        setError(null);
        try {
            const created = await createPrepAction({
                ...runner,
                label: trimmed,
                data: duplicate ? data : undefined,
            });
            setNewLabel('');
            router.push(`${studioPath}?session=${created.id}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Create failed');
        }
    };

    const onDelete = async () => {
        if (!session) return;
        if (!window.confirm(`Delete prep session '${session.label}'?`)) return;
        await deletePrepAction(session.id);
        router.push(studioPath);
    };

    // Ctrl+S saves; leaving with unsaved changes warns.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                onSave();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    return (
        <>
            <div className={styles.header}>
                <h1 className={styles.headerTitle}>
                    {runner.username} — {runner.game} — {runner.category}
                </h1>
                <select
                    value={session?.id ?? ''}
                    onChange={(e) =>
                        router.push(
                            e.target.value
                                ? `${studioPath}?session=${e.target.value}`
                                : studioPath,
                        )
                    }
                >
                    {sessions.length === 0 ? (
                        <option value="">no sessions yet</option>
                    ) : null}
                    {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.label}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="New session label (e.g. fast50 #3)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                />
                <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={() => onCreate(false)}
                >
                    New
                </button>
                <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={() => onCreate(true)}
                    disabled={!session}
                >
                    Duplicate
                </button>
                <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={onDelete}
                    disabled={!session}
                >
                    Delete
                </button>
                <Link className={styles.buttonGhost} href="/fast50/prep">
                    ← runners
                </Link>
            </div>

            {session ? (
                <>
                    <div className={styles.row}>
                        <label className={styles.field}>
                            Session label
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => {
                                    setLabel(e.target.value);
                                    setDirty(true);
                                }}
                            />
                        </label>
                        <button
                            type="button"
                            className={styles.button}
                            onClick={onSave}
                            disabled={!dirty || saving}
                        >
                            {saving ? 'Saving…' : dirty ? 'Save (Ctrl+S)' : 'Saved'}
                        </button>
                        {savedAt ? (
                            <span className={styles.savedAt}>
                                saved {savedAt.toLocaleTimeString()}
                            </span>
                        ) : null}
                        {error ? (
                            <span className={styles.error}>{error}</span>
                        ) : null}
                    </div>

                    <div className={styles.studio}>
                        <InterviewPanel
                            data={data}
                            splits={dossierPre.splits.map((s) => ({
                                index: s.index,
                                name: s.name,
                            }))}
                            onChange={onChange}
                        />
                        {/* Task 12: builder + preview */}
                        <div />
                        <div />
                    </div>
                </>
            ) : (
                <p className={styles.itemMeta}>
                    Create a session to start prepping this run.
                </p>
            )}
        </>
    );
};
```

(`deckTab`, `selected`, `dossierPost` are consumed by Task 12's panes — if lint flags them as unused at this commit, prefix with `_` now and rename back in Task 12.)

- [ ] **Step 3: Write `src/components/fast50/prep/interview-panel.tsx`**

```tsx
'use client';

import React, { useState } from 'react';
import { clipUploadUrlAction } from '~app/(fast50)/fast50/prep/actions';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import type {
    PrepFact,
    PrepSessionData,
} from '~src/lib/fast50/prep.types';
import { parseTimeInput } from '~src/lib/fast50/time-input';
import styles from './prep-studio.module.scss';

const uploadClip = (
    file: File,
    onProgress: (pct: number) => void,
): Promise<string> =>
    clipUploadUrlAction(file.type, file.size).then(
        ({ uploadUrl, videoUrl }) =>
            new Promise<string>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl);
                xhr.setRequestHeader('Content-Type', file.type);
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        onProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };
                xhr.onload = () =>
                    xhr.status >= 200 && xhr.status < 300
                        ? resolve(videoUrl)
                        : reject(new Error(`Upload failed (${xhr.status})`));
                xhr.onerror = () => reject(new Error('Upload failed'));
                xhr.send(file);
            }),
    );

export const InterviewPanel = ({
    data,
    splits,
    onChange,
}: {
    data: PrepSessionData;
    splits: { index: number; name: string }[];
    onChange: (data: PrepSessionData) => void;
}) => {
    const [targetInput, setTargetInput] = useState(
        data.interview.goal?.targetTimeMs
            ? formatTimeMs(data.interview.goal.targetTimeMs)
            : '',
    );
    const [uploadPct, setUploadPct] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [noteSplit, setNoteSplit] = useState(0);
    const [noteText, setNoteText] = useState('');

    const setInterview = (
        interview: Partial<PrepSessionData['interview']>,
    ) => onChange({ ...data, interview: { ...data.interview, ...interview } });

    const targetMs = parseTimeInput(targetInput);

    const onFile = async (file: File | undefined) => {
        if (!file) return;
        if (file.type !== 'video/mp4') {
            setUploadError('mp4 only');
            return;
        }
        setUploadError(null);
        setUploadPct(0);
        try {
            const videoUrl = await uploadClip(file, setUploadPct);
            onChange({
                ...data,
                clips: [
                    ...data.clips,
                    {
                        id: crypto.randomUUID(),
                        videoUrl,
                        title: file.name.replace(/\.mp4$/i, ''),
                    },
                ],
            });
        } catch (e) {
            setUploadError(e instanceof Error ? e.message : 'Upload failed');
        } finally {
            setUploadPct(null);
        }
    };

    return (
        <div className={styles.pane}>
            <div className={styles.paneTitle}>Interview</div>

            <label className={styles.field}>
                What's the goal tonight? (The Called Shot)
                <input
                    type="text"
                    placeholder="e.g. sub 1:40, survive Water Temple"
                    value={data.interview.goal?.text ?? ''}
                    onChange={(e) =>
                        setInterview({
                            goal: e.target.value
                                ? {
                                      text: e.target.value,
                                      targetTimeMs:
                                          data.interview.goal?.targetTimeMs,
                                  }
                                : undefined,
                        })
                    }
                />
            </label>
            <label className={styles.field}>
                Target time (mm:ss or h:mm:ss — optional)
                <input
                    type="text"
                    placeholder="1:40:00"
                    value={targetInput}
                    onChange={(e) => {
                        setTargetInput(e.target.value);
                        const ms = parseTimeInput(e.target.value);
                        if (data.interview.goal) {
                            setInterview({
                                goal: {
                                    text: data.interview.goal.text,
                                    targetTimeMs: ms,
                                },
                            });
                        }
                    }}
                />
                {targetInput && !targetMs ? (
                    <span className={styles.error}>unparseable time</span>
                ) : targetMs ? (
                    <span className={styles.itemMeta}>
                        = {formatTimeMs(targetMs)}
                    </span>
                ) : null}
            </label>

            <div className={styles.paneTitle}>Quotes (Runner's Words)</div>
            {data.interview.quotes.map((q, i) => (
                <div key={q.id} className={styles.itemCard}>
                    <textarea
                        rows={2}
                        value={q.text}
                        onChange={(e) => {
                            const quotes = [...data.interview.quotes];
                            quotes[i] = { ...q, text: e.target.value };
                            setInterview({ quotes });
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Context (e.g. On nerves)"
                        value={q.context ?? ''}
                        onChange={(e) => {
                            const quotes = [...data.interview.quotes];
                            quotes[i] = {
                                ...q,
                                context: e.target.value || undefined,
                            };
                            setInterview({ quotes });
                        }}
                    />
                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() =>
                            setInterview({
                                quotes: data.interview.quotes.filter(
                                    (x) => x.id !== q.id,
                                ),
                            })
                        }
                    >
                        remove
                    </button>
                </div>
            ))}
            <button
                type="button"
                className={styles.buttonGhost}
                onClick={() =>
                    setInterview({
                        quotes: [
                            ...data.interview.quotes,
                            { id: crypto.randomUUID(), text: '' },
                        ],
                    })
                }
            >
                + quote
            </button>

            <div className={styles.paneTitle}>Fact cards</div>
            {data.interview.facts.map((f, i) => {
                const update = (patch: Partial<PrepFact>) => {
                    const facts = [...data.interview.facts];
                    facts[i] = { ...f, ...patch };
                    setInterview({ facts });
                };
                return (
                    <div key={f.id} className={styles.itemCard}>
                        <select
                            value={f.template}
                            onChange={(e) =>
                                update({
                                    template: e.target
                                        .value as PrepFact['template'],
                                })
                            }
                        >
                            <option value="fact">Fact</option>
                            <option value="versus">Versus</option>
                            <option value="history">History</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Title / kicker"
                            value={f.title ?? ''}
                            onChange={(e) =>
                                update({ title: e.target.value || undefined })
                            }
                        />
                        <input
                            type="text"
                            placeholder={
                                f.template === 'versus' ? 'Left value' : 'Body'
                            }
                            value={f.body}
                            onChange={(e) => update({ body: e.target.value })}
                        />
                        {f.template === 'versus' ? (
                            <input
                                type="text"
                                placeholder="Right value"
                                value={f.secondary ?? ''}
                                onChange={(e) =>
                                    update({
                                        secondary:
                                            e.target.value || undefined,
                                    })
                                }
                            />
                        ) : null}
                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() =>
                                setInterview({
                                    facts: data.interview.facts.filter(
                                        (x) => x.id !== f.id,
                                    ),
                                })
                            }
                        >
                            remove
                        </button>
                    </div>
                );
            })}
            <button
                type="button"
                className={styles.buttonGhost}
                onClick={() =>
                    setInterview({
                        facts: [
                            ...data.interview.facts,
                            {
                                id: crypto.randomUUID(),
                                template: 'fact',
                                body: '',
                            },
                        ],
                    })
                }
            >
                + fact
            </button>

            <div className={styles.paneTitle}>Clips (Watch For This)</div>
            {data.clips.map((clip, i) => (
                <div key={clip.id} className={styles.itemCard}>
                    <input
                        type="text"
                        placeholder="Title"
                        value={clip.title}
                        onChange={(e) => {
                            const clips = [...data.clips];
                            clips[i] = { ...clip, title: e.target.value };
                            onChange({ ...data, clips });
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Caption (what to watch for)"
                        value={clip.caption ?? ''}
                        onChange={(e) => {
                            const clips = [...data.clips];
                            clips[i] = {
                                ...clip,
                                caption: e.target.value || undefined,
                            };
                            onChange({ ...data, clips });
                        }}
                    />
                    <video src={clip.videoUrl} controls muted height={120} />
                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() =>
                            onChange({
                                ...data,
                                clips: data.clips.filter(
                                    (x) => x.id !== clip.id,
                                ),
                            })
                        }
                    >
                        remove
                    </button>
                </div>
            ))}
            <label className={styles.field}>
                Upload mp4
                <input
                    type="file"
                    accept="video/mp4"
                    onChange={(e) => onFile(e.target.files?.[0])}
                />
                {uploadPct !== null ? (
                    <span className={styles.itemMeta}>
                        uploading… {uploadPct}%
                    </span>
                ) : null}
                {uploadError ? (
                    <span className={styles.error}>{uploadError}</span>
                ) : null}
            </label>

            <div className={styles.paneTitle}>Roadmap notes</div>
            {data.roadmapNotes.map((n) => (
                <div key={n.splitIndex} className={styles.itemCard}>
                    <span className={styles.itemLabel}>
                        {splits.find((s) => s.index === n.splitIndex)?.name ??
                            `split ${n.splitIndex}`}
                    </span>
                    <span className={styles.itemMeta}>{n.text}</span>
                    <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() =>
                            onChange({
                                ...data,
                                roadmapNotes: data.roadmapNotes.filter(
                                    (x) => x.splitIndex !== n.splitIndex,
                                ),
                            })
                        }
                    >
                        remove
                    </button>
                </div>
            ))}
            <div className={styles.row}>
                <select
                    value={noteSplit}
                    onChange={(e) => setNoteSplit(Number(e.target.value))}
                >
                    {splits.map((s) => (
                        <option key={s.index} value={s.index}>
                            {s.name}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Note"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                />
                <button
                    type="button"
                    className={styles.buttonGhost}
                    onClick={() => {
                        if (!noteText.trim()) return;
                        onChange({
                            ...data,
                            roadmapNotes: [
                                ...data.roadmapNotes.filter(
                                    (x) => x.splitIndex !== noteSplit,
                                ),
                                { splitIndex: noteSplit, text: noteText.trim() },
                            ],
                        });
                        setNoteText('');
                    }}
                >
                    + note
                </button>
            </div>
        </div>
    );
};
```

- [ ] **Step 4: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add "app/(fast50)/fast50/prep" src/components/fast50/prep
git commit -m "feat(fast50): prep studio with interview panel and save"
```

---

### Task 12: Frontend — deck builder + live preview panes

**Files:**
- Create: `src/components/fast50/prep/deck-builder.tsx`
- Create: `src/components/fast50/prep/preview-pane.tsx`
- Modify: `src/components/fast50/prep/studio.tsx` (replace the two placeholder `<div />`s)

**Interfaces:**
- Consumes: `composePreppedDeck`, `composeDeck`, `evaluators`, `SLIDE_COMPONENTS`, `CUSTOM_SLIDE_COMPONENTS`, `customSlidesFromPrep`, `headlineForCustom`, fast50 + studio styles.
- Produces:
  - `DeckBuilder`: props `{ deck: DeckKind; dossier: RunnerDossier; data: PrepSessionData; onChange: (data: PrepSessionData) => void; selected: PrepSlideRef | null; onSelect: (ref: PrepSlideRef) => void }`
  - `PreviewPane`: props `{ dossier: RunnerDossier; data: PrepSessionData; selected: PrepSlideRef | null }`
  - Editing the builder always **freezes** the order (writes `data.deckOrder[deck]`); "Reset to auto" deletes it (back to default interleave).

- [ ] **Step 1: Write `deck-builder.tsx`**

```tsx
'use client';

import React from 'react';
import { composeDeck } from '~src/components/fast50/deck/compose-deck';
import { composePreppedDeck } from '~src/components/fast50/deck/compose-prepped-deck';
import type {
    DeckKind,
    RunnerDossier,
} from '~src/lib/fast50/dossier.types';
import {
    customSlidesFromPrep,
    headlineForCustom,
    type PrepSessionData,
    type PrepSlideRef,
} from '~src/lib/fast50/prep.types';
import styles from './prep-studio.module.scss';

const refKey = (r: PrepSlideRef) => `${r.kind}:${r.id}`;

export const DeckBuilder = ({
    deck,
    dossier,
    data,
    onChange,
    selected,
    onSelect,
}: {
    deck: DeckKind;
    dossier: RunnerDossier;
    data: PrepSessionData;
    onChange: (data: PrepSessionData) => void;
    selected: PrepSlideRef | null;
    onSelect: (ref: PrepSlideRef) => void;
}) => {
    const frozen = deck === 'pre' ? data.deckOrder?.pre : data.deckOrder?.post;
    const composed = composePreppedDeck(dossier, data);
    const included: PrepSlideRef[] =
        frozen ??
        composed.slides
            .filter((s) => !s.overflow)
            .map((s) =>
                s.custom
                    ? { kind: 'custom' as const, id: s.id }
                    : { kind: 'stat' as const, id: s.id },
            );

    const custom = customSlidesFromPrep(data, deck);
    const includedKeys = new Set(included.map(refKey));
    const pool: { ref: PrepSlideRef; label: string }[] = [
        ...composeDeck(dossier).map((s) => ({
            ref: { kind: 'stat' as const, id: s.id },
            label: s.id,
        })),
        ...custom.map((c) => ({
            ref: { kind: 'custom' as const, id: c.id },
            label: `✦ ${headlineForCustom(c.content)}`,
        })),
    ].filter((p) => !includedKeys.has(refKey(p.ref)));

    const labelFor = (ref: PrepSlideRef): string => {
        if (ref.kind === 'stat') return ref.id;
        const item = custom.find((c) => c.id === ref.id);
        return item ? `✦ ${headlineForCustom(item.content)}` : `✦ ${ref.id}`;
    };

    const setOrder = (refs: PrepSlideRef[]) =>
        onChange({
            ...data,
            deckOrder: { ...data.deckOrder, [deck]: refs },
        });

    const move = (i: number, dir: -1 | 1) => {
        const next = [...included];
        const j = i + dir;
        if (j < 0 || j >= next.length) return;
        [next[i], next[j]] = [next[j], next[i]];
        setOrder(next);
    };

    const resetToAuto = () => {
        const deckOrder = { ...data.deckOrder };
        delete deckOrder[deck];
        onChange({
            ...data,
            deckOrder:
                deckOrder.pre || deckOrder.post ? deckOrder : undefined,
        });
    };

    return (
        <div className={styles.pane}>
            <div className={styles.row}>
                <span className={styles.paneTitle}>
                    Deck — {frozen ? 'curated (frozen)' : 'auto order'}
                </span>
                {frozen ? (
                    <button
                        type="button"
                        className={styles.buttonGhost}
                        onClick={resetToAuto}
                    >
                        Reset to auto
                    </button>
                ) : null}
            </div>
            {composed.warnings.map((w) => (
                <div key={w} className={styles.warning}>
                    ⚠ {w}
                </div>
            ))}
            <div className={styles.deckList}>
                {included.map((ref, i) => (
                    <div
                        key={refKey(ref)}
                        className={styles.deckItem}
                        data-custom={ref.kind === 'custom' || undefined}
                        data-selected={
                            (selected && refKey(selected) === refKey(ref)) ||
                            undefined
                        }
                    >
                        <button
                            type="button"
                            className={styles.deckItemLabel}
                            onClick={() => onSelect(ref)}
                        >
                            {i + 1}. {labelFor(ref)}
                        </button>
                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => move(i, -1)}
                        >
                            ↑
                        </button>
                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => move(i, 1)}
                        >
                            ↓
                        </button>
                        <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() =>
                                setOrder(included.filter((_, j) => j !== i))
                            }
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
            {pool.length > 0 ? (
                <>
                    <div className={styles.paneTitle}>Available</div>
                    <div className={styles.deckList}>
                        {pool.map((p) => (
                            <div
                                key={refKey(p.ref)}
                                className={styles.deckItem}
                                data-custom={
                                    p.ref.kind === 'custom' || undefined
                                }
                            >
                                <span className={styles.deckItemLabel}>
                                    {p.label}
                                </span>
                                <button
                                    type="button"
                                    className={styles.iconButton}
                                    onClick={() =>
                                        setOrder([...included, p.ref])
                                    }
                                >
                                    + add
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
};
```

Note: `composeDeck(dossier)` in the pool lists every stat slide with data (including overflow) so anything can be added; stat slides with no data never appear (their `evaluate` returned null).

- [ ] **Step 2: Write `preview-pane.tsx`**

The preview renders the *real* slide component scaled down. Caveat (accepted in design): slide typography uses `vw` units, which track the browser viewport rather than the scaled 1920px canvas, so proportions in the preview are approximate — the "open deck" link gives the pixel-faithful check.

```tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import fast50Styles from '~src/components/fast50/deck/fast50.module.scss';
import { evaluators, type SlideId } from '~src/components/fast50/deck/evaluators';
import {
    CUSTOM_SLIDE_COMPONENTS,
    SLIDE_COMPONENTS,
} from '~src/components/fast50/slides/slide-registry';
import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import {
    customSlidesFromPrep,
    type PrepSessionData,
    type PrepSlideRef,
} from '~src/lib/fast50/prep.types';
import styles from './prep-studio.module.scss';

export const PreviewPane = ({
    dossier,
    data,
    selected,
}: {
    dossier: RunnerDossier;
    data: PrepSessionData;
    selected: PrepSlideRef | null;
}) => {
    const [stage, setStage] = useState(0);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.4);

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() =>
            setScale(el.clientWidth / 1920),
        );
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // isSlide distinguishes a real slide render (goes inside the scaled
    // 1920×1080 stage) from placeholder/warning text (renders as pane copy).
    let slide: React.ReactNode = (
        <p className={styles.itemMeta}>Select a slide to preview.</p>
    );
    let isSlide = false;
    if (selected) {
        if (selected.kind === 'stat') {
            const evaluate = evaluators[selected.id as SlideId];
            const evaluation = evaluate ? evaluate(dossier) : null;
            const Component = SLIDE_COMPONENTS[selected.id as SlideId];
            if (evaluation && Component) {
                isSlide = true;
                slide = (
                    <Component
                        dossier={dossier}
                        evaluation={evaluation}
                        stage={stage}
                        prep={data}
                    />
                );
            } else {
                slide = (
                    <p className={styles.warning}>
                        ⚠ no data for '{selected.id}' — this slide will be
                        dropped at showtime
                    </p>
                );
            }
        } else {
            const item = customSlidesFromPrep(data, dossier.deck).find(
                (c) => c.id === selected.id,
            );
            if (item) {
                const Component = CUSTOM_SLIDE_COMPONENTS[item.content.kind];
                isSlide = true;
                slide = (
                    <Component
                        dossier={dossier}
                        content={item.content}
                        stage={stage}
                    />
                );
            }
        }
    }
    return (
        <div className={`${styles.pane} ${styles.preview}`}>
            <div className={styles.row}>
                <span className={styles.paneTitle}>Preview</span>
                {[0, 1, 2].map((s) => (
                    <button
                        key={s}
                        type="button"
                        className={styles.tab}
                        data-active={stage === s || undefined}
                        onClick={() => setStage(s)}
                    >
                        stage {s}
                    </button>
                ))}
            </div>
            {isSlide ? (
                <div ref={viewportRef} className={styles.previewViewport}>
                    <div
                        className={`${styles.previewScale} ${fast50Styles.stage} ${fast50Styles.stageEmbedded}`}
                        style={{ transform: `scale(${scale})` }}
                    >
                        {slide}
                    </div>
                </div>
            ) : (
                slide
            )}
        </div>
    );
};
```

- [ ] **Step 3: Wire the panes into `studio.tsx`**

Replace the `{/* Task 12: builder + preview */}` region:

```tsx
                    <div className={styles.studio}>
                        <InterviewPanel
                            data={data}
                            splits={dossierPre.splits.map((s) => ({
                                index: s.index,
                                name: s.name,
                            }))}
                            onChange={onChange}
                        />
                        <div>
                            <div className={styles.tabs}>
                                <button
                                    type="button"
                                    className={styles.tab}
                                    data-active={deckTab === 'pre' || undefined}
                                    onClick={() => setDeckTab('pre')}
                                >
                                    pre-run
                                </button>
                                <button
                                    type="button"
                                    className={styles.tab}
                                    data-active={
                                        deckTab === 'post' || undefined
                                    }
                                    onClick={() => setDeckTab('post')}
                                    disabled={!dossierPost}
                                >
                                    post-run
                                </button>
                            </div>
                            <DeckBuilder
                                deck={deckTab}
                                dossier={
                                    deckTab === 'post' && dossierPost
                                        ? dossierPost
                                        : dossierPre
                                }
                                data={data}
                                onChange={onChange}
                                selected={selected}
                                onSelect={setSelected}
                            />
                        </div>
                        <PreviewPane
                            dossier={
                                deckTab === 'post' && dossierPost
                                    ? dossierPost
                                    : dossierPre
                            }
                            data={data}
                            selected={selected}
                        />
                    </div>
```

Add the imports (`DeckBuilder`, `PreviewPane`) and a "open deck in new tab" link in the header for the faithful check:

```tsx
                <Link
                    className={styles.buttonGhost}
                    href={`/fast50/screen/${encodeURIComponent(runner.username)}/${encodeURIComponent(runner.game)}/${encodeURIComponent(runner.category)}?deck=${deckTab}${session ? `&session=${session.id}` : ''}`}
                    target="_blank"
                >
                    Open deck ↗
                </Link>
```

- [ ] **Step 4: Verify + commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

```bash
git add src/components/fast50/prep
git commit -m "feat(fast50): prep studio deck builder and live preview"
```

---

### Task 13: Frontend — picker integration + final verification

**Files:**
- Modify: `app/(fast50)/fast50/screen/actions.ts`
- Modify: `app/(fast50)/fast50/screen/picker.tsx`
- Modify: `app/(fast50)/fast50/screen/[username]/[game]/[category]/page.tsx` (`session=none` opt-out)
- Modify: `src/components/fast50/deck/fast50.module.scss` (one picker style)

**Interfaces:**
- Consumes: everything prior.
- Produces: `RunnerLookup.runs[]` entries gain `prepSessions: PrepSessionSummary[]` and `prepWarnings: number`; deck URL contract gains `&session={id}` / `&session=none`.

- [ ] **Step 1: Extend `lookupRunner` in `app/(fast50)/fast50/screen/actions.ts`**

```typescript
'use server';

import { getSession } from '~src/actions/session.action';
import { composeDeck } from '~src/components/fast50/deck/compose-deck';
import { composePreppedDeck } from '~src/components/fast50/deck/compose-prepped-deck';
import { getRunnerDossier } from '~src/lib/fast50/dossier';
import { getPrepSession, listPrepSessions } from '~src/lib/fast50/prep';
import type { PrepSessionSummary } from '~src/lib/fast50/prep.types';
import { getUserRuns } from '~src/lib/get-user-runs';

export interface RunnerLookup {
    runs: {
        game: string;
        category: string;
        preSlides: number;
        postSlides: number;
        prepSessions: PrepSessionSummary[];
        prepWarnings: number;
    }[];
}

export const lookupRunner = async (
    username: string,
): Promise<RunnerLookup | { error: string }> => {
    const trimmed = username.trim();
    if (!trimmed) return { error: 'Enter a username' };
    const runs = await getUserRuns(trimmed).catch(() => 'error' as const);
    if (runs === 'error') return { error: 'Lookup failed — try again' };
    if (runs.length === 0) return { error: `No runs found for '${trimmed}'` };

    const user = await getSession().catch(() => null);

    const detailed = await Promise.all(
        runs.slice(0, 12).map(async (r) => {
            // Isolate each dossier call: a single malformed payload must not
            // reject the outer Promise.all and kill the whole lookup. A
            // failed dossier reads as slide count 0 below.
            const [pre, post] = await Promise.all([
                getRunnerDossier(trimmed, r.game, r.run, 'pre').catch(
                    () => null,
                ),
                getRunnerDossier(trimmed, r.game, r.run, 'post').catch(
                    () => null,
                ),
            ]);

            // Prep is best-effort: no auth or a backend failure just means
            // no prep info on the row.
            let prepSessions: PrepSessionSummary[] = [];
            let prepWarnings = 0;
            if (user?.id) {
                try {
                    prepSessions = await listPrepSessions(
                        user.id,
                        trimmed,
                        r.game,
                        r.run,
                    );
                    if (prepSessions[0]) {
                        const prep = (
                            await getPrepSession(user.id, prepSessions[0].id)
                        ).data;
                        prepWarnings =
                            (pre
                                ? composePreppedDeck(pre, prep).warnings.length
                                : 0) +
                            (post
                                ? composePreppedDeck(post, prep).warnings
                                      .length
                                : 0);
                    }
                } catch {
                    prepSessions = [];
                }
            }

            return {
                game: r.game,
                category: r.run,
                preSlides: pre
                    ? composeDeck(pre).filter((s) => !s.overflow).length
                    : 0,
                postSlides: post
                    ? composeDeck(post).filter((s) => !s.overflow).length
                    : 0,
                prepSessions,
                prepWarnings,
            };
        }),
    );
    return { runs: detailed };
};
```

- [ ] **Step 2: Picker UI — session select, prep link, warning badge**

In `picker.tsx`, inside the `result.runs.map((r) => ...)` row, add state above the return (top of the `Picker` component):

```tsx
    const [sessionSel, setSessionSel] = useState<Record<string, string>>({});
```

Replace the row body so links carry the chosen session and a prep column appears (keep the existing badges):

```tsx
                    {result.runs.map((r) => {
                        const preDanger = r.preSlides < 4;
                        const postDanger = r.postSlides < 4;
                        const rowKey = `${r.game}-${r.category}`;
                        const base = `/fast50/screen/${encodeURIComponent(lookedUp)}/${encodeURIComponent(r.game)}/${encodeURIComponent(r.category)}`;
                        const prepBase = `/fast50/prep/${encodeURIComponent(lookedUp)}/${encodeURIComponent(r.game)}/${encodeURIComponent(r.category)}`;
                        const selected =
                            sessionSel[rowKey] ??
                            (r.prepSessions[0]
                                ? String(r.prepSessions[0].id)
                                : '');
                        const sessionQs = selected
                            ? `&session=${selected}`
                            : r.prepSessions.length > 0
                              ? '&session=none'
                              : '';
                        return (
                            <li key={rowKey} className={styles.runRow}>
                                <span className={styles.runLabel}>
                                    {r.game} — {r.category}
                                </span>
                                {/* existing pre/post badges unchanged */}
                                {r.prepSessions.length > 0 ? (
                                    <select
                                        className={styles.pickerSessionSelect}
                                        value={selected}
                                        onChange={(e) =>
                                            setSessionSel((s) => ({
                                                ...s,
                                                [rowKey]: e.target.value,
                                            }))
                                        }
                                    >
                                        {r.prepSessions.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                prep: {s.label}
                                            </option>
                                        ))}
                                        <option value="">no prep</option>
                                    </select>
                                ) : null}
                                {r.prepWarnings > 0 ? (
                                    <span
                                        className={`${styles.badge} ${styles.badgeDanger}`}
                                        title="prepped slides will be dropped — open the prep studio"
                                    >
                                        {r.prepWarnings} prep ⚠
                                    </span>
                                ) : null}
                                <span className={styles.runLinks}>
                                    <Link href={`${base}?deck=pre${sessionQs}`}>
                                        Pre-run deck
                                    </Link>
                                    <Link href={`${base}?deck=post${sessionQs}`}>
                                        Post-run deck
                                    </Link>
                                    <Link href={prepBase}>Prep →</Link>
                                </span>
                            </li>
                        );
                    })}
```

Note the `'no prep'` option maps to `session=none` (explicit opt-out; without it the deck page would auto-load the latest session).

Add to `fast50.module.scss` near the other picker styles:

```scss
.pickerSessionSelect {
    background: #11151d;
    border: 1px solid #2a3342;
    color: inherit;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 14px;
}
```

- [ ] **Step 3: `session=none` opt-out on the deck page**

In the deck page's prep resolution (Task 9), honor the sentinel — wrap the whole `try` in:

```typescript
    if (session !== 'none') {
        try {
            // ... unchanged prep resolution ...
        } catch {
            prep = null;
        }
    }
```

- [ ] **Step 4: Full verification**

Run: `cd /home/joey/therun/therun-fr && npm run test && npm run typecheck && npm run lint && npm run build`
Expected: all pass; the build compiles every new route (`/fast50/prep`, `/fast50/prep/[username]/[game]/[category]`).

Then clear the build cache per project convention: `rm -rf .next`

- [ ] **Step 5: Commit + push both repos**

```bash
cd /home/joey/therun/therun-fr && git add "app/(fast50)" src/components/fast50 && git commit -m "feat(fast50): picker prep integration and session links"
git push -u origin fast50-stats-screen
cd /home/joey/therun/therun && git push -u origin fast50-prep-sessions
```

Do NOT open PRs (Joey opens them himself).

---

## Handoff notes (for Joey, after implementation)

1. **Backend deploy is blocking:** the frontend prep features 404 until the `fast50-prep-sessions` branch is deployed — run the drizzle migration (`npm run migrate` against the target DB per your usual process) and `cdk deploy` for the API stack (new `/fast50/*` routes + lambda code). Verify the API lambda's S3 write grant covers `fast50/clips/*`.
2. **Demo clip:** drop any small mp4 at `public/fast50-demo-clip.mp4` to see clip playback in `/fast50/screen/demo?prep=full`; without it the demo exercises the graceful-degradation card.
3. **Browser pass:** prep studio flows (create/save/duplicate/delete, upload, builder, preview), then a deck with `&session=` at 1920×1080.


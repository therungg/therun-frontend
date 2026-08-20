# User Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One `/settings` route tree with a sidebar that consolidates profile, general preferences, Patreon status, appearance, LiveSplit key and Story Mode, with the old pages redirecting to it.

**Architecture:** The `/manage` console chrome (header + sidebar + content slot) is extracted into `src/components/console-chrome/` and made game-agnostic; `/settings/layout.tsx` wraps every section page in it with a link-driven sidebar. Existing section components are moved in; write paths go through `apiFetch` server actions with bearer auth. Three backend `users` endpoints gain bearer-first auth resolution so `{user}` is a plain username.

**Tech Stack:** Next.js 16 App Router, React 19, vitest, SCSS modules, zod; backend AWS Lambda (TypeScript, vitest).

**Spec:** `docs/plans/2026-08-21-user-settings-design.md`

## Global Constraints

- Frontend: never push `main`; work on branch `user-settings` (already created, design doc committed on it). Joey opens PRs.
- Backend: branch `users-bearer-auth` in `/home/joey/therun/therun`; push to main auto-deploys (never `cdk deploy` manually); 15-minute post-deploy health monitoring is mandatory (`/home/joey/therun/.claude/monitoring/check-health.sh 15`).
- Backend goes first. Its composite-path fallback keeps the current frontend working in between.
- No new API Gateway routes (the `api` stack is at the CloudFormation resource cap).
- Never mention speedrun.com in user-facing copy. No SRC section.
- Use `updateTag` for read-your-writes after mutations, not `revalidateTag`.
- Server actions return `{ ok: true, ... } | { ok: false, error: string }`; never throw to the client.
- Formatting: Biome (4-space indent, single quotes, trailing commas). Unused vars prefixed `_`.
- `npm run typecheck` and `npm run lint` are NOT clean on main (~356 pre-existing errors). Gate on "no new errors vs main", not exit 0: `npm run typecheck 2>&1 | grep -c "error TS"` before/after.
- Kill any dev server you start before ending a turn. Check first: `ps -eo pid,args | grep "next dev" | grep -v grep`.

---

## File map

**Backend (`/home/joey/therun/therun`)**
- Create `src/api/users/resolve-user-target.ts` — bearer-first / composite-fallback auth resolution.
- Create `test/unit/api/users/resolve-user-target.test.ts`.
- Modify `src/api/users/handler.ts` — three branches (PUT `/users/{user}`, GET `/users/uploadKey/{user}`, POST `/users/patreon/{user}`).
- Create `test/unit/api/users/settings-bearer.test.ts`.

**Frontend (`/home/joey/therun/therun-fr`)**
- Move `app/(new-layout)/games-v2/[game]/manage/console/{console-chrome.tsx,console-sidebar.tsx,attention-badge.tsx,attention-badge-content.ts,attention-badge-content.test.ts,nav-icons.ts,console.module.scss}` → `src/components/console-chrome/`.
- Create `app/(new-layout)/settings/{layout.tsx,page.tsx,nav-model.ts,nav-model.test.ts,settings-chrome.tsx,login-required.tsx,settings.module.scss}`.
- Create `app/(new-layout)/settings/profile/{page.tsx,profile-form.tsx,profile-form.module.scss}`; `src/actions/update-profile.action.ts` + test; `src/lib/profile-schema.ts` + test.
- Create `app/(new-layout)/settings/preferences/{page.tsx,general-preferences.tsx}`.
- Move `app/(new-layout)/livesplit/*` → `app/(new-layout)/settings/livesplit/`; create `src/lib/get-upload-key.ts` (rewritten).
- Move `app/(new-layout)/change-appearance/*` → `app/(new-layout)/settings/appearance/` (customiser) and create `app/(new-layout)/settings/patreon/{page.tsx,patreon-status.tsx}`; create `src/actions/save-patreon-settings.action.ts` + test.
- Create `app/(new-layout)/settings/story-mode/page.tsx`.
- Modify `next.config.js` (redirects), `src/components/Topbar/topbar-nav-items.ts`, `src/components/Topbar/UserMenu.tsx`, `types/session.types.ts`, `src/components/user/userform.tsx`, `app/(new-layout)/[username]/wrapped/timezone-warning.tsx`, `app/(new-layout)/frontpage/sections/your-stats-client.tsx`, `src/actions/user-patreon-data.action.ts`.
- Delete `app/(new-layout)/upload-key/`, `app/(new-layout)/livesplit/`, `app/(new-layout)/change-appearance/`, `app/(new-layout)/stories/manage/page.tsx`, `app/api/users/[user]/upload-key/`, `app/api/users/[user]/patreon-settings/`, `src/lib/edit-user.ts`, `src/lib/save-patreon-settings.ts`, the PUT handler in `app/api/users/[user]/route.ts`.

---

## Task 1: Backend — `resolveUserTarget` helper

**Repo:** `/home/joey/therun/therun`. Create branch first: `git -C /home/joey/therun/therun checkout -b users-bearer-auth main`.

**Files:**
- Create: `src/api/users/resolve-user-target.ts`
- Test: `test/unit/api/users/resolve-user-target.test.ts`

**Interfaces:**
- Produces: `resolveUserTarget(event: APIGatewayProxyEvent, rawUser: string): Promise<{ authuser: User | null | undefined; username: string }>`. Bearer header present → `authuser` from `getAuthenticatedUserFromEvent`, `username = decodeURIComponent(rawUser)`. No header → split `rawUser` on the first `-` into `sessionId` and `username`, `authuser = getUserBySessionId(sessionId)`. Malformed percent-encoding falls back to the raw string.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/api/users/resolve-user-target.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/session/get-session", () => ({
  getUserBySessionId: vi.fn(),
}));
vi.mock("../../../../src/session/getAuthenticatedUserFromEvent", () => ({
  getAuthenticatedUserFromEvent: vi.fn(),
}));

import { resolveUserTarget } from "../../../../src/api/users/resolve-user-target";
import { getUserBySessionId } from "../../../../src/session/get-session";
import { getAuthenticatedUserFromEvent } from "../../../../src/session/getAuthenticatedUserFromEvent";

const ev = (headers: Record<string, string>) => ({ headers }) as any;

describe("resolveUserTarget", () => {
  beforeEach(() => {
    vi.mocked(getUserBySessionId).mockReset();
    vi.mocked(getAuthenticatedUserFromEvent).mockReset();
  });

  it("uses the bearer token and treats {user} as a plain username", async () => {
    vi.mocked(getAuthenticatedUserFromEvent).mockResolvedValue({ user: "mod" } as any);
    const r = await resolveUserTarget(ev({ Authorization: "Bearer abc" }), "joey");
    expect(r).toEqual({ authuser: { user: "mod" }, username: "joey" });
    expect(getUserBySessionId).not.toHaveBeenCalled();
  });

  it("decodes a percent-encoded username on the bearer path", async () => {
    vi.mocked(getAuthenticatedUserFromEvent).mockResolvedValue({ user: "x" } as any);
    const r = await resolveUserTarget(
      ev({ Authorization: "Bearer abc" }),
      "%E3%81%8F%E3%82%82",
    );
    expect(r.username).toBe("くも");
  });

  it("keeps a dash inside a plain username on the bearer path", async () => {
    vi.mocked(getAuthenticatedUserFromEvent).mockResolvedValue({ user: "x" } as any);
    const r = await resolveUserTarget(ev({ Authorization: "Bearer abc" }), "a-b");
    expect(r.username).toBe("a-b");
  });

  it("falls back to the composite {sessionId}-{username} form without a header", async () => {
    vi.mocked(getUserBySessionId).mockResolvedValue({ user: "joey" } as any);
    const r = await resolveUserTarget(ev({}), "sess123-joey");
    expect(getUserBySessionId).toHaveBeenCalledWith("sess123");
    expect(r).toEqual({ authuser: { user: "joey" }, username: "joey" });
  });

  it("returns a null authuser when the bearer session is invalid", async () => {
    vi.mocked(getAuthenticatedUserFromEvent).mockResolvedValue(null as any);
    const r = await resolveUserTarget(ev({ Authorization: "Bearer nope" }), "joey");
    expect(r.authuser).toBeNull();
  });

  it("tolerates a malformed percent sequence", async () => {
    vi.mocked(getAuthenticatedUserFromEvent).mockResolvedValue({ user: "x" } as any);
    const r = await resolveUserTarget(ev({ Authorization: "Bearer abc" }), "bad%2seq");
    expect(r.username).toBe("bad%2seq");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/joey/therun/therun && npx vitest run --project unit test/unit/api/users/resolve-user-target.test.ts`
Expected: FAIL — cannot resolve `src/api/users/resolve-user-target`.

- [ ] **Step 3: Write the implementation**

```ts
// src/api/users/resolve-user-target.ts
import { APIGatewayProxyEvent } from "aws-lambda";
import { User } from "../../repositories/users";
import { getUserBySessionId } from "../../session/get-session";
import { getAuthenticatedUserFromEvent } from "../../session/getAuthenticatedUserFromEvent";

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/**
 * Resolves "who is calling" and "which user is the target" for the user
 * settings endpoints.
 *
 * Preferred form: `Authorization: Bearer {sessionId}` + `{user}` is a plain
 * username. Legacy form (no header): `{user}` is `{sessionId}-{username}`.
 * The legacy branch exists only until the last frontend caller is gone.
 */
export const resolveUserTarget = async (
  event: APIGatewayProxyEvent,
  rawUser: string,
): Promise<{ authuser: User | null | undefined; username: string }> => {
  const header = event.headers?.["Authorization"] ?? event.headers?.["authorization"];
  if (header) {
    const authuser = await getAuthenticatedUserFromEvent(event);
    return { authuser, username: safeDecode(rawUser) };
  }
  const dash = rawUser.indexOf("-");
  const sessionId = dash === -1 ? rawUser : rawUser.slice(0, dash);
  const username = dash === -1 ? "" : safeDecode(rawUser.slice(dash + 1));
  const authuser = await getUserBySessionId(sessionId);
  return { authuser, username };
};
```

Note: `getAuthenticatedUserFromEvent` reads only `event.headers["Authorization"]`. If the lowercase-header test matters for API Gateway HTTP API style events, leave it — REST API passes the header case as sent and every existing caller uses `Authorization`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit test/unit/api/users/resolve-user-target.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
cd /home/joey/therun/therun
git add src/api/users/resolve-user-target.ts test/unit/api/users/resolve-user-target.test.ts
git commit -m "feat(users): resolveUserTarget — bearer-first auth with composite-path fallback"
```

---

## Task 2: Backend — wire the three settings endpoints, push, monitor

**Files:**
- Modify: `src/api/users/handler.ts` — the three `params.user.split("-")` branches at (current line numbers) ~306 (`uploadKey` GET), ~318 (`/users/patreon` POST), ~332 (`PUT /users/{user}` profile edit). Do NOT touch the run-level DELETE/PUT branches at ~150 and ~195.
- Test: `test/unit/api/users/settings-bearer.test.ts`

**Interfaces:**
- Consumes: `resolveUserTarget` from Task 1.
- Produces (API contract the frontend relies on):
  - `PUT /users/{username}` with `Authorization: Bearer` and JSON body `{ pronouns?, aka?, country?, timezone?, bio?, socials?: { youtube?, twitter?, bluesky? } }` → existing `editUser` response.
  - `GET /users/uploadKey/{username}` with bearer → `{ result: string }` (the upload key).
  - `POST /users/patreon/{username}` with bearer + `PatronPreferences` body → existing `setPatreonPreferences` response.
  - Permission: `edit user` for PUT/POST (self via the `{user: user.user}` rule; admins via manage-all); `view-restricted run` for the key. Unauthenticated → 403.

- [ ] **Step 1: Write the failing handler test**

```ts
// test/unit/api/users/settings-bearer.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/repositories/users", () => ({
  getUser: vi.fn(async (name: string) => ({
    user: name,
    banned: false,
    roles: [],
    moderatedGames: [],
    uploadKey: `key-of-${name}`,
  })),
  findUser: vi.fn(),
  editUser: vi.fn(async () => ({ statusCode: 200, body: "{}" })),
  getUserByUploadKey: vi.fn(),
  resetUploadKey: vi.fn(),
}));
vi.mock("../../../../src/repositories/runs", () => ({
  deleteRun: vi.fn(), editRun: vi.fn(), getRun: vi.fn(),
  getRunByCustomUrl: vi.fn(), getUserRuns: vi.fn(), highlightRun: vi.fn(),
}));
vi.mock("../../../../src/search/algolia-client", () => ({ getRunsIndex: vi.fn() }));
vi.mock("../../../../src/session/get-session", () => ({ getUserBySessionId: vi.fn() }));
vi.mock("../../../../src/session/getAuthenticatedUserFromEvent", () => ({
  getAuthenticatedUserFromEvent: vi.fn(),
}));
vi.mock("../../../../src/patreon/set-patreon-preferences", () => ({
  default: vi.fn(async () => ({ saved: true })),
}));
vi.mock("../../../../src/story-mode/preferences/set-story-mode-preferences", () => ({
  setStoryModePreferences: vi.fn(),
}));
vi.mock("../../../../src/services/users-db", () => ({
  getFrontpageConfig: vi.fn(), getPreferences: vi.fn(), updateFrontpageConfig: vi.fn(),
  updatePreferences: vi.fn(), updateUserCountry: vi.fn(),
}));
vi.mock("../../../../src/db/backfill-user-activity", () => ({ resetActivityBackfill: vi.fn() }));
vi.mock("../../../../src/db", () => ({ getDb: vi.fn() }));
vi.mock("../../../../src/sync/cleanup-deleted-run", () => ({ cleanupDeletedRun: vi.fn() }));
vi.mock("../../../../src/repositories/user-card", () => ({ getUserCardStats: vi.fn() }));
vi.mock("../../../../src/services/anonymize-redaction", () => ({
  resolveAnonymizedUsernames: vi.fn(async () => new Set<string>()),
}));
vi.mock("../../../../src/services/plugin-usage", () => ({ getPluginUsage: vi.fn() }));

import { handleUsers } from "../../../../src/api/users/handler";
import { editUser } from "../../../../src/repositories/users";
import setPatreonPreferences from "../../../../src/patreon/set-patreon-preferences";
import { getUserBySessionId } from "../../../../src/session/get-session";
import { getAuthenticatedUserFromEvent } from "../../../../src/session/getAuthenticatedUserFromEvent";

const self = { user: "joey", roles: [], banned: false, moderatedGames: [] } as any;
const admin = { user: "boss", roles: ["admin"], banned: false, moderatedGames: [] } as any;

const bearer = (path: string, method: string, user: string, body?: unknown) =>
  ({
    path,
    httpMethod: method,
    pathParameters: { user },
    headers: { Authorization: "Bearer sess" },
    body: body === undefined ? null : JSON.stringify(body),
  }) as any;

const composite = (path: string, method: string, user: string, body?: unknown) =>
  ({
    path,
    httpMethod: method,
    pathParameters: { user },
    headers: {},
    body: body === undefined ? null : JSON.stringify(body),
  }) as any;

describe("settings endpoints accept bearer auth with a plain username", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUserFromEvent).mockReset();
    vi.mocked(getUserBySessionId).mockReset();
    vi.mocked(editUser).mockClear();
    vi.mocked(setPatreonPreferences).mockClear();
  });

  it("PUT /users/{user}: self edits own profile", async () => {
    vi.mocked(getAuthenticatedUserFromEvent).mockResolvedValue(self);
    const res = await handleUsers(bearer("/users/joey", "PUT", "joey", { bio: "hi" }));
    expect(res.statusCode).toBe(200);
    expect(editUser).toHaveBeenCalledWith(expect.objectContaining({ user: "joey" }), { bio: "hi" });
  });

  it("PUT /users/{user}: admin edits another user", async () => {
    vi.mocked(getAuthenticatedUserFromEvent).mockResolvedValue(admin);
    const res = await handleUsers(bearer("/users/joey", "PUT", "joey", { bio: "x" }));
    expect(res.statusCode).toBe(200);
    expect(editUser).toHaveBeenCalledWith(expect.objectContaining({ user: "joey" }), { bio: "x" });
  });

  it("PUT /users/{user}: a different plain user is forbidden", async () => {
    vi.mocked(getAuthenticatedUserFromEvent).mockResolvedValue({ ...self, user: "other" });
    await expect(handleUsers(bearer("/users/joey", "PUT", "joey", { bio: "x" }))).rejects.toThrow();
    expect(editUser).not.toHaveBeenCalled();
  });

  it("PUT /users/{user}: still accepts the composite legacy form", async () => {
    vi.mocked(getUserBySessionId).mockResolvedValue(self);
    const res = await handleUsers(composite("/users/sess-joey", "PUT", "sess-joey", { bio: "z" }));
    expect(res.statusCode).toBe(200);
    expect(getUserBySessionId).toHaveBeenCalledWith("sess");
  });

  it("GET /users/uploadKey/{user}: returns the caller's key with bearer", async () => {
    vi.mocked(getAuthenticatedUserFromEvent).mockResolvedValue(self);
    const res = await handleUsers(bearer("/users/uploadKey/joey", "GET", "joey"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ result: "key-of-joey" });
  });

  it("GET /users/uploadKey/{user}: 403 with no session", async () => {
    vi.mocked(getAuthenticatedUserFromEvent).mockResolvedValue(null as any);
    const res = await handleUsers(bearer("/users/uploadKey/joey", "GET", "joey"));
    expect(res.statusCode).toBe(403);
  });

  it("POST /users/patreon/{user}: saves preferences with bearer", async () => {
    vi.mocked(getAuthenticatedUserFromEvent).mockResolvedValue(self);
    const res = await handleUsers(bearer("/users/patreon/joey", "POST", "joey", { bold: true }));
    expect(res.statusCode).toBe(200);
    expect(setPatreonPreferences).toHaveBeenCalledWith("joey", { bold: true });
  });
});
```

Check how the existing handler surfaces a `confirmPermission` failure on these branches (it throws; `api-entry.ts` converts to a 403/500 upstream). If the PUT-forbidden test fails because the handler catches and returns a response instead, change the assertion to `expect(res.statusCode).toBe(403)` — match actual behaviour, do not change the handler's error shape.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit test/unit/api/users/settings-bearer.test.ts`
Expected: the bearer-path tests FAIL (the handler splits `"joey"` on `-` → `sessionId="joey"`, `username=undefined`).

- [ ] **Step 3: Replace the three branches**

Import at the top of `src/api/users/handler.ts`:

```ts
import { resolveUserTarget } from "./resolve-user-target";
```

uploadKey branch (the `else` inside the `/users/uploadKey` block):

```ts
      } else {
        const { authuser, username } = await resolveUserTarget(event, params.user);
        if (!authuser) return forbidden("Invalid session");
        confirmPermission(authuser, "view-restricted", "run", username);
        const user = await getUser(username, false, true);
        response = user.uploadKey;
      }
```

patreon branch:

```ts
    } else if (event.path.toLowerCase().startsWith("/users/patreon")) {
      const { authuser, username } = await resolveUserTarget(event, params.user);
      confirmPermission(authuser, "edit", "user", username);
      response = await setPatreonPreferences(
        username,
        JSON.parse(event.body as string),
      );
    } else {
```

profile PUT branch:

```ts
      if (event.httpMethod === "PUT") {
        const { authuser, username } = await resolveUserTarget(event, params.user);
        confirmPermission(authuser, "edit", "user", username);
        const user = await getUser(username, false, true);
        const body = JSON.parse(event.body as string);
        const editResult = await editUser(user as User, body);
        if (editResult.statusCode === 200) {
          try {
            await updateUserCountry(username, body.country || null);
          } catch (e) {
            console.error("Failed to sync country to Postgres:", e);
          }
        }
        return editResult;
      } else {
```

Remove the now-unused `let [sessionId, username] = ...` + try/catch decode lines from those three branches only.

- [ ] **Step 4: Run the whole unit suite**

Run: `npm test`
Expected: all pass, including `global-decode.test.ts` and the new file.

- [ ] **Step 5: Commit, push to main, monitor**

```bash
git add src/api/users/handler.ts test/unit/api/users/settings-bearer.test.ts
git commit -m "feat(users): settings endpoints accept bearer auth + plain username (composite fallback kept)"
git checkout main && git merge --ff-only users-bearer-auth && git push origin main
```

Then, per the monitoring rule: run `/home/joey/therun/.claude/monitoring/check-health.sh 15` immediately and at ~5/10/15 minutes; confirm `https://api.therun.gg/live` is 200; confirm the current (composite) profile save on therun.gg still works by loading a profile page. Report the outcome in the conversation. Frontend tasks may start in parallel with the monitoring window because the composite fallback keeps production working either way.

---

## Task 3: Frontend — extract the console chrome into `src/components/console-chrome/`

**Files:**
- Move (git mv): from `app/(new-layout)/games-v2/[game]/manage/console/` → `src/components/console-chrome/`: `console-chrome.tsx`, `console-sidebar.tsx`, `attention-badge.tsx`, `attention-badge-content.ts`, `attention-badge-content.test.ts`, `nav-icons.ts`, `console.module.scss`.
- Modify: every importer of those files (found with the grep in Step 3).
- Test: existing `nav-model.test.ts`, `tile-grid.test.tsx`, `attention-badge-content.test.ts`, `form-kit.test.tsx` must keep passing.

**Interfaces:**
- Produces: `ConsoleChrome` with the new props below. `ConsoleSidebar` generic over `string` ids, with an `icons: Record<string, IconType>` prop and optional `ariaLabel`. `NAV_ICON` stays the manage console's icon map (moved file keeps exporting it; its `NavItemId` import becomes a relative import of the manage `nav-model`). Manage-side behaviour unchanged.

```ts
// src/components/console-chrome/console-chrome.tsx — new Props
export interface ConsoleHeader {
    eyebrow: string;          // "Admin" | "Settings"
    title: string;            // game display name | "@username"
    titleHref: string;        // where the title links
    image?: string | null;    // optional 3:4 cover (manage passes game.image)
    actions?: ReactNode;      // right-hand slot (manage: "All your games" + BackLink)
}
interface Props {
    header: ConsoleHeader;
    groups: NavGroup[];                 // NavGroup from './nav-types'
    icons: Record<string, IconType>;
    activeItem: string | null;
    onNavigate: (id: string) => void;
    attentionCount?: number;            // default 0
    badgeDegraded?: boolean;
    navAriaLabel?: string;              // default 'Console navigation'
    children: ReactNode;
}
```

```ts
// src/components/console-chrome/nav-types.ts (new, tiny)
export interface NavItem { id: string; label: string; reserved?: boolean }
export interface NavGroup { id: string; label: string; items: NavItem[] }
```

- [ ] **Step 1: Move the files**

```bash
cd /home/joey/therun/therun-fr
mkdir -p src/components/console-chrome
C="app/(new-layout)/games-v2/[game]/manage/console"
for f in console-chrome.tsx console-sidebar.tsx attention-badge.tsx attention-badge-content.ts attention-badge-content.test.ts nav-icons.ts console.module.scss; do git mv "$C/$f" src/components/console-chrome/$f; done
```

- [ ] **Step 2: Generalise the moved files**

Create `src/components/console-chrome/nav-types.ts` with the two interfaces above.

`console-sidebar.tsx`: replace the `NavGroup, NavItemId` import with `import type { NavGroup } from './nav-types'` and `import type { Icon as IconType } from 'react-bootstrap-icons'`; props become `{ groups, icons, activeItem: string | null, onSelect: (id: string) => void, attentionCount?: number, badgeDegraded?: boolean, ariaLabel?: string }`; `const Icon = icons[item.id]` and render `{Icon && <Icon … />}`; `<nav aria-label={ariaLabel ?? 'Console navigation'}>`. Keep the `item.id === 'attention'` badge (inert when count is 0 — `attentionBadgeContent` already returns null for 0).

`console-chrome.tsx`: apply the `Props` above. Header JSX becomes:

```tsx
{header.image && (
    <img className={styles.cover} src={header.image} alt="" width={44} height={59} loading="eager" />
)}
<div>
    <div className={styles.eyebrow}>{header.eyebrow}</div>
    <h1 className={styles.title}>
        <Link href={header.titleHref} className={styles.titleLink}>{header.title}</Link>
    </h1>
</div>
{header.actions && <div className={styles.headerActions}>{header.actions}</div>}
```

Fix the two relative imports that pointed at the manage tree: `useDialogBehavior` → `'~app/(new-layout)/games-v2/[game]/shared/board-dialog'`; drop the `BackLink` and `ResolvedGame` imports (manage passes BackLink through `header.actions`). Pass `icons`/`navAriaLabel` through to `ConsoleSidebar`.

`nav-icons.ts`: change `import type { NavItemId } from './nav-model'` to `import type { NavItemId } from '~app/(new-layout)/games-v2/[game]/manage/console/nav-model'`. (Manage-specific map; it stays exported from here because `tile-grid.tsx` and the sidebar both read it.)

`attention-badge.tsx` / `attention-badge-content.ts`: no changes besides the SCSS import, which is already relative.

In `app/(new-layout)/games-v2/[game]/manage/console/nav-model.ts`, make the manage `NavGroup`/`NavItem` types satisfy the generic ones (they already do structurally — `NavItemId` is a string union). No change needed unless the typecheck complains; if it does, `import type { NavGroup as GenericNavGroup } from '~src/components/console-chrome/nav-types'` and annotate `buildNav(): NavGroup[]` unchanged (assignable).

- [ ] **Step 3: Update the manage-side callers**

```bash
grep -rln "console-chrome\|console-sidebar\|nav-icons\|attention-badge\|console\.module\.scss" "app/(new-layout)" src --include=*.ts --include=*.tsx --include=*.scss
```

For each hit, rewrite the import path to `~src/components/console-chrome/<file>`. Known sites: `manage/page.tsx`, `manage/loading.tsx`, `manage/loading.module.scss` (SCSS `@use`/composes — check and repoint), `game-tab/game-tab.tsx`, `moderation/attention/mod-applications-card.tsx`, `moderation/roster/roster-view.tsx`, `moderation/runner/[userId]/runner-view.tsx`, `src-import/src-import-pane.tsx`, `reassignments/reassign-pane.tsx`, `levels/levels-pane.tsx`, `levels/level-categories-pane.tsx`, and inside `console/`: `console-shell.tsx`, `subroute-chrome.tsx`, `tile-grid.tsx`, `tile-grid.test.tsx`, `content-router.tsx` (grep inside the console dir too).

`console-shell.tsx` and `subroute-chrome.tsx`: build the header prop —

```tsx
import { BackLink } from '../../shared/back-link';
import { NAV_ICON } from '~src/components/console-chrome/nav-icons';
…
<ConsoleChrome
    header={{
        eyebrow: 'Admin',
        title: game.display,
        titleHref: `/games-v2/${encodeURIComponent(game.name)}/manage`,
        image: game.image,
        actions: (
            <>
                {moderatedGamesCount > 1 && (
                    <Link href="/games-v2/manage" className={styles.allGamesLink}>All your games</Link>
                )}
                <BackLink href={`/games-v2/${encodeURIComponent(game.name)}`} label="Back to leaderboard" />
            </>
        ),
    }}
    icons={NAV_ICON}
    navAriaLabel="Game admin console"
    groups={groups}
    activeItem={activeItem}
    onNavigate={(id) => navigate(id as NavItemId)}
    attentionCount={attentionCount}
    badgeDegraded={badgeDegraded}
>
```

(`styles` here is `~src/components/console-chrome/console.module.scss`, for `.allGamesLink`.) Confirm `BackLink` resolves — the original import was `'../../shared/back-link'` relative to the console dir, i.e. `app/(new-layout)/games-v2/[game]/shared/back-link.tsx`. Keep the same relative path from `console-shell.tsx`/`subroute-chrome.tsx` since they did not move.

- [ ] **Step 4: Verify**

Run: `npx vitest run "app/(new-layout)/games-v2/[game]/manage" src/components/console-chrome`
Expected: all pass.

Run: `npm run typecheck 2>&1 | grep -c "error TS"` and compare with the same command on `main` (`git stash` is not needed — run it once before Step 1 and record the number). Expected: no increase.

Browser: start `npm run dev`, open `/games-v2/<any game you moderate>/manage` — header, sidebar, panes, and the mobile drawer (≤768px) behave exactly as before. Kill the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: extract console chrome into src/components/console-chrome (game-agnostic header)"
```

---

## Task 4: Settings shell — nav model, chrome, layout, index redirect

**Files:**
- Create: `app/(new-layout)/settings/nav-model.ts`, `nav-model.test.ts`, `settings-chrome.tsx`, `login-required.tsx`, `settings.module.scss`, `layout.tsx`, `page.tsx`

**Interfaces:**
- Produces: `SETTINGS_GROUPS: NavGroup[]`, `SETTINGS_ICONS: Record<SettingsItemId, IconType>`, `settingsHref(id): string`, `activeSettingsItem(pathname: string): SettingsItemId | null`. Section pages (Tasks 6–10) render inside `layout.tsx` and may assume a logged-in session (`getSession()` again is cached per request — cheap).

- [ ] **Step 1: Write the failing nav-model test**

```ts
// app/(new-layout)/settings/nav-model.test.ts
import { describe, expect, it } from 'vitest';
import {
    activeSettingsItem,
    SETTINGS_GROUPS,
    SETTINGS_ICONS,
    settingsHref,
} from './nav-model';

describe('settings nav model', () => {
    it('lists the six phase-1 sections in order', () => {
        expect(SETTINGS_GROUPS.flatMap((g) => g.items.map((i) => i.id))).toEqual([
            'profile',
            'preferences',
            'patreon',
            'appearance',
            'livesplit',
            'story-mode',
        ]);
    });

    it('has an icon for every item', () => {
        for (const g of SETTINGS_GROUPS)
            for (const i of g.items) expect(SETTINGS_ICONS[i.id]).toBeDefined();
    });

    it('maps ids to hrefs', () => {
        expect(settingsHref('profile')).toBe('/settings/profile');
        expect(settingsHref('story-mode')).toBe('/settings/story-mode');
    });

    it('resolves the active item from the pathname', () => {
        expect(activeSettingsItem('/settings/livesplit')).toBe('livesplit');
        expect(activeSettingsItem('/settings/patreon?code=abc')).toBe('patreon');
        expect(activeSettingsItem('/settings')).toBeNull();
        expect(activeSettingsItem('/settings/unknown')).toBeNull();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "app/(new-layout)/settings"`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the nav model**

```ts
// app/(new-layout)/settings/nav-model.ts
// Pure IA for /settings. No React, no fetching.
import {
    BookHalf,
    Gear,
    Heart,
    type Icon as IconType,
    Key,
    Palette,
    PersonCircle,
} from 'react-bootstrap-icons';
import type { NavGroup } from '~src/components/console-chrome/nav-types';

export type SettingsItemId =
    | 'profile'
    | 'preferences'
    | 'patreon'
    | 'appearance'
    | 'livesplit'
    | 'story-mode';

export const SETTINGS_GROUPS: NavGroup[] = [
    {
        id: 'account',
        label: 'Account',
        items: [
            { id: 'profile', label: 'Profile' },
            { id: 'preferences', label: 'General preferences' },
        ],
    },
    {
        id: 'supporter',
        label: 'Supporter',
        items: [
            { id: 'patreon', label: 'Patreon' },
            { id: 'appearance', label: 'Appearance' },
        ],
    },
    {
        id: 'tools',
        label: 'Tools',
        items: [
            { id: 'livesplit', label: 'LiveSplit key' },
            { id: 'story-mode', label: 'Story Mode' },
        ],
    },
];

export const SETTINGS_ICONS: Record<SettingsItemId, IconType> = {
    profile: PersonCircle,
    preferences: Gear,
    patreon: Heart,
    appearance: Palette,
    livesplit: Key,
    'story-mode': BookHalf,
};

const ALL_IDS = new Set<string>(
    SETTINGS_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
);

export function settingsHref(id: SettingsItemId): string {
    return `/settings/${id}`;
}

export function activeSettingsItem(pathname: string): SettingsItemId | null {
    const path = pathname.split('?')[0];
    const seg = path.replace(/^\/settings\/?/, '').split('/')[0];
    return seg && ALL_IDS.has(seg) ? (seg as SettingsItemId) : null;
}
```

(If any icon name is missing from the installed `react-bootstrap-icons`, pick a neighbour from the same package — check `node_modules/react-bootstrap-icons/dist/icons/` — do not add a dependency.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run "app/(new-layout)/settings"`
Expected: 4 passed.

- [ ] **Step 5: Write the chrome, login gate, layout and index**

```tsx
// app/(new-layout)/settings/settings-chrome.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { ConsoleChrome } from '~src/components/console-chrome/console-chrome';
import {
    activeSettingsItem,
    SETTINGS_GROUPS,
    SETTINGS_ICONS,
    type SettingsItemId,
    settingsHref,
} from './nav-model';

export function SettingsChrome({
    username,
    children,
}: {
    username: string;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    return (
        <ConsoleChrome
            header={{
                eyebrow: 'Settings',
                title: username,
                titleHref: `/${encodeURIComponent(username)}`,
            }}
            groups={SETTINGS_GROUPS}
            icons={SETTINGS_ICONS}
            navAriaLabel="Settings"
            activeItem={activeSettingsItem(pathname)}
            onNavigate={(id) => router.push(settingsHref(id as SettingsItemId))}
        >
            {children}
        </ConsoleChrome>
    );
}
```

```tsx
// app/(new-layout)/settings/login-required.tsx
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import styles from './settings.module.scss';

export function LoginRequired({ returnTo }: { returnTo: string }) {
    return (
        <div className={styles.loginRequired}>
            <h1>Settings</h1>
            <p>Log in with Twitch to manage your account settings.</p>
            <TwitchLoginButton returnTo={returnTo} />
        </div>
    );
}
```

```scss
// app/(new-layout)/settings/settings.module.scss
.loginRequired {
    max-width: 40rem;
    margin: 4rem auto;
    padding: 0 1rem;
    text-align: center;
    display: grid;
    gap: 1rem;
    justify-items: center;
}

// Shared page scaffolding for every section pane.
.pane {
    display: grid;
    gap: 1.5rem;
    max-width: 56rem;
}

.paneHeader {
    display: grid;
    gap: 0.25rem;
}

.paneTitle {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
}

.paneLede {
    margin: 0;
    opacity: 0.75;
}
```

```tsx
// app/(new-layout)/settings/layout.tsx
import type { ReactNode } from 'react';
import { getSession } from '~src/actions/session.action';
import { LoginRequired } from './login-required';
import { SettingsChrome } from './settings-chrome';

export default async function SettingsLayout({
    children,
}: {
    children: ReactNode;
}) {
    const session = await getSession();
    if (!session.id || !session.username) {
        return <LoginRequired returnTo="/settings" />;
    }
    return <SettingsChrome username={session.username}>{children}</SettingsChrome>;
}
```

```tsx
// app/(new-layout)/settings/page.tsx
import { redirect } from 'next/navigation';

export default function SettingsIndex() {
    redirect('/settings/profile');
}
```

Check how other `(new-layout)` pages using `getSession()` handle `cacheComponents` — `stories/manage/page.tsx` is an `async` server component that calls `getSession()` directly, so the same works in a layout. If the build complains about dynamic data in a layout under `cacheComponents`, wrap `{children}` access in `<Suspense>` per Next 16 guidance; do not add `'use cache'` here (it reads cookies).

- [ ] **Step 6: Verify in the browser**

Start `npm run dev`. Logged out: `/settings` shows the login gate. Logged in: `/settings` redirects to `/settings/profile` (404 content for now — the page arrives in Task 6), sidebar shows three groups/six items, header shows "Settings / <username>", clicking items changes the URL, mobile drawer works. Kill the dev server.

- [ ] **Step 7: Commit**

```bash
git add "app/(new-layout)/settings"
git commit -m "feat(settings): /settings shell — nav model, chrome, login gate, index redirect"
```

---

## Task 5: Profile schema + `updateProfile` server action

**Files:**
- Create: `src/lib/profile-schema.ts`, `src/lib/__tests__/profile-schema.test.ts`
- Create: `src/actions/update-profile.action.ts`, `src/actions/__tests__/update-profile.action.test.ts`
- Modify: `types/session.types.ts` (add `bio?`, `aka?`, `country?`, `socials.bluesky?`)

**Interfaces:**
- Produces: `ProfileInput` (zod-inferred) `{ pronouns?: string; aka?: string; country?: string; timezone?: string; bio?: string; socials?: { youtube?: string; twitter?: string; bluesky?: string } }`; `profileSchema`; `normaliseHandle(kind: 'youtube' | 'twitter', value: string): string`; `updateProfile(input: ProfileInput): Promise<{ ok: true } | { ok: false; error: string }>`.
- Consumes: `apiFetch`, `getSession`, `updateTag` (`next/cache`), backend `PUT /users/{username}` from Task 2.

- [ ] **Step 1: Write the failing schema test**

```ts
// src/lib/__tests__/profile-schema.test.ts
import { describe, expect, it } from 'vitest';
import { normaliseHandle, profileSchema } from '../profile-schema';

describe('profileSchema', () => {
    it('accepts a full valid payload', () => {
        const r = profileSchema.safeParse({
            pronouns: 'they/them',
            aka: 'J',
            country: 'NL',
            timezone: 'Europe/Amsterdam',
            bio: 'hi',
            socials: { youtube: 'joey', twitter: 'joey', bluesky: 'joey.bsky.social' },
        });
        expect(r.success).toBe(true);
    });

    it('rejects a bio over 100 characters', () => {
        expect(profileSchema.safeParse({ bio: 'x'.repeat(101) }).success).toBe(false);
    });

    it('rejects an aka over 25 characters', () => {
        expect(profileSchema.safeParse({ aka: 'x'.repeat(26) }).success).toBe(false);
    });

    it('maps the "no country" sentinel to an empty string', () => {
        const r = profileSchema.parse({ country: 'Show no country' });
        expect(r.country).toBe('');
    });

    it('rejects an unknown country code', () => {
        expect(profileSchema.safeParse({ country: 'ZZ' }).success).toBe(false);
    });
});

describe('normaliseHandle', () => {
    it('strips youtube.com/ and youtu.be/ prefixes', () => {
        expect(normaliseHandle('youtube', 'https://youtube.com/@joey')).toBe('@joey');
        expect(normaliseHandle('youtube', 'https://youtu.be/joey')).toBe('joey');
    });
    it('strips twitter.com/ prefixes', () => {
        expect(normaliseHandle('twitter', 'https://twitter.com/joey')).toBe('joey');
    });
    it('leaves bare handles alone', () => {
        expect(normaliseHandle('twitter', 'joey')).toBe('joey');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/__tests__/profile-schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the schema**

```ts
// src/lib/profile-schema.ts
import { z } from 'zod';
import { countries } from '~src/common/countries';

export const NO_COUNTRY = 'Show no country';

const handle = z.string().trim().max(100).optional();

export const profileSchema = z.object({
    pronouns: z.string().trim().max(50).optional(),
    aka: z.string().trim().max(25).optional(),
    country: z
        .string()
        .trim()
        .optional()
        .transform((v) => (v === NO_COUNTRY ? '' : (v ?? '')))
        .refine((v) => v === '' || v in countries(), 'Unknown country'),
    timezone: z.string().trim().max(100).optional(),
    bio: z.string().trim().max(100).optional(),
    socials: z
        .object({ youtube: handle, twitter: handle, bluesky: handle })
        .optional(),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfilePayload = z.output<typeof profileSchema>;

/** Users paste URLs; the backend stores bare handles (matches the old form). */
export function normaliseHandle(kind: 'youtube' | 'twitter', value: string) {
    if (kind === 'twitter') {
        const parts = value.split('.com/');
        return parts[parts.length - 1];
    }
    let parts = value.split('.com/');
    if (parts.length === 1) parts = parts[0].split('.be/');
    return parts[parts.length - 1];
}
```

Confirm `zod` is already a dependency (`grep '"zod"' package.json`); the repo uses it in other actions. If `countries()` returns a Record keyed by ISO code, `v in countries()` is right; if it returns a Map, use `.has(v)`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/__tests__/profile-schema.test.ts`
Expected: 8 passed.

- [ ] **Step 5: Write the failing action test**

```ts
// src/actions/__tests__/update-profile.action.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    apiFetch: vi.fn(),
    updateTag: vi.fn(),
}));
vi.mock('~src/actions/session.action', () => ({ getSession: mocks.getSession }));
vi.mock('~src/lib/api-client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('~src/lib/api-client')>();
    return { ...actual, apiFetch: mocks.apiFetch };
});
vi.mock('next/cache', () => ({ updateTag: mocks.updateTag }));

import { ApiError } from '~src/lib/api-client';
import { updateProfile } from '../update-profile.action';

describe('updateProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSession.mockResolvedValue({ id: 'sess', username: 'joey' });
        mocks.apiFetch.mockResolvedValue(undefined);
    });

    it('refuses when not signed in', async () => {
        mocks.getSession.mockResolvedValue({ id: '', username: '' });
        const r = await updateProfile({ bio: 'x' });
        expect(r).toEqual({ ok: false, error: 'You must be signed in.' });
        expect(mocks.apiFetch).not.toHaveBeenCalled();
    });

    it('PUTs the normalised payload with bearer auth and updates the tag', async () => {
        const r = await updateProfile({
            bio: ' hi ',
            country: 'Show no country',
            socials: { youtube: 'https://youtube.com/@joey', twitter: 'joey' },
        });
        expect(r).toEqual({ ok: true });
        expect(mocks.apiFetch).toHaveBeenCalledWith('/users/joey', {
            method: 'PUT',
            sessionId: 'sess',
            body: {
                bio: 'hi',
                country: '',
                socials: { youtube: '@joey', twitter: 'joey' },
            },
        });
        expect(mocks.updateTag).toHaveBeenCalledWith('user-joey');
    });

    it('returns the validation message for bad input', async () => {
        const r = await updateProfile({ bio: 'x'.repeat(101) });
        expect(r.ok).toBe(false);
        expect(mocks.apiFetch).not.toHaveBeenCalled();
    });

    it('maps a 403 to a permission message', async () => {
        mocks.apiFetch.mockRejectedValue(new ApiError(403, 'nope'));
        const r = await updateProfile({ bio: 'x' });
        expect(r).toEqual({ ok: false, error: "You don't have permission to do that." });
    });

    it('passes other API errors through', async () => {
        mocks.apiFetch.mockRejectedValue(new ApiError(500, 'boom'));
        expect(await updateProfile({ bio: 'x' })).toEqual({ ok: false, error: 'boom' });
    });

    it('encodes the username in the path', async () => {
        mocks.getSession.mockResolvedValue({ id: 'sess', username: 'くも' });
        await updateProfile({ bio: 'x' });
        expect(mocks.apiFetch.mock.calls[0][0]).toBe('/users/%E3%81%8F%E3%82%82');
    });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run src/actions/__tests__/update-profile.action.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Write the action and the type additions**

```ts
// src/actions/update-profile.action.ts
'use server';

import { updateTag } from 'next/cache';
import { ApiError, apiFetch } from '~src/lib/api-client';
import {
    normaliseHandle,
    type ProfileInput,
    profileSchema,
} from '~src/lib/profile-schema';
import { getSession } from './session.action';

export type ActionResult = { ok: true } | { ok: false; error: string };

export function mapApiError(e: unknown): ActionResult {
    if (e instanceof ApiError) {
        if (e.status === 403)
            return { ok: false, error: "You don't have permission to do that." };
        return { ok: false, error: e.message };
    }
    return { ok: false, error: 'Something went wrong. Please try again.' };
}

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
    const session = await getSession();
    if (!session?.id || !session.username) {
        return { ok: false, error: 'You must be signed in.' };
    }

    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }
    const body = { ...parsed.data };
    if (body.socials) {
        body.socials = {
            ...body.socials,
            ...(body.socials.youtube !== undefined && {
                youtube: normaliseHandle('youtube', body.socials.youtube),
            }),
            ...(body.socials.twitter !== undefined && {
                twitter: normaliseHandle('twitter', body.socials.twitter),
            }),
        };
    }

    try {
        await apiFetch(`/users/${encodeURIComponent(session.username)}`, {
            method: 'PUT',
            sessionId: session.id,
            body,
        });
    } catch (e) {
        return mapApiError(e);
    }

    updateTag(`user-${session.username}`);
    return { ok: true };
}
```

Note: `'use server'` files may only export async functions. Move `ActionResult` and `mapApiError` into `src/lib/action-result.ts` (plain module) and import them; the test mocks nothing there so it still works. Adjust the import in the action accordingly.

Check which cache tag the profile page actually uses for user data: `grep -rn "cacheTag(" src/lib/get-session-data.ts src/lib/*user*` — if the profile page's fetcher tags differently (or not at all), tag it `user-${username}` as part of this task so the `updateTag` call has something to hit. If the profile page has no `'use cache'` read at all, keep the `updateTag` call (harmless) and note it in the commit message.

`types/session.types.ts`:

```ts
    pronouns?: string;
    aka?: string;
    bio?: string;
    country?: string;
    …
    socials: { youtube: string; twitter: string; twitch: string; bluesky?: string };
```

- [ ] **Step 8: Run to verify it passes**

Run: `npx vitest run src/actions/__tests__/update-profile.action.test.ts src/lib/__tests__/profile-schema.test.ts`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/profile-schema.ts src/lib/action-result.ts src/lib/__tests__/profile-schema.test.ts src/actions/update-profile.action.ts src/actions/__tests__/update-profile.action.test.ts types/session.types.ts
git commit -m "feat(settings): typed updateProfile action via apiFetch + profile schema"
```

---

## Task 6: Profile page + retire inline editing on the public profile

**Files:**
- Create: `app/(new-layout)/settings/profile/page.tsx`, `profile-form.tsx`, `profile-form.module.scss`
- Modify: `src/components/user/userform.tsx` (display-only + "Edit profile" link), `app/(new-layout)/[username]/wrapped/timezone-warning.tsx`, `app/(new-layout)/[username]/user-profile.tsx` (drop `session` prop if now unused)
- Delete: `src/lib/edit-user.ts`; the `PUT` export in `app/api/users/[user]/route.ts` (keep `GET` — third-party overlays use it)

**Interfaces:**
- Consumes: `updateProfile`, `ProfileInput`, `NO_COUNTRY` (Task 5); `FormSection`, `SectionFooter`, `InlineError` from `~app/(new-layout)/games-v2/[game]/manage/shared/form-kit`; `getSession`; `UserData` from `~src/lib/get-session-data`.

- [ ] **Step 1: Page**

```tsx
// app/(new-layout)/settings/profile/page.tsx
import { getSession } from '~src/actions/session.action';
import { getUserData } from '~src/lib/get-session-data';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import { ProfileForm } from './profile-form';

export default async function ProfileSettingsPage() {
    const session = await getSession();
    const userData = await getUserData(session.username);
    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Profile</h1>
                <p className={styles.paneLede}>
                    What other runners see on your profile page.
                </p>
            </header>
            <ProfileForm initial={userData} />
        </div>
    );
}

export const metadata = buildMetadata({ title: 'Profile settings', index: false, follow: false });
```

Check the actual exported name of the user-data fetcher in `src/lib/get-session-data.ts` (the profile page calls something that returns `UserData`) and use that; if it is a `'use cache'` function, this is where the `user-${username}` `cacheTag` from Task 5 must live.

- [ ] **Step 2: Form**

```tsx
// app/(new-layout)/settings/profile/profile-form.tsx
'use client';

import { useState, useTransition } from 'react';
import TimezoneSelect from 'react-timezone-select';
import {
    FormSection,
    InlineError,
    SectionFooter,
} from '~app/(new-layout)/games-v2/[game]/manage/shared/form-kit';
import { updateProfile } from '~src/actions/update-profile.action';
import { countries } from '~src/common/countries';
import { Button } from '~src/components/Button/Button';
import { NO_COUNTRY, type ProfileInput } from '~src/lib/profile-schema';
import type { UserData } from '~src/lib/get-session-data';
import styles from './profile-form.module.scss';

export function ProfileForm({ initial }: { initial: UserData }) {
    const [form, setForm] = useState<ProfileInput>({
        pronouns: initial.pronouns ?? '',
        aka: initial.aka ?? '',
        country: initial.country || NO_COUNTRY,
        timezone:
            initial.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        bio: initial.bio ?? '',
        socials: {
            youtube: initial.socials?.youtube ?? '',
            twitter: initial.socials?.twitter ?? '',
            bluesky: initial.socials?.bluesky ?? '',
        },
    });
    const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) =>
        setForm((f) => ({ ...f, [k]: v }));
    const setSocial = (k: 'youtube' | 'twitter' | 'bluesky', v: string) =>
        setForm((f) => ({ ...f, socials: { ...f.socials, [k]: v } }));

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
            const r = await updateProfile(form);
            if (r.ok) setStatus('saved');
            else {
                setStatus('error');
                setError(r.error);
            }
        });
    };

    return (
        <form onSubmit={onSubmit} className={styles.form}>
            <FormSection title="About you">
                <div className={styles.grid}>
                    <label className={styles.field}>
                        <span>Pronouns</span>
                        <input value={form.pronouns} maxLength={50} placeholder="they/them"
                            onChange={(e) => set('pronouns', e.target.value)} />
                    </label>
                    <label className={styles.field}>
                        <span>Also known as</span>
                        <input value={form.aka} maxLength={25}
                            onChange={(e) => set('aka', e.target.value)} />
                    </label>
                    <label className={styles.field}>
                        <span>Country</span>
                        <select value={form.country} onChange={(e) => set('country', e.target.value)}>
                            <option value={NO_COUNTRY}>{NO_COUNTRY}</option>
                            {Object.entries(countries()).map(([code, name]) => (
                                <option key={code} value={code}>{name}</option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.field}>
                        <span>Timezone</span>
                        <TimezoneSelect className="timeZoneSelect" value={form.timezone ?? ''}
                            onChange={(tz) => set('timezone', tz.value)} />
                    </label>
                    <label className={`${styles.field} ${styles.full}`}>
                        <span>About (max. 100 characters)</span>
                        <textarea value={form.bio} maxLength={100} rows={3}
                            onChange={(e) => set('bio', e.target.value)} />
                    </label>
                </div>
            </FormSection>

            <FormSection title="Socials" lede="Paste a link or a handle.">
                <div className={styles.grid}>
                    <label className={styles.field}>
                        <span>YouTube</span>
                        <input value={form.socials?.youtube} maxLength={100} placeholder="youtube.com/…"
                            onChange={(e) => setSocial('youtube', e.target.value)} />
                    </label>
                    <label className={styles.field}>
                        <span>Twitter</span>
                        <input value={form.socials?.twitter} maxLength={100} placeholder="twitter.com/…"
                            onChange={(e) => setSocial('twitter', e.target.value)} />
                    </label>
                    <label className={styles.field}>
                        <span>Bluesky</span>
                        <input value={form.socials?.bluesky} maxLength={100} placeholder="bsky.app/profile/…"
                            onChange={(e) => setSocial('bluesky', e.target.value)} />
                    </label>
                </div>
            </FormSection>

            <SectionFooter>
                <Button type="submit" disabled={pending}>
                    {pending ? 'Saving…' : 'Save changes'}
                </Button>
                {status === 'saved' && <span role="status">Saved.</span>}
                {status === 'error' && error && <InlineError>{error}</InlineError>}
            </SectionFooter>
        </form>
    );
}
```

`profile-form.module.scss`:

```scss
.form { display: grid; gap: 1.5rem; }
.grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    @media (max-width: 640px) { grid-template-columns: 1fr; }
}
.field {
    display: grid;
    gap: 0.35rem;
    span { font-size: 0.85rem; font-weight: 600; }
    input, select, textarea {
        width: 100%;
        padding: 0.5rem 0.65rem;
        border-radius: 0.5rem;
        border: 1px solid var(--bs-border-color);
        background: var(--bs-body-bg);
        color: inherit;
    }
}
.full { grid-column: 1 / -1; }
```

Reset `status` back to `'idle'` on any field change (wrap `set`/`setSocial` to also call `setStatus('idle')`) so a stale "Saved." does not sit next to edited fields.

- [ ] **Step 3: Retire inline editing**

`src/components/user/userform.tsx`:
- Remove `session` and `editInfo` props, `editingInfo` state, the `Edit()` function and the `<Can>` button block.
- Keep `Display` and the handle-stripping logic (display still wants bare handles).
- Replace the `<Can>` block with:

```tsx
<Can I="edit" this={subject('user', username)}>
    <div className="mt-3">
        <Link href="/settings/profile" className="btn btn-outline-secondary btn-sm">
            Edit profile
        </Link>
    </div>
</Can>
```

(`Link` from `~src/components/link`.) Remove now-unused imports (`Form`, `Button`, `TimezoneSelect`, `countries` if only `Edit` used it — `CountryIcon` still needs `countries`).

`app/(new-layout)/[username]/user-profile.tsx`: both `<Userform username={username} userData={userData} />` — drop the `session` prop.

`app/(new-layout)/[username]/wrapped/timezone-warning.tsx`: replace the `<Userform … editInfo />` block with a link: `<Link href="/settings/profile" className="btn btn-primary">Set your timezone in Settings</Link>`. Remove the `Userform` import.

Delete `src/lib/edit-user.ts`. In `app/api/users/[user]/route.ts` delete the `PUT` export and the `editUser` import. `grep -rn "edit-user\|editUser" src app` must return nothing frontend-side.

- [ ] **Step 4: Verify**

Run: `npx vitest run` — all pass. Typecheck error count not above the recorded baseline.

Browser: `/settings/profile` loads with current values; change bio + country + a social URL, Save → "Saved."; reload → values persist (backend Task 2 deployed); `/<username>` shows the new values and an "Edit profile" link for the owner only. Kill the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(settings): profile page; public profile links to it instead of inline editing"
```

---

## Task 7: General preferences page

**Files:**
- Create: `app/(new-layout)/settings/preferences/page.tsx`, `general-preferences.tsx`
- Modify: `src/actions/user-preferences.action.ts` (return a result, `updateTag`), `app/(new-layout)/frontpage/sections/your-stats-client.tsx` (toggle → link)

**Interfaces:**
- Consumes: `toggleStreakVisibility`, `SwitchField` (form-kit), `getSession`.
- Produces: `toggleStreakVisibility(hideStreaks: boolean): Promise<{ ok: true } | { ok: false; error: string }>`.

- [ ] **Step 1: Harden the action**

```ts
// src/actions/user-preferences.action.ts
'use server';

import { updateTag } from 'next/cache';
import { type ActionResult, mapApiError } from '~src/lib/action-result';
import { apiFetch } from '~src/lib/api-client';
import { getSession } from './session.action';

export async function toggleStreakVisibility(
    hideStreaks: boolean,
): Promise<ActionResult> {
    const session = await getSession();
    if (!session?.user || !session.id) {
        return { ok: false, error: 'You must be signed in.' };
    }
    try {
        await apiFetch(`/users/${encodeURIComponent(session.user)}/preferences`, {
            method: 'PUT',
            sessionId: session.id,
            body: { hideStreaks },
        });
    } catch (e) {
        return mapApiError(e);
    }
    updateTag(`user-preferences-${session.user}`);
    return { ok: true };
}
```

Check the `cacheLife` profile of whatever reads `user-preferences-*` (`grep -rn "user-preferences-" src app`) — `updateTag` takes one argument, so nothing else changes. The frontpage caller ignores the return value today; that keeps compiling.

- [ ] **Step 2: Page + component**

```tsx
// app/(new-layout)/settings/preferences/page.tsx
import { getSession } from '~src/actions/session.action';
import { getUserPreferences } from '~src/lib/user-preferences';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import { GeneralPreferences } from './general-preferences';

export default async function PreferencesPage() {
    const session = await getSession();
    const prefs = await getUserPreferences(session.user);
    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>General preferences</h1>
            </header>
            <GeneralPreferences hideStreaks={prefs.hideStreaks ?? false} />
        </div>
    );
}

export const metadata = buildMetadata({ title: 'General preferences', index: false, follow: false });
```

Find the existing preferences reader first: `grep -rn "user-preferences-\|/preferences" src/lib app/\(new-layout\)/frontpage` — reuse whatever the frontpage uses to get `hideStreaks` (it passes `hideStreaks` into `YourStatsClient`). Import that instead of inventing `getUserPreferences` if one exists; if the frontpage reads it from `session.preferences.hideStreaks`, do the same here.

```tsx
// app/(new-layout)/settings/preferences/general-preferences.tsx
'use client';

import { useState, useTransition } from 'react';
import {
    FormSection,
    InlineError,
    SwitchField,
} from '~app/(new-layout)/games-v2/[game]/manage/shared/form-kit';
import { toggleStreakVisibility } from '~src/actions/user-preferences.action';

export function GeneralPreferences({ hideStreaks }: { hideStreaks: boolean }) {
    const [hide, setHide] = useState(hideStreaks);
    const [error, setError] = useState<string | null>(null);
    const [pending, start] = useTransition();

    const onChange = (next: boolean) => {
        setHide(next);
        setError(null);
        start(async () => {
            const r = await toggleStreakVisibility(next);
            if (!r.ok) {
                setHide(!next);
                setError(r.error);
            }
        });
    };

    return (
        <FormSection title="Front page">
            <SwitchField
                id="hide-streaks"
                label="Hide streaks"
                hint="Don't show run streaks in your stats on the front page."
                checked={hide}
                disabled={pending}
                onChange={onChange}
            />
            {error && <InlineError>{error}</InlineError>}
        </FormSection>
    );
}
```

- [ ] **Step 3: Frontpage card**

In `your-stats-client.tsx`, find where `handleToggleStreaks` is rendered (a switch/button around the `streaksHidden` state; `grep -n "handleToggleStreaks"`). Replace that control with a `<Link href="/settings/preferences">Streak settings</Link>` (`~src/components/link`). Remove `handleToggleStreaks`, `setStreaksHidden`, and the `toggleStreakVisibility` import; `streaksHidden` becomes `const streaksHidden = hideStreaksProp ?? false;`.

- [ ] **Step 4: Verify**

`npx vitest run` passes. Browser: `/settings/preferences` toggles and survives reload; the frontpage card shows the link and respects the setting. Kill the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(settings): general preferences page (hide streaks); frontpage card links to it"
```

---

## Task 8: LiveSplit key page

**Files:**
- Move: `app/(new-layout)/livesplit/{copy-upload-key.component.tsx,livesplit.module.scss,reset-upload-key.action.ts}` → `app/(new-layout)/settings/livesplit/`
- Create: `app/(new-layout)/settings/livesplit/page.tsx` (body from the old page)
- Rewrite: `src/lib/get-upload-key.ts`
- Delete: `app/(new-layout)/livesplit/page.tsx`, `app/(new-layout)/upload-key/` (whole dir), `app/api/users/[user]/upload-key/`

**Interfaces:**
- Produces: `getUploadKey(username: string, sessionId: string): Promise<string>`.
- Consumes: backend `GET /users/uploadKey/{username}` with bearer (Task 2).

- [ ] **Step 1: Move and rewrite**

```bash
mkdir -p "app/(new-layout)/settings/livesplit"
git mv "app/(new-layout)/livesplit/copy-upload-key.component.tsx" "app/(new-layout)/settings/livesplit/"
git mv "app/(new-layout)/livesplit/livesplit.module.scss" "app/(new-layout)/settings/livesplit/"
git mv "app/(new-layout)/livesplit/reset-upload-key.action.ts" "app/(new-layout)/settings/livesplit/"
git mv "app/(new-layout)/livesplit/page.tsx" "app/(new-layout)/settings/livesplit/page.tsx"
git rm -r "app/(new-layout)/upload-key" "app/api/users/[user]/upload-key"
```

```ts
// src/lib/get-upload-key.ts
import { apiFetch } from './api-client';

export async function getUploadKey(username: string, sessionId: string) {
    return apiFetch<string>(`/users/uploadKey/${encodeURIComponent(username)}`, {
        sessionId,
        cache: 'no-store',
    });
}
```

(Remove the `'use server'` directive — this is a plain server-side helper, not an action.)

`reset-upload-key.action.ts`: replace the hand-rolled `fetch` with `apiFetch`:

```ts
'use server';

import { getSession } from '~src/actions/session.action';
import { apiFetch } from '~src/lib/api-client';
import { mapApiError } from '~src/lib/action-result';

export async function resetUploadKeyAction(): Promise<{ uploadKey?: string; error?: string }> {
    const session = await getSession();
    if (!session.id || !session.username) return { error: 'Not authenticated' };
    try {
        const data = await apiFetch<{ uploadKey: string }>(
            `/users/${encodeURIComponent(session.username)}/reset-upload-key`,
            { method: 'POST', sessionId: session.id },
        );
        if (!data?.uploadKey) return { error: 'Unexpected response from server' };
        return { uploadKey: data.uploadKey };
    } catch (e) {
        const r = mapApiError(e);
        return { error: r.ok ? undefined : r.error };
    }
}
```

(`apiFetch` unwraps `.result`, so the `{ result: { uploadKey } }` envelope becomes `{ uploadKey }`.)

`page.tsx` in the new location: drop the `getBaseUrl` round-trip and the `session.username ? … : login prompt` branch (the layout already gates). Top of the component:

```tsx
const session = await getSession();
const uploadKey = await getUploadKey(session.username, session.id);
```

Keep the rest of the markup, wrap it in `<div className={paneStyles.pane}>` with the `paneHeader`/`paneTitle`/`paneLede` classes from `../settings.module.scss` replacing the old `header`/`pageTitle`/`subtitle` block. Metadata title: `'LiveSplit key'`.

- [ ] **Step 2: Verify**

`grep -rn "get-upload-key\|upload-key\|/livesplit" src app --include=*.ts --include=*.tsx` — only the new page and the Topbar item (updated in Task 10) should reference them. Browser: `/settings/livesplit` shows the masked key, reveal/copy work, Reset Key issues a new key and it survives reload. Kill the dev server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(settings): LiveSplit key page; key fetched with bearer auth; upload-key duplicate removed"
```

---

## Task 9: Patreon status page + Appearance page

**Files:**
- Move: `app/(new-layout)/change-appearance/{customization/,patreon-section.tsx,change-appearance.module.scss}` → `app/(new-layout)/settings/appearance/`; `login-with-patreon.tsx` → `app/(new-layout)/settings/patreon/login-with-patreon.tsx`
- Create: `app/(new-layout)/settings/appearance/page.tsx`, `app/(new-layout)/settings/patreon/page.tsx`, `patreon-status.tsx`, `src/actions/save-patreon-settings.action.ts`, `src/actions/__tests__/save-patreon-settings.action.test.ts`
- Modify: `src/actions/user-patreon-data.action.ts` (redirect_uri → `/settings/patreon`), `login-with-patreon.tsx` (OAuth redirect_uri + `returnTo`)
- Delete: `app/(new-layout)/change-appearance/page.tsx`, `src/lib/save-patreon-settings.ts`, `app/api/users/[user]/patreon-settings/`

**Interfaces:**
- Produces: `savePatreonSettings(prefs: PatronPreferences): Promise<ActionResult>`; `PatreonStatus` component.
- Consumes: `getUserPatreonData(searchParams)` (returns `{ tier, preferences } | null`), `UserPatreonData` type (exported from `patreon-section.tsx` — keep that export; update the two importers' paths).

- [ ] **Step 1: Failing action test**

```ts
// src/actions/__tests__/save-patreon-settings.action.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    apiFetch: vi.fn(),
    revalidateTag: vi.fn(),
}));
vi.mock('~src/actions/session.action', () => ({ getSession: mocks.getSession }));
vi.mock('~src/lib/api-client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('~src/lib/api-client')>();
    return { ...actual, apiFetch: mocks.apiFetch };
});
vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));

import { ApiError } from '~src/lib/api-client';
import { savePatreonSettings } from '../save-patreon-settings.action';

const prefs = { hide: false, bold: true } as any;

describe('savePatreonSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSession.mockResolvedValue({ id: 'sess', username: 'joey' });
        mocks.apiFetch.mockResolvedValue(undefined);
    });

    it('refuses when signed out', async () => {
        mocks.getSession.mockResolvedValue({ id: '', username: '' });
        expect(await savePatreonSettings(prefs)).toEqual({ ok: false, error: 'You must be signed in.' });
    });

    it('POSTs with bearer auth and revalidates the patrons tag', async () => {
        expect(await savePatreonSettings(prefs)).toEqual({ ok: true });
        expect(mocks.apiFetch).toHaveBeenCalledWith('/users/patreon/joey', {
            method: 'POST',
            sessionId: 'sess',
            body: prefs,
        });
        expect(mocks.revalidateTag).toHaveBeenCalledWith('patrons', 'hours');
    });

    it('maps a 403', async () => {
        mocks.apiFetch.mockRejectedValue(new ApiError(403, 'no'));
        expect(await savePatreonSettings(prefs)).toEqual({
            ok: false,
            error: "You don't have permission to do that.",
        });
    });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/actions/__tests__/save-patreon-settings.action.test.ts` → module not found.

- [ ] **Step 3: Action**

```ts
// src/actions/save-patreon-settings.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import { type ActionResult, mapApiError } from '~src/lib/action-result';
import { apiFetch } from '~src/lib/api-client';
import type { PatronPreferences } from '../../types/patreon.types';
import { getSession } from './session.action';

export async function savePatreonSettings(
    preferences: PatronPreferences,
): Promise<ActionResult> {
    const session = await getSession();
    if (!session?.id || !session.username) {
        return { ok: false, error: 'You must be signed in.' };
    }
    try {
        await apiFetch(`/users/patreon/${encodeURIComponent(session.username)}`, {
            method: 'POST',
            sessionId: session.id,
            body: preferences,
        });
    } catch (e) {
        return mapApiError(e);
    }
    // The patron list is read with cacheLife('hours'); stale-while-revalidate
    // is fine here — the customiser refreshes itself via router.refresh().
    revalidateTag('patrons', 'hours');
    return { ok: true };
}
```

- [ ] **Step 4: Run to verify it passes.**

- [ ] **Step 5: Move files and build the two pages**

```bash
mkdir -p "app/(new-layout)/settings/appearance" "app/(new-layout)/settings/patreon"
git mv "app/(new-layout)/change-appearance/customization" "app/(new-layout)/settings/appearance/customization"
git mv "app/(new-layout)/change-appearance/patreon-section.tsx" "app/(new-layout)/settings/appearance/patreon-section.tsx"
git mv "app/(new-layout)/change-appearance/change-appearance.module.scss" "app/(new-layout)/settings/patreon/patreon.module.scss"
git mv "app/(new-layout)/change-appearance/login-with-patreon.tsx" "app/(new-layout)/settings/patreon/login-with-patreon.tsx"
git rm "app/(new-layout)/change-appearance/page.tsx" src/lib/save-patreon-settings.ts
git rm -r "app/api/users/[user]/patreon-settings"
```

Fix imports: `grep -rn "change-appearance" src app` → repoint to the new paths (`user-patreon-data.action.ts` imports `UserPatreonData` from `patreon-section`; `login-with-patreon.tsx` imports its SCSS as `./patreon.module.scss`; `patreon-section.tsx` no longer imports `LoginWithPatreon` — see below).

`patreon-section.tsx`:
- Remove `axios`, `mutate`, `LoginWithPatreon` imports and the outer `PatreonSection` wrapper's non-patron branch. Export `PatreonSettings` as the default component (props `{ userPatreonData, session, tierOverride }`).
- `onSave`:

```tsx
const onSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
        const r = await savePatreonSettings({ ...prefs, colorPreference: 0 });
        if (!r.ok) {
            setSaveError(r.error);
            return;
        }
        router.refresh();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    } finally {
        setSaving(false);
    }
};
```

Add `const [saveError, setSaveError] = useState<string | null>(null)` and render it next to the save button. Drop `await mutate('/api/patreons')` — check `src/components/patreon/use-patrons.ts`: if it uses SWR keyed on `/api/patreons`, keep `mutate` (import from `swr`) so the topbar/scrollbar refresh; otherwise remove it.

`login-with-patreon.tsx`: `returnTo="/settings/patreon"`; `redirectUri = \`${baseUrl || 'https://therun.gg'}%2fsettings%2fpatreon\``. Keep the hardcoded client_id (it is a public OAuth client id).

`user-patreon-data.action.ts`: `safeEncodeURI(\`${baseUrl}/settings/patreon\`)`. Wrap the `code` exchange: if `patreonLinkData.ok` is false, return `null` — the status page reads `?code` presence + null result as "linking failed".

```tsx
// app/(new-layout)/settings/patreon/page.tsx
import { getBaseUrl } from '~src/actions/base-url.action';
import { getSession } from '~src/actions/session.action';
import { getUserPatreonData } from '~src/actions/user-patreon-data.action';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import { LoginWithPatreon } from './login-with-patreon';
import { PatreonStatus } from './patreon-status';

export default async function PatreonSettingsPage(props: {
    searchParams: Promise<{ [_: string]: string }>;
}) {
    const searchParams = await props.searchParams;
    const session = await getSession();
    const baseUrl = await getBaseUrl();
    const data = await getUserPatreonData(searchParams);
    const linkFailed = !!searchParams.code && !data;

    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Patreon</h1>
                <p className={styles.paneLede}>Your supporter status and account link.</p>
            </header>
            {data?.tier ? (
                <PatreonStatus tier={data.tier} />
            ) : (
                <>
                    {linkFailed && (
                        <p role="alert">Linking your Patreon account failed. Try again.</p>
                    )}
                    <LoginWithPatreon session={session} baseUrl={baseUrl} />
                </>
            )}
        </div>
    );
}

export const metadata = buildMetadata({ title: 'Patreon', index: false, follow: false });
```

```tsx
// app/(new-layout)/settings/patreon/patreon-status.tsx
import Link from '~src/components/link';
import { BunnyIcon } from '~src/icons/bunny-icon';
import styles from './patreon.module.scss';

export function PatreonStatus({ tier }: { tier: 1 | 2 | 3 }) {
    return (
        <div className={styles.statusCard}>
            <BunnyIcon size={32} />
            <div>
                <div className={styles.statusTitle}>Linked — Tier {tier}</div>
                <p>Thank you for supporting therun.gg.</p>
            </div>
            <div className={styles.statusActions}>
                <Link href="/settings/appearance" className="btn btn-primary btn-sm">
                    Customise your name
                </Link>
                <a href="https://patreon.com/therungg" target="_blank" rel="noreferrer"
                    className="btn btn-outline-secondary btn-sm">
                    Manage on Patreon
                </a>
            </div>
        </div>
    );
}
```

Add to `patreon.module.scss`:

```scss
.statusCard {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    align-items: center;
    padding: 1.25rem;
    border: 1px solid var(--bs-border-color);
    border-radius: 0.75rem;
}
.statusTitle { font-weight: 700; font-size: 1.1rem; }
.statusActions { grid-column: 1 / -1; display: flex; gap: 0.5rem; flex-wrap: wrap; }
```

```tsx
// app/(new-layout)/settings/appearance/page.tsx
import { getSession } from '~src/actions/session.action';
import { getUserPatreonData } from '~src/actions/user-patreon-data.action';
import Link from '~src/components/link';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';
import PatreonSettings from './patreon-section';

export default async function AppearancePage(props: {
    searchParams: Promise<{ [_: string]: string }>;
}) {
    const searchParams = await props.searchParams;
    const session = await getSession();
    const data = await getUserPatreonData({});
    const isAdmin = session.roles?.includes('admin') ?? false;
    const rawTier = isAdmin ? Number(searchParams.tier) : NaN;
    const tierOverride = isAdmin && [1, 2, 3].includes(rawTier) ? (rawTier as 1 | 2 | 3) : undefined;

    const canCustomise = !!data?.tier || isAdmin;

    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Appearance</h1>
                <p className={styles.paneLede}>How your name looks across the site.</p>
            </header>
            {canCustomise ? (
                <PatreonSettings
                    session={session}
                    userPatreonData={data ?? { tier: 3, preferences: null }}
                    tierOverride={tierOverride}
                />
            ) : (
                <p>
                    Name customisation is a supporter perk.{' '}
                    <Link href="/settings/patreon">Link your Patreon</Link> or{' '}
                    <Link href="/patron">become a supporter</Link>.
                </p>
            )}
        </div>
    );
}

export const metadata = buildMetadata({ title: 'Appearance', index: false, follow: false });
```

The admin `?tier=0` preview of the non-patron view is dropped (the non-patron view is now one sentence). Note it in the commit message.

- [ ] **Step 6: Verify**

`npx vitest run` passes; `grep -rn "change-appearance\|axios" src app "app/(new-layout)/settings"` shows no stale references (axios may remain elsewhere — only check the moved files). Browser: `/settings/patreon` (linked: status card; unlinked: invite + "Link your Patreon account" opens Patreon with `redirect_uri=…/settings/patreon`); `/settings/appearance` customiser saves and the preview in the topbar updates after refresh; admin `?tier=1` override. Kill the dev server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(settings): Patreon status + Appearance pages; patreon prefs saved via bearer action"
```

---

## Task 10: Story Mode page, redirects, entry points

**Files:**
- Create: `app/(new-layout)/settings/story-mode/page.tsx`
- Delete: `app/(new-layout)/stories/manage/page.tsx` (keep `manage-stories.tsx` and siblings where they are — `/stories/manage` imports stay valid via alias)
- Modify: `next.config.js`, `src/components/Topbar/topbar-nav-items.ts`, `src/components/Topbar/UserMenu.tsx`

- [ ] **Step 1: Story Mode page**

```tsx
// app/(new-layout)/settings/story-mode/page.tsx
import ManageStories from '~app/(new-layout)/stories/manage/manage-stories';
import buildMetadata from '~src/utils/metadata';

export default async function StoryModeSettingsPage() {
    return <ManageStories />;
}

export const metadata = buildMetadata({ title: 'Story Mode', index: false, follow: false });
```

`ManageStories` renders its own `.page` wrapper with a `pageTitle`; check `manage-stories.module.scss` `.page` for a `max-width`/margin that fights the console content column — if it centres itself with `margin: auto`, change it to `margin: 0`. Then `git rm "app/(new-layout)/stories/manage/page.tsx"`. Grep `stories/manage` for any link inside the stories feature that points at the old URL and update it to `/settings/story-mode`.

- [ ] **Step 2: Redirects**

In `next.config.js` `redirects()` add (before the existing `/game` entry is fine):

```js
{ source: '/change-appearance', destination: '/settings/appearance', permanent: false },
{ source: '/livesplit', destination: '/settings/livesplit', permanent: false },
{ source: '/upload-key', destination: '/settings/livesplit', permanent: false },
{ source: '/stories/manage', destination: '/settings/story-mode', permanent: false },
```

`next.config.js` redirects forward the query string by default, so a stale Patreon `redirect_uri` of `/change-appearance?code=…` lands on `/settings/appearance?code=…` — which ignores `code`. That is acceptable: the OAuth app's registered redirect URI must be updated to `https://therun.gg/settings/patreon` in the Patreon developer portal **by Joey** (flag this in the handoff; until then "Link your Patreon account" may fail with a redirect_uri mismatch in prod).

- [ ] **Step 3: Entry points**

`topbar-nav-items.ts` `toolsItems`:

```ts
export const toolsItems: NavItem[] = [
    { href: '/upload', label: 'Upload' },
    { href: '/settings', label: 'Settings' },
];
```

`UserMenu.tsx`: the `/change-appearance` link becomes `href="/settings"` with label "Settings" (keep the icon slot). Check `src/components/Topbar/__tests__/user-menu-logout.test.tsx` still passes (it may assert on menu item text).

`MobileMenu.tsx`: if it renders `toolsItems`, nothing else to do; if it hardcodes the old links, update the same way.

- [ ] **Step 4: Verify**

`npx vitest run` passes. Browser: each old URL redirects; topbar Tools shows Settings; user menu shows Settings; `/settings/story-mode` renders the Story Mode manager inside the sidebar layout. Kill the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(settings): Story Mode page; redirect old routes; topbar + user menu entry points"
```

---

## Task 11: Full verification pass, docs, push

- [ ] **Step 1: Static checks**

```bash
npx vitest run
npm run typecheck 2>&1 | grep -c "error TS"     # must not exceed the baseline recorded before Task 3
npm run lint 2>&1 | tail -5                      # no new errors in files touched by this branch
npx @biomejs/biome check "app/(new-layout)/settings" src/components/console-chrome src/actions src/lib
```

- [ ] **Step 2: Browser pass (dev server, then kill it)**

Logged out: `/settings` → login gate with Twitch button. Logged in, desktop and ≤768px:
1. `/settings` → `/settings/profile`; edit + save + reload; `/<username>` shows new values and "Edit profile".
2. `/settings/preferences` toggle; frontpage card reflects it.
3. `/settings/patreon` status or invite; link round-trip if you have a Patreon account to test with.
4. `/settings/appearance` save; `/settings/livesplit` reveal/copy/reset.
5. `/settings/story-mode`; all four redirects; `/games-v2/<game>/manage` console unchanged (header, sidebar, drawer, panes).

- [ ] **Step 3: Docs and memory**

Mark `docs/plans/2026-08-21-user-settings-design.md` status line as "implemented on branch `user-settings` (2026-08-21)". Add a "Handoffs" section: (a) Patreon OAuth redirect URI must be changed to `/settings/patreon` in the Patreon developer portal; (b) backend follow-up: delete the composite-path fallback in `resolveUserTarget` once this branch is deployed; (c) run-level composite paths still exist.

Update the memory file `project-user-settings.md` (status, branch, handoffs).

- [ ] **Step 4: Push the branch (never main)**

```bash
rm -rf .next
git push -u origin user-settings
```

Report to Joey: branch name, what was verified in the browser, the three handoffs, and that the backend is already on main.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

therun.gg is a free speedrun statistics website providing live data and advanced statistics for speedrunners. Built with Next.js 16 (App Router), React 19, and TypeScript. All data operations go through the backend REST API (`NEXT_PUBLIC_DATA_URL`).

## Commands

```bash
npm run dev           # Start development server with Turbopack
npm run build         # Production build with Turbopack
npm run lint          # Run ESLint
npm run lint-fix      # Run ESLint with auto-fix
npm run typecheck     # TypeScript type checking (tsc --noEmit)
```

## Code Quality

Uses both ESLint and Biome for linting/formatting:
- Biome handles formatting (4-space indent, single quotes, trailing commas, semicolons)
- ESLint handles Next.js and React-specific rules
- Husky pre-commit hook runs `npx @biomejs/biome check --write` on staged files
- Unused variables must be prefixed with `_` (e.g., `_unusedVar`)

## Architecture

### App Router Layout Groups

The app uses Next.js route groups to manage different layouts:
- `app/(old-layout)/` - Main application with header, footer, and full feature set
- `app/(new-layout)/` - New redesigned layout (frontpage panels, new styling)
- `app/(footer)/` - Static pages (blog, FAQ, contact, privacy policy)

### Path Aliases

```typescript
~src/*  → src/*
~app/*  → app/*
```

### Key Directories

- `src/lib/` - Data fetching functions (server-side, via backend API)
- `src/lib/api-client.ts` - Shared `apiFetch()` helper for backend API calls
- `src/actions/` - Server Actions
- `src/rbac/` - Role-based access control using CASL
- `src/components/` - Shared React components
- `types/` - TypeScript type definitions (standalone, no ORM dependencies)

### Authentication & Authorization

- Authentication via Twitch OAuth, sessions stored server-side
- RBAC using CASL library (`src/rbac/ability.ts`)
- Roles: admin, moderator, patreon1-3, event-admin, race-admin, board-admin, etc.
- Use `<Can>` component for conditional rendering based on permissions

### Backend API

- All data operations (events, users, roles, frontpage config) go through the backend REST API
- Base URL configured via `NEXT_PUBLIC_DATA_URL` environment variable
- Auth pattern: `Authorization: Bearer {sessionId}` header
- API client helper: `src/lib/api-client.ts` (`apiFetch()`)

### External Services

- Vercel Blob for image storage
- Algolia for search (events read-only from frontend, writes handled by backend)
- WebSocket at `wss://ws.therun.gg` for live updates
- Backend REST API for all CRUD operations

### Caching

Next.js 16 with `experimental.useCache: true` and `cacheComponents: true` in next.config.js. Always use the `'use cache'` directive with `cacheLife()` and `cacheTag()` from `next/cache` for server-side data fetching. Never use the old `{ next: { revalidate: N } }` fetch option — use `'use cache'` instead. Use `revalidateTag()` for targeted cache invalidation.

```typescript
import { cacheLife, cacheTag, revalidateTag } from 'next/cache';

export async function getData() {
    'use cache';
    cacheLife('minutes'); // 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'max'
    cacheTag('my-data');
    // ...
}

// Invalidation: revalidateTag requires 2 args — the tag and the cacheLife profile
revalidateTag('my-data', 'minutes');
```

### React Compiler

The project uses React Compiler (babel-plugin-react-compiler) enabled via `reactCompiler: true` in next.config.js. This auto-memoizes components.

## Workflow Guidelines

### Implementation Execution Preference

**Subagent-Driven Development:** When given the choice between subagent-driven (this session) vs parallel session (separate) execution, always choose **subagent-driven** for this project. This allows for task-by-task execution with review between tasks in the current session.
**Worktree Cleanup:** After creating a Pull Request, always remove the worktree with `git worktree remove --force <path>`. The user prefers to access branches from the main repository rather than keeping worktrees around.

### After Completing Work

**IMPORTANT:** Always complete these steps when finishing a feature or session:

2. **Clear build cache** - Run `rm -rf .next` if there were significant changes
3. **Verify commits** - Ensure all changes are committed with proper messages
4. **Update documentation** - Mark design documents as implemented if applicable
5. **Push changes** - Push all commits to remote if working on a PR

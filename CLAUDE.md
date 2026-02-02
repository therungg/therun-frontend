# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

therun.gg is a free speedrun statistics website providing live data and advanced statistics for speedrunners. Built with Next.js 16 (App Router), React 19, TypeScript, and PostgreSQL via Drizzle ORM.

## Commands

```bash
npm run dev           # Start development server with Turbopack
npm run build         # Production build with Turbopack
npm run lint          # Run ESLint
npm run lint-fix      # Run ESLint with auto-fix
npm run typecheck     # TypeScript type checking (tsc --noEmit)
npm run migrate       # Run Drizzle database migrations
npm run seed          # Seed the database with test data
npm run generate-migration  # Generate new Drizzle migration
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

- `src/lib/` - Data fetching functions (server-side)
- `src/actions/` - Server Actions
- `src/db/` - Drizzle ORM schema and database connection
- `src/rbac/` - Role-based access control using CASL
- `src/components/` - Shared React components
- `types/` - TypeScript type definitions

### Authentication & Authorization

- Authentication via Twitch OAuth, sessions stored server-side
- RBAC using CASL library (`src/rbac/ability.ts`)
- Roles: admin, moderator, patreon1-3, event-admin, race-admin, board-admin, etc.
- Use `<Can>` component for conditional rendering based on permissions

### Database

- PostgreSQL with Drizzle ORM
- Schema defined in `src/db/schema.ts`
- Migrations in `./drizzle/` directory
- Uses dotenvx to load `.env.local` and `.env` for database commands

### External Services

- Vercel Blob for image storage
- Algolia for search (events, games, users)
- WebSocket at `wss://ws.therun.gg` for live updates
- Various AWS Lambda endpoints for API operations

### React Compiler

The project uses React Compiler (babel-plugin-react-compiler) enabled via `reactCompiler: true` in next.config.js. This auto-memoizes components.

## Workflow Guidelines

### After Completing Work

**IMPORTANT:** Always complete these steps when finishing a feature or session:

1. **STOP THE DEV SERVER** - Run `pkill -f "next dev"` to kill any running development servers
   - This is critical to avoid resource usage and port conflicts
   - Do this EVERY TIME before finishing work
2. **Clear build cache** - Run `rm -rf .next` if there were significant changes
3. **Verify commits** - Ensure all changes are committed with proper messages
4. **Update documentation** - Mark design documents as implemented if applicable
5. **Push changes** - Push all commits to remote if working on a PR

import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
}));

const mockV1Fetch = vi.fn();
vi.mock('../v1-fetch', () => ({
    v1Fetch: (...args: unknown[]) => mockV1Fetch(...args),
    V1FetchError: class extends Error {
        status: number;
        constructor(status: number, message: string) {
            super(message);
            this.status = status;
        }
    },
}));

import { resolveCategory } from '../games-v1';
import { normalizeSlug } from '../normalize-slug';

const CATEGORY_STATS = [
    {
        game_id: 1,
        category_id: 1,
        game_display: 'Test Game',
        category_display: 'Any%',
        total_run_time: 10_000_000,
        total_attempt_count: 100,
        total_finished_attempt_count: 50,
        total_pbs: 10,
        unique_runners: 20,
        primary_timing: 'rt',
    },
    {
        // Below the activity floor: total_run_time under MIN_PLAYTIME_MS
        // and zero finished attempts. Must be dropped even though pageData
        // also carries this category id.
        game_id: 1,
        category_id: 2,
        game_display: 'Test Game',
        category_display: 'Low Activity%',
        total_run_time: 100,
        total_attempt_count: 1,
        total_finished_attempt_count: 0,
        total_pbs: 0,
        unique_runners: 1,
        primary_timing: 'rt',
    },
];

const PAGE_DATA = {
    game: { categoryDisplayMode: 'auto' },
    ungroupedCategories: [
        {
            id: 1,
            display: 'Any%',
            name: 'any',
            isMain: true,
            active: true,
            sortOrder: 1,
            levelTemplateId: null,
            levelOverride: false,
        },
        {
            id: 2,
            display: 'Low Activity%',
            name: 'lowactivity',
            isMain: false,
            active: true,
            sortOrder: 2,
        },
        {
            // Has no stats row at all — a pageData-only category (e.g. a
            // freshly created board with zero runs). Must still appear, with
            // zero stats.
            id: 3,
            display: '100%',
            name: '100',
            isMain: false,
            active: true,
            sortOrder: 3,
            primaryTiming: 'gt',
            gameTimeLabel: 'igt',
            rules: 'No major skips.',
            showMilliseconds: false,
            requireVideo: true,
            sortAscending: false,
        },
    ],
    groups: [
        {
            id: 10,
            name: 'E1M1',
            sortOrder: 0,
            kind: 'level',
            rules: 'No OoB.',
            categories: [
                {
                    // A level board with no stats row — level boards start
                    // empty and must appear anyway.
                    id: 4,
                    display: 'E1M1 — Any%',
                    name: 'e1m1-any%',
                    isMain: true,
                    active: true,
                    sortOrder: 1,
                    levelTemplateId: 9,
                    levelOverride: false,
                },
            ],
        },
        {
            // A wire group predating `kind`/`rules` (or simply a normal
            // group, which the backend never stamps with `kind: 'normal'`
            // explicitly) — the absence of both fields must still resolve
            // to 'normal'/null, not merely happen to match a fixture that
            // sets them.
            id: 20,
            name: 'Bonus Stages',
            sortOrder: 2,
            categories: [],
        },
    ],
    levelTemplates: [
        {
            id: 9,
            display: 'Any%',
            rules: null,
            isMain: true,
            sortOrder: 1,
            imageUrl: null,
        },
    ],
};

function setupFetch() {
    mockV1Fetch.mockImplementation(async (path: string) => {
        if (path.startsWith('/v1/runs/categories')) {
            const offset = Number(
                new URL(`http://x${path}`).searchParams.get('offset'),
            );
            return { result: offset === 0 ? CATEGORY_STATS : [] };
        }
        if (path.startsWith('/v1/games/')) {
            return { result: PAGE_DATA };
        }
        throw new Error(`unexpected path ${path}`);
    });
}

describe('resolveCategory — level groups + pageData-only categories', () => {
    it('includes a pageData category with no stats row, with zero stats', async () => {
        setupFetch();
        const { categories } = await resolveCategory(1);
        const zeroStats = categories.find((c) => c.id === 3);
        expect(zeroStats).toBeDefined();
        expect(zeroStats?.totalRunTime ?? 0).toBe(0);
        expect(zeroStats?.totalAttemptCount ?? 0).toBe(0);
        expect(zeroStats?.totalFinishedAttemptCount ?? 0).toBe(0);
        // The slug is derived from `display`, not the pageData `name` field
        // (which is set to a deliberately different value in this fixture).
        expect(zeroStats?.name).toBe(normalizeSlug('100%'));
        expect(zeroStats?.display).toBe('100%');
        expect(zeroStats?.rules).toBe('No major skips.');
        expect(zeroStats?.showMilliseconds).toBe(false);
        expect(zeroStats?.requireVideo).toBe(true);
    });

    it('still drops a stats-backed row below the activity floor', async () => {
        setupFetch();
        const { categories } = await resolveCategory(1);
        const lowActivity = categories.find((c) => c.id === 2);
        expect(lowActivity).toBeUndefined();
    });

    it('includes a level board with no stats row, tagged with its template', async () => {
        setupFetch();
        const { categories, groups } = await resolveCategory(1);
        const board = categories.find((c) => c.id === 4);
        expect(board).toBeDefined();
        expect(board?.totalRunTime ?? 0).toBe(0);
        expect(board?.levelTemplateId).toBe(9);
        expect(board?.levelOverride).toBe(false);
        expect(board?.groupId).toBe(10);

        const levelGroup = groups.find((g) => g.id === 10);
        expect(levelGroup?.kind).toBe('level');
        expect(levelGroup?.rules).toBe('No OoB.');
    });

    it('a group with no kind/rules on the wire defaults to normal/null', async () => {
        setupFetch();
        const { groups } = await resolveCategory(1);
        const bonus = groups.find((g) => g.id === 20);
        expect(bonus?.kind).toBe('normal');
        expect(bonus?.rules).toBeNull();
    });

    it('returns levelTemplates from pageData', async () => {
        setupFetch();
        const { levelTemplates } = await resolveCategory(1);
        expect(levelTemplates).toEqual([
            {
                id: 9,
                display: 'Any%',
                rules: null,
                isMain: true,
                sortOrder: 1,
                imageUrl: null,
                // The board settings a template pushes — the console's
                // category detail page edits a template as a category, so
                // they come off the same pageData entry every category uses.
                // This fixture states none of them, so they read as defaults.
                primaryTiming: 'rt',
                gameTimeLabel: 'igt',
                sortAscending: true,
                showMilliseconds: true,
                requireVideo: false,
            },
        ]);
    });

    it('slugs a zero-stats board from display, same as a stats-backed row would, and it is selectable', async () => {
        setupFetch();
        const { categories, selected } = await resolveCategory(
            1,
            'E1M1 — Any%',
        );
        const board = categories.find((c) => c.id === 4);
        // The backend `name` on the wire fixture ('e1m1-any%') is NOT the
        // slug — it must not leak through. The slug is always derived from
        // `display`, exactly as a stats-backed row's `name` is.
        expect(board?.name).toBe(normalizeSlug('E1M1 — Any%'));
        expect(board?.name).not.toBe('e1m1-any%');
        expect(selected?.id).toBe(4);
    });

    it('sets levelTemplateId/levelOverride on a normal category from pageData', async () => {
        setupFetch();
        const { categories } = await resolveCategory(1);
        const anyPercent = categories.find((c) => c.id === 1);
        expect(anyPercent?.levelTemplateId ?? null).toBeNull();
        expect(anyPercent?.levelOverride ?? false).toBe(false);
    });
});

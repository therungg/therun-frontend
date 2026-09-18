import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';

/**
 * The owner Move dialog's board-context loader.
 *
 * The one behavior this file exists for: a per-category variables failure must
 * fail the WHOLE load. A `.catch(() => [])` there — the shape the sibling mod
 * loader's helper has — would hand the picker a category with no subcategory
 * bands, and a move made through it lands the run on the wrong board while
 * looking like it worked. That silent wrongness is the entire reason this
 * action is separate from the mod one, and nothing else in the codebase
 * witnesses it.
 */

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    resolveGame: vi.fn(),
    resolveCategory: vi.fn(),
    getVariables: vi.fn(),
}));

vi.mock('~src/actions/session.action', () => ({
    getSession: mocks.getSession,
}));
vi.mock('~src/lib/games-v1', () => ({
    resolveGame: mocks.resolveGame,
    resolveCategory: mocks.resolveCategory,
}));
vi.mock('~src/lib/leaderboards-v1', () => ({
    getVariables: mocks.getVariables,
}));

import { loadOwnerBoardContextAction } from './load-owner-board-context.action';

const category = (over: Partial<ResolvedCategory>): ResolvedCategory => ({
    id: 1,
    name: 'any',
    display: 'Any%',
    primaryTiming: 'rt',
    archived: false,
    sortOrder: 0,
    isMain: true,
    ...over,
});

const FEATURED = category({ id: 1, name: 'any', display: 'Any%' });
const ARCHIVED = category({ id: 2, name: 'old', archived: true, isMain: true });
/** Not featured — reachable only because it is the board being moved off. */
const THE_RUNS_OWN = category({ id: 3, name: 'lowactivity', isMain: false });

const variableRow = (id: number) =>
    ({ id, name: `var-${id}` }) as unknown as Awaited<
        ReturnType<typeof mocks.getVariables>
    >['variables'][number];

beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ username: 'joey', id: 'sess-1' });
    mocks.resolveGame.mockResolvedValue({
        id: 5,
        name: 'mario64',
        display: 'Super Mario 64',
    });
    mocks.resolveCategory.mockResolvedValue({
        categories: [FEATURED, ARCHIVED, THE_RUNS_OWN],
    });
    mocks.getVariables.mockImplementation(
        async (_slug: string, cat: string) => ({
            variables: [variableRow(cat === 'any' ? 1 : 2)],
            reservedParams: [],
            validCombinations: { mode: 'open' },
        }),
    );
});

describe('loadOwnerBoardContextAction', () => {
    it('fails the whole load when one category’s variables fail, rather than yielding empty bands', async () => {
        mocks.getVariables.mockRejectedValueOnce(new Error('502 variables'));
        const res = await loadOwnerBoardContextAction('mario64', 3);
        expect(res).toEqual({ error: 'Failed to load board data.' });
        expect('ok' in res).toBe(false);
    });

    it('returns categories plus every fetched category’s variable defs, flattened', async () => {
        const res = await loadOwnerBoardContextAction('mario64', 3);
        expect('ok' in res).toBe(true);
        if (!('ok' in res)) return;
        expect(res.gameDisplay).toBe('Super Mario 64');
        expect(res.categories).toHaveLength(3);
        expect(res.variables).toHaveLength(2);
    });

    // Only what the picker can offer, plus the board being moved off: the
    // archived one is invisible everywhere, and the run's own non-featured
    // category has to be resolvable or the dialog cannot name where it is.
    it('fetches defs only for the offerable categories and the run’s own', async () => {
        await loadOwnerBoardContextAction('mario64', 3);
        const fetched = mocks.getVariables.mock.calls.map((c) => c[1]);
        expect(fetched.sort()).toEqual(['any', 'lowactivity']);
    });

    it('refuses a signed-out caller before touching the API', async () => {
        mocks.getSession.mockResolvedValue({ username: '', id: '' });
        const res = await loadOwnerBoardContextAction('mario64', 3);
        expect(res).toEqual({ error: 'Not signed in.' });
        expect(mocks.resolveGame).not.toHaveBeenCalled();
    });

    it('reports an unknown game rather than loading nothing quietly', async () => {
        mocks.resolveGame.mockResolvedValue(null);
        const res = await loadOwnerBoardContextAction('nope', 3);
        expect(res).toEqual({ error: 'Game not found.' });
        expect(mocks.getVariables).not.toHaveBeenCalled();
    });
});

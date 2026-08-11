import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
    updateTag: vi.fn(),
}));
vi.mock('~src/lib/games-v1', () => ({
    resolveCategory: vi.fn(),
}));
vi.mock('../public-mod-log', () => ({
    modLogTag: (gameId: number) => `mod-log:${gameId}`,
}));

import { updateTag } from 'next/cache';
import { resolveCategory } from '~src/lib/games-v1';
import {
    revalidateAffectedBoards,
    revalidateBoardsForRuleScope,
} from '../revalidate-boards';

const updateTagMock = vi.mocked(updateTag);
const resolveCategoryMock = vi.mocked(resolveCategory);

describe('revalidateAffectedBoards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resolveCategoryMock.mockResolvedValue({
            categories: [{ id: 12, name: '120 Star' }],
        } as Awaited<ReturnType<typeof resolveCategory>>);
    });

    it('busts the exact slice tags for an affected board', async () => {
        await revalidateAffectedBoards(7, 'Super Mario 64', [
            { categoryId: 12, subcategoryKey: 'difficulty=normal' },
        ]);
        const tags = updateTagMock.mock.calls.map(([t]) => t);
        expect(tags).toContain(
            'lb:Super Mario 64:120 Star:difficulty=normal:gt:a',
        );
        expect(tags).toContain(
            'lb:Super Mario 64:120 Star:difficulty=normal:rt:v',
        );
    });

    it('busts the coarse per-category tag, covering views cached under URL-derived fragments (default view, partial selections, combined)', async () => {
        // The run's stored subcategoryKey materializes defaults
        // ('difficulty=normal'), but a mod viewing the board without URL
        // params reads through the empty fragment ('lb:game:cat::gt:a').
        // Enumerating fragments from the write side can't cover every URL
        // subset — the coarse tag is what guarantees read-your-writes.
        await revalidateAffectedBoards(7, 'Super Mario 64', [
            { categoryId: 12, subcategoryKey: 'difficulty=normal' },
        ]);
        const tags = updateTagMock.mock.calls.map(([t]) => t);
        expect(tags).toContain('lb:Super Mario 64:120 Star');
    });

    it('is a no-op when no boards were affected (callers use revalidateModLog for that)', async () => {
        await revalidateAffectedBoards(7, 'Super Mario 64', []);
        expect(updateTagMock).not.toHaveBeenCalled();
    });
});

describe('revalidateBoardsForRuleScope', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resolveCategoryMock.mockResolvedValue({
            categories: [
                { id: 12, name: '120 Star' },
                { id: 13, name: '70 Star' },
            ],
        } as Awaited<ReturnType<typeof resolveCategory>>);
    });

    it('busts the coarse tag for a category-scoped rule, plus the mod log', async () => {
        await revalidateBoardsForRuleScope(7, 'Super Mario 64', 12);
        const tags = updateTagMock.mock.calls.map(([t]) => t);
        expect(tags).toContain('lb:Super Mario 64:120 Star');
        expect(tags).not.toContain('lb:Super Mario 64:70 Star');
        expect(tags).toContain('mod-log:7');
    });

    it('busts every category for a game-wide rule', async () => {
        await revalidateBoardsForRuleScope(7, 'Super Mario 64', null);
        const tags = updateTagMock.mock.calls.map(([t]) => t);
        expect(tags).toContain('lb:Super Mario 64:120 Star');
        expect(tags).toContain('lb:Super Mario 64:70 Star');
    });

    it('still busts the mod log when category resolution fails', async () => {
        resolveCategoryMock.mockRejectedValue(new Error('backend down'));
        await revalidateBoardsForRuleScope(7, 'Super Mario 64', 12);
        const tags = updateTagMock.mock.calls.map(([t]) => t);
        expect(tags).toEqual(['mod-log:7']);
    });
});

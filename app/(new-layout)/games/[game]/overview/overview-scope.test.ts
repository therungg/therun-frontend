import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { overviewCardCategories } from './data';

function cat(over: Partial<ResolvedCategory>): ResolvedCategory {
    return {
        id: 1,
        name: 'any',
        display: 'Any%',
        primaryTiming: 'rt',
        archived: false,
        sortOrder: 0,
        isMain: true,
        ...over,
    };
}

const levelGroup: ResolvedGroup = {
    id: 10,
    name: 'E1M1',
    sortOrder: 1,
    hiddenByDefault: false,
    displayMode: null,
    kind: 'level',
    rules: null,
};

const normalGroup: ResolvedGroup = {
    ...levelGroup,
    id: 20,
    name: 'Extensions',
    kind: 'normal',
};

describe('overviewCardCategories', () => {
    it('drops level boards — one card and one fetch each is the whole cost', () => {
        const anyPct = cat({ id: 1, name: 'any' });
        const boards = Array.from({ length: 8 }, (_, i) =>
            cat({ id: 100 + i, name: `e1m1any${i}`, groupId: 10 }),
        );

        expect(
            overviewCardCategories([anyPct, ...boards], [levelGroup]),
        ).toEqual([anyPct]);
    });

    it('keeps grouped full-game categories — only level groups are special', () => {
        const ext = cat({ id: 2, name: 'ext', groupId: 20 });
        expect(overviewCardCategories([ext], [normalGroup])).toEqual([ext]);
    });
});

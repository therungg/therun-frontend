import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../types/leaderboards.types';
import { decideGameRootView } from './root-view';

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

describe('decideGameRootView', () => {
    const anyPct = cat({ id: 1, name: 'any', display: 'Any%' });
    const hundred = cat({ id: 2, name: '100', display: '100%' });
    const junk = cat({ id: 3, name: 'junkcat', isMain: false });
    const dead = cat({ id: 4, name: 'oldcat', archived: true });

    it('param resolving to a Featured category -> board', () => {
        expect(decideGameRootView([anyPct, hundred, junk], '100')).toEqual({
            view: 'board',
            category: hundred,
        });
    });
    it('param matching is slug-normalized (case/spaces/dashes)', () => {
        expect(decideGameRootView([anyPct], 'ANY')).toEqual({
            view: 'board',
            category: anyPct,
        });
    });
    it('param naming a non-Featured category -> redirect', () => {
        expect(decideGameRootView([anyPct, junk], 'junkcat')).toEqual({
            view: 'redirect',
        });
    });
    it('param naming an archived category -> redirect', () => {
        expect(decideGameRootView([anyPct, dead], 'oldcat')).toEqual({
            view: 'redirect',
        });
    });
    it('param naming an unknown category -> redirect', () => {
        expect(decideGameRootView([anyPct], 'nope')).toEqual({
            view: 'redirect',
        });
    });
    it('no param, multiple Featured -> overview with only Featured', () => {
        expect(decideGameRootView([anyPct, hundred, junk], undefined)).toEqual({
            view: 'overview',
            featured: [anyPct, hundred],
        });
    });
    it('no param, exactly one Featured -> that board directly', () => {
        expect(decideGameRootView([anyPct, junk, dead], undefined)).toEqual({
            view: 'board',
            category: anyPct,
        });
    });
    it('no param, zero Featured -> empty', () => {
        expect(decideGameRootView([junk, dead], undefined)).toEqual({
            view: 'empty',
        });
    });
    it('empty param string behaves like no param', () => {
        expect(decideGameRootView([anyPct, hundred], '')).toEqual({
            view: 'overview',
            featured: [anyPct, hundred],
        });
    });

    // Level boards: Featured (they copy their level category's isMain) and in
    // a level group. They belong to the level picker, never the card wall.
    const levelGroup: ResolvedGroup = {
        id: 10,
        name: 'E1M1',
        sortOrder: 1,
        hiddenByDefault: false,
        displayMode: null,
        kind: 'level',
        rules: null,
    };
    const levelBoards = Array.from({ length: 8 }, (_, i) =>
        cat({
            id: 100 + i,
            name: `e1m1any${i}`,
            display: `E1M1 — Any% ${i}`,
            groupId: 10,
            levelTemplateId: 1,
        }),
    );

    it('no param, one full-game Featured + level boards -> that board', () => {
        // Without the group scope this is "9 featured" and the game lands on
        // a 9-card wall it never had before levels existed.
        expect(
            decideGameRootView([anyPct, ...levelBoards], undefined, [
                levelGroup,
            ]),
        ).toEqual({ view: 'board', category: anyPct });
    });

    it('no param, level boards never become cards on the wall', () => {
        expect(
            decideGameRootView([anyPct, hundred, ...levelBoards], undefined, [
                levelGroup,
            ]),
        ).toEqual({ view: 'overview', featured: [anyPct, hundred] });
    });

    it('a levels-only game opens on a board, not the empty state', () => {
        expect(
            decideGameRootView(levelBoards, undefined, [levelGroup]),
        ).toEqual({ view: 'board', category: levelBoards[0] });
    });

    it('a ?category deep link to a level board still resolves', () => {
        // Not advertised on the wall is not the same as not public.
        expect(
            decideGameRootView([anyPct, ...levelBoards], 'e1m1any3', [
                levelGroup,
            ]),
        ).toEqual({ view: 'board', category: levelBoards[3] });
    });
});

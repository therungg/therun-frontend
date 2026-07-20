import { describe, expect, it } from 'vitest';
import type { ResolvedCategory } from '../../../../types/leaderboards.types';
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
});

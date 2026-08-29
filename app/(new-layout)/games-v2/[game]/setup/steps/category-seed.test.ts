import { describe, expect, it } from 'vitest';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import {
    buildCategorySeed,
    computeCategoryChanges,
    seedUpdateBody,
} from './category-seed';

function mkCat(overrides: Partial<ResolvedCategory> = {}): ResolvedCategory {
    return {
        id: 1,
        name: 'any',
        display: 'Any%',
        primaryTiming: 'rt',
        archived: false,
        sortOrder: 0,
        ...overrides,
    };
}

describe('buildCategorySeed', () => {
    it("maps the game's realtime-scoped primary timing to 'realtime'", () => {
        expect(
            buildCategorySeed({
                primaryTiming: 'rt',
                gameTimeLabel: null,
                hideRealTime: false,
                hideGameTime: false,
            }),
        ).toEqual({
            primaryTiming: 'realtime',
            gameTimeLabel: 'igt',
            hideRealTime: false,
            hideGameTime: false,
        });
    });

    it("maps a null primary timing to 'realtime' (same default as the resolver)", () => {
        expect(
            buildCategorySeed({
                primaryTiming: null,
                gameTimeLabel: null,
                hideRealTime: false,
                hideGameTime: false,
            }),
        ).toEqual({
            primaryTiming: 'realtime',
            gameTimeLabel: 'igt',
            hideRealTime: false,
            hideGameTime: false,
        });
    });

    it("maps the game's gametime-scoped primary timing to 'gametime'", () => {
        expect(
            buildCategorySeed({
                primaryTiming: 'gt',
                gameTimeLabel: null,
                hideRealTime: true,
                hideGameTime: false,
            }),
        ).toEqual({
            primaryTiming: 'gametime',
            gameTimeLabel: 'igt',
            hideRealTime: true,
            hideGameTime: false,
        });
    });

    it('falls back to showing both clocks when legacy metadata hides both', () => {
        expect(
            buildCategorySeed({
                primaryTiming: 'rt',
                gameTimeLabel: null,
                hideRealTime: true,
                hideGameTime: true,
            }),
        ).toEqual({
            primaryTiming: 'realtime',
            gameTimeLabel: 'igt',
            hideRealTime: false,
            hideGameTime: false,
        });
    });
});

describe('seedUpdateBody', () => {
    it('writes the seed timing and never touches rules', () => {
        expect(
            seedUpdateBody({
                primaryTiming: 'gametime',
                gameTimeLabel: 'igt',
                hideRealTime: true,
                hideGameTime: false,
            }),
        ).toEqual({
            primaryTiming: 'gametime',
            gameTimeLabel: 'igt',
            hideRealTime: true,
            hideGameTime: false,
        });
    });
});

describe('computeCategoryChanges', () => {
    it('flags the feature-on transition as becomingMain', () => {
        const categories = [mkCat({ id: 1, isMain: false, rules: null })];
        const changes = computeCategoryChanges(
            [{ id: 1, main: true }],
            categories,
        );
        expect(changes).toEqual([
            { id: 1, main: true, restore: false, becomingMain: true },
        ]);
    });

    it('does not flag becomingMain when un-featuring a category', () => {
        const categories = [mkCat({ id: 1, isMain: true, archived: false })];
        const changes = computeCategoryChanges(
            [{ id: 1, main: false }],
            categories,
        );
        expect(changes).toEqual([
            { id: 1, main: false, restore: false, becomingMain: false },
        ]);
    });

    it('does not flag becomingMain for a restore (already isMain, just archived)', () => {
        // Archiving doesn't clear isMain — restoring it re-ticks a box that
        // was already checked, so it's re-curation, not first setup.
        const categories = [
            mkCat({ id: 1, isMain: true, archived: true, rules: null }),
        ];
        const changes = computeCategoryChanges(
            [{ id: 1, main: true }],
            categories,
        );
        expect(changes).toEqual([
            { id: 1, main: true, restore: true, becomingMain: false },
        ]);
    });

    it('skips rows whose isMain value is unchanged', () => {
        const categories = [mkCat({ id: 1, isMain: true, archived: false })];
        const changes = computeCategoryChanges(
            [{ id: 1, main: true }],
            categories,
        );
        expect(changes).toEqual([]);
    });

    it('skips a row with no matching category', () => {
        const changes = computeCategoryChanges([{ id: 999, main: true }], []);
        expect(changes).toEqual([]);
    });
});

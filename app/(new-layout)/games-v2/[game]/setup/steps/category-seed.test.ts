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
                rulesTemplate: null,
            }),
        ).toEqual({
            primaryTiming: 'realtime',
            gameTimeLabel: 'igt',
            hideRealTime: false,
            hideGameTime: false,
            rulesTemplate: null,
        });
    });

    it("maps a null primary timing to 'realtime' (same default as the resolver)", () => {
        expect(
            buildCategorySeed({
                primaryTiming: null,
                gameTimeLabel: null,
                hideRealTime: false,
                hideGameTime: false,
                rulesTemplate: null,
            }),
        ).toEqual({
            primaryTiming: 'realtime',
            gameTimeLabel: 'igt',
            hideRealTime: false,
            hideGameTime: false,
            rulesTemplate: null,
        });
    });

    it("maps the game's gametime-scoped primary timing to 'gametime'", () => {
        expect(
            buildCategorySeed({
                primaryTiming: 'gt',
                gameTimeLabel: null,
                hideRealTime: true,
                hideGameTime: false,
                rulesTemplate: null,
            }),
        ).toEqual({
            primaryTiming: 'gametime',
            gameTimeLabel: 'igt',
            hideRealTime: true,
            hideGameTime: false,
            rulesTemplate: null,
        });
    });

    it('carries the rules template through verbatim', () => {
        expect(
            buildCategorySeed({
                primaryTiming: 'rt',
                gameTimeLabel: null,
                hideRealTime: false,
                hideGameTime: true,
                rulesTemplate: 'No major skips.',
            }),
        ).toEqual({
            primaryTiming: 'realtime',
            gameTimeLabel: 'igt',
            hideRealTime: false,
            hideGameTime: true,
            rulesTemplate: 'No major skips.',
        });
    });

    it('falls back to showing both clocks when legacy metadata hides both', () => {
        expect(
            buildCategorySeed({
                primaryTiming: 'rt',
                gameTimeLabel: null,
                hideRealTime: true,
                hideGameTime: true,
                rulesTemplate: null,
            }),
        ).toEqual({
            primaryTiming: 'realtime',
            gameTimeLabel: 'igt',
            hideRealTime: false,
            hideGameTime: false,
            rulesTemplate: null,
        });
    });
});

describe('seedUpdateBody', () => {
    it('writes rules when the category currently has none', () => {
        expect(
            seedUpdateBody(
                {
                    primaryTiming: 'realtime',
                    gameTimeLabel: 'igt',
                    hideRealTime: false,
                    hideGameTime: true,
                    rulesTemplate: 'No skips.',
                },
                true,
            ),
        ).toEqual({
            primaryTiming: 'realtime',
            gameTimeLabel: 'igt',
            hideRealTime: false,
            hideGameTime: true,
            rules: 'No skips.',
        });
    });

    it('never overwrites a category that already has rules', () => {
        expect(
            seedUpdateBody(
                {
                    primaryTiming: 'realtime',
                    gameTimeLabel: 'igt',
                    hideRealTime: false,
                    hideGameTime: false,
                    rulesTemplate: 'No skips.',
                },
                false,
            ),
        ).toEqual({
            primaryTiming: 'realtime',
            gameTimeLabel: 'igt',
            hideRealTime: false,
            hideGameTime: false,
        });
    });

    it('omits rules when the game has no template to apply, even if the category is empty', () => {
        expect(
            seedUpdateBody(
                {
                    primaryTiming: 'gametime',
                    gameTimeLabel: 'igt',
                    hideRealTime: true,
                    hideGameTime: false,
                    rulesTemplate: null,
                },
                true,
            ),
        ).toEqual({
            primaryTiming: 'gametime',
            gameTimeLabel: 'igt',
            hideRealTime: true,
            hideGameTime: false,
        });
    });

    it('omits rules when the template is blank/whitespace-only', () => {
        expect(
            seedUpdateBody(
                {
                    primaryTiming: 'realtime',
                    gameTimeLabel: 'igt',
                    hideRealTime: false,
                    hideGameTime: false,
                    rulesTemplate: '   ',
                },
                true,
            ),
        ).toEqual({
            primaryTiming: 'realtime',
            gameTimeLabel: 'igt',
            hideRealTime: false,
            hideGameTime: false,
        });
    });
});

describe('computeCategoryChanges', () => {
    it('flags the feature-on transition as becomingMain, seedless facts included', () => {
        const categories = [mkCat({ id: 1, isMain: false, rules: null })];
        const changes = computeCategoryChanges(
            [{ id: 1, main: true }],
            categories,
        );
        expect(changes).toEqual([
            {
                id: 1,
                main: true,
                restore: false,
                becomingMain: true,
                currentRulesEmpty: true,
            },
        ]);
    });

    it('does not flag becomingMain when un-featuring a category', () => {
        const categories = [mkCat({ id: 1, isMain: true, archived: false })];
        const changes = computeCategoryChanges(
            [{ id: 1, main: false }],
            categories,
        );
        expect(changes).toEqual([
            {
                id: 1,
                main: false,
                restore: false,
                becomingMain: false,
                currentRulesEmpty: true,
            },
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
            {
                id: 1,
                main: true,
                restore: true,
                becomingMain: false,
                currentRulesEmpty: true,
            },
        ]);
    });

    it('computes currentRulesEmpty from the category, not the seed', () => {
        const categories = [
            mkCat({ id: 1, isMain: false, rules: 'Existing rules.' }),
        ];
        const changes = computeCategoryChanges(
            [{ id: 1, main: true }],
            categories,
        );
        expect(changes[0].currentRulesEmpty).toBe(false);
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

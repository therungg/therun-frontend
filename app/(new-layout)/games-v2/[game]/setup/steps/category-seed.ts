import type { GameMetadata } from '~src/lib/game-mgmt';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';

export interface CategorySeed {
    primaryTiming: 'realtime' | 'gametime';
    gameTimeLabel: 'igt' | 'lrt';
    hideRealTime: boolean;
    hideGameTime: boolean;
}

/**
 * What a newly-Featured category should seed from — the game's own default
 * timing (primary clock AND the step-1 time-columns choice), so a category
 * that's never been touched doesn't land on the board with no timing. Rules
 * are authored per category, so nothing is seeded there. Pure so the
 * `'rt'|'gt'|null` -> `'realtime'|'gametime'` mapping (feature-on transition in
 * step-categories.tsx) is testable without rendering the step.
 */
export function buildCategorySeed(
    metadata: Pick<
        GameMetadata,
        'primaryTiming' | 'gameTimeLabel' | 'hideRealTime' | 'hideGameTime'
    >,
): CategorySeed {
    // Both-hidden is invalid (the update action rejects it); legacy games can
    // still carry it in metadata, so fall back to showing both rather than
    // seeding a body the server refuses.
    const bothHidden = metadata.hideRealTime && metadata.hideGameTime;
    return {
        primaryTiming:
            metadata.primaryTiming === 'gt' ? 'gametime' : 'realtime',
        gameTimeLabel: metadata.gameTimeLabel === 'lrt' ? 'lrt' : 'igt',
        hideRealTime: bothHidden ? false : metadata.hideRealTime,
        hideGameTime: bothHidden ? false : metadata.hideGameTime,
    };
}

/**
 * The body curate-category.action.ts actually writes for a seed: the game's
 * default timing. Rules are never seeded — they're authored per category.
 */
export function seedUpdateBody(seed: CategorySeed): {
    primaryTiming: 'realtime' | 'gametime';
    gameTimeLabel: 'igt' | 'lrt';
    hideRealTime: boolean;
    hideGameTime: boolean;
} {
    return {
        primaryTiming: seed.primaryTiming,
        gameTimeLabel: seed.gameTimeLabel,
        hideRealTime: seed.hideRealTime,
        hideGameTime: seed.hideGameTime,
    };
}

export interface CategoryChange {
    id: number;
    /** The value `isMain` is becoming. */
    main: boolean;
    /** Restoring an Archived-but-still-`isMain` category — writes `active: true` too. */
    restore: boolean;
    /** True only on the actual feature-on transition (`isMain` false -> true) — the one case that seeds. Re-curation (already Featured, or a restore that was already `isMain`) stays seedless. */
    becomingMain: boolean;
}

/**
 * Pure diff: which rows actually changed `isMain` against the categories the
 * step was seeded with, plus the per-row facts curateCategoryAction needs
 * (restore / becomingMain / currentRulesEmpty). Extracted from
 * StepCategories' `save()` so the feature-on-only seeding gate is testable
 * without rendering the step or mocking the server action.
 */
export function computeCategoryChanges(
    rows: Array<{ id: number; main: boolean }>,
    categories: ResolvedCategory[],
): CategoryChange[] {
    return rows.flatMap((r) => {
        const orig = categories.find((c) => c.id === r.id);
        if (!orig) return [];
        const wasMain = orig.isMain ?? false;
        const restore = r.main && orig.archived;
        if (wasMain === r.main && !restore) return [];
        return [
            {
                id: r.id,
                main: r.main,
                restore,
                becomingMain: r.main && !wasMain,
            },
        ];
    });
}

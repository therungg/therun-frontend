import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import type { ModTiming } from '../../../../../../../types/moderation.types';

export interface BoardClocks {
    /** The clock this board ranks by. */
    primaryTiming: ModTiming;
    /** The category shows both clocks, so a submission can carry both. */
    showSecondary: boolean;
    /** What this board calls its game-time clock: 'igt' or 'lrt'. */
    gameTimeLabel: string;
}

/** A category's clocks, for any form that takes a manual time on it. */
export function clocksOfCategory(
    category: Pick<
        ResolvedCategory,
        'primaryTiming' | 'hideRealTime' | 'hideGameTime' | 'gameTimeLabel'
    >,
): BoardClocks {
    return {
        primaryTiming:
            category.primaryTiming === 'gt' ? 'gametime' : 'realtime',
        showSecondary: !category.hideRealTime && !category.hideGameTime,
        gameTimeLabel: category.gameTimeLabel ?? 'igt',
    };
}

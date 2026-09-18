'use client';

import Link from '~src/components/link';
import { buildModRunnerHref } from '~src/lib/board-url';
import type {
    LeaderboardRosterRow,
    UserEligibleRunRow,
} from '../../../../../../types/moderation.types';
import type { TimingKey } from '../../leaderboard/timing-columns';
import styles from './board-curation.module.scss';

export interface RowActionsProps {
    row: LeaderboardRosterRow;
    gameSlug: string;
}

/** The value of a candidate/replacement run for the category's primary
 * timing — `UserEligibleRunRow` carries both `time` and `gameTime` the same
 * way `LeaderboardRosterRow` does. Exported so `BoardCuration` can sort
 * next-run candidates with the same rule used to display them here. */
export function primaryValueOf(
    row: UserEligibleRunRow,
    timing: 'rt' | 'gt',
): number | null {
    return timing === 'gt' ? row.gameTime : row.time;
}

/** `timingValue()`'s twin for the roster shape, which names its real time
 *  `time` rather than `realTime`. */
export function rosterTimingValue(
    row: { time: number | null; gameTime: number | null },
    key: TimingKey,
): number | null {
    return key === 'rt' ? row.time : row.gameTime;
}

/**
 * The trailing-cell link to a registered runner's page. Every verb on the
 * run lives in the moderate modal the row's Moderate button opens.
 */
export function RowActions({ row, gameSlug }: RowActionsProps) {
    if (row.userId == null) return null;
    return (
        <div className={styles.actionCluster}>
            <Link
                className={styles.actionBtn}
                href={buildModRunnerHref(gameSlug, row.userId, 'boards')}
                title={`Open ${row.runnerName}'s runner page`}
            >
                View
            </Link>
        </div>
    );
}

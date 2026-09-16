import type { Run } from '~src/common/types';
import Link from '~src/components/link';
import { FromNow } from '~src/components/util/datetime';
import { getUserRuns } from '~src/lib/get-user-runs';
import { safeEncodeURI } from '~src/utils/uri';
import type { RunnerProfileHead } from '../../../../../types/runner-profile.types';
import { toSessionRows } from '../../(sections)/activity/session-rows';
import { formatDuration } from '../../(sections)/format';
import ui from '../../(sections)/profile-ui.module.scss';
import { categoryOf, plural } from '../../(sections)/ranks';
import { Chapter, ChapterError } from '../chapter';
import styles from '../overview.module.scss';

const ms = (s: string | undefined) => {
    const n = Number.parseInt(s ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : null;
};

const runHref = (run: Run) =>
    `/${run.url
        .split('/')
        .map((p) => safeEncodeURI(p))
        .join('/')}`;

const gameOf = (run: Run) => run.game.split('#')[0];

/** Most played run, the last session and the latest PB. */
export async function SplitsChapter({ head }: { head: RunnerProfileHead }) {
    const name = head.runner.name;
    let runs: Run[];
    try {
        runs = (await getUserRuns(name)) ?? [];
    } catch {
        return <ChapterError id="splits" name={name} />;
    }
    if (runs.length === 0) return null;

    const mostPlayed = runs.reduce((best, r) =>
        (ms(r.totalRunTime) ?? 0) > (ms(best.totalRunTime) ?? 0) ? r : best,
    );
    const pb = ms(mostPlayed.personalBest);
    const sob = ms(mostPlayed.sumOfBests);
    const gap = pb !== null && sob !== null && pb > sob ? pb - sob : null;

    const session = toSessionRows(runs).find((r) => r.attempts > 0) ?? null;

    // personalBestTime is an ISO string, so it sorts as text.
    const latest = runs
        .filter((r) => ms(r.personalBest) !== null && r.personalBestTime)
        .reduce<Run | null>(
            (a, b) => (a && a.personalBestTime >= b.personalBestTime ? a : b),
            null,
        );

    return (
        <Chapter id="splits" name={name}>
            <div className={styles.splitsGrid}>
                <Link
                    href={runHref(mostPlayed)}
                    className={`${ui.card} ${styles.splitsCard}`}
                >
                    <span className={styles.cardLabel}>Most played</span>
                    <span className={styles.cardTitle}>
                        {gameOf(mostPlayed)} · {categoryOf(mostPlayed)}
                    </span>
                    <span className={styles.cardValue}>
                        {formatDuration(pb)}
                    </span>
                    <span className={styles.muted}>
                        {plural(
                            Number(mostPlayed.attemptCount) || 0,
                            'attempt',
                            'attempts',
                        )}
                    </span>
                    {gap !== null && sob !== null && pb !== null ? (
                        <>
                            <span className={styles.sobBar} aria-hidden>
                                <span
                                    style={{ width: `${(sob / pb) * 100}%` }}
                                />
                            </span>
                            <span className={styles.muted}>
                                {formatDuration(gap)} off the sum of best
                            </span>
                        </>
                    ) : null}
                </Link>
                {session ? (
                    <Link
                        href={session.href}
                        className={`${ui.card} ${styles.splitsCard}`}
                    >
                        <span className={styles.cardLabel}>Last session</span>
                        <span className={styles.cardTitle}>
                            {session.game} · {session.category}
                        </span>
                        <span className={styles.cardValue}>
                            {formatDuration(
                                new Date(session.endedAt).getTime() -
                                    new Date(session.startedAt).getTime(),
                            )}
                        </span>
                        <span className={styles.muted}>
                            <FromNow time={session.endedAt} /> ·{' '}
                            {plural(session.attempts, 'attempt', 'attempts')}
                        </span>
                    </Link>
                ) : null}
                {latest ? (
                    <Link
                        href={runHref(latest)}
                        className={`${ui.card} ${styles.splitsCard}`}
                    >
                        <span className={styles.cardLabel}>Latest PB</span>
                        <span className={styles.cardTitle}>
                            {gameOf(latest)} · {categoryOf(latest)}
                        </span>
                        <span className={styles.cardValue}>
                            {formatDuration(ms(latest.personalBest))}
                        </span>
                        <span className={styles.muted}>
                            <FromNow time={latest.personalBestTime} />
                        </span>
                    </Link>
                ) : null}
            </div>
        </Chapter>
    );
}

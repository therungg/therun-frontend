import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { buildBoardHref } from '~src/lib/board-url';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import { formatSubcategoryKey } from '../labels';
import { CountryFlag } from '../leaderboard/country-flag';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

const MAX_ENTRIES = 5;

export function RunnerCard({ model }: { model: RunViewModel }) {
    if (model.userId == null && !model.isGuest) return null; // hidden runner
    // Real boards only: ranked, with someone to be ranked against.
    // Featured categories first, then best placement, then biggest board.
    const others = model.runnerEntries
        .filter(
            (e) =>
                e.rank != null &&
                e.totalRunners >= 2 &&
                !(
                    e.categoryId === model.categoryId &&
                    e.subcategoryKey === model.subcategoryKey
                ),
        )
        .sort(
            (a, b) =>
                Number(b.isMain === true) - Number(a.isMain === true) ||
                (a.rank ?? 0) - (b.rank ?? 0) ||
                b.totalRunners - a.totalRunners,
        )
        .slice(0, MAX_ENTRIES);

    return (
        <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Runner</h2>
            <div className={styles.runnerHead}>
                <RunnerAvatar
                    name={model.runnerName}
                    picture={model.picture}
                    size="md"
                />
                <CountryFlag country={model.country} />
                {model.isGuest ? (
                    <span>{model.runnerName}</span>
                ) : (
                    <UserLink username={model.runnerName} to="leaderboards" />
                )}
            </div>
            {others.length > 0 && (
                <ul className={styles.entries}>
                    {others.map((e) => {
                        const sub = formatSubcategoryKey(e.subcategoryKey);
                        return (
                            <li key={`${e.categoryId}:${e.subcategoryKey}`}>
                                <Link
                                    href={buildBoardHref(model.game.name, {
                                        categorySlug: e.categorySlug,
                                        subcategoryKey: e.subcategoryKey,
                                    })}
                                    className={styles.entry}
                                >
                                    <span className={styles.entryName}>
                                        {e.category}
                                        {sub && ` · ${sub}`}
                                    </span>
                                    <span className={styles.entryTime}>
                                        {formatTimeMs(e.timeMs)}
                                    </span>
                                    <span className={styles.entryRank}>
                                        #{e.rank?.toLocaleString()} /{' '}
                                        {e.totalRunners.toLocaleString()}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

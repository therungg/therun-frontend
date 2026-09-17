import Link from '~src/components/link';
import { buildBoardHref, rankToPage } from '~src/lib/board-url';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import type { BoardContextRow } from '../../../../../types/leaderboards.types';
import { CountryFlag } from '../leaderboard/country-flag';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { formatGap } from './run-format';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

function rowHref(gameName: string, r: BoardContextRow): string | null {
    if (r.runId != null)
        return `/games-v2/${encodeURIComponent(gameName)}/run/${r.runId}`;
    if (r.manualTimeId != null)
        return `/games-v2/${encodeURIComponent(gameName)}/manual/${r.manualTimeId}`;
    return null;
}

function Row({
    r,
    selfTime,
    href,
}: {
    r: BoardContextRow;
    selfTime: number;
    href: string | null;
}) {
    const body = (
        <>
            <span className={styles.sliceRank}>#{r.rank}</span>
            <CountryFlag country={r.country} />
            <RunnerAvatar
                name={r.runnerName}
                picture={r.picture}
                size="xs"
                anonymous={r.anonymized === true}
            />
            <span className={styles.sliceName}>{r.runnerName}</span>
            <span className={styles.sliceTime}>{formatTimeMs(r.time)}</span>
            <span className={styles.sliceGap}>
                {formatGap(selfTime - r.time)}
            </span>
        </>
    );
    return href ? (
        <Link href={href} className={styles.sliceRow}>
            {body}
        </Link>
    ) : (
        <div className={styles.sliceRow}>{body}</div>
    );
}

export function BoardSlice({ model }: { model: RunViewModel }) {
    const ctx = model.boardContext;
    if (!ctx) return null;
    const selfTime =
        model.realTime != null && ctx.view.timing === 'rt'
            ? model.realTime
            : (model.gameTime ?? model.realTime);
    if (selfTime == null) return null;

    const boardHref = buildBoardHref(model.game.name, {
        categorySlug: model.categorySlug,
        subcategoryKey: model.subcategoryKey,
        page: rankToPage(ctx.rank),
    });
    const showWr = ctx.wr != null && !ctx.above.some((r) => r.rank === 1);

    return (
        <section className={styles.panel}>
            <h2 className={styles.panelTitle}>On the board</h2>
            <div className={styles.slice}>
                {showWr && ctx.wr && (
                    <>
                        <Row
                            r={ctx.wr}
                            selfTime={selfTime}
                            href={rowHref(model.game.name, ctx.wr)}
                        />
                        {ctx.above.at(-1)?.rank !== 2 && (
                            <div className={styles.sliceGapRow}>⋯</div>
                        )}
                    </>
                )}
                {[...ctx.above].reverse().map((r) => (
                    <Row
                        key={r.rank}
                        r={r}
                        selfTime={selfTime}
                        href={rowHref(model.game.name, r)}
                    />
                ))}
                <div className={`${styles.sliceRow} ${styles.sliceSelf}`}>
                    <span className={styles.sliceRank}>#{ctx.rank}</span>
                    <CountryFlag country={model.country} />
                    <RunnerAvatar name={model.runnerName} size="xs" />
                    <span className={styles.sliceName}>{model.runnerName}</span>
                    <span className={styles.sliceTime}>
                        {formatTimeMs(selfTime)}
                    </span>
                    <span className={styles.sliceGap} />
                </div>
                {ctx.below.map((r) => (
                    <Row
                        key={r.rank}
                        r={r}
                        selfTime={selfTime}
                        href={rowHref(model.game.name, r)}
                    />
                ))}
            </div>
            <Link href={boardHref} className={styles.panelLink}>
                Full board →
            </Link>
        </section>
    );
}

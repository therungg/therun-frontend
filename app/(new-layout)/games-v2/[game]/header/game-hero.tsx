'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useState } from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    LeaderboardResponse,
    QuickStats,
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../types/leaderboards.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import styles from '../game-page.module.scss';
import { CountryFlag } from '../leaderboard/country-flag';
import { relativeDate } from '../leaderboard/relative-date';

const WrHistoryDrawer = dynamic(
    () => import('../drawers/wr-history-drawer').then((m) => m.WrHistoryDrawer),
    { ssr: false },
);

interface Props {
    game: ResolvedGame;
    stats: QuickStats;
    category: ResolvedCategory | null;
    leaderboard: LeaderboardResponse | null;
    subcategoryKey: string;
    canManage?: boolean;
    canModerate?: boolean;
    claim?: ClaimCtaState | null;
    selfClaim?: ReactNode;
}

export function GameHero({
    game,
    stats,
    category,
    leaderboard,
    subcategoryKey,
    canManage,
    canModerate,
    claim,
    selfClaim,
}: Props) {
    const [historyOpen, setHistoryOpen] = useState(false);

    // The crown only ever shows the actual record: rank 1 on the
    // currently loaded data. On deep-linked later pages entries[0]
    // is not rank 1, so the crown falls back to a neutral state
    // instead of claiming the board has no runs.
    const top = leaderboard?.entries[0];
    const wr = top && top.rank === 1 && top.time !== null ? top : null;
    // Only a genuinely empty board (page 1, zero entries) gets the
    // "set the first record" copy. A deep-linked page or a null
    // leaderboard just means we can't see rank 1 from here.
    const boardIsEmpty =
        leaderboard != null &&
        leaderboard.page === 1 &&
        leaderboard.entries.length === 0;
    const wrHref = wr
        ? wr.source === 'manual' && wr.manualTimeId != null
            ? `/games-v2/${game.name}/manual/${wr.manualTimeId}`
            : wr.runId != null
              ? `/games-v2/${game.name}/run/${wr.runId}`
              : null
        : null;

    return (
        <header className={styles.hero}>
            {game.image ? (
                <img
                    src={game.image}
                    alt=""
                    aria-hidden
                    className={styles.heroBackdrop}
                />
            ) : null}
            <div className={styles.heroScrim} />
            <div className={styles.heroContent}>
                <div className={styles.heroMain}>
                    {game.image && (
                        <img
                            src={game.image}
                            alt={game.display}
                            width={96}
                            height={128}
                            className={styles.heroCover}
                            loading="eager"
                        />
                    )}
                    <div className={styles.heroText}>
                        <h1 className={styles.heroTitle}>{game.display}</h1>
                        <div className={styles.metaLine}>
                            <span>{stats.uniqueRunners.toLocaleString()}</span>{' '}
                            runners ·{' '}
                            <span>
                                {stats.totalAttemptCount.toLocaleString()}
                            </span>{' '}
                            attempts ·{' '}
                            <span>
                                <DurationToFormatted
                                    duration={stats.totalRunTime}
                                />
                            </span>{' '}
                            total
                        </div>
                        <div className={styles.heroActions}>
                            {claim && !claim.hasModerators && (
                                <ClaimCta
                                    claim={claim}
                                    gameDisplay={game.display}
                                />
                            )}
                            {selfClaim}
                            <Link
                                href={`/games-v2/${game.name}/submit`}
                                className="btn btn-sm btn-primary"
                            >
                                Submit a run
                            </Link>
                            {(canManage || canModerate) && (
                                <Link
                                    href={`/games-v2/${game.name}/manage`}
                                    className={`btn btn-sm ${styles.glassChip}`}
                                >
                                    {canModerate ? 'Moderate' : 'Manage'}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
                {category && (
                    <div
                        className={styles.crown}
                        key={`${category.id}:${subcategoryKey}`}
                    >
                        <div className={styles.crownHead}>
                            <span className={styles.eyebrow}>
                                World record — {category.display}
                            </span>
                            <button
                                type="button"
                                className={styles.quietLink}
                                onClick={() => setHistoryOpen(true)}
                            >
                                History
                            </button>
                        </div>
                        {wr ? (
                            <>
                                <div className={styles.crownTime}>
                                    {wrHref ? (
                                        <Link
                                            href={wrHref}
                                            className="text-decoration-none"
                                        >
                                            <DurationToFormatted
                                                duration={wr.time as number}
                                            />
                                        </Link>
                                    ) : (
                                        <DurationToFormatted
                                            duration={wr.time as number}
                                        />
                                    )}
                                </div>
                                <div className={styles.crownMeta}>
                                    <UserLink
                                        username={wr.runnerName}
                                        url={undefined}
                                    />{' '}
                                    <CountryFlag country={wr.country} />
                                    {wr.runDate && (
                                        <span
                                            title={new Date(
                                                wr.runDate,
                                            ).toLocaleDateString()}
                                        >
                                            {' '}
                                            · {relativeDate(wr.runDate)}
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : boardIsEmpty ? (
                            <div className={styles.crownEmpty}>
                                No verified runs yet —{' '}
                                <Link href={`/games-v2/${game.name}/submit`}>
                                    set the first record
                                </Link>
                                .
                            </div>
                        ) : (
                            <div className={styles.crownTime}>
                                <span className={styles.crownMeta}>—</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {historyOpen && category && (
                <WrHistoryDrawer
                    show={historyOpen}
                    onHide={() => setHistoryOpen(false)}
                    gameSlug={game.name}
                    categorySlug={category.name}
                    categoryDisplay={category.display}
                    subcategoryKey={subcategoryKey}
                />
            )}
        </header>
    );
}

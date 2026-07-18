'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { HourglassSplit } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type {
    LeaderboardEntry,
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
    /**
     * The rank-1 entry for the current category/subcategory — always the
     * real record, fetched server-side through page 1 even when the board
     * itself is showing a deep-linked later page. Null when there's no
     * valid board or it has no runs yet.
     */
    wrEntry: LeaderboardEntry | null;
    /** True only for a genuinely empty (zero-entry) valid board. */
    boardIsEmpty: boolean;
    subcategoryKey: string;
    canManage?: boolean;
    canModerate?: boolean;
    claim?: ClaimCtaState | null;
}

export function GameHero({
    game,
    stats,
    category,
    wrEntry,
    boardIsEmpty,
    subcategoryKey,
    canManage,
    canModerate,
    claim,
}: Props) {
    const [historyOpen, setHistoryOpen] = useState(false);

    // Defensive: wrEntry is already the real rank-1 record by construction
    // (data.ts resolves it from a page-1 fetch), but a malformed/empty
    // response should still fall back to the neutral state rather than
    // rendering a bogus crown.
    const wr =
        wrEntry && wrEntry.rank === 1 && wrEntry.time !== null ? wrEntry : null;
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
                                <div className={styles.crownTimeRow}>
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
                                    {wr.verificationStatus === 'pending' && (
                                        <span className={styles.crownPending}>
                                            <HourglassSplit
                                                size={11}
                                                aria-hidden
                                            />
                                            Pending verification
                                        </span>
                                    )}
                                </div>
                                <div className={styles.crownMeta}>
                                    <UserLink
                                        username={wr.runnerName}
                                        url={undefined}
                                    />{' '}
                                    <CountryFlag country={wr.country} />
                                    {wr.runDate && (
                                        <span title={formatRunDate(wr.runDate)}>
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

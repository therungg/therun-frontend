import type React from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { Vod, youtubeParser } from '~src/components/run/dashboard/vod';
import { DurationToFormatted } from '~src/components/util/datetime';
import {
    buildBoardHref,
    buildSubmitHref,
    rankToPage,
} from '~src/lib/board-url';
import { formatRunDate } from '~src/lib/format-run-date';
import type {
    ResolvedGame,
    RunOrigin,
    RunOriginRef,
} from '../../../../../types/leaderboards.types';
import type { HistoryEvent } from '../../../../../types/moderation.types';
import { formatSubcategoryKey } from '../labels';
import { CountryFlag } from '../leaderboard/country-flag';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { isSameRunner } from '../shared/is-same-runner';
import { OriginPanel } from './origin-panel';
import { RunActions } from './run-actions';
import { VariablesLine, VerificationBadge } from './run-badges';
import { RunHistoryList } from './run-history-list';
import styles from './run-view.module.scss';

// This run's position on its live board — only ever populated for the
// `run` kind (run/[runId]/page.tsx matches getUserRankingsByName against
// this runId). A miss (the run isn't the runner's current board entry —
// superseded by a later PB, filtered out, etc.) means `null`: the rank
// line is omitted, but the breadcrumb still links to the plain game/board
// URL (see RunView below).
export interface RunBoardStanding {
    categorySlug: string;
    subcategoryKey: string;
    rank: number;
    totalRunners: number;
}

export interface RunViewModel {
    kind: 'run' | 'manual';
    id: number; // runId or manualTimeId
    game: ResolvedGame;
    categoryDisplay: string;
    subcategoryKey: string;
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    realTime: number | null;
    gameTime: number | null;
    runDate: string | null; // null for manual times (no run date)
    vodUrl: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    variables: Record<string, string>;
    origin: RunOrigin | null;
    verifiedBy: RunOriginRef | null;
    rejectionReason: string | null;
    boardStanding: RunBoardStanding | null;
}

function isEmbeddableVod(url: string): boolean {
    return Boolean(youtubeParser(url)) || url.includes('twitch');
}

export function RunView({
    model,
    history,
    sessionUsername,
    modPanel,
}: {
    model: RunViewModel;
    history: HistoryEvent[]; // [] for manual times
    sessionUsername: string | null;
    modPanel?: React.ReactNode; // mod layer slot, page decides
}): React.JSX.Element {
    const primaryTime = model.realTime ?? model.gameTime;
    const isRejected = model.verificationStatus === 'rejected';
    const subcategoryLabel = formatSubcategoryKey(model.subcategoryKey);
    const standing = model.boardStanding;
    const isTopOfBoard = standing?.rank === 1;

    // Breadcrumb + rank deep link: a matched standing carries a real
    // category slug, so the board pills/rank line point at that exact
    // slice; no match falls back to the plain game URL (RunDetail has no
    // categorySlug of its own to build a scoped link from — see round-1
    // handoff).
    const gameHref = buildBoardHref(model.game.name);
    const boardHref = standing
        ? buildBoardHref(model.game.name, {
              categorySlug: standing.categorySlug,
              subcategoryKey: standing.subcategoryKey,
          })
        : gameHref;
    const rankHref = standing
        ? buildBoardHref(model.game.name, {
              categorySlug: standing.categorySlug,
              subcategoryKey: standing.subcategoryKey,
              page: rankToPage(standing.rank),
          })
        : null;
    // "Correct this time" / "submit a corrected claim" target — carries
    // the matched standing's category context when there is one (only the
    // `run` kind ever has a standing; manual claims never do — see
    // requirement 5's backend handoff, W6).
    const claimHref = buildSubmitHref(model.game.name, {
        mode: 'claim',
        categorySlug: standing?.categorySlug,
        subcategoryKey: standing?.subcategoryKey,
    });

    const eyebrowText = `${model.game.display} · ${model.categoryDisplay}${
        subcategoryLabel ? ` · ${subcategoryLabel}` : ''
    }`;

    // "What now?" — a rejected self-claim (manual variant, owner only)
    // isn't a dead end. `mode=claim` carries the same category context the
    // board pills above resolved (none, currently, since manual times have
    // no rank match to source a categorySlug from — see requirement 5's
    // backend handoff, W6).
    const isOwnManualClaim =
        model.kind === 'manual' &&
        isSameRunner(sessionUsername, model.runnerName);
    const showWhatNow = isOwnManualClaim && isRejected;

    return (
        <div>
            <header className={styles.header}>
                <Link href={gameHref} className={styles.gameLink}>
                    {model.game.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={model.game.image}
                            width={48}
                            height={64}
                            className={styles.gameCover}
                            alt=""
                        />
                    )}
                    <span>{model.game.display}</span>
                </Link>
                <div className={styles.crumbBody}>
                    <div className={styles.eyebrow}>{eyebrowText}</div>
                    <div className={styles.timeRow}>
                        <h1
                            className={`${styles.time} ${isTopOfBoard ? styles.timeGold : ''}`}
                        >
                            {primaryTime != null ? (
                                // The category's showMilliseconds flag isn't
                                // fetchable from this page's data (RunDetail
                                // has no category settings join) without an
                                // extra call — default to ms here since a run
                                // page showing more precision than configured
                                // is never wrong, just occasionally more
                                // precise than the board.
                                <DurationToFormatted
                                    duration={primaryTime}
                                    withMillis
                                />
                            ) : (
                                '—'
                            )}
                        </h1>
                        <VerificationBadge status={model.verificationStatus} />
                    </div>
                    <div className={styles.runnerLine}>
                        <RunnerAvatar name={model.runnerName} />
                        {model.isGuest ? (
                            model.runnerName
                        ) : (
                            <UserLink username={model.runnerName} />
                        )}
                        {/* RunDetail/ManualTimeDetail carry no country — unlike
                            LeaderboardEntry, this join isn't available here yet. */}
                        <CountryFlag country={null} />
                        {model.verifiedBy && (
                            <span className={styles.verifiedByNote}>
                                verified by {model.verifiedBy.name}
                            </span>
                        )}
                    </div>
                    <div className={styles.pillRow}>
                        <Link href={boardHref} className={styles.pill}>
                            {model.categoryDisplay}
                        </Link>
                        {subcategoryLabel && (
                            <Link href={boardHref} className={styles.pill}>
                                {subcategoryLabel}
                            </Link>
                        )}
                    </div>
                    {standing && rankHref && (
                        <Link href={rankHref} className={styles.rankLine}>
                            <strong>
                                #{standing.rank} of {standing.totalRunners}
                            </strong>{' '}
                            on this board
                        </Link>
                    )}
                    <div className={styles.headerActions}>
                        <RunActions
                            model={model}
                            sessionUsername={sessionUsername}
                        />
                    </div>
                </div>
            </header>

            {isRejected && model.rejectionReason && (
                <div className={styles.rejectedNotice}>
                    Rejected: {model.rejectionReason}
                </div>
            )}

            {showWhatNow && (
                <p className={styles.whatNow}>
                    What now? You can{' '}
                    <Link href={claimHref}>submit a corrected claim</Link>.
                </p>
            )}

            <div className="row g-3">
                <div className="col-lg-8">
                    {model.vodUrl ? (
                        isEmbeddableVod(model.vodUrl) ? (
                            <div className={styles.vodWrap}>
                                <Vod vod={model.vodUrl} />
                            </div>
                        ) : (
                            <div className={styles.mediaPlaceholder}>
                                <a
                                    href={model.vodUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Watch video / view evidence ↗
                                </a>
                            </div>
                        )
                    ) : (
                        <div className={styles.mediaPlaceholder}>
                            No video attached
                        </div>
                    )}
                </div>
                <div className="col-lg-4 d-flex flex-column gap-3">
                    <div className={styles.surface}>
                        <div className="d-flex flex-wrap gap-3 mb-2">
                            <div>
                                <small className={styles.statLabel}>
                                    Real Time
                                </small>
                                <strong className={styles.statValue}>
                                    {model.realTime != null ? (
                                        <DurationToFormatted
                                            duration={model.realTime}
                                            withMillis
                                        />
                                    ) : (
                                        '—'
                                    )}
                                </strong>
                            </div>
                            <div>
                                <small className={styles.statLabel}>
                                    Game Time
                                </small>
                                <strong className={styles.statValue}>
                                    {model.gameTime != null ? (
                                        <DurationToFormatted
                                            duration={model.gameTime}
                                            withMillis
                                        />
                                    ) : (
                                        '—'
                                    )}
                                </strong>
                            </div>
                            {model.runDate && (
                                <div>
                                    <small className={styles.statLabel}>
                                        Run date
                                    </small>
                                    <span>{formatRunDate(model.runDate)}</span>
                                </div>
                            )}
                        </div>
                        <VariablesLine variables={model.variables} />
                    </div>
                    <OriginPanel model={model} />
                </div>
            </div>

            <RunHistoryList events={history} />
            {modPanel}
        </div>
    );
}

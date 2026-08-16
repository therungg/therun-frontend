import moment from 'moment';
import type React from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { Vod } from '~src/components/run/dashboard/vod';
import { DurationToFormatted } from '~src/components/util/datetime';
import {
    buildBoardHref,
    buildSubmitHref,
    rankToPage,
} from '~src/lib/board-url';
import { formatRunDate } from '~src/lib/format-run-date';
import { isEmbeddableVod } from '~src/lib/vod-url';
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
import {
    RunDescription,
    type RunDescriptionRestrictionView,
} from './run-description';
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
    /** Numeric game id — the owner Move/Hide-identity actions are game-scoped
     * `/v1/me/*` calls. Always present (both RunDetail and ManualTimeDetail
     * carry it), but only ever used when `kind === 'run'`. */
    gameId: number;
    /** This run's category id — the owner Move dialog needs it to find its
     * current placement in the loaded board context. Same availability note
     * as `gameId`. */
    categoryId: number;
    categoryDisplay: string;
    subcategoryKey: string;
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    realTime: number | null;
    gameTime: number | null;
    /** What this run's board calls its game-time clock. Display only. */
    gameTimeLabel: 'igt' | 'lrt';
    runDate: string | null; // null for manual times (no run date)
    vodUrl: string | null;
    /** Runner-authored markdown. Manual times carry no description — `null`. */
    description?: string | null;
    /**
     * Only ever set for the run's owner, on a read that carried their session:
     * a moderator revoked their descriptions on this category.
     */
    descriptionRestriction?: RunDescriptionRestrictionView | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    variables: Record<string, string>;
    origin: RunOrigin | null;
    verifiedBy: RunOriginRef | null;
    rejectionReason: string | null;
    boardStanding: RunBoardStanding | null;
}

export function RunView({
    model,
    history,
    sessionUsername,
    modPanel,
    canModerate = false,
}: {
    model: RunViewModel;
    history: HistoryEvent[]; // [] for manual times
    sessionUsername: string | null;
    modPanel?: React.ReactNode; // mod layer slot, page decides
    /** The visitor moderates this game — gates the description's mod verbs. */
    canModerate?: boolean;
}): React.JSX.Element {
    const primaryTime = model.realTime ?? model.gameTime;
    const isRejected = model.verificationStatus === 'rejected';
    // Tombstone (design doc §F / mocks fig. 5): a rejected run keeps this
    // same page rather than 404ing or vanishing. RunDetail has no separate
    // "excluded" boolean of its own (mod remove/restore and the verdict
    // reject/unreject verbs both resolve to this one status field today —
    // see the design doc's note that the frontend deliberately keeps
    // reversible layers rather than surfacing every backing verb), so
    // `isRejected` is the one state this page can render a tombstone from
    // without inventing a field the backend doesn't send.
    const isTombstone = isRejected;
    // Most recent reject-type verdict in the public history feed — the
    // event whose `at`/`reason` becomes the removal panel's byline.
    // HistoryEvent carries no actor name (only `byRole: 'mod'|'self'|
    // 'system'`), so the panel reads "by a moderator", not a specific
    // username — a real gap: full mock parity ("Removed by weegee_mod")
    // needs the backend to add an actor ref to either RunDetail or
    // HistoryEvent.
    const removalEvent = isTombstone
        ? (history.find(
              (e) => e.type === 'verdict' && e.action.includes('reject'),
          ) ?? null)
        : null;
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
    // "Correct this time" target — opens the submit dialog carrying the
    // matched standing's category context when there is one (only the `run`
    // kind ever has a standing; manual claims never do — see requirement 5's
    // backend handoff, W6). Submitting and claiming are one flow now, so
    // there is no longer a mode to ask for.
    const claimHref = buildSubmitHref(model.game.name, {
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
            {isTombstone && (
                <RemovalPanel
                    boardHref={boardHref}
                    event={removalEvent}
                    fallbackReason={model.rejectionReason}
                />
            )}
            <div className={isTombstone ? styles.desaturated : undefined}>
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
                            <VerificationBadge
                                status={model.verificationStatus}
                            />
                            {isTombstone && (
                                <span className={styles.notRankedPill}>
                                    Not ranked
                                </span>
                            )}
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
                        <RunDescription
                            kind={model.kind}
                            runId={model.id}
                            description={model.description ?? null}
                            // Same gate as the owner verbs above: a guest row
                            // or a userId-less row has no `/v1/me` identity,
                            // so there is nobody to edit as.
                            canEdit={
                                isSameRunner(
                                    sessionUsername,
                                    model.runnerName,
                                ) &&
                                model.userId != null &&
                                !model.isGuest
                            }
                            restriction={model.descriptionRestriction ?? null}
                            canModerate={canModerate}
                            gameSlug={model.game.name}
                            hasAccount={model.userId != null}
                        />
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
                                        {model.gameTimeLabel === 'lrt'
                                            ? 'Load-Removed Time'
                                            : 'Game Time'}
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
                                        <span>
                                            {formatRunDate(model.runDate)}
                                        </span>
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
        </div>
    );
}

/**
 * The removal event, front and center, in full colour — the one thing on a
 * tombstone page that isn't desaturated. See `isTombstone` above for why
 * this only ever renders off `verificationStatus === 'rejected'`, and the
 * "by a moderator" byline for the actor-name gap in the history feed.
 */
function RemovalPanel({
    boardHref,
    event,
    fallbackReason,
}: {
    boardHref: string;
    event: HistoryEvent | null;
    fallbackReason: string | null;
}) {
    const reason = event?.reason ?? fallbackReason;
    const when = event ? moment(event.at).format('D MMM YYYY, HH:mm') : null;
    const by = event
        ? event.byRole === 'self'
            ? 'the runner'
            : event.byRole === 'system'
              ? 'the system'
              : 'a moderator'
        : null;

    return (
        <div className={styles.removalPanel}>
            <div className={styles.removalHead}>
                <span className={styles.removalPill}>Removed</span>
                {by && when && (
                    <span>
                        by {by} · {when}
                    </span>
                )}
            </div>
            {reason && <div className={styles.removalReason}>“{reason}”</div>}
            <Link href={boardHref} className={styles.removalBack}>
                ← Back to the board
            </Link>
        </div>
    );
}

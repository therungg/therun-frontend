import moment from 'moment';
import type React from 'react';
import Link from '~src/components/link';
import { buildBoardHref, buildSubmitHref } from '~src/lib/board-url';
import type {
    BoardContext,
    ResolvedGame,
    RunComparison,
    RunnerGameEntry,
    RunOrigin,
    RunOriginRef,
    RunSplit,
    RunTimerStats,
    VodReview,
} from '../../../../../types/leaderboards.types';
import type {
    AutoVerifyResult,
    HistoryEvent,
    VerifiedVia,
} from '../../../../../types/moderation.types';
import { isSameRunner } from '../shared/is-same-runner';
import { BoardSlice } from './board-slice';
import { DescriptionMarkdown } from './description-markdown';
import { runnerSplitsHref } from './run-format';
import { RunHero } from './run-hero';
import { RunMediaProvider, RunMediaSlot } from './run-media';
import { hasMedia } from './run-media-shared';
import pageStyles from './run-page.module.scss';
import { RunStatStrip } from './run-stat-strip';
import styles from './run-view.module.scss';
import { RunnerCard } from './runner-card';
import { SplitsTable } from './splits-table';
import { SupersededNote } from './superseded-note';
import { VerificationFooter } from './verification-footer';

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
    /** Runner's country; null for guests and hidden runners. */
    country: string | null;
    realTime: number | null;
    gameTime: number | null;
    /** What this run's board calls its game-time clock. Display only. */
    gameTimeLabel: 'igt' | 'lrt';
    runDate: string | null; // null for manual times (no run date)
    vodUrl: string | null;
    /** Runner-authored description (backend Task A4). May be absent while
     * that backend surface isn't deployed yet — pages default it to null. */
    description: string | null;
    descriptionRevoked?: boolean;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    variables: Record<string, string>;
    origin: RunOrigin | null;
    verifiedBy: RunOriginRef | null;
    rejectionReason: string | null;
    /** Who produced the run's current verdict; null covers everything that
     * isn't the auto-verify checks (see docs/frontend-guide-auto-verify.md
     * §3) — not evidence a human reviewed it. */
    verifiedVia: VerifiedVia;
    /** Per-check auto-verify result; set whenever the checks actually ran
     * (pass or fail), null otherwise. Mod-only display. */
    autoVerifyResult: AutoVerifyResult | null;
    /** Verification timestamp; null when unverified or on the manual-time
     * page (ManualTimeDetail carries no verifiedAt of its own). */
    verifiedAt: string | null;
    /** Category slug for scoped board links; null when the category can't
     * be resolved. */
    categorySlug: string | null;
    /** Null when rejected, superseded or unranked. */
    boardContext: BoardContext | null;
    /** The runner's timer stats for this category; null for imported runs,
     * set times, guest runs and redacted runs. */
    timerStats: RunTimerStats | null;
    /** PB splits; `[]` unless this run is the timer PB. */
    splits: RunSplit[];
    vodReview: VodReview | null;
    /** The runner's current entries in this game (runner card, superseded
     * note). */
    runnerEntries: RunnerGameEntry[];
    /** Runner's profile picture; null for guests, hidden runners and manual
     * times. */
    picture: string | null;
    /** The adjacent board run for split comparison; null on manual times. */
    comparison: RunComparison | null;
}

export function RunView({
    model,
    history,
    sessionUsername,
    isMod = false,
    modPanel,
}: {
    model: RunViewModel;
    history: HistoryEvent[]; // [] for manual times
    sessionUsername: string | null;
    isMod?: boolean;
    modPanel?: React.ReactNode; // mod layer slot, page decides
}): React.JSX.Element {
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
    const gameHref = buildBoardHref(model.game.name);
    const boardHref = buildBoardHref(model.game.name, {
        categorySlug: model.categorySlug,
        subcategoryKey: model.categorySlug ? model.subcategoryKey : null,
    });
    const media = hasMedia(model);
    const showDescription = !!model.description && !model.descriptionRevoked;

    // "Correct this time" target — opens the submit dialog carrying the
    // resolved category context when there is one (only the `run` kind ever
    // resolves one; manual claims never do — see requirement 5's backend
    // handoff, W6). Submitting and claiming are one flow now, so there is no
    // longer a mode to ask for.
    const claimHref = buildSubmitHref(model.game.name, {
        categorySlug: model.categorySlug ?? undefined,
        subcategoryKey: model.categorySlug ? model.subcategoryKey : undefined,
    });

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
            <div
                className={`${pageStyles.page} ${isTombstone ? styles.desaturated : ''}`}
            >
                <RunHero
                    model={model}
                    gameHref={gameHref}
                    boardHref={boardHref}
                    isTombstone={isTombstone}
                    sessionUsername={sessionUsername}
                />
                <RunStatStrip
                    model={model}
                    sessionUsername={sessionUsername}
                    isMod={isMod}
                />
                {showWhatNow && (
                    <p className={styles.whatNow}>
                        What now? You can{' '}
                        <Link href={claimHref}>submit a corrected claim</Link>.
                    </p>
                )}
                <RunMediaProvider>
                    <div
                        className={`${pageStyles.grid} ${media ? '' : pageStyles.gridBare}`}
                    >
                        {media && (
                            <div className={pageStyles.main}>
                                <div
                                    data-slot="media"
                                    className={pageStyles.mediaSurface}
                                >
                                    <RunMediaSlot model={model} />
                                </div>
                                {showDescription && model.description && (
                                    <div data-slot="description">
                                        <DescriptionBlock
                                            text={model.description}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        <aside className={pageStyles.side}>
                            <div
                                data-slot="board"
                                className={pageStyles.surface}
                            >
                                {!isTombstone && <BoardSlice model={model} />}
                                <SupersededNote model={model} />
                            </div>
                            <div
                                data-slot="runner"
                                className={pageStyles.surface}
                            >
                                <RunnerCard model={model} />
                            </div>
                        </aside>
                        {!media && showDescription && model.description && (
                            <div
                                data-slot="description"
                                className={pageStyles.bareDescription}
                            >
                                <DescriptionBlock text={model.description} />
                            </div>
                        )}
                        <div
                            data-slot="splits"
                            className={`${pageStyles.surface} ${pageStyles.wide}`}
                        >
                            <SplitsTable
                                splits={model.splits}
                                comparison={model.comparison}
                                splitsHref={runnerSplitsHref(model)}
                            />
                        </div>
                    </div>
                </RunMediaProvider>
                <VerificationFooter
                    model={model}
                    history={history}
                    isMod={isMod}
                />
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

function DescriptionBlock({ text }: { text: string }) {
    return (
        <div className={pageStyles.description}>
            <DescriptionMarkdown text={text} />
        </div>
    );
}

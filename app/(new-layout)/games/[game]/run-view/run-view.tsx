import moment from 'moment';
import type React from 'react';
import Link from '~src/components/link';
import {
    buildBoardHref,
    buildGameHref,
    buildSubmitHref,
} from '~src/lib/board-url';
import {
    isYourRow,
    type PlayersRuleScope,
    rendersAsRoster,
    showsSoloRosterPanel,
} from '~src/lib/run-view/roster';
import { parseSubcategoryKey } from '~src/lib/variables/keys';
import type {
    BoardContext,
    PlayersRange,
    ResolvedGame,
    RunComparison,
    RunnerGameEntry,
    RunOrigin,
    RunOriginRef,
    RunParticipant,
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
import { RunRoster } from './run-roster';
import styles from './run-view.module.scss';
import { RunnerCard } from './runner-card';
import { RunMetaLine, RunnerStats } from './runner-stats';
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
    /**
     * The timer's own clocks, when the shown time is not the timer's: a
     * verified source time on a linked run, or a hand-set time. Null (or
     * absent, on an older backend) otherwise.
     */
    timerTime?: number | null;
    timerGameTime?: number | null;
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
    /** The runner's splits page for this run's timer record; null without one. */
    splitsHref?: string | null;
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
    /** Whether this visitor can open the board pages (`canSeeBoards`). When
     * false, game links go to `/games/<game>`, board links render as text
     * and the submit/claim entry points are hidden. Missing = false. */
    boardsVisible?: boolean;
    /**
     * Everyone this run credits, in filing order. ABSENT (or null) MEANS
     * SOLO — a run with no roster does not carry the field, and a solo page
     * must look exactly as it did before co-op existed. Never on a manual
     * time, and never on a redacted run.
     */
    participants?: RunParticipant[] | null;
    /**
     * The run is off its board because its roster no longer satisfies the
     * board's player policy (`ineligible_reason = participants_incomplete`).
     *
     * This is the one ineligible reason the PUBLIC run-detail payload does
     * carry (guide §5) — every other reason is moderation and stays on the
     * moderator-only provenance read, but this one is the runner's own to
     * fix, so it rides the plain `RunDetail.rosterIncomplete` boolean a
     * signed-out visitor's read can see too. Absent on a deploy that
     * predates the field.
     */
    rosterIncomplete?: boolean;
    /** The run is off its board because its roster credits MORE runners than
     * the board's `players` maximum — the other public ineligible reason
     * (guide §5). Never both this and `rosterIncomplete`. Absent on older
     * deploys. */
    rosterTooMany?: boolean;
    /** The board's resolved runner range, for naming the count in the panel's
     * notice. `max: null` is no ceiling; `null` is no policy configured at
     * any scope. Absent on older deploys — treat as null. */
    players?: PlayersRange | null;
    /** Where that rule lives, for the sentences that name it. */
    playersScope?: PlayersRuleScope;
    /** True only when this run's board has a players policy that both exists
     * and permits more than one runner (guide §5). Gates the affordances that
     * would MAKE a run co-op — never the rendering of a roster it already
     * has. Absent (older deploy) is treated as false. */
    coopBoard?: boolean;
}

export function RunView({
    model,
    history,
    sessionUsername,
    isMod = false,
    bar,
    top,
    aside,
    belowMain,
    splits,
    headline,
    mediaFoot,
    noMedia,
    footer,
    rosterOpen = false,
}: {
    model: RunViewModel;
    history: HistoryEvent[]; // [] for manual times
    sessionUsername: string | null;
    isMod?: boolean;
    /** Pinned bar, first on the page. Rendered straight into the outer
     * element so it sticks for the whole view, not one band. */
    bar?: React.ReactNode;
    /** Above the page, the removal panel included. */
    top?: React.ReactNode;
    /** In the aside after the board slice; replaces the runner card. */
    aside?: React.ReactNode;
    /** A full-width row after the media and aside, before the splits. */
    belowMain?: React.ReactNode;
    /** Replaces the splits table when set. */
    splits?: React.ReactNode;
    /** Moderator view: the run in one line, in place of the hero and the
     * runner's stats. */
    headline?: React.ReactNode;
    /** Moderator view: under the video. */
    mediaFoot?: React.ReactNode;
    /** Moderator view: the video's place when there is none to play. */
    noMedia?: React.ReactNode;
    /** Moderator view: in place of the verification footer. */
    footer?: React.ReactNode;
    /** Moderator view: the Runners panel was asked for (a partner is being
     * added to a run filed solo). */
    rosterOpen?: boolean;
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
    const boardsVisible = model.boardsVisible === true;
    const gameHref = buildGameHref(model.game, boardsVisible);
    const boardHref = boardsVisible
        ? buildBoardHref(model.game.name, {
              categorySlug: model.categorySlug,
              subcategoryKey: model.categorySlug ? model.subcategoryKey : null,
          })
        : null;
    const media = hasMedia(model);
    const showDescription = !!model.description && !model.descriptionRevoked;
    // The Runners panel, or null when there is nothing for it to say. It
    // earns its place on a run that credits several people, on a run whose
    // roster has taken it off the board, and on any run a moderator is
    // looking at — a co-op run is filed solo and its partners are credited
    // afterwards, so the solo page is where that starts.
    //
    // A solo run has no roster rows at all, so the filer stands in for one:
    // that is exactly what the backend writes the moment the roster is first
    // edited. A manual time carries a roster of its own and takes the same
    // panel — see `resolveRosterMembers`.
    const rosterMembers = resolveRosterMembers(model, sessionUsername, isMod);
    // Whether this run already has a real roster of its own — the one flag
    // `RunRoster` needs to let a moderator repair a team's roster after the
    // board's players policy is removed (guide §5 / brief part 5), without
    // making the same true for a plain solo run on a non-co-op board.
    const hasRoster = rendersAsRoster(model.participants, model);

    // Above the fold for the person the panel is actually for (requirement:
    // the runner who did not file this run has to see "Take me off this run"
    // without scrolling). Everyone else keeps the existing order — the board
    // slice first, roster second. Filed-by-you stays board-first too: the
    // filer already sees their own run at the top of the page, and it is
    // their own submission, not a credit somebody else gave them.
    const viewerIsFiler = isSameRunner(sessionUsername, model.runnerName);
    // `isYourRow` is the one "is this the viewer's row" test the board row
    // and Find-me use — checked against the roster the panel is actually
    // showing, not a third inline recompute of the same account match.
    const rosterFirst =
        rosterMembers != null &&
        isYourRow(rosterMembers, model.runnerName, sessionUsername) &&
        !viewerIsFiler;

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
    const showWhatNow = isOwnManualClaim && isRejected && boardsVisible;

    if (bar != null) {
        // The moderator's layout: the video beside the board and the facts,
        // the runner and the rules below, then the splits and the history.
        // With no video the splits take its column; with neither, the facts
        // do, so there's no hole.
        const splitsBlock = splits ?? (
            <div className={pageStyles.surface}>
                <SplitsTable
                    splits={model.splits}
                    comparison={model.comparison}
                    splitsHref={runnerSplitsHref(model)}
                />
            </div>
        );
        const factsLeft = !media && model.splits.length === 0;
        // A solo run's Runners row already names the runner; the panel only
        // earns a place on a team (or what a removal left of one), on a
        // roster the board holds the run for, or on a run filed as co-op.
        const showRoster =
            rosterMembers != null &&
            (hasRoster ||
                rosterOpen ||
                model.rosterIncomplete === true ||
                model.rosterTooMany === true ||
                filedAsCoop(model));
        const note = showDescription && model.description && (
            <section className={pageStyles.surface}>
                <div className={pageStyles.panelHead}>
                    <h2 className={pageStyles.panelEyebrow}>Runner's note</h2>
                </div>
                <DescriptionBlock text={model.description} />
            </section>
        );
        return (
            <div className={pageStyles.modView}>
                {bar}
                {top != null && <div className={pageStyles.top}>{top}</div>}
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
                    {headline}
                    <RunMediaProvider>
                        <div className={pageStyles.modGrid}>
                            <div className={pageStyles.modColumn}>
                                {media ? (
                                    <div className={pageStyles.modMedia}>
                                        <div
                                            className={pageStyles.mediaSurface}
                                        >
                                            <RunMediaSlot model={model} />
                                        </div>
                                        {mediaFoot}
                                    </div>
                                ) : (
                                    noMedia
                                )}
                                {factsLeft && aside}
                                {note}
                                {!media && !factsLeft && splitsBlock}
                            </div>
                            <aside className={pageStyles.modColumn}>
                                <div
                                    data-slot="board"
                                    className={pageStyles.surface}
                                >
                                    {!isTombstone && (
                                        <BoardSlice
                                            model={model}
                                            title="Lands at"
                                        />
                                    )}
                                    <SupersededNote model={model} />
                                </div>
                                {!factsLeft && aside}
                                {showRoster && (
                                    <div
                                        data-slot="roster"
                                        className={pageStyles.surface}
                                    >
                                        <RunRoster
                                            board={{
                                                target: {
                                                    kind: model.kind,
                                                    id: model.id,
                                                },
                                                gameId: model.gameId,
                                                gameSlug: model.game.name,
                                                categoryId: model.categoryId,
                                                subcategoryKey:
                                                    model.subcategoryKey ?? '',
                                            }}
                                            members={rosterMembers}
                                            sessionUsername={sessionUsername}
                                            viewerIsFiler={viewerIsFiler}
                                            isMod={isMod}
                                            rosterIncomplete={
                                                model.rosterIncomplete === true
                                            }
                                            rosterTooMany={
                                                model.rosterTooMany === true
                                            }
                                            players={model.players ?? null}
                                            playersScope={
                                                model.playersScope ?? 'category'
                                            }
                                            coopBoard={model.coopBoard === true}
                                            hasRoster={hasRoster}
                                        />
                                    </div>
                                )}
                            </aside>
                        </div>
                        {belowMain != null && (
                            <div className={pageStyles.belowMain}>
                                {belowMain}
                            </div>
                        )}
                        {media && splitsBlock}
                    </RunMediaProvider>
                    {footer}
                </div>
            </div>
        );
    }

    return (
        <div className={bar != null ? pageStyles.modView : undefined}>
            {bar}
            {top != null && <div className={pageStyles.top}>{top}</div>}
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
                    meta={
                        <RunMetaLine
                            model={model}
                            sessionUsername={sessionUsername}
                            isMod={isMod}
                        />
                    }
                />
                <RunnerStats model={model} />
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
                            {(() => {
                                const boardBlock = (
                                    <div
                                        key="board"
                                        data-slot="board"
                                        className={pageStyles.surface}
                                    >
                                        {!isTombstone && (
                                            <BoardSlice model={model} />
                                        )}
                                        <SupersededNote model={model} />
                                    </div>
                                );
                                const rosterBlock = rosterMembers && (
                                    <div
                                        key="roster"
                                        data-slot="roster"
                                        className={pageStyles.surface}
                                    >
                                        <RunRoster
                                            board={{
                                                target: {
                                                    kind: model.kind,
                                                    id: model.id,
                                                },
                                                gameId: model.gameId,
                                                gameSlug: model.game.name,
                                                categoryId: model.categoryId,
                                                subcategoryKey:
                                                    model.subcategoryKey ?? '',
                                            }}
                                            members={rosterMembers}
                                            sessionUsername={sessionUsername}
                                            // The filer keeps the right to
                                            // credit someone even after
                                            // taking themselves off the run
                                            // (guide §3 rule 2), so it is
                                            // asked separately from "are you
                                            // on the roster".
                                            viewerIsFiler={viewerIsFiler}
                                            isMod={isMod}
                                            rosterIncomplete={
                                                model.rosterIncomplete === true
                                            }
                                            rosterTooMany={
                                                model.rosterTooMany === true
                                            }
                                            players={model.players ?? null}
                                            playersScope={
                                                model.playersScope ?? 'category'
                                            }
                                            coopBoard={model.coopBoard === true}
                                            hasRoster={hasRoster}
                                        />
                                    </div>
                                );
                                // Above the fold for a credited runner who
                                // did not file the run — everyone else keeps
                                // the board first.
                                const asideBlock = aside != null && (
                                    <div key="aside" data-slot="aside">
                                        {aside}
                                    </div>
                                );
                                return rosterFirst
                                    ? [rosterBlock, boardBlock, asideBlock]
                                    : [boardBlock, asideBlock, rosterBlock];
                            })()}
                            {aside == null && (
                                <div
                                    data-slot="runner"
                                    className={pageStyles.surface}
                                >
                                    <RunnerCard model={model} />
                                </div>
                            )}
                        </aside>
                        {!media && showDescription && model.description && (
                            <div
                                data-slot="description"
                                className={pageStyles.bareDescription}
                            >
                                <DescriptionBlock text={model.description} />
                            </div>
                        )}
                        {belowMain != null && (
                            <div
                                data-slot="below-main"
                                className={`${pageStyles.belowMain} ${pageStyles.wide}`}
                            >
                                {belowMain}
                            </div>
                        )}
                        {splits != null ? (
                            <div data-slot="splits" className={pageStyles.wide}>
                                {splits}
                            </div>
                        ) : (
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
                        )}
                    </div>
                </RunMediaProvider>
                <VerificationFooter
                    model={model}
                    history={history}
                    isMod={isMod}
                    showChecks={isMod && bar == null}
                />
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
    boardHref: string | null;
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
                <span className={styles.removalPill}>Rejected</span>
                {by && when && (
                    <span>
                        by {by} · {when}
                    </span>
                )}
            </div>
            {reason && <div className={styles.removalReason}>“{reason}”</div>}
            {boardHref && (
                <Link href={boardHref} className={styles.removalBack}>
                    ← Back to the board
                </Link>
            )}
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

/**
 * Who the Runners panel lists, or null when the panel has nothing to say.
 *
 * It earns its place on a run that credits several people, on a run taken off
 * its board by its roster, on any run a moderator is looking at, and — this
 * is the ordinary path a co-op run is even created — for the filer and
 * anyone currently credited: guide §2 says a co-op run is filed solo and its
 * partners are added afterwards, and guide §3 rule 2 says the filer and
 * every credited member may add. Gate this on moderator/incomplete alone and
 * that path doesn't exist: a solo filer on a board with the default players
 * policy gets no panel and no way to ever add a partner. This has to agree
 * with `RunRoster`'s own `canAdd`, which computes the same set — see that
 * component rather than writing a third test here.
 *
 * A solo entry carries no roster rows at all, so the filer stands in for one.
 * That is not a guess: the backend materialises exactly that row the moment
 * such an entry's roster is first edited.
 *
 * A MANUAL TIME takes the same panel, and every rule above holds for it
 * unchanged (guide §11) — the one difference is upstream of here: its roster
 * is filed WITH it, so the ordinary path is a team that already exists rather
 * than a solo entry growing one.
 */
/** The run's own values say it was run by more than one person: a solo/co-op
 * variable set to co-op, a duo, or a player count above one. */
function filedAsCoop(model: RunViewModel): boolean {
    const values = [
        ...Object.values(model.variables),
        ...parseSubcategoryKey(model.subcategoryKey).map((p) => p.value),
    ];
    return values.some((raw) => {
        const v = String(raw).toLowerCase();
        return (
            /\bco-?op\b|\bduo\b|\bteam\b/.test(v) ||
            /\b[2-9]\s*(p|players?)\b/.test(v)
        );
    });
}

function resolveRosterMembers(
    model: RunViewModel,
    sessionUsername: string | null,
    isMod: boolean,
): RunParticipant[] | null {
    const roster = model.participants ?? [];
    // Any roster that is not simply the filer is this run's own answer to who
    // it credits, and the panel always shows it. That includes a ONE-member
    // roster whose member is not the filer: that roster is the result of a
    // removal, and hiding it would hide the only record of who is left.
    if (rendersAsRoster(model.participants, model)) return model.participants;
    const viewerIsFiler = isSameRunner(sessionUsername, model.runnerName);
    const viewerOnRoster = roster.some(
        (m) => m.userId != null && isSameRunner(sessionUsername, m.name),
    );
    if (
        !showsSoloRosterPanel(model.coopBoard === true, {
            isMod,
            rosterIncomplete: model.rosterIncomplete === true,
            rosterTooMany: model.rosterTooMany === true,
            viewerIsFiler,
            viewerOnRoster,
        })
    ) {
        return null;
    }
    if (roster.length > 0) return roster;
    return [
        {
            userId: model.userId,
            name: model.runnerName,
            isGuest: model.isGuest,
            country: model.country,
            picture: model.picture,
        },
    ];
}

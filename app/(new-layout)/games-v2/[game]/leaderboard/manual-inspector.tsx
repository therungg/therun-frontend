'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
    BoxArrowUpRight,
    ChevronDown,
    ChevronUp,
    PlayBtn,
} from 'react-bootstrap-icons';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import type { ModVerb } from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/action-model';
import {
    RunActionForm,
    VERB_TITLE,
} from '~app/(new-layout)/games-v2/[game]/manage/moderation/shared/run-action-dialog';
import { selfSetManualEvidenceAction } from '~src/actions/self-evidence.action';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type {
    GameTimeLabel,
    LeaderboardEntry,
    ResolvedCategory,
    VariableRow,
    VodReviewPatch,
} from '../../../../../types/leaderboards.types';
import type { UserEligibleRunRow } from '../../../../../types/moderation.types';
import { loadUserEligibleRunsAction } from '../manage/moderation/shared/actions/eligible-runs.action';
import { ManualTimeDialog } from '../manage/moderation/shared/manual-time-dialog';
import { useDialogBehavior } from '../shared/board-dialog';
import { EvidenceEditor } from '../shared/evidence-editor';
import { evidencePermissions } from '../shared/use-evidence-permissions';
import { buildSubcategoryKey } from '../submit/subcategory-key';
import { loadModBoardContextAction } from './actions/load-mod-board-context.action';
import {
    loadOwnerEvidenceAction,
    type OwnerEvidenceTarget,
} from './actions/load-owner-evidence.action';
import { relativeDate } from './relative-date';
import styles from './run-inspector.module.scss';
import { detectVod } from './vod-review/player/types';
import { ReviewPane, useReviewPaneFits } from './vod-review/review-pane';
import { ReviewVodPanel } from './vod-review/review-vod-panel';
import { ReviewingCard } from './vod-review/reviewing-card';

/** Who is looking. `'mod'` is the full moderation surface (default, so
 * existing callers — board-curation, the mod pager path — are unchanged);
 * `'owner'` is the reduced self-service one a runner gets on their OWN set
 * time and nobody else's. Mirrors `InspectorMode` in run-inspector.tsx. */
export type ManualInspectorMode = 'mod' | 'owner';

interface Props {
    /** The inspected row — always a manual set time (manualTimeId != null). */
    entry: LeaderboardEntry;
    gameSlug: string;
    gameId: number;
    categorySlug: string;
    subcategoryDefKeys: string[];
    mode?: ManualInspectorMode;
    gameTimeLabel?: GameTimeLabel;
    showMilliseconds: boolean;
    onClose: () => void;
    onMutated: () => void;
    onPrev?: () => void;
    onNext?: () => void;
    /** Open with this verb form already expanded — the row's Remove/`x`
     * routes here instead of a standalone dialog. Mod mode only. */
    initialVerb?: ModVerb;
}

type OwnerEvidence = {
    vodUrl: string | null;
    description: string | null;
    descriptionRevoked: boolean;
};

/**
 * Owner mode's evidence block — the self-service `EvidenceEditor`, wired to
 * `selfSetManualEvidenceAction`. Mirrors `OwnerEvidenceBlock` in
 * run-inspector.tsx so the two owner surfaces don't drift.
 */
function OwnerEvidenceBlock({
    manualTimeId,
    verificationStatus,
    evidence,
}: {
    manualTimeId: number;
    verificationStatus: LeaderboardEntry['verificationStatus'];
    evidence: OwnerEvidence | null;
}) {
    const perms = evidencePermissions({
        isOwner: true,
        isMod: false,
        verificationStatus,
        descriptionRevoked: evidence?.descriptionRevoked ?? false,
    });

    const onSaveVod = (url: string | null) =>
        selfSetManualEvidenceAction(manualTimeId, { evidenceUrl: url });

    const onSaveDescription = (text: string | null) =>
        selfSetManualEvidenceAction(manualTimeId, { description: text });

    if (evidence == null) {
        return (
            <div className={styles.evidence}>
                <p className="text-muted small mb-0">Loading your evidence…</p>
            </div>
        );
    }

    return (
        <div className={styles.evidence}>
            <EvidenceEditor
                vodUrl={evidence.vodUrl}
                description={evidence.description}
                perms={perms}
                onSaveVod={onSaveVod}
                onSaveDescription={onSaveDescription}
            />
        </div>
    );
}

interface ModBoardContext {
    gameDisplay: string;
    categories: ResolvedCategory[];
    variables: VariableRow[];
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'text-bg-warning' },
    verified: { label: 'Verified', className: 'text-bg-success' },
    rejected: { label: 'Rejected', className: 'text-bg-danger' },
};

/** The verbs the footer offers for a set time in this verification state.
 * Manual times have no restore/move — verify and reject are their verdicts,
 * remove is a hard delete. */
export function manualVerbsForStatus(
    status: LeaderboardEntry['verificationStatus'],
): ModVerb[] {
    const verbs: ModVerb[] = [];
    if (status !== 'verified') verbs.push('approve');
    if (status !== 'rejected') verbs.push('reject');
    verbs.push('remove');
    return verbs;
}

/**
 * Set-time inspector — the manual counterpart to RunInspector, in the same
 * drawer chrome. A manual set time has no finished_run, so no run-history
 * timeline and no move/adjust/hide-identity; its verbs are Verify / Reject /
 * Remove (a delete) plus Change time… (the value + evidence editor). j/k step
 * through the page's set-time rows.
 */
export function ManualInspector({
    entry,
    gameSlug,
    gameId,
    categorySlug,
    subcategoryDefKeys,
    mode = 'mod',
    gameTimeLabel = 'igt',
    showMilliseconds,
    onClose,
    onMutated,
    onPrev,
    onNext,
    initialVerb,
}: Props) {
    const ownerMode = mode === 'owner';
    const manualTimeId = entry.manualTimeId as number;
    // VOD review — see RunInspector: workbench in a companion pane beside the
    // drawer at wide viewports, inline in the evidence block otherwise. Open
    // state survives j/k (the pane re-targets); the summary is per set time.
    const [reviewing, setReviewing] = useState(false);
    const [reviewPatch, setReviewPatch] = useState<VodReviewPatch | null>(null);
    const paneFits = useReviewPaneFits();
    useEffect(() => {
        setReviewPatch(null);
    }, [manualTimeId]);
    const toggleReview = () => {
        setReviewing((v) => !v);
        setReviewPatch(null);
    };
    const reviewUrl = entry.vodUrl ?? null;
    const reviewInPane =
        reviewing &&
        paneFits &&
        !ownerMode &&
        reviewUrl != null &&
        detectVod(reviewUrl) != null;
    const panelRef = useRef<HTMLDivElement>(null);
    // Portal target isn't available during SSR — mount client-side only.
    const [portalReady, setPortalReady] = useState(false);
    useEffect(() => {
        setPortalReady(true);
    }, []);
    const [activeVerb, setActiveVerb] = useState<ModVerb | null>(
        initialVerb ?? null,
    );
    // Same contract as RunInspector: re-applies when another row's Remove
    // is clicked while the drawer is open; stepping clears the parent verb.
    useEffect(() => {
        if (initialVerb) setActiveVerb(initialVerb);
    }, [initialVerb, manualTimeId]);
    const [editOpen, setEditOpen] = useState(false);

    // Board context (categories) for the Change-time dialog's categoryId —
    // loaded lazily on first use, like the old kebab.
    const [modCtx, setModCtx] = useState<ModBoardContext | null>(null);
    const [_ctxPending, startCtxLoad] = useTransition();

    const [runnerRuns, setRunnerRuns] = useState<UserEligibleRunRow[] | null>(
        null,
    );

    // Owner mode only: `description` + `descriptionRevoked` aren't on the
    // public `LeaderboardEntry` — see `load-owner-evidence.action.ts`. Loaded
    // lazily on open, reset (and re-fetched) on manualTimeId change or a
    // mode flip, and never fetched in mod mode.
    const [ownerEvidence, setOwnerEvidence] = useState<OwnerEvidence | null>(
        null,
    );
    useEffect(() => {
        if (!ownerMode) {
            setOwnerEvidence(null);
            return;
        }
        let stale = false;
        setOwnerEvidence(null);
        const target: OwnerEvidenceTarget = { kind: 'manual', manualTimeId };
        loadOwnerEvidenceAction(target).then((res) => {
            if (stale || 'error' in res) return;
            setOwnerEvidence(res);
        });
        return () => {
            stale = true;
        };
    }, [ownerMode, manualTimeId]);

    // Hand the focus trap to the Change-time dialog while it's open.
    useDialogBehavior({ open: !editOpen, onClose, panelRef });

    const entrySubcategoryKey = buildSubcategoryKey(
        Object.fromEntries(
            Object.entries(entry.variables ?? {}).filter(([k]) =>
                subcategoryDefKeys.includes(k),
            ),
        ),
    );
    const modCategory =
        modCtx?.categories.find((c) => c.name === categorySlug) ?? null;

    const openEdit = () => {
        if (modCtx != null) {
            if (modCategory == null) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            setEditOpen(true);
            return;
        }
        startCtxLoad(async () => {
            const res = await loadModBoardContextAction(gameSlug);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            const ctx = {
                gameDisplay: res.gameDisplay,
                categories: res.categories,
                variables: res.variables,
            };
            setModCtx(ctx);
            if (!ctx.categories.some((c) => c.name === categorySlug)) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            setEditOpen(true);
        });
    };

    const step = (dir: 'prev' | 'next') => {
        setActiveVerb(null);
        (dir === 'prev' ? onPrev : onNext)?.();
    };

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (activeVerb != null || editOpen) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (
                t &&
                (t.tagName === 'INPUT' ||
                    t.tagName === 'TEXTAREA' ||
                    t.tagName === 'SELECT' ||
                    t.isContentEditable)
            ) {
                return;
            }
            if (e.key === 'j' && onNext) {
                e.preventDefault();
                step('next');
            } else if (e.key === 'k' && onPrev) {
                e.preventDefault();
                step('prev');
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeVerb, editOpen, onNext, onPrev]);

    // The runner-record block (board count / prior rejections) is
    // mod-only — it reads through `loadUserEligibleRunsAction`, which is
    // itself moderator-gated (an arbitrary userId, unlike the owner's own
    // `/v1/me/*` routes), and links to a mod-only runner page. Owner mode
    // skips the fetch rather than let it 403 for no on-screen benefit.
    useEffect(() => {
        const userId = entry.userId;
        if (ownerMode || userId == null) {
            setRunnerRuns(null);
            return;
        }
        let stale = false;
        setRunnerRuns(null);
        loadUserEligibleRunsAction(gameSlug, userId).then((res) => {
            if (stale || 'error' in res) return;
            setRunnerRuns(res.rows);
        });
        return () => {
            stale = true;
        };
    }, [gameSlug, entry.userId, ownerMode]);

    // A manual row asserts exactly one clock; the entry carries it in
    // gameTime or realTime (see the board row's manual handling).
    const timing = entry.gameTime != null ? 'gametime' : 'realtime';
    const timeMs = entry.gameTime ?? entry.realTime ?? entry.time ?? 0;
    const timeLabel =
        timing === 'gametime'
            ? gameTimeLabel === 'lrt'
                ? 'Load-removed time'
                : 'Game time'
            : 'Real time';
    const badge = STATUS_BADGE[entry.verificationStatus] ?? null;
    const variableValues = Object.values(entry.variables ?? {});

    const boardCount =
        runnerRuns?.filter(
            (r) => r.isLeaderboardEntry || r.isLeaderboardEntryGt,
        ).length ?? 0;
    const rejectedCount =
        runnerRuns?.filter((r) => r.verificationStatus === 'rejected').length ??
        0;

    const verbDone = () => {
        setActiveVerb(null);
        onMutated();
    };

    if (!portalReady) return null;

    // Portalled for the same reason as RunInspector — see the note there.
    return createPortal(
        <>
            <button
                type="button"
                aria-label="Close set-time inspector"
                className={`position-fixed top-0 start-0 w-100 h-100 border-0 p-0 ${styles.backdrop}`}
                onClick={onClose}
            />
            {reviewInPane && reviewUrl && (
                <ReviewPane
                    key={manualTimeId}
                    url={reviewUrl}
                    target={{ kind: 'manual', manualTimeId, gameId }}
                    gameSlug={gameSlug}
                    onSaved={onMutated}
                    onChange={setReviewPatch}
                    onClose={toggleReview}
                />
            )}
            <div
                ref={panelRef}
                className={`position-fixed top-0 end-0 h-100 bg-body shadow-lg d-flex flex-column ${styles.panel}`}
                role="dialog"
                aria-modal="true"
                aria-label={
                    ownerMode
                        ? 'Manage your set time'
                        : `Moderate ${entry.runnerName}'s set time`
                }
            >
                <div className="d-flex align-items-center justify-content-between p-3 border-bottom">
                    <h2 className="h5 mb-0">
                        {ownerMode ? 'Manage set time' : 'Moderate set time'}
                    </h2>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        onClick={onClose}
                    />
                </div>

                <div className="flex-grow-1 overflow-auto">
                    <div className="p-3 border-bottom">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className={styles.runnerName}>
                                {entry.runnerName}
                            </span>
                            <span className="badge text-bg-secondary">
                                Set time
                            </span>
                            {badge && (
                                <span className={`badge ${badge.className}`}>
                                    {badge.label}
                                </span>
                            )}
                            {entry.runDate && (
                                <span
                                    className="text-muted small"
                                    title={formatRunDate(entry.runDate)}
                                >
                                    {relativeDate(entry.runDate)}
                                </span>
                            )}
                        </div>
                        <div className="text-muted small mt-1">
                            {categorySlug}
                            {variableValues.length > 0 &&
                                ` — ${variableValues.join(' / ')}`}
                        </div>
                        <div className={styles.timesLine}>
                            <span>
                                <span className={styles.timeLabel}>
                                    {timeLabel}
                                </span>{' '}
                                <DurationToFormatted
                                    duration={timeMs}
                                    withMillis={showMilliseconds}
                                />
                            </span>
                        </div>
                        {!ownerMode && (
                            <div className="d-flex gap-3 mt-2">
                                {entry.vodUrl && (
                                    <a
                                        href={entry.vodUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.factLink}
                                    >
                                        <PlayBtn size={14} aria-hidden />{' '}
                                        Evidence
                                    </a>
                                )}
                                {entry.vodUrl &&
                                    detectVod(entry.vodUrl) != null && (
                                        <button
                                            type="button"
                                            className={styles.factLink}
                                            onClick={toggleReview}
                                        >
                                            {reviewing
                                                ? 'Close review'
                                                : 'Review VOD'}
                                        </button>
                                    )}
                                <Link
                                    href={`/games-v2/${encodeURIComponent(gameSlug)}/manual/${manualTimeId}`}
                                    className={styles.factLink}
                                >
                                    <BoxArrowUpRight size={12} aria-hidden />{' '}
                                    Set-time details
                                </Link>
                            </div>
                        )}
                        {reviewInPane && reviewUrl && (
                            <div className="mt-2">
                                <ReviewingCard
                                    url={reviewUrl}
                                    patch={reviewPatch}
                                    onClose={toggleReview}
                                />
                            </div>
                        )}
                        {!reviewInPane &&
                            !ownerMode &&
                            reviewing &&
                            entry.vodUrl && (
                                <div className="mt-2">
                                    <ReviewVodPanel
                                        url={entry.vodUrl}
                                        target={{
                                            kind: 'manual',
                                            manualTimeId,
                                            gameId,
                                        }}
                                        gameSlug={gameSlug}
                                        onSaved={onMutated}
                                    />
                                </div>
                            )}
                    </div>

                    {/* Owner mode gets the self-service evidence editor
                        (VOD + description) in place of the mod's runner
                        record and paste-a-link affordances — both of those
                        are mod-only reads/routes with nothing for the owner
                        to see about their own set time. */}
                    {ownerMode ? (
                        <OwnerEvidenceBlock
                            key={manualTimeId}
                            manualTimeId={manualTimeId}
                            verificationStatus={entry.verificationStatus}
                            evidence={ownerEvidence}
                        />
                    ) : (
                        <>
                            <div className="p-3 border-bottom">
                                {entry.userId != null ? (
                                    <div className="d-flex align-items-center justify-content-between gap-2">
                                        <span className="small">
                                            {runnerRuns == null ? (
                                                <span className="text-muted">
                                                    Loading runner record…
                                                </span>
                                            ) : (
                                                <>
                                                    On {boardCount} board
                                                    {boardCount === 1
                                                        ? ''
                                                        : 's'}{' '}
                                                    in this game
                                                    {rejectedCount > 0 && (
                                                        <span className="text-danger">
                                                            {` · ${rejectedCount} prior rejection${rejectedCount === 1 ? '' : 's'}`}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </span>
                                        <Link
                                            href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/moderation/runner/${entry.userId}?from=board`}
                                            className={styles.factLink}
                                        >
                                            Runner page →
                                        </Link>
                                    </div>
                                ) : (
                                    <span className="text-muted small">
                                        Guest set time — no runner account.
                                    </span>
                                )}
                            </div>

                            <div className="p-3">
                                <p className="text-muted small mb-0">
                                    A moderator-set leaderboard time. It has no
                                    run history of its own; use Change time to
                                    correct its value or evidence.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Owner mode has no verbs of its own — a set time is a
                    moderator judgement call (Verify/Reject) or a hard
                    delete (Remove), neither of which is an owner-facing
                    action, and "Change time…" is a moderator edit. The
                    evidence editor above is the entire owner-mode surface;
                    do not invent an owner verb that doesn't exist. */}
                {!ownerMode && (
                    <div className="border-top">
                        {activeVerb == null ? (
                            <>
                                <div className={styles.actionBar}>
                                    {manualVerbsForStatus(
                                        entry.verificationStatus,
                                    ).map((verb) => (
                                        <button
                                            key={verb}
                                            type="button"
                                            className={`btn ${styles.verbBtn} ${
                                                verb === 'approve'
                                                    ? 'btn-success'
                                                    : verb === 'remove'
                                                      ? 'btn-danger'
                                                      : 'btn-outline-secondary'
                                            }`}
                                            onClick={() => setActiveVerb(verb)}
                                        >
                                            {verb === 'approve'
                                                ? 'Verify'
                                                : VERB_TITLE[verb]}
                                            {verb === 'remove' && '…'}
                                        </button>
                                    ))}
                                </div>
                                <div className={styles.secondaryBar}>
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        onClick={openEdit}
                                    >
                                        Change time…
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className={styles.verbForm}>
                                <div className={styles.verbFormTitle}>
                                    {activeVerb === 'approve'
                                        ? 'Verify'
                                        : VERB_TITLE[activeVerb]}{' '}
                                    — {entry.runnerName}’s set time
                                </div>
                                <RunActionForm
                                    gameSlug={gameSlug}
                                    verb={activeVerb}
                                    target={{
                                        kind: 'runs',
                                        runIds: [],
                                        manualTimeIds: [manualTimeId],
                                        label: `${entry.runnerName}'s set time`,
                                    }}
                                    onDone={verbDone}
                                    onClose={() => setActiveVerb(null)}
                                    onUndoComplete={onMutated}
                                    autoFocus
                                />
                            </div>
                        )}
                        {(onPrev || onNext) && activeVerb == null && (
                            <div className="d-flex justify-content-between align-items-center px-3 pb-3">
                                <button
                                    type="button"
                                    className={styles.stepBtn}
                                    disabled={!onPrev}
                                    onClick={() => step('prev')}
                                >
                                    <ChevronUp size={14} aria-hidden /> Previous{' '}
                                    <kbd>k</kbd>
                                </button>
                                <button
                                    type="button"
                                    className={styles.stepBtn}
                                    disabled={!onNext}
                                    onClick={() => step('next')}
                                >
                                    Next <kbd>j</kbd>{' '}
                                    <ChevronDown size={14} aria-hidden />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {!ownerMode && editOpen && modCategory != null && (
                <ManualTimeDialog
                    gameSlug={gameSlug}
                    runnerRef={
                        entry.userId != null
                            ? { userId: entry.userId }
                            : { guestName: entry.runnerName }
                    }
                    runnerLabel={entry.runnerName}
                    categoryId={modCategory.id}
                    categoryLabel={modCategory.display}
                    subcategoryKey={entrySubcategoryKey}
                    existing={{
                        id: manualTimeId,
                        timing,
                        timeMs,
                        evidenceUrl: entry.vodUrl ?? null,
                    }}
                    onDone={() => {
                        setEditOpen(false);
                        onMutated();
                    }}
                    onClose={() => setEditOpen(false)}
                />
            )}
        </>,
        document.body,
    );
}

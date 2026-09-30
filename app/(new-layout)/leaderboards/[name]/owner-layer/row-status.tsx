'use client';

import { useRouter } from 'next/navigation';
import {
    type ReactNode,
    useEffect,
    useId,
    useState,
    useTransition,
} from 'react';
import { CheckCircleFill, ThreeDots } from 'react-bootstrap-icons';
import {
    deleteOwnManualTimeAction,
    revalidateSelfBoardsAction,
} from '~src/actions/run-user-actions.action';
import {
    loadOwnEvidenceAction,
    type OwnEvidence,
    selfSetEvidenceAction,
    selfSetManualEvidenceAction,
} from '~src/actions/self-evidence.action';
import Link from '~src/components/link';
import {
    RUNNER_NEXT_STEP_LABEL,
    RUNNER_STATUS_LABEL,
    runnerStatusHint,
    STATUS_LABEL,
} from '~src/lib/moderation/run-status-copy';
import type {
    RunnerStatus,
    SubmissionItem,
} from '../../../../../types/runner-status.types';
import { CorrectTimeDialog } from '../../../games/[game]/run-view/correct-time-dialog';
import { ConfirmDialog } from '../../../games/[game]/shared/confirm-dialog';
import { EvidenceEditor } from '../../../games/[game]/shared/evidence-editor';
import {
    SelfRunVerdictDialog,
    useSelfRunVerdict,
} from '../../../games/[game]/shared/self-run-verdict';
import { evidencePermissions } from '../../../games/[game]/shared/use-evidence-permissions';
import { entryHref, formatEntryTime } from '../format';
import profileStyles from '../leaderboards-profile.module.scss';
import styles from './owner-layer.module.scss';
import type { ItemFormat } from './owner-layer-provider';
import { useOwnerLayer } from './owner-layer-provider';

/** Where a run sits, for its links and for the board it has to refresh. */
export interface ItemBoard {
    gameId: number;
    /** `games.name`, what links and board caches are keyed on. */
    gameRef: string;
    format: ItemFormat;
}

const TONE: Record<RunnerStatus, 'good' | 'warn' | 'bad' | 'muted'> = {
    on_board: 'good',
    waiting_mod: 'muted',
    needs_you: 'warn',
    beaten: 'muted',
    rejected: 'bad',
    removed_by_you: 'muted',
    removed_by_mod: 'bad',
    off_board: 'muted',
};

/** The time a board shows for this item: game time on a game-time board. */
export function itemTime(item: SubmissionItem, format: ItemFormat): string {
    const timeMs =
        format.timing === 'gametime' && item.gameTimeMs !== null
            ? item.gameTimeMs
            : item.timeMs;
    return formatEntryTime({ ...format, timeMs });
}

export const itemHref = (gameRef: string, item: SubmissionItem) =>
    gameRef === ''
        ? null
        : entryHref(gameRef, {
              kind: item.kind,
              runId: item.kind === 'run' ? item.id : null,
              manualTimeId: item.kind === 'manual' ? item.id : null,
          });

/** The item's status in the runner's words, and whether it has its video. */
export function RowStatus({
    item,
    withReason = false,
}: {
    item: SubmissionItem;
    /** Print the reason after the label rather than only in the tooltip. */
    withReason?: boolean;
}) {
    const hint = runnerStatusHint(item.status, item.reason);
    return (
        <span className={styles.status}>
            <span
                className={styles.statusLabel}
                data-tone={TONE[item.status]}
                title={withReason ? undefined : (hint ?? undefined)}
            >
                {RUNNER_STATUS_LABEL[item.status]}
            </span>
            {withReason && hint ? (
                <span className={styles.statusReason}>{hint}</span>
            ) : null}
            {item.vodState === 'required_missing' ? (
                <span className={styles.statusVideo} data-tone="warn">
                    Video needed
                </span>
            ) : item.vodState === 'missing' ? (
                <span className={styles.statusVideo}>No video</span>
            ) : null}
        </span>
    );
}

/**
 * The row's status column: a tick when the run is on the board, otherwise
 * one short pill. The runner's own wording and the reason sit in its tooltip
 * and in the ⋯ panel.
 */
export function StatusSlot({ item }: { item: SubmissionItem }) {
    const hint = runnerStatusHint(item.status, item.reason);
    const title = [RUNNER_STATUS_LABEL[item.status], hint]
        .filter(Boolean)
        .join('. ');
    if (item.status === 'on_board') {
        return (
            <span
                className={profileStyles.statusVerified}
                role="img"
                aria-label={RUNNER_STATUS_LABEL.on_board}
                title={title}
            >
                <CheckCircleFill size={12} aria-hidden />
            </span>
        );
    }
    const pill =
        item.status === 'needs_you'
            ? { label: RUNNER_STATUS_LABEL.needs_you, className: 'warn' }
            : item.vodState === 'required_missing'
              ? { label: 'Video needed', className: 'warn' }
              : item.status === 'waiting_mod'
                ? { label: STATUS_LABEL.pending, className: 'neutral' }
                : item.status === 'rejected' || item.status === 'removed_by_mod'
                  ? {
                        label:
                            item.status === 'rejected'
                                ? STATUS_LABEL.rejected
                                : 'Removed',
                        className: 'bad',
                    }
                  : {
                        label:
                            item.status === 'removed_by_you'
                                ? 'Removed'
                                : RUNNER_STATUS_LABEL[item.status],
                        className: 'neutral',
                    };
    return (
        <span
            className={
                pill.className === 'warn'
                    ? profileStyles.statusWarn
                    : pill.className === 'bad'
                      ? profileStyles.statusRejected
                      : profileStyles.statusPending
            }
            title={title}
        >
            {pill.label}
        </span>
    );
}

/** Expire the board and the runner's tab, then re-read the page. */
function useAfterChange(item: SubmissionItem, board: ItemBoard) {
    const router = useRouter();
    return async () => {
        await revalidateSelfBoardsAction(board.gameRef, board.gameId, [
            {
                categoryId: item.categoryId,
                subcategoryKey: item.subcategoryKey,
            },
        ]);
        router.refresh();
    };
}

/**
 * The run's video and description, read fresh when opened. A verified run is
 * locked for its owner; the editor says so instead of offering the fields.
 */
export function EvidenceInline({
    item,
    board,
}: {
    item: SubmissionItem;
    board: ItemBoard;
}) {
    const afterChange = useAfterChange(item, board);
    const [evidence, setEvidence] = useState<OwnEvidence | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let live = true;
        loadOwnEvidenceAction(item.kind, item.id).then((res) => {
            if (!live) return;
            if ('error' in res) setError(res.error);
            else setEvidence(res.evidence);
        });
        return () => {
            live = false;
        };
    }, [item.kind, item.id]);

    if (error) return <p className={styles.error}>{error}</p>;
    if (!evidence) return <p className={styles.loading}>Loading…</p>;

    const perms = evidencePermissions({
        isOwner: true,
        isMod: false,
        verificationStatus: evidence.verificationStatus,
        descriptionRevoked: evidence.descriptionRevoked,
    });
    const saved = async (res: { ok: true } | { error: string }) => {
        if ('ok' in res) await afterChange();
        return res;
    };

    return (
        <div className={styles.evidence}>
            <EvidenceEditor
                vodUrl={evidence.vodUrl}
                description={evidence.description}
                perms={perms}
                showPlayer={false}
                onSaveVod={async (url) =>
                    saved(
                        item.kind === 'run'
                            ? await selfSetEvidenceAction(item.id, {
                                  vodUrl: url,
                              })
                            : await selfSetManualEvidenceAction(item.id, {
                                  evidenceUrl: url,
                              }),
                    )
                }
                onSaveDescription={async (text) =>
                    saved(
                        item.kind === 'run'
                            ? await selfSetEvidenceAction(item.id, {
                                  description: text,
                              })
                            : await selfSetManualEvidenceAction(item.id, {
                                  description: text,
                              }),
                    )
                }
            />
        </div>
    );
}

// Runs a runner can still take off the boards themself. Removed and
// rejected runs already are; a moderator's removal is not theirs to undo.
const REMOVABLE: RunnerStatus[] = [
    'on_board',
    'waiting_mod',
    'needs_you',
    'beaten',
    'off_board',
];
// A correction is a new claim on the board: not for a run that is off it,
// or one a faster run of theirs has already replaced.
const CORRECTABLE: RunnerStatus[] = [
    'on_board',
    'waiting_mod',
    'needs_you',
    'off_board',
];

function OwnerPanel({
    item,
    board,
    id,
    nested,
}: {
    item: SubmissionItem;
    board: ItemBoard;
    id: string;
    nested: boolean;
}) {
    const afterChange = useAfterChange(item, board);
    const [video, setVideo] = useState(item.nextStep === 'add_video');
    const [correcting, setCorrecting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [deleting, startDelete] = useTransition();
    const verdict = useSelfRunVerdict();

    const runPage = itemHref(board.gameRef, item);
    const hint = runnerStatusHint(item.status, item.reason);
    const boardRef = {
        gameSlug: board.gameRef,
        gameId: board.gameId,
        categoryId: item.categoryId,
        subcategoryKey: item.subcategoryKey,
    };
    const isRun = item.kind === 'run';
    const canCorrect =
        isRun &&
        CORRECTABLE.includes(item.status) &&
        item.nextStep !== 'submit';
    const canRemove = isRun
        ? REMOVABLE.includes(item.status)
        : item.status !== 'removed_by_mod';
    const canRestore = isRun && item.status === 'removed_by_you';
    const canEditVideo = item.status !== 'removed_by_mod';

    const deleteManual = () => {
        setDeleteError(null);
        startDelete(async () => {
            const res = await deleteOwnManualTimeAction(item.id);
            if ('error' in res) {
                setDeleteError(res.error);
                return;
            }
            setConfirmDelete(false);
            await afterChange();
        });
    };

    return (
        <div id={id} className={styles.panel} data-nested={nested || undefined}>
            {hint ? <p className={styles.panelHint}>{hint}</p> : null}
            <div className={styles.panelActions}>
                {item.nextStep === 'submit' ? (
                    <Link
                        href={`/submissions/${item.id}`}
                        className={`${profileStyles.tab} ${profileStyles.tabActive}`}
                    >
                        {RUNNER_NEXT_STEP_LABEL.submit}
                    </Link>
                ) : null}
                {(item.nextStep === 'fix_runners' ||
                    item.nextStep === 'appeal') &&
                runPage ? (
                    <Link
                        href={runPage}
                        className={`${profileStyles.tab} ${profileStyles.tabActive}`}
                    >
                        {RUNNER_NEXT_STEP_LABEL[item.nextStep]}
                    </Link>
                ) : null}
                {canEditVideo ? (
                    <button
                        type="button"
                        className={
                            video
                                ? `${profileStyles.tab} ${profileStyles.tabActive}`
                                : profileStyles.tab
                        }
                        aria-pressed={video}
                        onClick={() => setVideo((v) => !v)}
                    >
                        Video &amp; note
                    </button>
                ) : null}
                {canCorrect ? (
                    <button
                        type="button"
                        className={profileStyles.tab}
                        onClick={() => setCorrecting(true)}
                    >
                        Correct this time
                    </button>
                ) : null}
                {canRestore ? (
                    <button
                        type="button"
                        className={profileStyles.tab}
                        onClick={() =>
                            verdict.requestVerdict(
                                item.id,
                                'unreject',
                                boardRef,
                            )
                        }
                    >
                        Put back on the boards
                    </button>
                ) : null}
                {canRemove ? (
                    <button
                        type="button"
                        className={profileStyles.tab}
                        onClick={() =>
                            isRun
                                ? verdict.requestVerdict(
                                      item.id,
                                      'reject',
                                      boardRef,
                                  )
                                : setConfirmDelete(true)
                        }
                    >
                        Remove from the boards
                    </button>
                ) : null}
            </div>
            {video && canEditVideo ? (
                <EvidenceInline item={item} board={board} />
            ) : null}
            {canCorrect ? (
                <CorrectTimeDialog
                    id={item.id}
                    timeMs={item.timeMs}
                    gameTimeMs={item.gameTimeMs}
                    gameTimeLabel={board.format.gameTimeLabel}
                    verified={item.status === 'on_board'}
                    board={boardRef}
                    open={correcting}
                    onClose={() => setCorrecting(false)}
                />
            ) : null}
            {isRun ? (
                <SelfRunVerdictDialog
                    confirmState={verdict.confirmState}
                    pending={verdict.pending}
                    error={verdict.error}
                    onCancel={verdict.cancel}
                    onConfirm={verdict.confirm}
                />
            ) : (
                <ConfirmDialog
                    open={confirmDelete}
                    onClose={() => setConfirmDelete(false)}
                    onConfirm={deleteManual}
                    labelledBy={`${id}-delete`}
                    title="Remove from the boards"
                    message="This deletes the time. It can't be undone."
                    confirmLabel="Remove"
                    pending={deleting}
                    error={deleteError}
                />
            )}
        </div>
    );
}

/**
 * The owner's controls for one row: a ⋯ button in the row's actions, and the
 * panel it opens under the row. Nothing for anyone else — a moderator reads
 * the status and opens the run page.
 */
export function useOwnerRow(
    item: SubmissionItem | undefined,
    board: ItemBoard | null,
    /** Inside an already indented list (the earlier PBs). */
    nested = false,
): { toggle: ReactNode; panel: ReactNode } {
    const { viewer } = useOwnerLayer();
    const [open, setOpen] = useState(false);
    const panelId = useId();
    if (!item || !board || viewer !== 'owner') {
        return { toggle: null, panel: null };
    }
    return {
        toggle: (
            <button
                type="button"
                className={
                    open
                        ? `${profileStyles.tab} ${profileStyles.tabActive} ${styles.rowToggle}`
                        : `${profileStyles.tab} ${styles.rowToggle}`
                }
                aria-expanded={open}
                aria-controls={panelId}
                aria-label="Your run: status and changes"
                title="Your run: status and changes"
                onClick={() => setOpen((v) => !v)}
            >
                <ThreeDots size={14} aria-hidden />
            </button>
        ),
        panel: open ? (
            <OwnerPanel
                item={item}
                board={board}
                id={panelId}
                nested={nested}
            />
        ) : null,
    };
}

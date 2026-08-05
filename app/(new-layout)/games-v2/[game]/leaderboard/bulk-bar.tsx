'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type {
    LeaderboardEntry,
    ResolvedCategory,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import { RunnerDialog } from '../manage/boards/runner-dialog';
import type { ModVerb } from '../manage/moderation/shared/action-model';
import { markRunsAction } from '../manage/moderation/shared/actions/marks.action';
import { RunActionDialog } from '../manage/moderation/shared/run-action-dialog';
import { buildSubcategoryKey } from '../submit/subcategory-key';
import { loadModBoardContextAction } from './actions/load-mod-board-context.action';
import styles from './bulk-bar.module.scss';
import { BulkMoveDialog } from './bulk-move-dialog';
import { entryToRosterRow } from './mod-row';

interface Props {
    gameSlug: string;
    categorySlug: string;
    canSiteBan: boolean;
    subcategoryDefKeys: string[];
    /** Every currently-loaded/visible entry — the selection is a subset of these. */
    entries: LeaderboardEntry[];
    selectedRunIds: Set<number>;
    onClear: () => void;
    /** After a bulk mutation applies successfully. */
    onMutated: () => void;
    /** True while a prior mutation's read-your-writes refetch is in flight. */
    busy?: boolean;
}

interface ModBoardContext {
    categories: ResolvedCategory[];
    variables: VariableRow[];
}

function runnerKeyOf(entry: LeaderboardEntry): string {
    return entry.userId != null ? `u:${entry.userId}` : `g:${entry.runnerName}`;
}

/**
 * Sticky bulk action bar (approved mocks fig. 2) — one verb set that adapts
 * to the selection rather than N bespoke bulk actions. Verify/Reject/
 * Remove…/Restore reuse RunActionDialog exactly as the row menu's single-run
 * dialogs do (same preview → reason → apply machinery, `target.kind ===
 * 'runs'` already supports N runIds). Move… and Runner… need board context
 * (categories/variables), lazy-loaded the same way the row menu's
 * Move/Adjust/Runner dialogs already do.
 */
export function BoardBulkBar({
    gameSlug,
    categorySlug,
    canSiteBan,
    subcategoryDefKeys,
    entries,
    selectedRunIds,
    onClear,
    onMutated,
    busy = false,
}: Props) {
    const selected = entries.filter(
        (e) => e.runId != null && selectedRunIds.has(e.runId),
    );
    const runIds = selected.map((e) => e.runId as number);
    const runnerKeys = new Set(selected.map(runnerKeyOf));
    const runnerNames = new Set(selected.map((e) => e.runnerName));
    const singleRunner = runnerKeys.size === 1 ? selected[0] : null;
    const singleRunnerHasAccount =
        singleRunner != null && singleRunner.userId != null;
    const canRestore = selected.some(
        (e) => e.verificationStatus === 'rejected',
    );

    const entrySubcategoryKey = (entry: LeaderboardEntry) =>
        buildSubcategoryKey(
            Object.fromEntries(
                Object.entries(entry.variables ?? {}).filter(([k]) =>
                    subcategoryDefKeys.includes(k),
                ),
            ),
        );

    const [modVerb, setModVerb] = useState<ModVerb | null>(null);
    const [modCtx, setModCtx] = useState<ModBoardContext | null>(null);
    const [ctxError, setCtxError] = useState<string | null>(null);
    const [ctxPending, startCtxLoad] = useTransition();
    const [moveOpen, setMoveOpen] = useState(false);
    const [runnerOpen, setRunnerOpen] = useState(false);
    const [markPending, startMark] = useTransition();

    const modCategory =
        modCtx?.categories.find((c) => c.name === categorySlug) ?? null;

    const ensureModCtx = (then: () => void) => {
        if (modCtx != null) {
            if (modCategory == null) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            then();
            return;
        }
        startCtxLoad(async () => {
            const res = await loadModBoardContextAction(gameSlug);
            if ('error' in res) {
                setCtxError(res.error);
                toast.error(res.error);
                return;
            }
            const ctx = {
                categories: res.categories,
                variables: res.variables,
            };
            setModCtx(ctx);
            if (!ctx.categories.some((c) => c.name === categorySlug)) {
                toast.error("Could not resolve this board's category.");
                return;
            }
            then();
        });
    };

    const openMove = () => ensureModCtx(() => setMoveOpen(true));
    const openRunner = () => ensureModCtx(() => setRunnerOpen(true));

    const handleMark = () => {
        startMark(async () => {
            const res = await markRunsAction(gameSlug, runIds, true);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(
                `Marked ${runIds.length} run${runIds.length === 1 ? '' : 's'} for later.`,
            );
            onClear();
        });
    };

    const label = `${runIds.length} run${runIds.length === 1 ? '' : 's'}`;
    const runnerLine =
        runnerKeys.size === 1
            ? Array.from(runnerNames)[0]
            : `${runnerKeys.size} runners`;

    const runnerVerbDisabledReason =
        runnerKeys.size > 1
            ? `Selection spans ${runnerKeys.size} runners.`
            : singleRunner != null && !singleRunnerHasAccount
              ? "Guest runs don't have a runner page."
              : null;

    return (
        <>
            <div className={styles.bar} role="region" aria-label="Bulk actions">
                <span className={styles.count}>{label}</span>
                <span className={styles.sub}>
                    selected · {runnerLine} · 1 board
                </span>
                <button
                    type="button"
                    className={styles.clear}
                    onClick={onClear}
                >
                    Clear
                </button>
                <span className={styles.verbs}>
                    <button
                        type="button"
                        className={styles.pill}
                        disabled={busy}
                        onClick={() => setModVerb('approve')}
                    >
                        Verify
                    </button>
                    <button
                        type="button"
                        className={styles.pill}
                        disabled={busy}
                        onClick={() => setModVerb('reject')}
                    >
                        Reject
                    </button>
                    <button
                        type="button"
                        className={`${styles.pill} ${styles.pillDanger}`}
                        disabled={busy}
                        onClick={() => setModVerb('remove')}
                    >
                        Remove…
                    </button>
                    <button
                        type="button"
                        className={styles.pill}
                        disabled={busy || !canRestore}
                        title={
                            canRestore
                                ? undefined
                                : 'Nothing selected is currently removed.'
                        }
                        onClick={() => setModVerb('restore')}
                    >
                        Restore
                    </button>
                    <button
                        type="button"
                        className={styles.pill}
                        disabled={busy || ctxPending}
                        onClick={openMove}
                    >
                        Move…
                    </button>
                    <button
                        type="button"
                        className={styles.pill}
                        disabled={busy || markPending}
                        onClick={handleMark}
                    >
                        Mark
                    </button>
                    <span className={styles.sep} aria-hidden="true" />
                    <button
                        type="button"
                        className={`${styles.pill} ${runnerVerbDisabledReason ? '' : styles.pillOn}`}
                        disabled={
                            busy ||
                            ctxPending ||
                            runnerVerbDisabledReason != null
                        }
                        title={runnerVerbDisabledReason ?? undefined}
                        onClick={openRunner}
                    >
                        {runnerVerbDisabledReason
                            ? 'Runner…'
                            : `Runner… ${singleRunner?.runnerName}`}
                    </button>
                </span>
            </div>
            {runnerVerbDisabledReason && (
                <div className={styles.why}>{runnerVerbDisabledReason}</div>
            )}
            {ctxError && <div className={styles.why}>{ctxError}</div>}

            {modVerb && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={modVerb}
                    target={{ kind: 'runs', runIds, label }}
                    onDone={() => {
                        setModVerb(null);
                        onMutated();
                    }}
                    onClose={() => setModVerb(null)}
                />
            )}

            {modCtx != null && modCategory != null && (
                <BulkMoveDialog
                    open={moveOpen}
                    onClose={() => setMoveOpen(false)}
                    runs={selected.map((e) => ({
                        runId: e.runId as number,
                        runnerName: e.runnerName,
                        subcategoryKey: entrySubcategoryKey(e),
                    }))}
                    category={modCategory}
                    categories={modCtx.categories}
                    variables={modCtx.variables}
                    gameSlug={gameSlug}
                    onMutated={() => {
                        setMoveOpen(false);
                        onMutated();
                    }}
                />
            )}

            {modCtx != null &&
                modCategory != null &&
                singleRunner != null &&
                singleRunnerHasAccount && (
                    <RunnerDialog
                        open={runnerOpen}
                        onClose={() => setRunnerOpen(false)}
                        row={
                            entryToRosterRow(
                                singleRunner,
                                entrySubcategoryKey(singleRunner),
                            ) as NonNullable<
                                ReturnType<typeof entryToRosterRow>
                            >
                        }
                        category={modCategory}
                        variables={modCtx.variables}
                        gameSlug={gameSlug}
                        subcategoryKey={entrySubcategoryKey(singleRunner)}
                        canSiteBan={canSiteBan}
                        dossierFrom="board"
                        onMutated={() => {
                            setRunnerOpen(false);
                            onMutated();
                        }}
                    />
                )}
        </>
    );
}

'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { DurationField } from '~src/components/time-input/duration-field';
import { normalizeVariableName } from '~src/lib/variables/keys';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import { attachVodAction } from '../../leaderboard/actions/attach-vod.action';
import { useMoveTarget } from '../../manage/moderation/moderate/move-target';
import { MIN_REASON } from '../../manage/moderation/moderate/run-heavy-verbs';
import { moveRunAction } from '../../manage/moderation/shared/actions/board-override.action';
import { updateManualTimeAction } from '../../manage/moderation/shared/actions/manual-times.action';
import { setRunVariablesAction } from '../../manage/moderation/shared/actions/run-fields.action';
import { setRunTimesAction } from '../../manage/moderation/shared/actions/run-times.action';
import type { ModContext } from '../load-run-view';
import { MOD_VOD_REASON } from '../run-evidence-panel';
import type { RunViewModel } from '../run-view';
import styles from './mod-layer.module.scss';

export type FactEdit =
    | { kind: 'time'; clock: 'rt' | 'gt'; currentMs: number | null }
    | { kind: 'move' }
    | { kind: 'filter'; variable: VariableRow; current: string }
    | { kind: 'video' };

type Result = { ok: true } | { error: string };

/** A variable's values as the run stores them: normalized, display kept. */
export function variableOptions(v: VariableRow) {
    return v.values.map((bucket) => ({
        label: bucket[0] ?? '',
        value: normalizeVariableName(bucket[0] ?? ''),
    }));
}

/** One fact of the run, open for a change: the value, a reason, Save. */
export function FactEditor({
    edit,
    label,
    model,
    mod,
    onClose,
    onSaved,
}: {
    edit: FactEdit;
    label: string;
    model: RunViewModel;
    mod: ModContext;
    onClose: () => void;
    onSaved: () => void;
}) {
    const gameSlug = mod.sheet.gameSlug;
    const boardRef = {
        categoryId: mod.board.categoryId,
        subcategoryKey: mod.board.subcategoryKey,
    };
    const [busy, setBusy] = useState(false);
    const [reason, setReason] = useState('');
    const [timeMs, setTimeMs] = useState<number | null>(
        edit.kind === 'time' ? edit.currentMs : null,
    );
    const [filterValue, setFilterValue] = useState(
        edit.kind === 'filter' ? edit.current : '',
    );
    const [video, setVideo] = useState(model.vodUrl ?? '');
    const move = useMoveTarget(mod.board, mod.sheet);

    // A video link is evidence, not a correction: the log records who
    // changed it, and the action stamps its own reason.
    const needsReason = edit.kind !== 'video';
    const reasonOk = !needsReason || reason.trim().length >= MIN_REASON;
    const valueOk = (() => {
        switch (edit.kind) {
            case 'time':
                return (
                    timeMs != null && timeMs > 0 && timeMs !== edit.currentMs
                );
            case 'move':
                return move.target != null;
            case 'filter':
                return filterValue !== edit.current;
            case 'video':
                return video.trim() !== (model.vodUrl ?? '');
        }
    })();
    const canSave = reasonOk && valueOk && !busy;

    const save = async (): Promise<Result> => {
        const why = reason.trim();
        const manual = model.kind === 'manual';
        switch (edit.kind) {
            case 'time': {
                if (timeMs == null)
                    return { error: 'Type the new time first.' };
                if (manual) {
                    return updateManualTimeAction(
                        gameSlug,
                        model.id,
                        { reason: why, timeMs },
                        boardRef,
                    );
                }
                return setRunTimesAction(
                    gameSlug,
                    model.id,
                    edit.clock === 'gt'
                        ? { gameTime: timeMs }
                        : { time: timeMs },
                    why,
                    boardRef,
                );
            }
            case 'move': {
                if (!move.target) return { error: 'Pick a board first.' };
                return moveRunAction(
                    gameSlug,
                    model.id,
                    move.target,
                    [boardRef, move.target],
                    why,
                );
            }
            case 'filter': {
                const next = { ...model.variables };
                const key = edit.variable.nameNormalized;
                if (filterValue) next[key] = filterValue;
                else delete next[key];
                return setRunVariablesAction(
                    gameSlug,
                    model.id,
                    next,
                    why,
                    boardRef,
                );
            }
            case 'video': {
                const url = video.trim() || null;
                if (manual) {
                    return updateManualTimeAction(
                        gameSlug,
                        model.id,
                        { reason: MOD_VOD_REASON, evidenceUrl: url },
                        boardRef,
                    );
                }
                const res = await attachVodAction(gameSlug, model.id, url, {
                    categorySlug: mod.board.categorySlug,
                    subcategoryKey: mod.board.subcategoryKey,
                });
                return 'error' in res ? res : { ok: true };
            }
        }
    };

    const onSave = async () => {
        if (!canSave) return;
        setBusy(true);
        try {
            const res = await save();
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success('Saved.');
            onSaved();
        } catch {
            toast.error('Something went wrong. Try again.');
        } finally {
            setBusy(false);
        }
    };

    const field = (() => {
        switch (edit.kind) {
            case 'time':
                return (
                    <DurationField
                        size="sm"
                        aria-label={label}
                        value={timeMs}
                        onChange={setTimeMs}
                        disabled={busy}
                        autoFocus
                        onEnter={onSave}
                    />
                );
            case 'move':
                return move.fields(busy);
            case 'filter':
                return (
                    <select
                        aria-label={label}
                        className="form-select form-select-sm"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        disabled={busy}
                    >
                        <option value="">Not set</option>
                        {variableOptions(edit.variable).map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                );
            case 'video':
                return (
                    <input
                        type="url"
                        aria-label={label}
                        className="form-control form-control-sm"
                        value={video}
                        onChange={(e) => setVideo(e.target.value)}
                        disabled={busy}
                        autoFocus
                    />
                );
        }
    })();

    return (
        <div className={styles.editor}>
            <div className={styles.editorLabel}>{label}</div>
            {field}
            {needsReason && (
                <div className={styles.reasonRow}>
                    <input
                        aria-label="Reason"
                        className="form-control form-control-sm"
                        placeholder="Reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSave();
                            if (e.key === 'Escape') onClose();
                        }}
                        disabled={busy}
                        maxLength={500}
                    />
                    <span className={styles.reasonCount}>
                        {reason.trim().length}/{MIN_REASON}
                    </span>
                </div>
            )}
            <div className={styles.editorActions}>
                <button
                    type="button"
                    className={styles.pill}
                    onClick={onClose}
                    disabled={busy}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={onSave}
                    disabled={!canSave}
                >
                    Save
                </button>
            </div>
        </div>
    );
}

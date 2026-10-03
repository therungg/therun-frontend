'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type { RejectionReasonKey } from '../../../../../../types/moderation.types';
import type { RejectOptions } from '../../../../../../types/reject-options.types';
import { RunnerAvatar } from '../../leaderboard/runner-avatar';
import { MIN_REASON } from '../../manage/moderation/moderate/run-heavy-verbs';
import { loadRejectOptionsAction } from '../../manage/moderation/shared/actions/reject-options.action';
import { ReasonKeyPicker } from '../../manage/moderation/shared/reason-key-picker';
import { BoardDialog } from '../../shared/board-dialog';
import type { RunViewModel } from '../run-view';
import styles from './decision-bar.module.scss';
import {
    banBlocked,
    consequenceOf,
    type RejectScope,
    scopeRunIds,
    scopeWithout,
    submitLabel,
} from './reject-scope';

export type RejectSubmit =
    | {
          kind: 'reject';
          runIds: number[];
          /** The submitted runs that are verified now; undo re-verifies them. */
          verifiedRunIds: number[];
          key: RejectionReasonKey;
          note: string;
      }
    | {
          kind: 'ban';
          scope: 'category' | 'game';
          userId: number | null;
          reason: string;
      };

type Kind = 'run' | 'select' | 'all' | 'ban-category' | 'ban-game';

const scopeOf = (kind: Kind, selected: number[]): RejectScope =>
    kind === 'select'
        ? { kind: 'select', runIds: selected }
        : kind === 'ban-category'
          ? { kind: 'ban', scope: 'category' }
          : kind === 'ban-game'
            ? { kind: 'ban', scope: 'game' }
            : { kind };

/**
 * Reject: how far it reaches (this run, some or all of the runner's runs on
 * the board, or a ban), a reason from the closed list and a note to the
 * runner. "Other" is not a reason on its own, so it needs the note. A ban is
 * the runner's exclusion rule: quiet, with a reason only mods see.
 */
export function RejectDialog({
    model,
    timeMs,
    busy,
    gameSlug,
    gameDisplay,
    onCancel,
    onSubmit,
}: {
    model: RunViewModel;
    /** The time the board ranks the run by. */
    timeMs: number | null;
    busy: boolean;
    gameSlug: string;
    gameDisplay: string;
    onCancel: () => void;
    onSubmit: (s: RejectSubmit) => void;
}) {
    const titleId = useId();
    const noteId = useId();
    const runId = model.id;
    const [kind, setKind] = useState<Kind>('run');
    const [selected, setSelected] = useState<number[]>([]);
    const [options, setOptions] = useState<RejectOptions | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [previewFailed, setPreviewFailed] = useState(false);
    const [entryAfter, setEntryAfter] = useState<
        RejectOptions['entryAfter'] | undefined
    >(undefined);
    const [key, setKey] = useState<RejectionReasonKey | null>(null);
    const [note, setNote] = useState('');
    const [banReason, setBanReason] = useState('');

    const scope = scopeOf(kind, selected);
    const isBan = scope.kind === 'ban';

    // First load: the runner's runs and the "this run" consequence.
    useEffect(() => {
        let live = true;
        void loadRejectOptionsAction(gameSlug, runId, null).then((res) => {
            if (!live) return;
            if ('error' in res) setLoadFailed(true);
            else {
                setOptions(res.options);
                setEntryAfter(res.options.entryAfter);
            }
        });
        return () => {
            live = false;
        };
    }, [gameSlug, runId]);

    // Each scope asks its own question; the selection is debounced.
    const withoutKey = JSON.stringify(scopeWithout(scope));
    const emptySelect = kind === 'select' && selected.length === 0;
    const first = useRef(true);
    useEffect(() => {
        if (options == null) return;
        if (first.current) {
            first.current = false;
            return;
        }
        let live = true;
        setPreviewFailed(false);
        // Nothing ticked: there is nothing to ask about.
        if (emptySelect) return;
        setEntryAfter(undefined);
        const t = setTimeout(() => {
            const without = JSON.parse(withoutKey) as ReturnType<
                typeof scopeWithout
            >;
            void loadRejectOptionsAction(gameSlug, runId, without).then(
                (res) => {
                    if (!live) return;
                    if ('error' in res) setPreviewFailed(true);
                    else setEntryAfter(res.options.entryAfter);
                },
            );
        }, 300);
        return () => {
            live = false;
            clearTimeout(t);
        };
    }, [gameSlug, runId, options, withoutKey, emptySelect]);

    const name = options?.runner.name ?? model.runnerName;
    const categoryName =
        options?.board.categoryDisplay || model.categoryDisplay;
    const names = { category: categoryName, game: gameDisplay };

    const noteLength = note.trim().length;
    const noteShort = noteLength < MIN_REASON && key === 'other';
    const runIds = scopeRunIds(scope, runId, options);
    const ready = isBan
        ? banReason.trim().length >= MIN_REASON
        : key !== null && !noteShort && runIds.length > 0;

    const consequence = (() => {
        if (emptySelect) return 'Pick runs to reject';
        if (loadFailed || previewFailed) return null;
        if (entryAfter === undefined) return '…';
        const c = consequenceOf(entryAfter);
        if (c.kind === 'leaves') return `${name} leaves the board`;
        const when = c.endedAt ? formatRunDate(c.endedAt) : null;
        return (
            <>
                {name} drops to{' '}
                <span className={styles.mono}>
                    <DurationToFormatted duration={c.timeMs} />
                </span>
                {when ? ` (${when})` : ''}
            </>
        );
    })();

    const radio = (
        value: Kind,
        label: ReactNode,
        blocked: string | null = null,
    ) => (
        <label className={styles.scopeOption} aria-disabled={blocked != null}>
            <input
                type="radio"
                name={`${titleId}-scope`}
                checked={kind === value}
                onChange={() => setKind(value)}
                disabled={busy || blocked != null}
            />
            <span>
                {label}
                {kind === value && !blocked ? (
                    <span className={styles.scopeConsequence}>
                        {value === 'ban-category'
                            ? `Hides all of ${name}'s ${categoryName} runs, now and future`
                            : value === 'ban-game'
                              ? `Hides all of ${name}'s ${gameDisplay} runs, now and future`
                              : consequence}
                    </span>
                ) : null}
                {blocked ? (
                    <span className={styles.scopeBlocked}>{blocked}</span>
                ) : null}
            </span>
        </label>
    );

    return (
        <BoardDialog
            open
            onClose={() => {
                if (!busy) onCancel();
            }}
            labelledBy={titleId}
            size="md"
            closeOnBackdropClick={!busy}
            themed
        >
            <div className={styles.dialogHeader}>
                <h5 id={titleId} className={styles.dialogTitle}>
                    {isBan ? 'Ban runner' : 'Reject this run'}
                </h5>
                <span className={styles.dialogSub}>
                    <span className={styles.dialogSubRunner}>
                        <RunnerAvatar
                            name={model.runnerName}
                            picture={model.picture}
                            size="xs"
                        />
                        {model.runnerName}
                    </span>{' '}
                    · {model.categoryDisplay}
                    {timeMs != null ? (
                        <>
                            {' · '}
                            <span className={styles.mono}>
                                <DurationToFormatted duration={timeMs} />
                            </span>
                        </>
                    ) : null}
                </span>
            </div>
            <form
                className={styles.dialogBody}
                id={`${titleId}-form`}
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!ready || busy) return;
                    if (scope.kind === 'ban') {
                        onSubmit({
                            kind: 'ban',
                            scope: scope.scope,
                            userId: options?.runner.userId ?? null,
                            reason: banReason.trim(),
                        });
                    } else if (key) {
                        onSubmit({
                            kind: 'reject',
                            runIds,
                            verifiedRunIds: runIds.filter((id) =>
                                options?.runs.some(
                                    (r) =>
                                        r.runId === id &&
                                        r.status === 'verified',
                                ),
                            ),
                            key,
                            note: note.trim(),
                        });
                    }
                }}
            >
                <fieldset className={styles.scopeList} disabled={busy}>
                    <legend className={styles.fieldLabel}>
                        What to reject
                    </legend>
                    {radio('run', 'This run')}
                    {options ? (
                        <>
                            {options.allRunIds.length > 1 ? (
                                <>
                                    {radio(
                                        'select',
                                        `Select runs from ${name}…`,
                                    )}
                                    {kind === 'select' ? (
                                        <ul className={styles.scopeRuns}>
                                            {options.runs.map((r) => (
                                                <li key={r.runId}>
                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected.includes(
                                                                r.runId,
                                                            )}
                                                            onChange={(e) =>
                                                                setSelected(
                                                                    (s) =>
                                                                        e.target
                                                                            .checked
                                                                            ? [
                                                                                  ...s,
                                                                                  r.runId,
                                                                              ]
                                                                            : s.filter(
                                                                                  (
                                                                                      x,
                                                                                  ) =>
                                                                                      x !==
                                                                                      r.runId,
                                                                              ),
                                                                )
                                                            }
                                                        />
                                                        <span
                                                            className={
                                                                styles.mono
                                                            }
                                                        >
                                                            {r.timeMs !=
                                                            null ? (
                                                                <DurationToFormatted
                                                                    duration={
                                                                        r.timeMs
                                                                    }
                                                                />
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </span>
                                                        {r.endedAt
                                                            ? ` · ${formatRunDate(r.endedAt)}`
                                                            : ''}
                                                        {` · ${r.status}`}
                                                        {r.isCurrentEntry
                                                            ? ' · on board'
                                                            : ''}
                                                    </label>
                                                </li>
                                            ))}
                                            {options.allRunIds.length >
                                            options.runs.length ? (
                                                <li
                                                    className={
                                                        styles.scopeBlocked
                                                    }
                                                >
                                                    Showing the fastest{' '}
                                                    {options.runs.length} of{' '}
                                                    {options.allRunIds.length}
                                                </li>
                                            ) : null}
                                        </ul>
                                    ) : null}
                                    {radio(
                                        'all',
                                        `All ${options.allRunIds.length} runs from ${name} on this board`,
                                    )}
                                </>
                            ) : null}
                            {radio(
                                'ban-category',
                                `Ban ${name} from ${categoryName}`,
                                banBlocked(options, 'category'),
                            )}
                            {radio(
                                'ban-game',
                                `Ban ${name} from ${gameDisplay}`,
                                banBlocked(options, 'game'),
                            )}
                        </>
                    ) : loadFailed ? (
                        <p className={styles.scopeBlocked}>
                            Couldn't load other options.
                        </p>
                    ) : null}
                </fieldset>

                {isBan ? (
                    <div>
                        <label htmlFor={noteId} className={styles.fieldLabel}>
                            Reason (mods only)
                            {banReason.trim().length < MIN_REASON ? (
                                <span className={styles.fieldRequired}>
                                    Required, {MIN_REASON} characters or more
                                </span>
                            ) : null}
                        </label>
                        <textarea
                            id={noteId}
                            className={styles.textarea}
                            rows={3}
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            disabled={busy}
                        />
                        <p className={styles.notice}>
                            Runs are hidden quietly. The runner is not notified.
                            Lift from Exclusion rules.
                        </p>
                    </div>
                ) : (
                    <>
                        <ReasonKeyPicker
                            value={key}
                            onChange={setKey}
                            disabled={busy}
                            legend="Reason"
                        />
                        <div>
                            <label
                                htmlFor={noteId}
                                className={styles.fieldLabel}
                            >
                                Note to the runner
                                {noteShort ? (
                                    <span className={styles.fieldRequired}>
                                        Required, {MIN_REASON} characters or
                                        more
                                    </span>
                                ) : null}
                            </label>
                            <textarea
                                id={noteId}
                                className={styles.textarea}
                                rows={3}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={busy}
                            />
                        </div>
                        <p className={styles.notice}>
                            {runIds.length > 1
                                ? 'They get a notification for each rejected run, with this reason and note, and can appeal from the run page.'
                                : 'They get a notification with this reason and note, and can appeal from the run page.'}
                        </p>
                    </>
                )}
            </form>
            <div className={styles.dialogFooter}>
                <button
                    type="button"
                    className={styles.cancel}
                    onClick={onCancel}
                    disabled={busy}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    form={`${titleId}-form`}
                    className={styles.danger}
                    disabled={!ready || busy}
                >
                    {submitLabel(scope, runId, options, names)}
                </button>
            </div>
        </BoardDialog>
    );
}

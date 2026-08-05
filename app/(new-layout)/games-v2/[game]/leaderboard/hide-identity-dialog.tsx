'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    anonymizeRunAction,
    anonymizeUserAction,
    MIN_ANONYMIZE_REASON,
} from '../manage/moderation/shared/actions/anonymize-rules.action';
import { BoardDialog } from '../shared/board-dialog';
import styles from './hide-identity-dialog.module.scss';
import dialogStyles from './row-action-dialogs.module.scss';

/** The three scopes a game moderator can reach. Site-wide is admin-only and
 * lives on the runner panel — see the Identity card there. */
export type HideIdentityScope = 'run' | 'category' | 'game';

interface Props {
    open: boolean;
    onClose: () => void;
    onDone: () => void;
    gameSlug: string;
    gameDisplay: string;
    /** Placeholder-safe display name of the row's runner. */
    runnerName: string;
    runId: number;
    /** Null for guests and already-anonymized rows — runner scopes need it. */
    userId: number | null;
    categoryId: number;
    categoryDisplay: string;
    subcategoryKey: string;
}

const SCOPE_COPY: Record<
    HideIdentityScope,
    { label: (p: Props) => string; blurb: string }
> = {
    run: {
        label: () => 'This run only',
        blurb: 'One run loses its name. The runner stays visible everywhere else, including their other runs on this board.',
    },
    category: {
        label: (p) => `This runner on ${p.categoryDisplay}`,
        blurb: 'Every run this runner has on this one board reads as the same placeholder. Their runs on the game’s other boards are untouched.',
    },
    game: {
        label: (p) => `This runner across ${p.gameDisplay}`,
        blurb: 'Every run this runner has anywhere in this game reads as the same placeholder.',
    },
};

/**
 * "Hide identity…" — the anonymize verb from the board row kebab
 * (design doc §C, mocks fig. 6).
 *
 * Anonymize is NOT a ban: the run keeps its rank, its time and its history;
 * only the public identity is replaced by a stable placeholder. It is also
 * permanent by design — the copy says so plainly rather than implying an undo
 * the moderator does not have (lifting is admin-only, from the runner panel).
 */
export function HideIdentityDialog(props: Props) {
    const {
        open,
        onClose,
        onDone,
        gameSlug,
        runnerName,
        runId,
        userId,
        categoryId,
        subcategoryKey,
    } = props;

    const labelledBy = useId();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [scope, setScope] = useState<HideIdentityScope>('run');
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const reasonOk = reason.trim().length >= MIN_ANONYMIZE_REASON;
    // Runner-wide scopes need an account to key on. Guests have no persistent
    // identity, so the verb stays visible and explains itself instead of
    // vanishing — the run scope still works for them.
    const runnerScopesAvailable = userId != null;

    const submit = () => {
        setError(null);
        startTransition(async () => {
            const res =
                scope === 'run' || userId == null
                    ? await anonymizeRunAction(gameSlug, {
                          runId,
                          reason: reason.trim(),
                          board: { categoryId, subcategoryKey },
                      })
                    : await anonymizeUserAction(gameSlug, {
                          userId,
                          reason: reason.trim(),
                          categoryId: scope === 'category' ? categoryId : null,
                      });

            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success(
                res.result.alreadyExists
                    ? 'Already hidden at this scope — nothing changed.'
                    : `Identity hidden — now shown publicly as ${res.result.rule.displayName}.`,
            );
            setReason('');
            setScope('run');
            onDone();
        });
    };

    return (
        <BoardDialog
            open={open}
            onClose={onClose}
            labelledBy={labelledBy}
            size="md"
            initialFocusRef={textareaRef}
            closeOnBackdropClick={!pending}
        >
            <div className={dialogStyles.header}>
                <div className={dialogStyles.headingBlock}>
                    <p className={dialogStyles.eyebrow}>Moderator</p>
                    <h5 className={dialogStyles.title} id={labelledBy}>
                        Hide identity
                    </h5>
                </div>
            </div>
            <div className={dialogStyles.body}>
                <p className={dialogStyles.blurb}>
                    The runs stay exactly where they are — same rank, same time,
                    same history. Only the name, avatar, flag and profile link
                    go, replaced by a stable placeholder. Moderators still see{' '}
                    <strong>{runnerName}</strong>.
                </p>

                <fieldset className={styles.scopes}>
                    <legend className={dialogStyles.fieldLabel}>Scope</legend>
                    {(
                        [
                            'run',
                            'category',
                            'game',
                        ] as const satisfies readonly HideIdentityScope[]
                    ).map((key) => {
                        const disabled =
                            key !== 'run' && !runnerScopesAvailable;
                        return (
                            <label
                                key={key}
                                className={`${styles.scope} ${disabled ? styles.scopeDisabled : ''}`}
                            >
                                <input
                                    type="radio"
                                    name={`${labelledBy}-scope`}
                                    checked={scope === key}
                                    disabled={disabled || pending}
                                    onChange={() => setScope(key)}
                                />
                                <span className={styles.scopeText}>
                                    <span className={styles.scopeLabel}>
                                        {SCOPE_COPY[key].label(props)}
                                    </span>
                                    <span className={styles.scopeBlurb}>
                                        {disabled
                                            ? 'Needs a registered account — this run has no runner to key on.'
                                            : SCOPE_COPY[key].blurb}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </fieldset>

                <p className={styles.permanent}>
                    <strong>This is permanent.</strong> Undoing it requires a
                    site admin. Applying at a wider scope later is always
                    possible; the placeholder number stays the same.
                </p>

                <label
                    htmlFor={`${labelledBy}-reason`}
                    className={dialogStyles.fieldLabel}
                >
                    Reason — min {MIN_ANONYMIZE_REASON} characters, audit-logged
                </label>
                <textarea
                    ref={textareaRef}
                    id={`${labelledBy}-reason`}
                    className={dialogStyles.reasonTextarea}
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={pending}
                    placeholder="Why is this identity being hidden?"
                />
                {!reasonOk && reason.length > 0 && (
                    <div className={dialogStyles.reasonError}>
                        {MIN_ANONYMIZE_REASON - reason.trim().length} more
                        needed.
                    </div>
                )}
                {error && (
                    <div className={dialogStyles.reasonError} role="alert">
                        {error}
                    </div>
                )}
            </div>
            <div className={dialogStyles.footer}>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onClose}
                    disabled={pending}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={submit}
                    disabled={pending || !reasonOk}
                >
                    {pending ? 'Working…' : 'Hide identity'}
                </button>
            </div>
        </BoardDialog>
    );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import remarkGfm from 'remark-gfm';
import {
    removeDescriptionAction,
    removeManualTimeDescriptionAction,
    setDescriptionRestrictionAction,
    setManualTimeDescriptionRestrictionAction,
    setOwnDescriptionAction,
    setOwnManualTimeDescriptionAction,
} from '../leaderboard/actions/run-description.action';
import styles from './run-description.module.scss';

/** Matches the backend cap in services/run-description.ts. */
export const DESCRIPTION_MAX_LENGTH = 4000;

export interface RunDescriptionRestrictionView {
    reason: string;
    since: string | null;
}

/** The reason length the moderation endpoints enforce. */
const REASON_MIN = 10;

/**
 * The run's description: markdown the runner wrote about their own run.
 *
 * A moderator gets no editor here, by design — the words on a run are the
 * runner's. What a moderator gets is the pair of removals: take this
 * description down, and revoke the runner's ability to write another one on
 * this board. Both are logged, and both are reversible.
 */
export function RunDescription({
    kind,
    runId,
    description,
    canEdit,
    restriction,
    canModerate = false,
    gameSlug,
    hasAccount = true,
}: {
    /** Which table the id points at — they save through different routes. */
    kind: 'run' | 'manual';
    runId: number;
    description: string | null;
    /** The viewer owns this run (and it has an account behind it). */
    canEdit: boolean;
    /** Set only for the owner, when a moderator revoked their descriptions here. */
    restriction?: RunDescriptionRestrictionView | null;
    /** The viewer moderates this game. */
    canModerate?: boolean;
    /** Needed by the moderator verbs; they are game-scoped. */
    gameSlug?: string;
    /** False for a guest row — there is no account to revoke anything from. */
    hasAccount?: boolean;
}) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(description ?? '');
    const [preview, setPreview] = useState(false);
    const [pending, startTransition] = useTransition();
    const [modVerb, setModVerb] = useState<
        'remove' | 'revoke' | 'restore' | null
    >(null);
    const [reason, setReason] = useState('');

    const canModerateHere = canModerate && gameSlug != null && !canEdit;

    // Nothing written and nothing the visitor could do about it: render no
    // empty shell on a page that already has plenty of panels.
    if (!description && !canEdit && !canModerateHere) return null;

    const tooLong = draft.trim().length > DESCRIPTION_MAX_LENGTH;
    // A restriction bars writing, not erasing: a runner told to take their
    // description down must still be able to take it down.
    const blocked = restriction != null && draft.trim().length > 0;

    const save = () => {
        startTransition(async () => {
            const result =
                kind === 'manual'
                    ? await setOwnManualTimeDescriptionAction(runId, draft)
                    : await setOwnDescriptionAction(runId, draft);
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            setEditing(false);
            setPreview(false);
            toast.success(
                result.description
                    ? 'Description saved.'
                    : 'Description removed.',
            );
            router.refresh();
        });
    };

    /** Run the chosen moderator verb with the typed reason. */
    const runModVerb = () => {
        if (!modVerb || !gameSlug || reason.trim().length < REASON_MIN) return;
        startTransition(async () => {
            const result =
                modVerb === 'remove'
                    ? kind === 'manual'
                        ? await removeManualTimeDescriptionAction(
                              gameSlug,
                              runId,
                              reason,
                          )
                        : await removeDescriptionAction(gameSlug, runId, reason)
                    : kind === 'manual'
                      ? await setManualTimeDescriptionRestrictionAction(
                            gameSlug,
                            runId,
                            modVerb,
                            reason,
                        )
                      : await setDescriptionRestrictionAction(
                            gameSlug,
                            runId,
                            modVerb,
                            reason,
                        );
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            setModVerb(null);
            setReason('');
            toast.success(
                modVerb === 'remove'
                    ? 'Description removed.'
                    : modVerb === 'revoke'
                      ? 'Descriptions revoked on this board.'
                      : 'Descriptions restored on this board.',
            );
            router.refresh();
        });
    };

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <h2 className={styles.title}>Description</h2>
                {canEdit && !editing && (
                    <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => {
                            setDraft(description ?? '');
                            setEditing(true);
                        }}
                    >
                        {description ? 'Edit' : 'Add a description'}
                    </button>
                )}
            </div>

            {!editing &&
                (description ? (
                    <div className={styles.body}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {description}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <p className={styles.empty}>
                        Nothing written yet — route notes, what went wrong, what
                        you'd do differently.
                    </p>
                ))}

            {editing && (
                <div className={styles.editor}>
                    {restriction && (
                        <p className={styles.restricted}>
                            A moderator removed your ability to add a
                            description here.
                            {restriction.reason
                                ? ` Reason: “${restriction.reason}”`
                                : ''}
                        </p>
                    )}
                    {preview ? (
                        <div className={styles.body}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {draft.trim() || '_Nothing to preview._'}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <textarea
                            className={styles.textarea}
                            value={draft}
                            rows={8}
                            disabled={restriction != null}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Markdown supported — headings, lists, links, **bold**."
                            aria-label="Run description"
                        />
                    )}
                    <div className={styles.editorFoot}>
                        <span
                            className={
                                tooLong ? styles.counterOver : styles.counter
                            }
                        >
                            {draft.trim().length} / {DESCRIPTION_MAX_LENGTH}
                        </span>
                        <div className={styles.editorActions}>
                            <button
                                type="button"
                                className={styles.ghostButton}
                                onClick={() => setPreview((p) => !p)}
                            >
                                {preview ? 'Write' : 'Preview'}
                            </button>
                            <button
                                type="button"
                                className={styles.ghostButton}
                                onClick={() => {
                                    setEditing(false);
                                    setPreview(false);
                                    setDraft(description ?? '');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.saveButton}
                                onClick={save}
                                disabled={pending || tooLong || blocked}
                            >
                                {pending ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {canModerateHere && (
                <div className={styles.modBar}>
                    {modVerb === null ? (
                        <>
                            {description && (
                                <button
                                    type="button"
                                    className={styles.dangerButton}
                                    onClick={() => setModVerb('remove')}
                                >
                                    Remove description
                                </button>
                            )}
                            {hasAccount && (
                                <>
                                    <button
                                        type="button"
                                        className={styles.dangerButton}
                                        onClick={() => setModVerb('revoke')}
                                    >
                                        Revoke descriptions
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.ghostButton}
                                        onClick={() => setModVerb('restore')}
                                    >
                                        Restore descriptions
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <div className={styles.modForm}>
                            <label
                                htmlFor="description-mod-reason"
                                className={styles.modPrompt}
                            >
                                {modVerb === 'remove'
                                    ? 'Why is this description coming down?'
                                    : modVerb === 'revoke'
                                      ? "Why is this runner losing descriptions on this board? It doesn't follow them to other boards."
                                      : 'Why are descriptions being restored?'}
                            </label>
                            <input
                                id="description-mod-reason"
                                type="text"
                                className={styles.textarea}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={`At least ${REASON_MIN} characters — it goes in the log.`}
                            />
                            <div className={styles.editorActions}>
                                <button
                                    type="button"
                                    className={styles.ghostButton}
                                    onClick={() => {
                                        setModVerb(null);
                                        setReason('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={styles.dangerButton}
                                    onClick={runModVerb}
                                    disabled={
                                        pending ||
                                        reason.trim().length < REASON_MIN
                                    }
                                >
                                    {pending ? 'Working…' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

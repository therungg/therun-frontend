'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { BoardDialog } from '~app/(new-layout)/games/[game]/shared/board-dialog';
import {
    editRunAction,
    type RunEditFields,
    type RunTarget,
} from '~src/actions/run-owner.action';
import { userHref } from '~src/lib/user-href';
import styles from './run-edit-dialog.module.scss';

const MAX_DESCRIPTION = 250;
const MAX_CUSTOM_URL = 50;

const EMPTY: RunEditFields = { description: '', vod: '', customUrl: '' };

interface Props {
    open: boolean;
    onClose: () => void;
    target: RunTarget;
    /** What the run already carries, when the caller already has it. */
    initial?: RunEditFields;
    /**
     * Read the run's own text when the caller doesn't have it — the runs
     * list carries times and ranks, not descriptions. Called once each time
     * the dialog opens.
     */
    load?: () => Promise<RunEditFields | { error: string }>;
    onSaved: () => void;
}

/**
 * The runner's edit form for their own run: description, VOD link and
 * custom URL.
 *
 * Lives apart from the run page's verb row because the Runs tab on the
 * profile opens the same form from a row, where none of the three fields
 * has been read yet — hence `load`.
 */
export function RunEditDialog({
    open,
    onClose,
    target,
    initial,
    load,
    onSaved,
}: Props) {
    const ids = useId();
    const firstRef = useRef<HTMLTextAreaElement>(null);
    const [form, setForm] = useState<RunEditFields>(initial ?? EMPTY);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [loading, setLoading] = useState(false);

    // Each opening re-reads, so a run edited twice in a row starts from what
    // the last save left behind rather than from the first read.
    useEffect(() => {
        if (!open || !load) return;
        let live = true;
        setLoading(true);
        setError(null);
        void load().then((res) => {
            if (!live) return;
            setLoading(false);
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setForm(res);
        });
        return () => {
            live = false;
        };
    }, [open, load]);

    const set = <K extends keyof RunEditFields>(
        key: K,
        value: RunEditFields[K],
    ) => setForm((f) => ({ ...f, [key]: value }));

    const close = () => {
        setForm(initial ?? EMPTY);
        setError(null);
        onClose();
    };

    const submit = async () => {
        if (pending || loading) return;
        setPending(true);
        setError(null);
        const res = await editRunAction(target, form);
        setPending(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        onSaved();
    };

    const slug = form.customUrl.trim();

    return (
        <BoardDialog
            open={open}
            onClose={() => {
                if (!pending) close();
            }}
            labelledBy={`${ids}-title`}
            size="lg"
            initialFocusRef={firstRef}
            closeOnBackdropClick={!pending}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                }}
            >
                <div className={styles.header}>
                    <h5 className={styles.title} id={`${ids}-title`}>
                        Edit run
                    </h5>
                </div>
                <div className={styles.body}>
                    {loading ? (
                        <div className={styles.loading}>Reading the run…</div>
                    ) : (
                        <>
                            <div className={styles.field}>
                                <label
                                    className={styles.label}
                                    htmlFor={`${ids}-description`}
                                >
                                    Description
                                    <span className={styles.count}>
                                        {form.description.length}/
                                        {MAX_DESCRIPTION}
                                    </span>
                                </label>
                                <textarea
                                    ref={firstRef}
                                    id={`${ids}-description`}
                                    className={`form-control form-control-sm ${styles.textarea}`}
                                    maxLength={MAX_DESCRIPTION}
                                    rows={3}
                                    value={form.description}
                                    placeholder="What is worth knowing about this run?"
                                    onChange={(e) =>
                                        set('description', e.target.value)
                                    }
                                />
                            </div>
                            <div className={styles.field}>
                                <label
                                    className={styles.label}
                                    htmlFor={`${ids}-vod`}
                                >
                                    VOD URL
                                </label>
                                <input
                                    id={`${ids}-vod`}
                                    type="text"
                                    className={`form-control form-control-sm ${styles.input}`}
                                    value={form.vod}
                                    placeholder="https://www.twitch.tv/videos/40861387"
                                    onChange={(e) => set('vod', e.target.value)}
                                />
                                <div className={styles.hint}>
                                    YouTube or Twitch only.
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label
                                    className={styles.label}
                                    htmlFor={`${ids}-custom-url`}
                                >
                                    Custom URL
                                </label>
                                <input
                                    id={`${ids}-custom-url`}
                                    type="text"
                                    className={`form-control form-control-sm ${styles.input}`}
                                    maxLength={MAX_CUSTOM_URL}
                                    value={form.customUrl}
                                    placeholder="my-best-run"
                                    onChange={(e) =>
                                        set('customUrl', e.target.value)
                                    }
                                />
                                <div className={styles.hint}>
                                    {slug
                                        ? `This run also answers at therun.gg${userHref(target.username, slug)}`
                                        : 'A short name this run also answers at.'}
                                </div>
                            </div>
                        </>
                    )}
                    {error ? (
                        <div className={styles.error} role="alert">
                            {error}
                        </div>
                    ) : null}
                </div>
                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.cancel}
                        onClick={close}
                        disabled={pending}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={styles.primary}
                        disabled={pending || loading}
                    >
                        {pending ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </form>
        </BoardDialog>
    );
}

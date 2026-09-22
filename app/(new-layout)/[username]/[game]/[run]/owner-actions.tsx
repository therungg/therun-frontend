'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { BoardDialog } from '~app/(new-layout)/games/[game]/shared/board-dialog';
import { ConfirmDialog } from '~app/(new-layout)/games/[game]/shared/confirm-dialog';
import {
    deleteRunAction,
    editRunAction,
    type RunTarget,
    toggleRunHighlightAction,
} from '~src/actions/run-owner.action';
import { userHref } from '~src/lib/user-href';
import { Can, subject } from '~src/rbac/Can.component';
import styles from './owner-actions.module.scss';

const MAX_DESCRIPTION = 250;
const MAX_CUSTOM_URL = 50;

interface Props extends RunTarget {
    /** What the run already carries, for the edit form to start from. */
    description: string;
    vod: string;
    customUrl: string;
    highlighted: boolean;
}

interface FormState {
    description: string;
    vod: string;
    customUrl: string;
}

/**
 * Edit, Highlight and Delete on your own run.
 *
 * The profile redesign left the run page with no way to reach any of them —
 * the old profile's table was the only place they lived. The writes go
 * through server actions rather than the API proxy routes so the page the
 * runner is looking at reads its own write back: the actions `updateTag`,
 * which the proxy routes' `revalidateTag` cannot do (stale-while-revalidate
 * would serve the old description one more time, and `router.refresh()`
 * re-renders the route without expiring the `'use cache'` entry behind it).
 */
export function RunOwnerActions(props: Props) {
    return (
        <Can I="delete" this={subject('run', props.username)}>
            <OwnerRow {...props} />
        </Can>
    );
}

function OwnerRow({
    username,
    game,
    category,
    description,
    vod,
    customUrl,
    highlighted,
}: Props) {
    const router = useRouter();
    const target: RunTarget = { username, game, category };
    const [starred, setStarred] = useState(highlighted);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pending, setPending] = useState<'star' | 'delete' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const toggleStar = async () => {
        if (pending) return;
        setPending('star');
        setError(null);
        const res = await toggleRunHighlightAction(target);
        setPending(null);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setStarred(res.highlighted);
        router.refresh();
    };

    const remove = async () => {
        if (pending) return;
        setPending('delete');
        setError(null);
        const res = await deleteRunAction(target);
        if ('error' in res) {
            setPending(null);
            setError(res.error);
            return;
        }
        setDeleteOpen(false);
        router.push(userHref(username, 'stats'));
    };

    return (
        <div className={styles.row}>
            <button
                type="button"
                className={styles.action}
                onClick={() => setEditOpen(true)}
            >
                Edit
            </button>
            <button
                type="button"
                className={`${styles.action}${starred ? ` ${styles.starred}` : ''}`}
                onClick={() => void toggleStar()}
                disabled={pending === 'star'}
            >
                {starred ? 'Unhighlight' : 'Highlight'}
            </button>
            <button
                type="button"
                className={styles.action}
                onClick={() => setDeleteOpen(true)}
            >
                Delete
            </button>
            {error ? (
                <div className={styles.error} role="alert">
                    {error}
                </div>
            ) : null}
            <EditRunDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                target={target}
                initial={{ description, vod, customUrl }}
                onSaved={() => {
                    setEditOpen(false);
                    router.refresh();
                }}
            />
            <ConfirmDialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={() => void remove()}
                labelledBy="run-delete-title"
                title="Delete this run?"
                message="The splits, the history and every statistic on this page go with it. This cannot be undone."
                confirmLabel="Delete run"
                pending={pending === 'delete'}
                error={error}
            />
        </div>
    );
}

function EditRunDialog({
    open,
    onClose,
    target,
    initial,
    onSaved,
}: {
    open: boolean;
    onClose: () => void;
    target: RunTarget;
    initial: FormState;
    onSaved: () => void;
}) {
    const ids = useId();
    const firstRef = useRef<HTMLTextAreaElement>(null);
    const [form, setForm] = useState<FormState>(initial);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((f) => ({ ...f, [key]: value }));

    const close = () => {
        setForm(initial);
        setError(null);
        onClose();
    };

    const submit = async () => {
        if (pending) return;
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
                    <div className={styles.field}>
                        <label
                            className={styles.label}
                            htmlFor={`${ids}-description`}
                        >
                            Description
                            <span className={styles.count}>
                                {form.description.length}/{MAX_DESCRIPTION}
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
                            onChange={(e) => set('description', e.target.value)}
                        />
                    </div>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor={`${ids}-vod`}>
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
                            onChange={(e) => set('customUrl', e.target.value)}
                        />
                        <div className={styles.hint}>
                            {slug
                                ? `This run also answers at therun.gg${userHref(target.username, slug)}`
                                : 'A short name this run also answers at.'}
                        </div>
                    </div>
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
                        disabled={pending}
                    >
                        {pending ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </form>
        </BoardDialog>
    );
}

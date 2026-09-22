'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '~app/(new-layout)/games/[game]/shared/confirm-dialog';
import {
    deleteRunAction,
    type RunTarget,
    toggleRunHighlightAction,
} from '~src/actions/run-owner.action';
import { userHref } from '~src/lib/user-href';
import { Can, subject } from '~src/rbac/Can.component';
import styles from './owner-actions.module.scss';
import { RunEditDialog } from './run-edit-dialog';

interface Props extends RunTarget {
    /** What the run already carries, for the edit form to start from. */
    description: string;
    vod: string;
    customUrl: string;
    highlighted: boolean;
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
            <RunEditDialog
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

'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useContext, useState } from 'react';
import { RunEditDialog } from '~app/(new-layout)/[username]/[game]/[run]/run-edit-dialog';
import { ConfirmDialog } from '~app/(new-layout)/games/[game]/shared/confirm-dialog';
import {
    deleteRunAction,
    getRunEditFieldsAction,
    type RunTarget,
} from '~src/actions/run-owner.action';
import { deleteRunMessage } from '~src/lib/delete-run-copy';
import { AbilityContext, subject } from '~src/rbac/Can.component';
import styles from './stats.module.scss';

/** Whether the viewer is the runner whose profile this is. */
function useOwns(username: string): boolean {
    const ability = useContext(AbilityContext);
    return ability.can('delete', subject('run', username));
}

function PencilIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
        </svg>
    );
}

/**
 * The box the Runs tab's rows share.
 *
 * Its `data-owner` is what widens every row by one column for the runner's
 * own actions: the column header is server-rendered and the ownership is
 * only known in the browser, so the two have to be told at the same place
 * or the header stops lining up with the rows underneath it.
 */
export function RunsOwnerScope({
    username,
    children,
}: {
    username: string;
    children: ReactNode;
}) {
    const owns = useOwns(username);
    return (
        <div className={styles.rows} data-owner={owns ? 'true' : undefined}>
            {children}
        </div>
    );
}

/**
 * One category row, which its owner can delete out from under themselves.
 *
 * A deleted run is gone before the route re-renders, so the row takes
 * itself away rather than waiting for the refresh to notice.
 */
export function RunRow({
    className,
    username,
    game,
    category,
    holdsBoardEntry,
    label,
    children,
}: {
    className: string;
    username: string;
    game: string;
    category: string;
    holdsBoardEntry: boolean;
    /** How the run is named back to the runner in the delete confirmation. */
    label: string;
    children: ReactNode;
}) {
    const [removed, setRemoved] = useState(false);
    if (removed) return null;
    return (
        <div className={className}>
            {children}
            <RunRowActions
                username={username}
                game={game}
                category={category}
                holdsBoardEntry={holdsBoardEntry}
                label={label}
                onRemoved={() => setRemoved(true)}
            />
        </div>
    );
}

/**
 * Edit and Delete at the end of a row, for the runner themselves.
 *
 * It lifts itself above the row's stretched-link overlay, the way the star
 * in front of the name does — without that, a click on either lands on the
 * link covering the row and navigates instead.
 */
function RunRowActions({
    username,
    game,
    category,
    holdsBoardEntry,
    label,
    onRemoved,
}: {
    username: string;
    game: string;
    category: string;
    holdsBoardEntry: boolean;
    label: string;
    onRemoved: () => void;
}) {
    const owns = useOwns(username);
    const router = useRouter();
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const target: RunTarget = { username, game, category };
    const id = `run-delete-${game}-${category}`;

    const load = useCallback(
        () => getRunEditFieldsAction({ username, game, category }),
        [username, game, category],
    );

    const remove = async () => {
        if (pending) return;
        setPending(true);
        setError(null);
        const res = await deleteRunAction(target);
        setPending(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setDeleteOpen(false);
        onRemoved();
        router.refresh();
    };

    if (!owns) return null;

    return (
        <span className={styles.actions}>
            <button
                type="button"
                className={styles.action}
                title="Edit this run"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditOpen(true);
                }}
            >
                <PencilIcon />
                <span className="visually-hidden">Edit {label}</span>
            </button>
            <button
                type="button"
                className={`${styles.action} ${styles.actionDanger}`}
                title="Delete this run"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteOpen(true);
                }}
            >
                <TrashIcon />
                <span className="visually-hidden">Delete {label}</span>
            </button>
            <RunEditDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                target={target}
                load={load}
                onSaved={() => {
                    setEditOpen(false);
                    router.refresh();
                }}
            />
            <ConfirmDialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={() => void remove()}
                labelledBy={id}
                title="Delete this run?"
                message={deleteRunMessage(`behind ${label}`, holdsBoardEntry)}
                confirmLabel="Delete run"
                pending={pending}
                error={error}
            />
        </span>
    );
}

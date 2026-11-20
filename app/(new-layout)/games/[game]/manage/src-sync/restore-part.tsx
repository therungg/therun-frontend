'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { plural } from '~src/lib/src-archive-counts';
import type { SrcRestorePreview } from '../../../../../../types/src-board-sync.types';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import styles from './src-sync.module.scss';
import { previewRestore, restoreFromSrc } from './src-sync-actions';

const BUSY = 'A sync is running. Try again in a few minutes.';

export function RestorePart({
    gameId,
    gameSlug,
    onRestored,
}: {
    gameId: number;
    gameSlug: string;
    onRestored: () => void;
}) {
    const router = useRouter();
    const [preview, setPreview] = useState<SrcRestorePreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [restoring, setRestoring] = useState(false);

    const open = async () => {
        setLoading(true);
        setError(null);
        const res = await previewRestore(gameId);
        setLoading(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        if (res.result.running) {
            setError(BUSY);
            return;
        }
        setPreview(res.result);
    };

    const close = () => {
        setPreview(null);
        setError(null);
    };

    const confirm = async () => {
        setPending(true);
        setError(null);
        const res = await restoreFromSrc(gameId, gameSlug);
        setPending(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        setPreview(null);
        setRestoring(true);
        router.refresh();
        onRestored();
    };

    if (restoring) {
        return (
            <div className={styles.part}>
                <p className={styles.muted} aria-live="polite">
                    Restoring. The mods get a notification when it's done.
                </p>
            </div>
        );
    }

    const runs = preview?.runs;
    const categories = preview?.archive.categories ?? [];
    const levels = preview?.archive.levels ?? [];
    const lost = runs
        ? [
              runs.hidden > 0 &&
                  plural(runs.hidden, 'hidden run', 'hidden runs'),
              runs.retimed > 0 &&
                  plural(runs.retimed, 'retimed run', 'retimed runs'),
              runs.moved > 0 && plural(runs.moved, 'moved run', 'moved runs'),
              runs.edited > 0 &&
                  plural(runs.edited, 'edited run', 'edited runs'),
              preview.openConflicts > 0 &&
                  plural(
                      preview.openConflicts,
                      'open conflict',
                      'open conflicts',
                  ),
              categories.length > 0 &&
                  `${plural(categories.length, 'category', 'categories')} archived: ${categories.map((c) => c.display).join(', ')}`,
              levels.length > 0 &&
                  `${plural(levels.length, 'level', 'levels')} archived: ${levels.map((l) => l.display).join(', ')}`,
          ].filter((p): p is string => !!p)
        : [];

    return (
        <div className={styles.part}>
            <div className={styles.footer}>
                <button
                    type="button"
                    className={styles.secondary}
                    onClick={open}
                    disabled={loading}
                >
                    Restore from speedrun.com
                </button>
            </div>
            {error && !preview && (
                <p className={styles.error} role="alert">
                    {error}
                </p>
            )}
            <ConfirmDialog
                open={preview !== null}
                onClose={close}
                onConfirm={confirm}
                labelledBy="src-restore-title"
                title="Restore from speedrun.com"
                message="This board will copy speedrun.com. Mod changes to speedrun.com runs are undone, and our categories that aren't on speedrun.com are archived. You can't undo this."
                confirmLabel="Restore"
                pending={pending}
                error={error}
            >
                <div className={styles.confirm}>
                    {lost.length > 0 && (
                        <ul className={styles.failed}>
                            {lost.map((line) => (
                                <li key={line}>{line}</li>
                            ))}
                        </ul>
                    )}
                    {preview && preview.fetchBoards > 0 && (
                        <p className={styles.counts}>
                            At least{' '}
                            {plural(preview.fetchBoards, 'board', 'boards')}{' '}
                            will be fetched.
                        </p>
                    )}
                </div>
            </ConfirmDialog>
        </div>
    );
}

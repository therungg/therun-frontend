'use client';

import { useEffect, useState } from 'react';
import type {
    CategoryExtensionCandidate,
    CategoryExtensionOptions,
} from '../../../../../../types/reassignments.types';
import styles from './merge.module.scss';
import {
    listCategoryExtensionsAction,
    mergeCategoryExtensionsAction,
} from './merge-actions';

interface Props {
    gameId: number;
    gameDisplay: string;
}

/**
 * Pulling a game's Category Extensions board in.
 *
 * Renders nothing at all when there is no candidate, which is most games.
 * A section explaining a merge you cannot do is a section in the way.
 */
export function CategoryExtensionsSection({ gameId, gameDisplay }: Props) {
    const [options, setOptions] = useState<CategoryExtensionOptions | null>(
        null,
    );
    const [confirming, setConfirming] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let live = true;
        listCategoryExtensionsAction(gameId)
            .then((rows) => {
                if (live) setOptions(rows);
            })
            .catch(() => {
                if (live) setOptions({ here: [], atSource: null });
            });
        return () => {
            live = false;
        };
    }, [gameId]);

    const candidates = options?.here ?? [];
    const atSource = options?.atSource ?? null;
    if (!options) return null;
    if (candidates.length === 0 && !atSource && !done) return null;

    async function bringOver() {
        setBusy(true);
        setError(null);
        try {
            await mergeCategoryExtensionsAction({ gameId });
            setDone(
                `Importing the Category Extensions board. It joins ${gameDisplay} once its categories are in.`,
            );
            setOptions({ here: [], atSource: null });
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'The import was refused.',
            );
        } finally {
            setBusy(false);
        }
    }

    async function merge(candidate: CategoryExtensionCandidate) {
        setBusy(true);
        setError(null);
        try {
            await mergeCategoryExtensionsAction({
                gameId,
                sourceGameId: candidate.id,
            });
            setDone(
                `${candidate.display} is merging into ${gameDisplay}. Its boards will arrive under a Category Extensions group.`,
            );
            setOptions({ here: [], atSource: null });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'The merge was refused.');
        } finally {
            setBusy(false);
            setConfirming(null);
        }
    }

    return (
        <section className={styles.step}>
            <h3 className={styles.question}>Merge a game into {gameDisplay}</h3>
            <p className={styles.blurb}>
                We recommend hosting Category Extensions on the same game name
                as the main game, so there won&rsquo;t be 2 urls for the main
                game and CE. This will create a new category group where CE
                categories are stored.
            </p>

            {candidates.map((c) => (
                <div key={c.id} className={styles.candidate}>
                    {c.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={c.coverUrl}
                            alt=""
                            aria-hidden
                            width={36}
                            height={48}
                            loading="lazy"
                            className={styles.candidateArt}
                        />
                    ) : (
                        <div className={styles.candidateArt} />
                    )}
                    <div className={styles.candidateBody}>
                        <strong>{c.display}</strong>
                        <span className={styles.candidateMeta}>
                            {c.boards.toLocaleString()}{' '}
                            {c.boards === 1 ? 'board' : 'boards'},{' '}
                            {c.runs.toLocaleString()}{' '}
                            {c.runs === 1 ? 'run' : 'runs'}
                        </span>
                    </div>
                    {confirming === c.id ? (
                        <div className={styles.candidateConfirm}>
                            <button
                                type="button"
                                className={styles.submit}
                                onClick={() => merge(c)}
                                disabled={busy}
                            >
                                {busy ? 'Merging…' : 'Yes, merge it'}
                            </button>
                            <button
                                type="button"
                                className={styles.cancel}
                                onClick={() => setConfirming(null)}
                                disabled={busy}
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className={styles.submit}
                            onClick={() => setConfirming(c.id)}
                            disabled={busy}
                        >
                            Merge into {gameDisplay}
                        </button>
                    )}
                </div>
            ))}

            {atSource ? (
                <div className={styles.candidate}>
                    <div className={styles.candidateArt} />
                    <div className={styles.candidateBody}>
                        <strong>{atSource.srcName}</strong>
                        <span className={styles.candidateMeta}>
                            on speedrun.com, not here yet
                        </span>
                    </div>
                    <button
                        type="button"
                        className={styles.submit}
                        onClick={bringOver}
                        disabled={busy}
                    >
                        {busy ? 'Importing…' : `Import and merge`}
                    </button>
                </div>
            ) : null}

            {confirming !== null ? (
                <p className={styles.blurb}>
                    Every CE run goes to the main board in a separate category
                    group. Category Extensions categories keep their own
                    subcategories, rules, settings, runs etc.
                </p>
            ) : null}

            {error ? <p className={styles.error}>{error}</p> : null}
            {done ? <p className={styles.done}>{done}</p> : null}
        </section>
    );
}

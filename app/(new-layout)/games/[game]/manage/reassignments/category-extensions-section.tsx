'use client';

import { useEffect, useState } from 'react';
import type { CategoryExtensionCandidate } from '../../../../../../types/reassignments.types';
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
    const [candidates, setCandidates] = useState<
        CategoryExtensionCandidate[] | null
    >(null);
    const [confirming, setConfirming] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let live = true;
        listCategoryExtensionsAction(gameId)
            .then((rows) => {
                if (live) setCandidates(rows);
            })
            .catch(() => {
                if (live) setCandidates([]);
            });
        return () => {
            live = false;
        };
    }, [gameId]);

    if (!candidates || candidates.length === 0) return null;

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
            setCandidates([]);
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
                Sometimes runs are submitted to a different game name, but they
                actually belong here. We recommend hosting Category Extensions
                on the same game name as the main game, so there won&rsquo;t be
                2 urls for the main game and CE.
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

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
    /** Told when the game is busy, so the rest of the tab can stand down too. */
    onBusy?: (reason: string | null) => void;
}

/**
 * Pulling a game's Category Extensions board in.
 *
 * Renders nothing at all when there is no candidate, which is most games.
 * A section explaining a merge you cannot do is a section in the way.
 */
export function CategoryExtensionsSection({
    gameId,
    gameDisplay,
    onBusy,
}: Props) {
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
                if (!live) return;
                setOptions(rows);
                onBusy?.(rows.busy ?? null);
            })
            .catch(() => {
                if (live) setOptions({ here: [], atSource: null });
            });
        return () => {
            live = false;
        };
    }, [gameId, onBusy]);

    const candidates = options?.here ?? [];
    const atSource = options?.atSource ?? null;
    const hasStripped = candidates.some((c) => c.match === 'stripped');
    // The bracketed part of this game's own title, when it has one, so the
    // stripped-match note can name the actual suffix instead of an example.
    const qualifier = gameDisplay.match(/\(([^)]+)\)\s*$/)?.[1] ?? null;
    if (!options) return null;
    // Busy: say what is running rather than offer buttons the server will
    // refuse. Shown even with no candidate — the merge that is running may be
    // the very one that took the candidate off the list.
    if (options.busy) {
        return (
            <section className={styles.step}>
                <h3 className={styles.question}>
                    Merge a game into {gameDisplay}
                </h3>
                <p className={styles.done}>
                    {options.busy} Merging, syncing and the board baseline are
                    paused on this game until it finishes.
                </p>
            </section>
        );
    }
    if (candidates.length === 0 && !atSource && !done) return null;

    async function bringOver() {
        setBusy(true);
        setError(null);
        try {
            const res = await mergeCategoryExtensionsAction({ gameId });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setDone(
                `Importing the Category Extensions board. It joins ${gameDisplay} once its categories are in.`,
            );
            setOptions({ here: [], atSource: null });
        } catch {
            setError('The import was refused.');
        } finally {
            setBusy(false);
        }
    }

    async function merge(candidate: CategoryExtensionCandidate) {
        setBusy(true);
        setError(null);
        try {
            const res = await mergeCategoryExtensionsAction({
                gameId,
                sourceGameId: candidate.id,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setDone(
                `${candidate.display} is merging into ${gameDisplay}. Its boards will arrive under a Category Extensions group.`,
            );
            setOptions({ here: [], atSource: null });
        } catch {
            setError('The merge was refused.');
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
            {hasStripped ? (
                <p className={styles.blurb}>
                    A settings sync will not bring this board in by itself.
                    Merging it here is the only way to get it into {gameDisplay}
                    .
                </p>
            ) : null}

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
                            {c.runs === 0
                                ? 'no runs yet'
                                : `${c.runs.toLocaleString()} ${c.runs === 1 ? 'run' : 'runs'}`}
                            {c.alsoClaimedBy ? (
                                <>
                                    {' '}
                                    &middot; {c.alsoClaimedBy.toLocaleString()}{' '}
                                    other{' '}
                                    {c.alsoClaimedBy === 1 ? 'game' : 'games'}{' '}
                                    here could also claim this board
                                </>
                            ) : null}
                        </span>
                        {c.match === 'stripped' ? (
                            <span className={styles.candidateNote}>
                                Matched by the title without{' '}
                                {qualifier ? (
                                    <>the &ldquo;({qualifier})&rdquo;</>
                                ) : (
                                    'its parenthetical'
                                )}{' '}
                                suffix, so other releases of this game may share
                                this board. The merge goes through only if the
                                source files this board under this release.
                            </span>
                        ) : null}
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

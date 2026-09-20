'use client';

import { useState } from 'react';
import type { GameSearchResult } from '~src/lib/game-search';
import { searchGames } from '~src/lib/game-search';
import styles from './merge.module.scss';
import { requestGameMergeAction } from './merge-actions';

interface Props {
    gameId: number;
    gameDisplay: string;
}

/**
 * Asking for any other game to be folded into this one.
 *
 * Whether it merges or waits is the backend's call, not this form's: it
 * depends on whether the asker also moderates the game being merged away,
 * and a client that decided that for itself would be deciding who may
 * rewrite somebody else's boards.
 */
export function RequestGameMerge({ gameId, gameDisplay }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GameSearchResult[]>([]);
    const [picked, setPicked] = useState<GameSearchResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function search(value: string) {
        setQuery(value);
        setPicked(null);
        setDone(null);
        if (value.trim().length < 2) {
            setResults([]);
            return;
        }
        try {
            const found = await searchGames(value.trim());
            setResults(found.filter((g) => g.id !== gameId));
        } catch {
            setResults([]);
        }
    }

    async function submit() {
        if (!picked) return;
        setBusy(true);
        setError(null);
        try {
            const res = await requestGameMergeAction({
                gameId,
                sourceGameId: picked.id,
            });
            setDone(
                res.merged
                    ? `${picked.display} is merging into ${gameDisplay}.`
                    : `Asked an admin to merge ${picked.display} into ${gameDisplay}. You moderate ${gameDisplay} but not ${picked.display}, so it needs their say-so.`,
            );
            setPicked(null);
            setQuery('');
            setResults([]);
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'The request was refused.',
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className={styles.step}>
            <h3 className={styles.question}>
                Merge another game into {gameDisplay}
            </h3>
            <p className={styles.blurb}>
                If you&rsquo;re a mod on both games this merge happens
                immediately. If not, it will go to an admin for review to
                prevent abuse.
            </p>

            <input
                type="search"
                className={styles.search}
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="Search games"
                aria-label="Search games to merge in"
                disabled={busy}
            />

            {results.length > 0 ? (
                <div className={styles.band}>
                    {results.map((g) => (
                        <button
                            key={g.id}
                            type="button"
                            className={`${styles.chip} ${
                                picked?.id === g.id ? styles.chipActive : ''
                            }`}
                            onClick={() => setPicked(g)}
                            disabled={busy}
                            aria-pressed={picked?.id === g.id}
                        >
                            {g.display}
                        </button>
                    ))}
                </div>
            ) : null}

            {picked ? (
                <>
                    <p className={styles.blurb}>
                        Every run on {picked.display} moves to {gameDisplay},
                        and its address points here afterwards.
                    </p>
                    <button
                        type="button"
                        className={styles.submit}
                        onClick={submit}
                        disabled={busy}
                    >
                        {busy
                            ? 'Asking…'
                            : `Merge ${picked.display} into ${gameDisplay}`}
                    </button>
                </>
            ) : null}

            {error ? <p className={styles.error}>{error}</p> : null}
            {done ? <p className={styles.done}>{done}</p> : null}
        </section>
    );
}

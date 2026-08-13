'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useDebounceValue } from 'usehooks-ts';
import { lookupRunnerEntriesAction } from '~src/actions/runner-entries.action';
import Link from '~src/components/link';
import type { SearchResults } from '~src/components/search/find-user-or-run';
import { gameSegment } from '~src/lib/board-url';
import { formatDuration } from '~src/lib/duration';
import { fetcher } from '~src/utils/fetcher';
import type { RunnerGameEntry } from '../../../../../types/leaderboards.types';
import {
    type BoardSlice,
    type RunnerChoice,
    resolveRunnerChoice,
} from './runner-state';
import styles from './submit-run-dialog.module.scss';

interface Props {
    gameId: number;
    gameSlug: string;
    board: BoardSlice;
    choice: RunnerChoice | null;
    onChoice: (choice: RunnerChoice | null) => void;
}

/** Where a runner's existing entry lives — a run page or a manual-time page. */
function entryHref(gameSlug: string, entry: RunnerGameEntry): string {
    const game = gameSegment(gameSlug);
    return entry.source === 'run'
        ? `/games-v2/${game}/run/${entry.runId}`
        : `/games-v2/${game}/manual/${entry.manualTimeId}`;
}

function describeEntry(entry: RunnerGameEntry): string {
    const rank =
        entry.rank != null ? ` (#${entry.rank} of ${entry.totalRunners})` : '';
    return `${formatDuration(entry.timeMs)}${rank}`;
}

/**
 * Who the run is for. Moderators only — a runner submitting for themselves
 * never sees this step.
 *
 * Selecting a search result or confirming a typed name resolves it against
 * what that runner already holds on this game (`lookupRunnerEntriesAction`).
 * The lookup is the only place a name becomes a numeric user id: the search
 * index carries display fields only, so without it every mod-added run would
 * be unlinked from the account it belongs to.
 */
export function StepRunner({
    gameId,
    gameSlug,
    board,
    choice,
    onChoice,
}: Props) {
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounceValue(query, 300);
    const [typedName, setTypedName] = useState('');
    const [resolving, setResolving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: searchResults, isLoading } = useSWR<SearchResults>(
        !choice && debouncedQuery.length >= 2
            ? `/api/search?q=${encodeURIComponent(debouncedQuery)}`
            : null,
        fetcher,
        { dedupingInterval: 500 },
    );

    const resolve = async (
        ref: { username: string } | { guestName: string },
    ) => {
        const name = 'username' in ref ? ref.username : ref.guestName;
        setResolving(true);
        setError(null);
        const result = await lookupRunnerEntriesAction(gameId, ref);
        setResolving(false);
        if ('error' in result) {
            setError(result.error);
            return;
        }
        onChoice(resolveRunnerChoice(result, name, board));
    };

    const reset = () => {
        onChoice(null);
        setQuery('');
        setTypedName('');
        setError(null);
    };

    if (choice) {
        return (
            <div className={styles.step}>
                <div className={styles.runnerCard}>
                    <div className={styles.runnerName}>
                        {choice.displayName}
                    </div>

                    {choice.kind === 'name-only' ? (
                        <p className={styles.runnerNote}>
                            No account found. The run is added under this name
                            and won’t be linked to a therun account.
                        </p>
                    ) : (
                        <p className={styles.runnerNote}>
                            Linked to their therun account.
                        </p>
                    )}

                    {choice.existing ? (
                        <div className={styles.runnerBlocked}>
                            {choice.displayName} already has a run on this board
                            — {describeEntry(choice.existing)}.{' '}
                            <Link
                                href={entryHref(gameSlug, choice.existing)}
                                className={styles.quietLink}
                            >
                                View it
                            </Link>
                        </div>
                    ) : (
                        <p className={styles.runnerNote}>
                            No run on this board yet.
                        </p>
                    )}

                    {choice.otherBoards.length > 0 && (
                        <div className={styles.otherBoards}>
                            Also on this game:
                            <ul className={styles.otherBoardsList}>
                                {choice.otherBoards.map((e) => (
                                    <li
                                        key={`${e.categoryId}#${e.subcategoryKey}`}
                                    >
                                        <Link
                                            href={entryHref(gameSlug, e)}
                                            className={styles.quietLink}
                                        >
                                            {e.category} — {describeEntry(e)}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div>
                        <button
                            type="button"
                            className={styles.btnSecondary}
                            onClick={reset}
                        >
                            Pick someone else
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const users = searchResults?.users ?? [];
    const searched = debouncedQuery.length >= 2 && !isLoading;

    return (
        <div className={styles.step}>
            <div>
                <label htmlFor="submit-runner-search" className="form-label">
                    Runner
                </label>
                <input
                    id="submit-runner-search"
                    type="text"
                    className="form-control"
                    placeholder="Search for a runner…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                    disabled={resolving}
                />
                <p className={styles.hint}>
                    Search for the runner this time belongs to.
                </p>
            </div>

            {users.length > 0 && (
                <div className={styles.searchResults}>
                    {users.map((u) => (
                        <button
                            key={u.user}
                            type="button"
                            className={styles.searchResult}
                            onClick={() => resolve({ username: u.user })}
                            disabled={resolving}
                        >
                            {u.picture && (
                                <img
                                    src={u.picture}
                                    alt=""
                                    className={styles.searchAvatar}
                                />
                            )}
                            <span>{u.user}</span>
                        </button>
                    ))}
                </div>
            )}

            {searched && users.length === 0 && (
                <div className={styles.runnerCard}>
                    <p className={styles.runnerNote}>
                        No account found. Check the spelling — if they don’t
                        have one, the run is added under the name you confirm
                        below and won’t be linked to a therun account.
                    </p>
                    <div>
                        <label
                            htmlFor="submit-runner-name"
                            className="form-label"
                        >
                            Name to add the run under
                        </label>
                        <input
                            id="submit-runner-name"
                            type="text"
                            className="form-control"
                            value={typedName || query}
                            onChange={(e) => setTypedName(e.target.value)}
                            disabled={resolving}
                        />
                    </div>
                    <div>
                        <button
                            type="button"
                            className={styles.btnSecondary}
                            disabled={
                                resolving || (typedName || query).trim() === ''
                            }
                            onClick={() =>
                                resolve({
                                    guestName: (typedName || query).trim(),
                                })
                            }
                        >
                            Use this name
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className={styles.errorAlert} role="alert">
                    {error}
                </div>
            )}
        </div>
    );
}

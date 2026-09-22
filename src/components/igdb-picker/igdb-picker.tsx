'use client';

import { type ReactNode, useRef, useState, useTransition } from 'react';
import styles from './igdb-picker.module.scss';

export interface IgdbPickerRow {
    id: number;
    name: string;
    year?: number | null;
    /** Any IGDB image URL; the picker picks the size. */
    coverUrl?: string | null;
}

interface Props<Row extends IgdbPickerRow, Err extends { error: string }> {
    search: (query: string) => Promise<{ result: Row[] } | Err>;
    renderAction: (row: Row, busy: boolean) => ReactNode;
    /**
     * Called with the raw error result so a caller can react to its extras
     * (e.g. a `needsLogin` flag the search action attaches alongside the
     * message).
     */
    onError?: (res: Err) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    emptyHint?: ReactNode;
    footer?: (state: { searched: boolean }) => ReactNode;
    /** Shortest query the caller's search will accept. Defaults to 2. */
    minChars?: number;
}

/** Any IGDB image URL, rewritten to the given IGDB cover size. */
export function igdbImage(
    url: string,
    size: 'cover_small' | 'cover_big',
): string {
    const full = url.startsWith('//') ? `https:${url}` : url;
    return full.replace(/t_[a-z0-9_]+\//, `t_${size}/`);
}

export function IgdbPicker<
    Row extends IgdbPickerRow,
    Err extends { error: string } = { error: string },
>({
    search,
    renderAction,
    onError,
    disabled = false,
    autoFocus = false,
    emptyHint = 'No IGDB games found.',
    footer,
    minChars = 2,
}: Props<Row, Err>) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Row[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSearching, startSearching] = useTransition();
    const inFlight = useRef(false);

    const canSearch = query.trim().length >= minChars;

    const run = () => {
        if (!canSearch || inFlight.current) return;
        inFlight.current = true;
        startSearching(async () => {
            try {
                setError(null);
                const res = await search(query.trim());
                if ('error' in res) {
                    setError(res.error);
                    onError?.(res);
                    return;
                }
                setResults(res.result);
            } finally {
                inFlight.current = false;
            }
        });
    };

    const busy = disabled || isSearching;

    return (
        <div className={styles.picker}>
            <div className={styles.searchRow}>
                <input
                    className="form-control form-control-sm"
                    value={query}
                    autoFocus={autoFocus}
                    disabled={disabled}
                    maxLength={100}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            run();
                        }
                    }}
                    placeholder="Search IGDB by name"
                    aria-label="Search IGDB by name"
                />
                <button
                    type="button"
                    className={styles.action}
                    disabled={busy || !canSearch}
                    onClick={run}
                >
                    {isSearching ? 'Searching…' : 'Search'}
                </button>
            </div>
            {results && results.length === 0 && (
                <p className="text-muted small mb-0">{emptyHint}</p>
            )}
            {results && results.length > 0 && (
                <ul className={styles.rows}>
                    {results.map((row) => (
                        <li key={row.id} className={styles.row}>
                            {row.coverUrl ? (
                                <img
                                    src={igdbImage(row.coverUrl, 'cover_small')}
                                    alt=""
                                    width={36}
                                    height={48}
                                    className={styles.cover}
                                />
                            ) : (
                                <span className={styles.cover} aria-hidden />
                            )}
                            <span className={styles.name}>
                                {row.name}
                                {row.year != null && (
                                    <span className="text-muted">
                                        {' '}
                                        ({row.year})
                                    </span>
                                )}
                            </span>
                            <span className={styles.rowAction}>
                                {renderAction(row, busy)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {error && (
                <div role="alert" className={styles.error}>
                    {error}
                </div>
            )}
            {footer?.({ searched: results !== null })}
        </div>
    );
}

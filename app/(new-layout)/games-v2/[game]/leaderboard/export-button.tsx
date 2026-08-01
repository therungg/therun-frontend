'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'react-bootstrap-icons';
import type { LeaderboardQuery } from '~src/lib/leaderboards-v1';
import { exportLeaderboard } from '../actions/export-board.action';
import gamePageStyles from '../game-page.module.scss';
import mastheadStyles from '../header/masthead.module.scss';
import { usePopoverFocus } from '../shared/use-popover-focus';
import { buildLeaderboardCsv } from './export-csv';
import styles from './leaderboard.module.scss';

interface Props {
    /** Same filter state the pager fetches with — page/pageSize are ignored. */
    query: Omit<LeaderboardQuery, 'page'>;
    gameSlug: string;
    categorySlug: string;
    subcategoryKey: string;
    showMilliseconds: boolean;
}

type Format = 'csv' | 'json';

/**
 * "Export" popover on the board meta bar: downloads the entire board —
 * unpaginated, with the enrichment fields (variables, platform, origin,
 * verification timestamps, ...) the paginated endpoint doesn't carry —
 * as CSV or JSON, honoring the active filters.
 */
export function ExportButton({
    query,
    gameSlug,
    categorySlug,
    subcategoryKey,
    showMilliseconds,
}: Props) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState<Format | null>(null);
    const [note, setNote] = useState<'error' | 'truncated' | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const close = () => setOpen(false);
    usePopoverFocus({ open, onClose: close, panelRef });

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const download = (content: string, filename: string, mime: string) => {
        const url = URL.createObjectURL(new Blob([content], { type: mime }));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const runExport = async (format: Format) => {
        if (busy) return;
        setBusy(format);
        setNote(null);
        try {
            const { pageSize: _pageSize, ...rest } = query;
            const res = await exportLeaderboard(rest);
            if (!res) {
                setNote('error');
                return;
            }
            const slice = [gameSlug, categorySlug, subcategoryKey]
                .filter(Boolean)
                .join('-');
            const stamp = res.exportedAt.slice(0, 10);
            if (format === 'csv') {
                download(
                    buildLeaderboardCsv(res, showMilliseconds),
                    `${slice}-leaderboard-${stamp}.csv`,
                    'text/csv;charset=utf-8',
                );
            } else {
                download(
                    JSON.stringify(res, null, 2),
                    `${slice}-leaderboard-${stamp}.json`,
                    'application/json',
                );
            }
            if (res.truncated) {
                setNote('truncated');
            } else {
                close();
            }
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className={gamePageStyles.popoverRoot} ref={rootRef}>
            <button
                type="button"
                className={mastheadStyles.chip}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <Download size={13} aria-hidden />
                Export
            </button>
            {open && (
                <div
                    ref={panelRef}
                    className={gamePageStyles.popoverPanel}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Export leaderboard"
                >
                    <div className={styles.exportMenu}>
                        <button
                            type="button"
                            className={styles.findMeBtn}
                            disabled={busy !== null}
                            onClick={() => runExport('csv')}
                        >
                            {busy === 'csv' ? 'Exporting…' : 'Download CSV'}
                        </button>
                        <button
                            type="button"
                            className={styles.findMeBtn}
                            disabled={busy !== null}
                            onClick={() => runExport('json')}
                        >
                            {busy === 'json' ? 'Exporting…' : 'Download JSON'}
                        </button>
                        {note === 'error' && (
                            <span className={styles.exportNote}>
                                Export failed. Try again.
                            </span>
                        )}
                        {note === 'truncated' && (
                            <span className={styles.exportNote}>
                                Board is larger than the export limit — the file
                                holds the top of the board only.
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

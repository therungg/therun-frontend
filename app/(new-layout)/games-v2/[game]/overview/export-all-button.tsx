'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'react-bootstrap-icons';
import { exportLeaderboard } from '../actions/export-board.action';
import {
    type ExportableBoard,
    listExportableBoards,
} from '../actions/export-game.action';
import gamePageStyles from '../game-page.module.scss';
import mastheadStyles from '../header/masthead.module.scss';
import { buildGameCsv, type ExportedBoard } from '../leaderboard/export-csv';
import leaderboardStyles from '../leaderboard/leaderboard.module.scss';
import { usePopoverFocus } from '../shared/use-popover-focus';

interface Props {
    gameSlug: string;
}

type Format = 'csv' | 'json';

// One board at a time would take minutes on a game with a hundred level
// boards; all of them at once would fire a hundred full board scans in the
// same instant. Four keeps the download moving without hammering the API.
const CONCURRENCY = 4;

interface Progress {
    done: number;
    total: number;
}

/**
 * "Export all" on the game overview: every non-archived board of the game —
 * levels included — as one CSV or JSON.
 *
 * Fans out one request per board rather than asking the backend for the whole
 * game in one response: a board export is already capped at 10 000 rows and
 * sits near the response-size ceiling on its own, so a single game-wide
 * response would break on exactly the games this feature is for. Each board
 * is fetched combined across its subcategories, so nothing is left behind.
 */
export function ExportAllButton({ gameSlug }: Props) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState<Format | null>(null);
    const [progress, setProgress] = useState<Progress | null>(null);
    const [note, setNote] = useState<string | null>(null);
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

    // Boards resolve in list order regardless of which finished first, so the
    // file always reads in the moderator's own category order.
    const fetchAll = async (
        boards: ExportableBoard[],
    ): Promise<{ exported: ExportedBoard[]; failed: number }> => {
        const results: (ExportedBoard | null)[] = new Array(boards.length).fill(
            null,
        );
        let cursor = 0;
        let done = 0;

        const worker = async () => {
            while (cursor < boards.length) {
                const index = cursor++;
                const board = boards[index];
                const res = await exportLeaderboard({
                    gameSlug,
                    categorySlug: board.categorySlug,
                    timing: board.timing,
                    subcategoryValues: {},
                    combined: true,
                    varFilters: {},
                    verified: false,
                });
                if (res) {
                    results[index] = {
                        categoryDisplay: board.categoryDisplay,
                        categorySlug: board.categorySlug,
                        group: board.group,
                        isLevel: board.isLevel,
                        res,
                    };
                }
                done += 1;
                setProgress({ done, total: boards.length });
            }
        };

        await Promise.all(
            Array.from(
                { length: Math.min(CONCURRENCY, boards.length) },
                worker,
            ),
        );

        const exported = results.filter((r): r is ExportedBoard => r !== null);
        return { exported, failed: boards.length - exported.length };
    };

    const runExport = async (format: Format) => {
        if (busy) return;
        setBusy(format);
        setNote(null);
        setProgress(null);
        try {
            const boards = await listExportableBoards(gameSlug);
            if (!boards) {
                setNote('Export failed. Try again.');
                return;
            }
            if (boards.length === 0) {
                setNote('This game has no boards to export.');
                return;
            }
            setProgress({ done: 0, total: boards.length });
            const { exported, failed } = await fetchAll(boards);
            if (exported.length === 0) {
                setNote('Export failed. Try again.');
                return;
            }

            const stamp = new Date().toISOString().slice(0, 10);
            const name = `${gameSlug}-all-leaderboards-${stamp}`;
            if (format === 'csv') {
                download(
                    buildGameCsv(exported),
                    `${name}.csv`,
                    'text/csv;charset=utf-8',
                );
            } else {
                download(
                    JSON.stringify(
                        {
                            game: gameSlug,
                            exportedAt: new Date().toISOString(),
                            boards: exported.map((b) => ({
                                category: b.categoryDisplay,
                                categorySlug: b.categorySlug,
                                group: b.group,
                                isLevel: b.isLevel,
                                timing: b.res.timing,
                                totalItems: b.res.totalItems,
                                truncated: b.res.truncated,
                                entries: b.res.entries,
                            })),
                        },
                        null,
                        2,
                    ),
                    `${name}.json`,
                    'application/json',
                );
            }

            const truncated = exported.filter((b) => b.res.truncated).length;
            const problems = [
                failed > 0 &&
                    `${failed} ${failed === 1 ? 'board' : 'boards'} could not be exported`,
                truncated > 0 &&
                    `${truncated} ${truncated === 1 ? 'board was' : 'boards were'} larger than the export limit and hold their top rows only`,
            ].filter((s): s is string => typeof s === 'string');
            if (problems.length > 0) {
                setNote(`${problems.join('; ')}.`);
            } else {
                close();
            }
        } finally {
            setBusy(null);
            setProgress(null);
        }
    };

    const label = (format: Format, idle: string) => {
        if (busy !== format) return idle;
        if (!progress) return 'Collecting boards…';
        return `Exporting ${progress.done} / ${progress.total} boards…`;
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
                Export all
            </button>
            {open && (
                <div
                    ref={panelRef}
                    className={gamePageStyles.popoverPanel}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Export every leaderboard of this game"
                >
                    <div className={leaderboardStyles.exportMenu}>
                        <button
                            type="button"
                            className={leaderboardStyles.findMeBtn}
                            disabled={busy !== null}
                            onClick={() => runExport('csv')}
                        >
                            {label('csv', 'Download CSV')}
                        </button>
                        <button
                            type="button"
                            className={leaderboardStyles.findMeBtn}
                            disabled={busy !== null}
                            onClick={() => runExport('json')}
                        >
                            {label('json', 'Download JSON')}
                        </button>
                        <span className={leaderboardStyles.exportNote}>
                            Every board of this game, levels included, in one
                            file.
                        </span>
                        {note && (
                            <span className={leaderboardStyles.exportNote}>
                                {note}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

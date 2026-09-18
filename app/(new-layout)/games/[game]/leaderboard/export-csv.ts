import { getFormattedString } from '~src/components/util/datetime';
import type {
    LeaderboardExportEntry,
    LeaderboardExportResponse,
} from '../../../../../types/leaderboards.types';

// Base columns in spreadsheet-friendly order; per-run variables append as
// one `variable:<key>` column per key found anywhere on the board.
const BASE_COLUMNS: {
    header: string;
    value: (
        e: LeaderboardExportEntry,
        fmt: (ms: number | null) => string,
    ) => unknown;
}[] = [
    { header: 'rank', value: (e) => e.rank },
    { header: 'runner', value: (e) => e.runnerName },
    { header: 'country', value: (e) => e.country },
    { header: 'time', value: (e, fmt) => fmt(e.time) },
    { header: 'time_ms', value: (e) => e.time },
    { header: 'real_time', value: (e, fmt) => fmt(e.realTime) },
    { header: 'real_time_ms', value: (e) => e.realTime },
    { header: 'game_time', value: (e, fmt) => fmt(e.gameTime) },
    { header: 'game_time_ms', value: (e) => e.gameTime },
    { header: 'run_date', value: (e) => e.runDate },
    { header: 'verification_status', value: (e) => e.verificationStatus },
    { header: 'verified_at', value: (e) => e.verifiedAt },
    { header: 'vod_url', value: (e) => e.vodUrl },
    { header: 'source', value: (e) => e.source ?? 'run' },
    { header: 'origin', value: (e) => e.origin },
    { header: 'subcategory_key', value: (e) => e.subcategoryKey },
    { header: 'platform', value: (e) => e.platform },
    { header: 'emulator', value: (e) => e.emulator },
    { header: 'speedrun_run_id', value: (e) => e.speedrunRunId },
    { header: 'ingested_at', value: (e) => e.ingestedAt },
    { header: 'run_id', value: (e) => e.runId },
    { header: 'manual_time_id', value: (e) => e.manualTimeId },
    { header: 'user_id', value: (e) => e.userId },
    { header: 'is_guest', value: (e) => e.isGuest },
];

const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const s = String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

type TimeFormatter = (ms: number | null) => string;

const makeFormatter =
    (showMilliseconds: boolean): TimeFormatter =>
    (ms) =>
        ms === null
            ? ''
            : getFormattedString(String(ms), showMilliseconds, false, false);

export function buildLeaderboardCsv(
    res: LeaderboardExportResponse,
    showMilliseconds: boolean,
): string {
    const fmt = makeFormatter(showMilliseconds);

    const variableKeys = [
        ...new Set(res.entries.flatMap((e) => Object.keys(e.variables ?? {}))),
    ].sort();

    const header = [
        ...BASE_COLUMNS.map((c) => c.header),
        ...variableKeys.map((k) => `variable:${k}`),
    ];
    const rows = res.entries.map((e) => [
        ...BASE_COLUMNS.map((c) => escapeCell(c.value(e, fmt))),
        ...variableKeys.map((k) => escapeCell(e.variables?.[k])),
    ]);
    return [header.map(escapeCell), ...rows].map((r) => r.join(',')).join('\n');
}

/** One board's export, tagged with the board it came from. */
export interface ExportedBoard {
    categoryDisplay: string;
    categorySlug: string;
    group: string | null;
    isLevel: boolean;
    res: LeaderboardExportResponse;
}

// Which board a row belongs to, ahead of the row's own columns — a whole-game
// file is one sheet holding every board, so the board has to be a column.
const BOARD_COLUMNS: {
    header: string;
    value: (b: ExportedBoard) => unknown;
}[] = [
    { header: 'category', value: (b) => b.categoryDisplay },
    { header: 'category_slug', value: (b) => b.categorySlug },
    { header: 'group', value: (b) => b.group },
    { header: 'is_level', value: (b) => b.isLevel },
];

/**
 * Every board of a game as one CSV. Variable columns are the union across all
 * boards, so a variable only one category has still gets a column (empty
 * elsewhere) rather than shifting the row shape halfway down the file.
 *
 * Milliseconds are always written: a board's showMilliseconds is a display
 * choice per category, and a single file cannot honour several at once
 * without silently rounding some boards' times.
 */
export function buildGameCsv(boards: ExportedBoard[]): string {
    const fmt = makeFormatter(true);

    const variableKeys = [
        ...new Set(
            boards.flatMap((b) =>
                b.res.entries.flatMap((e) => Object.keys(e.variables ?? {})),
            ),
        ),
    ].sort();

    const header = [
        ...BOARD_COLUMNS.map((c) => c.header),
        ...BASE_COLUMNS.map((c) => c.header),
        ...variableKeys.map((k) => `variable:${k}`),
    ];
    const rows = boards.flatMap((board) =>
        board.res.entries.map((e) => [
            ...BOARD_COLUMNS.map((c) => escapeCell(c.value(board))),
            ...BASE_COLUMNS.map((c) => escapeCell(c.value(e, fmt))),
            ...variableKeys.map((k) => escapeCell(e.variables?.[k])),
        ]),
    );
    return [header.map(escapeCell), ...rows].map((r) => r.join(',')).join('\n');
}

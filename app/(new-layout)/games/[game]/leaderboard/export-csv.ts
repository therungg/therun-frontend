import { getFormattedString } from '~src/components/util/datetime';
import { millisecondsFor, millisecondsKey } from '~src/lib/milliseconds-mode';
import type {
    LeaderboardExportEntry,
    LeaderboardExportResponse,
    MillisecondsMode,
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

// Appended after every existing column, variable columns included — a board
// with per-run variables must not shift `runners` in ahead of them, or every
// variable column moves and an already-open spreadsheet's mapping breaks.
// `participants` is the whole roster in filing order; absent means solo, so
// a plain run still gets exactly the one name it always did.
const RUNNERS_COLUMN: {
    header: string;
    value: (e: LeaderboardExportEntry) => unknown;
} = {
    header: 'runners',
    value: (e) =>
        e.participants?.length
            ? e.participants.map((p) => p.name).join('; ')
            : e.runnerName,
};

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

/**
 * One board's export, written the way the board reads.
 *
 * The whole board is in hand here rather than one page of it, so the tie
 * setting is answered against every row of the file — a time whose second is
 * shared only by a run on page 9 still prints its decimals.
 */
export function buildLeaderboardCsv(
    res: LeaderboardExportResponse,
    mode: MillisecondsMode,
): string {
    const millisRows = millisecondsFor(res.entries, mode, (e) =>
        res.timing === 'gt' ? (e.gameTime ?? e.realTime) : e.realTime,
    );

    const variableKeys = [
        ...new Set(res.entries.flatMap((e) => Object.keys(e.variables ?? {}))),
    ].sort();

    const header = [
        ...BASE_COLUMNS.map((c) => c.header),
        ...variableKeys.map((k) => `variable:${k}`),
        RUNNERS_COLUMN.header,
    ];
    const rows = res.entries.map((e, i) => {
        const fmt = makeFormatter(millisRows.has(millisecondsKey(e, i)));
        return [
            ...BASE_COLUMNS.map((c) => escapeCell(c.value(e, fmt))),
            ...variableKeys.map((k) => escapeCell(e.variables?.[k])),
            escapeCell(RUNNERS_COLUMN.value(e)),
        ];
    });
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
 * Milliseconds are always written: precision is a display choice per
 * category, and a single file cannot honour several at once without silently
 * rounding some boards' times.
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
        RUNNERS_COLUMN.header,
    ];
    const rows = boards.flatMap((board) =>
        board.res.entries.map((e) => [
            ...BOARD_COLUMNS.map((c) => escapeCell(c.value(board))),
            ...BASE_COLUMNS.map((c) => escapeCell(c.value(e, fmt))),
            ...variableKeys.map((k) => escapeCell(e.variables?.[k])),
            escapeCell(RUNNERS_COLUMN.value(e)),
        ]),
    );
    return [header.map(escapeCell), ...rows].map((r) => r.join(',')).join('\n');
}

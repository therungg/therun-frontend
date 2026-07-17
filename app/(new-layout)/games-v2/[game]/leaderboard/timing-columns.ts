// Single source of truth for RT/GT column order on the leaderboard table.
// Both the header (leaderboard-table.tsx) and the row cells
// (leaderboard-row.tsx) derive their order from here so they can never
// drift out of sync with each other or with `category.primaryTiming`.

export type TimingKey = 'rt' | 'gt';

export interface TimingColumn {
    key: TimingKey;
    label: string;
}

const REAL_TIME: TimingColumn = { key: 'rt', label: 'Real time' };
const GAME_TIME: TimingColumn = { key: 'gt', label: 'Game time' };

/** Primary-timing-first column order: the ranking column always leads. */
export function timingColumns(primaryTiming: TimingKey): {
    primary: TimingColumn;
    secondary: TimingColumn;
} {
    return primaryTiming === 'gt'
        ? { primary: GAME_TIME, secondary: REAL_TIME }
        : { primary: REAL_TIME, secondary: GAME_TIME };
}

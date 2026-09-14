import type { Run } from '~src/common/types';
import { safeEncodeURI } from '~src/utils/uri';
import { categoryOf } from '../ranks';

export interface SessionRow {
    key: string;
    game: string;
    category: string;
    href: string;
    startedAt: string;
    endedAt: string;
    attempts: number;
    finished: number[];
}

const SHOWN = 30;

/** The latest sessions across every run, newest first. */
export function toSessionRows(runs: Run[]): SessionRow[] {
    const rows: SessionRow[] = [];
    for (const run of runs) {
        const game = run.game.split('#')[0];
        for (const s of run.sessions ?? []) {
            rows.push({
                key: `${run.game}|${run.run}|${s.startedAt}`,
                game,
                category: categoryOf(run),
                href: `/${run.url
                    .split('/')
                    .map((p) => safeEncodeURI(p))
                    .join('/')}`,
                startedAt: s.startedAt,
                endedAt: s.endedAt,
                finished: s.finishedRuns
                    .map((t) => Number.parseInt(t, 10))
                    .filter((t) => Number.isFinite(t) && t > 0),
                attempts: Math.max(
                    0,
                    s.runIds.last - s.runIds.first + 1,
                    s.finishedRuns.length,
                ),
            });
        }
    }
    return rows
        .sort((a, b) => (a.endedAt > b.endedAt ? -1 : 1))
        .slice(0, SHOWN);
}

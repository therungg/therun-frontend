import { getFormattedString } from '~src/components/util/datetime';
import type { VideoRule, WaitingRun } from '../../../types/pb-submission.types';

/** The board's video rule in a few words, as the runner needs to read it. */
export function videoRuleText(rule: VideoRule): string {
    switch (rule.require) {
        case 'top_n':
            return `This board requires a video for the top ${rule.topN ?? 0}.`;
        case 'under_time':
            return `This board requires a video for runs under ${getFormattedString(String(rule.timeMs ?? 0))}.`;
        case 'everything':
            return 'This board requires a video for every run.';
        default:
            return 'This board requires a video for this run.';
    }
}

/** "Any% · No Major Glitches", or the category alone. */
export function boardName(run: WaitingRun): string {
    const category = run.categoryDisplay ?? 'Unknown category';
    const parts = run.subcategoryKey
        .split('|')
        .map((p) => p.slice(p.indexOf('=') + 1))
        .filter(Boolean);
    return parts.length > 0 ? `${category} · ${parts.join(', ')}` : category;
}

/** "2 runs need a video · 1 run needs submitting", skipping empty halves. */
export function summaryText(runs: WaitingRun[]): string {
    const video = runs.filter((r) => r.kind === 'video').length;
    const submit = runs.length - video;
    return [
        video > 0
            ? `${video} ${video === 1 ? 'run needs' : 'runs need'} a video`
            : null,
        submit > 0
            ? `${submit} ${submit === 1 ? 'run needs' : 'runs need'} submitting`
            : null,
    ]
        .filter(Boolean)
        .join(' · ');
}

export function submissionsHref(username: string, runId?: number): string {
    const base = `/${encodeURIComponent(username)}/submissions`;
    return runId === undefined ? base : `${base}?run=${runId}`;
}

/** Same board: category plus subcategory. */
export function sameBoard(
    run: Pick<WaitingRun, 'gameId' | 'categoryId' | 'subcategoryKey'>,
    other: { gameId: number; categoryId: number; subcategoryKey: string },
): boolean {
    return (
        run.gameId === other.gameId &&
        run.categoryId === other.categoryId &&
        run.subcategoryKey === other.subcategoryKey
    );
}

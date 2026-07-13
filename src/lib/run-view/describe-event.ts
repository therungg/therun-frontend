import type { HistoryEvent } from '../../../types/moderation.types';

export function describeEvent(e: HistoryEvent): string {
    if (e.type === 'verdict') {
        if (e.action.includes('unreject')) return 'Run reinstated';
        if (e.action.includes('reject')) return 'Run rejected';
        if (e.action.includes('verif')) return 'Run verified';
        return 'Verdict applied';
    }
    if (e.type === 'manual_time') return 'Leaderboard time adjusted';
    if (e.type === 'exclusion') return 'Run excluded';
    if (e.type === 'report') return 'Run reported';
    if (e.type === 'appeal') return 'Appeal opened';
    return e.action || 'Event';
}

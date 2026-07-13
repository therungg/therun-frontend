import type { RunOrigin } from '../../../types/leaderboards.types';

export interface OriginSummary {
    line: string;
    showSplitsLink: boolean;
}

// Public one-line answer to "how did this entry get on the board".
// Returns null when the backend didn't send an origin (older API) — panel hides.
export function originSummary(
    origin: RunOrigin | null | undefined,
    runnerName: string,
): OriginSummary | null {
    if (!origin?.path) return null;
    switch (origin.path) {
        case 'timer':
            return {
                line: 'Auto-tracked from a LiveSplit upload',
                showSplitsLink: true,
            };
        case 'guest_submit':
        case 'submission':
            return {
                line: origin.submittedBy
                    ? `Submitted on behalf of ${runnerName} by ${origin.submittedBy.name}`
                    : `Submitted by ${runnerName}`,
                showSplitsLink: false,
            };
        case 'manual_self':
            return {
                line: 'Self-claimed by the runner',
                showSplitsLink: false,
            };
        case 'manual_mod':
            return {
                line: 'Time asserted by a moderator',
                showSplitsLink: false,
            };
    }
}

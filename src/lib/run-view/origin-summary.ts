import type { RunOrigin } from '../../../types/leaderboards.types';

export interface OriginSummary {
    line: string;
    showSplitsLink: boolean;
    ccLicence?: boolean;
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
                line:
                    origin.submittedBy &&
                    origin.submittedBy.name.toLowerCase() !==
                        runnerName.toLowerCase()
                        ? `Submitted on behalf of ${runnerName} by ${origin.submittedBy.name}`
                        : `Submitted by ${runnerName}`,
                showSplitsLink: false,
            };
        case 'src_import':
            if (origin.srcProvenance === 'export') {
                return {
                    line: 'First posted on speedrun.com',
                    showSplitsLink: false,
                };
            }
            return {
                line:
                    origin.srcProvenance === 'archive'
                        ? 'From the speedrun.com archive'
                        : 'From speedrun.com',
                showSplitsLink: false,
                ccLicence: true,
            };
    }
}

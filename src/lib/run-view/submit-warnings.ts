import type { SubmitWarning } from '../../../types/leaderboards.types';

export function describeSubmitWarning(
    w: SubmitWarning,
    variableDisplayNames: Record<string, string>,
): string | null {
    const name = variableDisplayNames[w.nameNormalized] ?? w.nameNormalized;
    switch (w.reason) {
        case 'no_match_default_used':
            return `"${w.submitted}" isn't a recognized value for ${name}. Your run was placed on the default board (${name}: ${w.resolved}).`;
        case 'missing_default_used':
            return null;
        case 'no_match_filter_dropped':
            return `Filter ${name}: "${w.submitted}" was ignored.`;
        case 'combination_invalid_default_used':
            return `The combination you submitted isn't an active leaderboard for this game. Your run was placed on the default board.`;
    }
}

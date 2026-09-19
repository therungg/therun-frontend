// Sentence-cased copy for moderation history rows. `ModActionRow.action`
// (types/moderation.types.ts) is a raw backend log string with no enum
// contract — the mod-actions endpoint documents only 'exclude_run' /
// 'include_run' / 'exclude_via_rule' / 'delete_exclusion_rule', but the
// underlying `logs` table also carries verdict actions ('verify' /
// 'reject' / 'unreject') and is free-text beyond that. Known values get a
// specific sentence; anything else falls back to a humanized version of the
// raw string so a moderator never sees a bare snake_case code inline — the
// code itself stays available via a `title` attribute on the caller's
// element for auditability.

import { splitHumanizedWords } from '../../../labels';

const KNOWN_ACTIONS: Record<string, string> = {
    exclude_run: 'Excluded this run from the leaderboard',
    include_run: 'Restored this run to the leaderboard',
    exclude_via_rule: 'Excluded via a ban rule',
    delete_exclusion_rule: 'Removed a ban rule',
    verify: 'Verified this run',
    reject: 'Rejected this run',
    unreject: 'Restored a rejected run',
    merge_category: 'Merged one board into another',
};

/**
 * The specifics of a row, when the verb has any worth reading and the log
 * carried them. Separate from `historyActionLabel` on purpose: that one also
 * builds the action filter's buckets, so it has to stay the same sentence
 * for every row of a verb.
 *
 * `data` is typed `unknown` on the wire and is written by the backend, so
 * every field is checked rather than assumed.
 */
export function historyActionDetail(
    action: string,
    data: unknown,
): string | null {
    if (action !== 'merge_category') return null;
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Record<string, unknown>;
    const from = typeof d.sourceDisplay === 'string' ? d.sourceDisplay : null;
    const to = typeof d.targetDisplay === 'string' ? d.targetDisplay : null;
    if (!from || !to) return null;
    const runs = typeof d.runsMoved === 'number' ? d.runsMoved : null;
    const moved =
        runs === null
            ? ''
            : runs === 1
              ? ', 1 run moved'
              : `, ${runs.toLocaleString()} runs moved`;
    return `${from} into ${to}${moved}`;
}

/**
 * Sentence-cases a raw snake_case/kebab-case action code as a last resort —
 * shares its word-splitting with `humanizeWord` (labels.ts's title-case
 * primitive) via `splitHumanizedWords`, but caps only the first letter of
 * the whole string (sentence case, this project's copy convention for log
 * lines) rather than every word.
 */
function humanizeAction(raw: string): string {
    const spaced = splitHumanizedWords(raw);
    if (!spaced) return 'Unknown action';
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function historyActionLabel(action: string): string {
    if (!action) return 'Unknown action';
    return KNOWN_ACTIONS[action] ?? humanizeAction(action);
}

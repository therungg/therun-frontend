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

const KNOWN_ACTIONS: Record<string, string> = {
    exclude_run: 'Excluded this run from the leaderboard',
    include_run: 'Restored this run to the leaderboard',
    exclude_via_rule: 'Excluded via a ban rule',
    delete_exclusion_rule: 'Removed a ban rule',
    verify: 'Verified this run',
    reject: 'Rejected this run',
    unreject: 'Restored a rejected run',
};

/** Title-cases a raw snake_case/kebab-case action code as a last resort. */
function humanizeAction(raw: string): string {
    const spaced = raw.replace(/[_-]+/g, ' ').trim();
    if (!spaced) return 'Unknown action';
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function historyActionLabel(action: string): string {
    if (!action) return 'Unknown action';
    return KNOWN_ACTIONS[action] ?? humanizeAction(action);
}

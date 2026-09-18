// Client-side convenience buckets over the log's `action` strings, for the
// secondary filter pills on the Moderation view. The backend's mod-log
// endpoint only supports `categoryId`/`targetUserId`/`days` query params —
// there is no server-side action-group filter — so this only narrows the
// window of entries already loaded on the page, same as the board's own
// "includes runs awaiting verification" note derives from the loaded window
// rather than a true server-side count.
export type ActionGroup =
    | 'all'
    | 'verdicts'
    | 'removals'
    | 'bans'
    | 'time'
    | 'moves';

export const ACTION_GROUPS: { key: ActionGroup; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'verdicts', label: 'Verdicts' },
    { key: 'removals', label: 'Removals' },
    { key: 'bans', label: 'Bans' },
    { key: 'time', label: 'Time' },
    { key: 'moves', label: 'Moves' },
];

const GROUP_BY_ACTION: Record<string, ActionGroup> = {
    verdict_verify: 'verdicts',
    verdict_reject: 'verdicts',
    verdict_unreject: 'verdicts',
    verdict_unverify: 'verdicts',
    manual_time_verdict_verify: 'verdicts',
    manual_time_verdict_reject: 'verdicts',

    exclude_run: 'removals',
    include_run: 'removals',

    exclude_via_rule: 'bans',
    delete_exclusion_rule: 'bans',
    ban: 'bans',
    unban: 'bans',
    lift_ban: 'bans',

    board_override_set: 'time',
    board_override_clear: 'time',
    manual_time_create: 'time',
    manual_time_update: 'time',
    manual_time_delete: 'time',

    move_run: 'moves',
};

/** `'all'` never matches a real action — callers treat it as "no filter". */
export function actionGroupOf(action: string): ActionGroup | null {
    return GROUP_BY_ACTION[action] ?? null;
}

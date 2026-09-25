export type ModActionFamily =
    | 'verdicts'
    | 'runs'
    | 'exclusions'
    | 'bans'
    | 'manual_times'
    | 'board'
    | 'config'
    | 'variables'
    | 'roles'
    | 'privacy'
    | 'other';

export const MOD_ACTION_FAMILIES: ModActionFamily[] = [
    'verdicts',
    'runs',
    'exclusions',
    'bans',
    'manual_times',
    'board',
    'config',
    'variables',
    'roles',
    'privacy',
    'other',
];

export interface AdminModAction {
    source: 'logs' | 'audit';
    id: number;
    /** ISO UTC with microseconds, e.g. 2026-09-24T10:11:12.123456Z */
    at: string;
    family: ModActionFamily;
    action: string;
    actor: { id: number; username: string | null };
    game: { id: number; name: string; display: string } | null;
    categoryId: number | null;
    entity: string;
    target: string | null;
    subject: {
        userId?: number | null;
        username?: string | null;
        guestName?: string | null;
    } | null;
    reason: string | null;
    detail: unknown;
}

export interface AdminModActionsPage {
    items: AdminModAction[];
    nextCursor: string | null;
}

import type {
    AdminModActionsPage,
    ModActionFamily,
} from '../../types/admin-mod-actions.types';
import { meFetch } from './moderation/mod-fetch';

export interface AdminModActionsFilter {
    types: ModActionFamily[];
    gameId?: number;
    actorId?: number;
    before?: string;
}

// Not cached: an audit page has to show the action that happened a second ago.
export async function getAdminModActions(
    sessionId: string,
    f: AdminModActionsFilter,
): Promise<AdminModActionsPage> {
    return meFetch('/admin/mod-actions', {
        sessionId,
        query: {
            types: f.types.length > 0 ? f.types.join(',') : undefined,
            gameId: f.gameId,
            actorId: f.actorId,
            before: f.before,
            limit: 50,
        },
    });
}

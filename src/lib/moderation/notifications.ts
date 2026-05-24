import type {
    MarkAllReadResult,
    NotificationFilter,
    NotificationRow,
} from '../../../types/moderation.types';
import { meFetch } from './mod-fetch';

export function listNotifications(
    sessionId: string,
    filter?: NotificationFilter,
): Promise<NotificationRow[]> {
    return meFetch('/v1/me/notifications', {
        sessionId,
        query: {
            unreadOnly: filter?.unreadOnly ? 'true' : undefined,
            limit: filter?.limit,
            offset: filter?.offset,
        },
    });
}

export function markNotificationRead(
    sessionId: string,
    id: number,
): Promise<{ read: true }> {
    return meFetch(`/v1/me/notifications/${id}/read`, {
        sessionId,
        method: 'POST',
    });
}

export function markAllNotificationsRead(
    sessionId: string,
): Promise<MarkAllReadResult> {
    return meFetch('/v1/me/notifications/read-all', {
        sessionId,
        method: 'POST',
    });
}

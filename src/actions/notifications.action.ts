'use server';

import { getSession } from '~src/actions/session.action';
import {
    listNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from '~src/lib/moderation/notifications';
import type { NotificationRow } from '../../types/moderation.types';

/** Recent notifications for the signed-in user. Returns [] when signed out or on error. */
export async function loadNotificationsAction(): Promise<NotificationRow[]> {
    const session = await getSession();
    if (!session?.username || !session.id) return [];
    try {
        return await listNotifications(session.id, { limit: 30 });
    } catch {
        return [];
    }
}

export async function readNotificationAction(
    id: number,
): Promise<{ ok: boolean }> {
    const session = await getSession();
    if (!session?.id) return { ok: false };
    try {
        await markNotificationRead(session.id, id);
        return { ok: true };
    } catch {
        return { ok: false };
    }
}

export async function readAllNotificationsAction(): Promise<{
    ok: boolean;
    read: number;
}> {
    const session = await getSession();
    if (!session?.id) return { ok: false, read: 0 };
    try {
        const r = await markAllNotificationsRead(session.id);
        return { ok: true, read: r.read };
    } catch {
        return { ok: false, read: 0 };
    }
}

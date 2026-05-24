'use client';

import moment from 'moment';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    loadNotificationsAction,
    readAllNotificationsAction,
    readNotificationAction,
} from '~src/actions/notifications.action';
import type { NotificationRow } from '../../../types/moderation.types';

function describe(n: NotificationRow): string {
    const p = (n.payload ?? {}) as Record<string, unknown>;
    switch (n.type) {
        case 'manual_time_created':
            return 'A moderator set a leaderboard time for you.';
        case 'manual_time_verdict':
            return p.verdict === 'verified'
                ? 'Your claimed time was verified.'
                : 'Your claimed time was rejected.';
        case 'manual_time_deleted':
            return 'A moderator removed a leaderboard time set for you.';
        case 'verdict_applied':
            if (p.action === 'verify')
                return 'One of your runs was verified by a moderator.';
            if (p.action === 'reject')
                return 'One of your runs was rejected by a moderator.';
            if (p.action === 'unreject')
                return 'One of your runs was reinstated by a moderator.';
            return 'A moderator updated one of your runs.';
        default:
            return 'You have a new notification.';
    }
}

export function NotificationsBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationRow[]>([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        const rows = await loadNotificationsAction();
        setItems(rows);
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 60_000);
        return () => clearInterval(t);
    }, [refresh]);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    const unread = items.filter((n) => !n.readAt).length;

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if (next) refresh();
    };

    const handleRead = (n: NotificationRow) => {
        if (n.readAt) return;
        setItems((prev) =>
            prev.map((x) =>
                x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x,
            ),
        );
        void readNotificationAction(n.id);
    };

    const handleReadAll = () => {
        setItems((prev) =>
            prev.map((x) => ({
                ...x,
                readAt: x.readAt ?? new Date().toISOString(),
            })),
        );
        void readAllNotificationsAction();
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                type="button"
                className="btn btn-sm btn-link position-relative p-1 text-decoration-none"
                aria-label="Notifications"
                onClick={toggle}
            >
                <span aria-hidden>🔔</span>
                {unread > 0 && (
                    <span
                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger"
                        style={{ fontSize: '0.6rem' }}
                    >
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>
            {open && (
                <div
                    className="card shadow"
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        width: 340,
                        maxHeight: 420,
                        overflowY: 'auto',
                        zIndex: 1050,
                    }}
                >
                    <div className="card-header d-flex justify-content-between align-items-center py-2">
                        <strong className="small">Notifications</strong>
                        {unread > 0 && (
                            <button
                                type="button"
                                className="btn btn-sm btn-link p-0"
                                onClick={handleReadAll}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                    <ul className="list-group list-group-flush">
                        {loading && items.length === 0 && (
                            <li className="list-group-item text-muted small">
                                Loading…
                            </li>
                        )}
                        {!loading && items.length === 0 && (
                            <li className="list-group-item text-muted small">
                                No notifications.
                            </li>
                        )}
                        {items.map((n) => (
                            <li
                                key={n.id}
                                className={`list-group-item small ${n.readAt ? '' : 'bg-light-subtle'}`}
                                style={{
                                    cursor: n.readAt ? 'default' : 'pointer',
                                }}
                                onClick={() => handleRead(n)}
                            >
                                <div className="d-flex gap-2">
                                    {!n.readAt && (
                                        <span
                                            className="text-primary"
                                            aria-hidden
                                        >
                                            ●
                                        </span>
                                    )}
                                    <div className="flex-grow-1">
                                        <div>{describe(n)}</div>
                                        <small className="text-muted">
                                            {moment(n.createdAt).fromNow()}
                                        </small>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

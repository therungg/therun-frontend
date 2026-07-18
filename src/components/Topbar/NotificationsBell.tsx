'use client';

import moment from 'moment';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    loadNotificationsAction,
    readAllNotificationsAction,
    readNotificationAction,
} from '~src/actions/notifications.action';
import Link from '~src/components/link';
import type { NotificationRow } from '../../../types/moderation.types';
import { describe, linkFor } from './notification-copy';

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
        // Skip polling in background tabs — forgotten tabs and OBS sources
        // were polling the backend around the clock.
        const t = setInterval(() => {
            if (!document.hidden) refresh();
        }, 60_000);
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
                        {items.map((n) => {
                            const href = linkFor(n);
                            const content = (
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
                            );
                            return (
                                <li
                                    key={n.id}
                                    className={`list-group-item small ${n.readAt ? '' : 'bg-light-subtle'}`}
                                    style={{
                                        cursor:
                                            href || !n.readAt
                                                ? 'pointer'
                                                : 'default',
                                    }}
                                >
                                    {href ? (
                                        <Link
                                            href={href}
                                            className="d-block text-reset text-decoration-none"
                                            onClick={() => handleRead(n)}
                                        >
                                            {content}
                                        </Link>
                                    ) : (
                                        <div onClick={() => handleRead(n)}>
                                            {content}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

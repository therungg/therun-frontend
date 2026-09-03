'use client';

import { useState, useTransition } from 'react';
import type { SrcResyncKind } from '~src/lib/src-import';
import { resyncAction } from '../src-import/src-import-actions';
import styles from './board-overview.module.scss';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Hours-and-minutes until the daily gate lifts, e.g. "in 7h" / "in 43m". */
function untilLabel(readyAt: number, now: number): string {
    const ms = readyAt - now;
    if (ms <= 0) return '';
    const hours = Math.floor(ms / (60 * 60 * 1000));
    if (hours >= 1) return `in ${hours}h`;
    return `in ${Math.max(1, Math.floor(ms / (60 * 1000)))}m`;
}

interface Props {
    gameId: number;
    gameSlug: string;
    /** Which resync kind this button triggers — 'settings' (config-only) or
     * 'resync' (runs of therun runners). Each is gated independently. */
    kind: SrcResyncKind;
    /** Button label shown when idle. */
    label: string;
    /** createdAt of the board's latest job, when that job is of this same
     * kind — drives the 24h gate client-side. Null when the board's latest
     * job is a different kind (or there's never been one): the gate only
     * applies when the latest job matches this button's kind, otherwise the
     * button stays enabled and a backend 429 is the real gate (rendered
     * inline via `res.error`). */
    lastJobCreatedAt: string | null;
    /** Whether an import job is currently running — disables re-sync. */
    running: boolean;
    /** Global admins bypass the once-per-day cooldown (the backend enforces the
     * same rule), so the button never disables on the timer for them. */
    bypassCooldown?: boolean;
    /** Fired after a resync is accepted, so the pane can jump to the import
     * view and watch progress. */
    onStarted: () => void;
}

/**
 * One-click resync of a single kind (settings-only or runs). Auto-applies;
 * gated to once per day per game per kind. The gate is shown from the last
 * job's timestamp and enforced by the backend — a rejection still surfaces as
 * an inline error.
 */
export function ResyncButton({
    gameId,
    gameSlug,
    kind,
    label,
    lastJobCreatedAt,
    running,
    bypassCooldown = false,
    onStarted,
}: Props) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const now = Date.now();
    const readyAt = lastJobCreatedAt
        ? new Date(lastJobCreatedAt).getTime() + DAY_MS
        : 0;
    const throttled = !bypassCooldown && readyAt > now;

    const disabled = pending || running || throttled;

    const onClick = () => {
        setError(null);
        startTransition(async () => {
            const res = await resyncAction({ gameId, gameSlug, kind });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            onStarted();
        });
    };

    return (
        <>
            <button
                type="button"
                className={styles.railBtn}
                onClick={onClick}
                disabled={disabled}
            >
                {pending ? 'Starting…' : running ? 'Import running…' : label}
            </button>
            {throttled && !error && (
                <p className={styles.railHint}>
                    Next sync available {untilLabel(readyAt, now)}
                </p>
            )}
            {error && <p className={styles.railErr}>{error}</p>}
        </>
    );
}

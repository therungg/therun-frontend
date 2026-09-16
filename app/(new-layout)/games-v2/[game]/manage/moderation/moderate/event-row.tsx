'use client';

import { useTransition } from 'react';
import { toast } from 'react-toastify';
import type { HistoryEvent } from '../../../../../../../types/moderation.types';
import {
    historyUndoPlan,
    historyUndoReason,
} from '../../../leaderboard/history-undo';
import { excludeAction } from '../shared/actions/exclude.action';
import { markRunsAction } from '../shared/actions/marks.action';
import { restoreRunsAction } from '../shared/actions/restore.action';
import { applyVerdictsAction } from '../shared/actions/verdicts.action';
import styles from './moderate-panel.module.scss';

export interface EventRowProps {
    event: HistoryEvent;
    isLatest: boolean;
    gameSlug: string;
    runId: number;
    onUndone: () => void;
    /** Public run page passes false: no Undo, no private note. */
    canAct: boolean;
}

/** Logged actions in the verb names moderators click. Unknown actions show raw. */
const EVENT_VERB: Record<string, string> = {
    verdict_verify: 'Approve',
    'bulk-verify': 'Approve',
    verdict_reject: 'Decline',
    'bulk-reject': 'Decline',
    self_reject_run: 'Decline',
    exclude_run: 'Remove',
    bulk_exclude: 'Remove',
    exclude_via_rule: 'Remove',
    include_run: 'Restore',
    bulk_include: 'Restore',
    verdict_unreject: 'Restore',
    self_unreject_run: 'Restore',
    verdict_unverify: 'Send back',
    mark_run: 'Mark',
    unmark_run: 'Unmark',
    create_manual_time: 'Set time',
    update_manual_time: 'Set time',
    self_create_manual_time: 'Set time',
    manual_time_verify: 'Approve',
    manual_time_reject: 'Decline',
    delete_manual_time: 'Remove',
    self_delete_manual_time: 'Remove',
    move_run: 'Move',
    self_move_run: 'Move',
    board_override_set: 'Move',
    board_override_clear: 'Move',
    anonymize: 'Hide identity',
    request_video: 'Ask for video',
    video_added: 'Video added',
    waive_video: 'Video waived',
    create_report: 'Reported',
    create_appeal: 'Appealed',
    edit_run: 'Edited',
};

export const eventVerbLabel = (action: string): string =>
    EVENT_VERB[action] ?? action;

const actorName = (event: HistoryEvent): string => {
    if (event.by?.name) return event.by.name;
    if (event.byRole === 'self') return 'Runner';
    if (event.byRole === 'system') return 'System';
    return 'a moderator';
};

/** "now", "5m", "3h", "2d", "3w", "4mo", "2y". */
export function shortAgo(iso: string, now: number = Date.now()): string {
    const ms = now - new Date(iso).getTime();
    if (!Number.isFinite(ms)) return '';
    const min = Math.floor(ms / 60_000);
    if (min < 1) return 'now';
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d`;
    if (d < 30) return `${Math.floor(d / 7)}w`;
    if (d < 365) return `${Math.floor(d / 30)}mo`;
    return `${Math.floor(d / 365)}y`;
}

export function EventRow({
    event,
    isLatest,
    gameSlug,
    runId,
    onUndone,
    canAct,
}: EventRowProps) {
    const [pending, startTransition] = useTransition();
    const plan = canAct ? historyUndoPlan(event, isLatest) : null;

    const undo = () => {
        if (!plan) return;
        startTransition(async () => {
            const reason = historyUndoReason(event);
            try {
                const res =
                    plan.kind === 'verdict'
                        ? await applyVerdictsAction(
                              gameSlug,
                              plan.action,
                              [runId],
                              reason,
                          )
                        : plan.kind === 'restore'
                          ? await restoreRunsAction(gameSlug, [runId], reason)
                          : plan.kind === 'exclude'
                            ? await excludeAction(gameSlug, {
                                  runIds: [runId],
                                  reason,
                              })
                            : await markRunsAction(
                                  gameSlug,
                                  [runId],
                                  plan.marked,
                              );
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
                toast.success('Undone.');
                onUndone();
            } catch {
                toast.error(
                    "Couldn't undo. Check your connection and try again.",
                );
            }
        });
    };

    return (
        <li className={styles.event}>
            <span className={styles.eventVerb}>
                {eventVerbLabel(event.action)}
            </span>
            <span className={styles.eventBy}>
                {actorName(event)}
                {event.reason ? (
                    <>
                        {' · '}
                        <q>{event.reason}</q>
                    </>
                ) : null}
            </span>
            <span className={styles.eventWhen}>
                <time dateTime={event.at}>{shortAgo(event.at)}</time>
                {plan ? (
                    <button
                        type="button"
                        className={styles.undo}
                        onClick={undo}
                        disabled={pending}
                    >
                        {pending ? 'Undoing…' : 'Undo'}
                    </button>
                ) : null}
            </span>
        </li>
    );
}

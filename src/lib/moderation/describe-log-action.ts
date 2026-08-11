import type { PublicModLogEntry } from '../../../types/moderation.types';

export type LogSeverity = 'ok' | 'danger' | 'warn' | 'mute';

export interface DescribedLogAction {
    /** Short verb-pill label, e.g. "Removed", "Verified". */
    label: string;
    severity: LogSeverity;
}

/**
 * Maps the unified log's `action` string to a pill label + severity. This is
 * a **deny-list feed** (docs/plans/2026-08-05-board-moderation-design.md §A) —
 * the backend can add new verbs without a frontend release, so anything not
 * in the table below falls through to a readable generic label instead of
 * crashing or rendering a raw enum value.
 */
const ACTION_LABELS: Record<string, DescribedLogAction> = {
    verdict_verify: { label: 'Verified', severity: 'ok' },
    verdict_reject: { label: 'Rejected', severity: 'danger' },
    verdict_unreject: { label: 'Restored', severity: 'ok' },
    // Verified → pending, the one missing inverse (design doc §D.2) — not a
    // rejection, so it reads as a neutral repair rather than a removal.
    verdict_unverify: { label: 'Unverified', severity: 'warn' },

    edit_run: { label: 'Run edited', severity: 'mute' },
    move_run: { label: 'Moved', severity: 'mute' },

    board_override_set: { label: 'Time corrected', severity: 'mute' },
    board_override_clear: {
        label: 'Time correction cleared',
        severity: 'mute',
    },

    exclude_run: { label: 'Removed', severity: 'danger' },
    include_run: { label: 'Restored', severity: 'ok' },
    // A runner-scoped exclusion rule (ban) cascades to every matching run —
    // distinct from a single exclude_run.
    exclude_via_rule: { label: 'Banned', severity: 'danger' },
    delete_exclusion_rule: { label: 'Ban lifted', severity: 'ok' },
    ban: { label: 'Banned', severity: 'danger' },
    unban: { label: 'Ban lifted', severity: 'ok' },
    lift_ban: { label: 'Ban lifted', severity: 'ok' },

    // Workstream C. Neutral, not destructive: the runs and ranks are
    // untouched — only the public name changes.
    anonymize_apply: { label: 'Identity hidden', severity: 'mute' },
    anonymize_lift: { label: 'Identity restored', severity: 'ok' },

    mark_run: { label: 'Marked for later', severity: 'mute' },
    unmark_run: { label: 'Unmarked', severity: 'mute' },

    manual_time_create: { label: 'Time set', severity: 'mute' },
    manual_time_update: { label: 'Time corrected', severity: 'mute' },
    manual_time_delete: { label: 'Manual time removed', severity: 'danger' },
    manual_time_verdict_verify: { label: 'Verified', severity: 'ok' },
    manual_time_verdict_reject: { label: 'Rejected', severity: 'danger' },

    // Owner self-service verbs — actor is the runner themself.
    self_reject_run: { label: 'Hidden by runner', severity: 'mute' },
    self_unreject_run: { label: 'Restored by runner', severity: 'ok' },
    self_create_manual_time: { label: 'Time set by runner', severity: 'mute' },
    self_delete_manual_time: {
        label: 'Time removed by runner',
        severity: 'mute',
    },
    self_move_run: { label: 'Moved by runner', severity: 'mute' },
};

/** Title-cases a snake/kebab-case action string as the last-resort label. */
function genericLabel(action: string): string {
    const words = action.replace(/[_-]+/g, ' ').trim();
    if (!words) return 'Event';
    return words.charAt(0).toUpperCase() + words.slice(1);
}

export function describeLogAction(action: string): DescribedLogAction {
    return (
        ACTION_LABELS[action] ?? {
            label: genericLabel(action),
            severity: 'mute',
        }
    );
}

/**
 * The log row's main sentence — "4 runs removed", "sanke_'s run moved", etc.
 *
 * Deliberately does no redaction of its own: the backend's read-time pass
 * (workstream C) has already replaced `subject` wholesale with the stable
 * placeholder before the public feed leaves the API, and the moderator feed is
 * meant to carry the real name. `target` is the last-resort fallback and the
 * backend nulls it on user-targeted rows for exactly that reason.
 */
export function describeLogSubject(entry: PublicModLogEntry): string {
    const who =
        entry.subject?.username ??
        entry.subject?.guestName ??
        entry.target ??
        'a runner';
    if (entry.entity === 'finished_run' || entry.entity === 'manual_time') {
        return `${who}'s run`;
    }
    if (entry.entity === 'exclusion_rule' || entry.entity === 'user') {
        return who;
    }
    return who;
}

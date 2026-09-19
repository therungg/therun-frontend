import type { ModVerb } from '../shared/action-model';

export type ModerateVerb =
    | 'approve'
    | 'decline'
    | 'remove'
    | 'restore'
    | 'send_back'
    | 'ask_video'
    | 'set_time'
    | 'retime'
    | 'move'
    | 'reassign'
    | 'hide_identity'
    | 'mark'
    | 'note'
    | 'add_run'
    | 'ban'
    | 'lift_ban';

export type VerbTier = 'light' | 'heavy';

export const VERB_LABEL: Record<ModerateVerb, string> = {
    approve: 'Approve',
    decline: 'Decline',
    remove: 'Remove',
    restore: 'Restore',
    send_back: 'Send back',
    ask_video: 'Ask for video',
    set_time: 'Set time',
    retime: 'Retime',
    move: 'Move',
    reassign: 'Reassign',
    hide_identity: 'Hide identity',
    mark: 'Mark',
    note: 'Note',
    add_run: 'Add run',
    ban: 'Ban',
    lift_ban: 'Lift ban',
};

export const VERB_TIER: Record<ModerateVerb, VerbTier> = {
    approve: 'light',
    decline: 'heavy',
    remove: 'heavy',
    restore: 'light',
    send_back: 'light',
    ask_video: 'light',
    set_time: 'heavy',
    retime: 'heavy',
    move: 'heavy',
    reassign: 'heavy',
    hide_identity: 'heavy',
    mark: 'light',
    note: 'light',
    add_run: 'heavy',
    ban: 'heavy',
    lift_ban: 'light',
};

/** One-line consequence shown on the button tooltip and as part 1 of the heavy form. */
export const VERB_EFFECT: Record<ModerateVerb, string> = {
    approve: 'Goes on the board.',
    decline: 'Never goes on the board.',
    remove: 'Comes off the board. The run page stays reachable and says why.',
    restore: 'Back to where it was.',
    send_back: 'Returns to pending.',
    ask_video: 'The run waits until the runner adds a video. They get a nudge.',
    set_time: 'The time is corrected. The old time stays in history.',
    retime: 'Retime from the video. The result lands as Set time.',
    move: 'Moves to another board in this game.',
    reassign: 'Moves to another runner in this game.',
    hide_identity:
        'The public sees "Anonymous runner". Moderators still see the name.',
    mark: 'Private flag for later. Nothing changes.',
    note: 'Private note for moderators. Nothing changes.',
    add_run: 'A run is added for this runner.',
    ban: 'All their runs come off this scope. Reversible.',
    lift_ban: 'Their runs come back.',
};

/** What the runner is told. `null` = nothing: the backend sends no notification. */
export const VERB_RUNNER_SEES: Record<ModerateVerb, string | null> = {
    approve: 'Your run was approved.',
    decline: 'Your run was declined, with the reason.',
    remove: null,
    restore: 'Your run is back on the board.',
    send_back: 'Your run is pending again.',
    ask_video: 'A moderator asked for a video.',
    set_time: null,
    retime: null,
    move: null,
    reassign: 'Both runners: the run changed owner.',
    hide_identity: null,
    mark: null,
    note: null,
    add_run: 'A run was added for you.',
    ban: null,
    lift_ban: null,
};

export const VERB_KEY: Partial<Record<ModerateVerb, string>> = {
    approve: 'a',
    decline: 'd',
    remove: 'r',
    ask_video: 'v',
    ban: 'b',
    mark: 'm',
};

/** Verbs with no backend yet. Not rendered until it lands. */
export const NOT_BUILT: ReadonlySet<ModerateVerb> = new Set([
    'note',
    'reassign',
]);

export const RUN_BAR: ModerateVerb[] = [
    'approve',
    'decline',
    'ask_video',
    'remove',
    'restore',
];
export const RUN_MORE: ModerateVerb[] = [
    'set_time',
    'retime',
    'move',
    'reassign',
    'send_back',
    'hide_identity',
    'mark',
    'note',
];
export const RUNNER_BAR: ModerateVerb[] = [
    'ban',
    'lift_ban',
    'hide_identity',
    'add_run',
];
export const RUNNER_MORE: ModerateVerb[] = ['note'];
export const BULK_BAR: ModerateVerb[] = [
    'approve',
    'decline',
    'remove',
    'restore',
    'move',
];

export interface VerbAvailability {
    verb: ModerateVerb;
    enabled: boolean;
    /** Tooltip when disabled. */
    reason?: string;
    /**
     * The answer is not known yet — a read is still in flight, or failed.
     * A verb the state rules out is hidden; one that is merely unresolved
     * stays in place, so the bar does not rearrange itself as data lands.
     */
    pending?: boolean;
}

export interface RunVerbState {
    status: 'pending' | 'verified' | 'rejected';
    excluded: boolean;
    hasVideo: boolean;
    isManual: boolean;
    marked: boolean;
    /** False when the mod's scope does not cover this run's category. */
    inScope: boolean;
    scopeLabel?: string;
}

function scoped(state: {
    inScope: boolean;
    scopeLabel?: string;
}): string | null {
    return state.inScope
        ? null
        : `You moderate ${state.scopeLabel ?? 'other boards'} only`;
}

export function runVerbs(state: RunVerbState): VerbAvailability[] {
    const out = (
        verb: ModerateVerb,
        reason: string | null,
    ): VerbAvailability =>
        reason ? { verb, enabled: false, reason } : { verb, enabled: true };
    const s = scoped(state);
    const pending = state.status === 'pending';
    const verified = state.status === 'verified';
    const gone = state.status === 'rejected' || state.excluded;
    return [
        out(
            'approve',
            s ??
                (pending
                    ? null
                    : verified
                      ? 'Already approved'
                      : 'Not pending'),
        ),
        out('decline', s ?? (pending ? null : 'Not pending')),
        out(
            'ask_video',
            s ??
                (state.hasVideo
                    ? 'Already has a video'
                    : pending
                      ? null
                      : 'Not pending'),
        ),
        out(
            'remove',
            s ??
                // On a manual time Remove is a delete, and a delete makes
                // sense whatever the entry's standing — it is the only way
                // to take one back without leaving a declined record. The
                // board rule below is about finished runs, which Remove
                // excludes rather than deletes, and which are only on the
                // board once verified.
                (state.isManual
                    ? null
                    : verified
                      ? null
                      : gone
                        ? 'Already off the board'
                        : 'Not on the board'),
        ),
        out('restore', s ?? (gone ? null : 'Nothing to restore')),
        out(
            'set_time',
            s ?? (state.isManual || !gone ? null : 'Off the board'),
        ),
        out('retime', s ?? (state.hasVideo ? null : 'No video attached')),
        out('move', s ?? (state.isManual ? 'Manual times cannot move' : null)),
        out('reassign', s),
        out('send_back', s ?? (verified ? null : 'Not approved')),
        out('hide_identity', s),
        out('mark', s ?? (state.marked ? 'Already marked' : null)),
        out('note', s),
    ];
}

export interface RunnerVerbState {
    banned: 'none' | 'category' | 'game';
    anonymized: boolean;
    isGuest: boolean;
    inScope: boolean;
    scopeLabel?: string;
}

export function runnerVerbs(state: RunnerVerbState): VerbAvailability[] {
    const out = (
        verb: ModerateVerb,
        reason: string | null,
    ): VerbAvailability =>
        reason ? { verb, enabled: false, reason } : { verb, enabled: true };
    const s = scoped(state);
    return [
        out(
            'ban',
            s ??
                (state.banned === 'game'
                    ? 'Already banned from the game'
                    : null),
        ),
        out('lift_ban', s ?? (state.banned === 'none' ? 'Not banned' : null)),
        out(
            'hide_identity',
            s ??
                (state.anonymized
                    ? 'Already hidden'
                    : state.isGuest
                      ? 'Guest runner'
                      : null),
        ),
        out('add_run', s),
        out('note', s),
    ];
}

export function bulkVerbs(states: RunVerbState[]): VerbAvailability[] {
    const all = states.map(runVerbs);
    return BULK_BAR.map((verb) => {
        const per = all.map((list) => list.find((v) => v.verb === verb));
        const enabled = per.some((v) => v?.enabled);
        return enabled
            ? { verb, enabled: true }
            : {
                  verb,
                  enabled: false,
                  reason: 'Applies to none of the selected runs',
              };
    });
}

/** Legacy adapter for actions that still take the old verb union. */
export function toLegacyVerb(verb: ModerateVerb): ModVerb | null {
    switch (verb) {
        case 'approve':
            return 'approve';
        case 'decline':
            return 'reject';
        case 'remove':
            return 'remove';
        case 'restore':
            return 'restore';
        case 'send_back':
            return 'unverify';
        case 'ban':
            return 'ban';
        default:
            return null;
    }
}

export function verbFromKey(key: string): ModerateVerb | null {
    const hit = (Object.entries(VERB_KEY) as [ModerateVerb, string][]).find(
        ([, k]) => k === key,
    );
    return hit ? hit[0] : null;
}

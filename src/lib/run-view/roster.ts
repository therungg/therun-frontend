import type { RosterMemberInput } from '~src/lib/moderation/run-roster';
import type { RunParticipant } from '../../../types/leaderboards.types';

/**
 * The rules a roster editor has to hold to, kept in one place away from the
 * components so the run page and anything that grows a roster editor later
 * cannot disagree about them. See docs/frontend-guide-co-op-runs.md §§3, 7.
 */

/** A run credits several people only when two or more are on the roster. */
export function isCoopRoster(
    participants: RunParticipant[] | null | undefined,
): participants is RunParticipant[] {
    return Array.isArray(participants) && participants.length >= 2;
}

/**
 * An account whose identity is masked on this board: no id, a placeholder
 * name, and `isGuest: false` because it IS an account. The one shape a roster
 * edit cannot round-trip — the write body names an account by id and a guest
 * by name, so re-sending this member is either impossible (no id) or wrong
 * (it would write a guest row under the placeholder name and quietly strip
 * the account's credit).
 */
export function isMaskedMember(member: RunParticipant): boolean {
    return member.userId == null && !member.isGuest;
}

/**
 * Whether this roster can be written back at all. False as soon as one member
 * is masked: every edit replaces the whole roster, so there is no edit —
 * not even someone removing themselves — that keeps a masked member credited.
 * Hide the controls rather than offering an edit that damages the run.
 */
export function rosterIsEditable(members: RunParticipant[]): boolean {
    return !members.some(isMaskedMember);
}

/**
 * The member as the write body names them. Null for a masked account, which
 * has no representation — callers must have checked `rosterIsEditable` first.
 */
export function toRosterInput(
    member: RunParticipant,
): RosterMemberInput | null {
    if (member.userId != null) return { userId: member.userId };
    if (member.isGuest) return { name: member.name };
    return null;
}

/** The whole roster as the write body, minus the members matched by `drop`. */
export function rosterBody(
    members: RunParticipant[],
    drop?: (member: RunParticipant) => boolean,
): RosterMemberInput[] {
    const body: RosterMemberInput[] = [];
    for (const member of members) {
        if (drop?.(member)) continue;
        const input = toRosterInput(member);
        if (input) body.push(input);
    }
    return body;
}

/**
 * `finished_runs.ineligible_reason`, in words. The reason strings are a
 * backend enum that grows; an unknown one falls back to null so the caller
 * renders nothing rather than a raw snake_case token.
 */
export function describeIneligibleReason(
    reason: string | null | undefined,
): string | null {
    switch (reason) {
        case 'participants_incomplete':
            return 'Off the board until its runners are filled in.';
        case 'below_minimum':
            return 'Off the board: the time is below this board’s minimum.';
        case 'mod_override':
            return 'Taken off the board by a moderator.';
        default:
            return null;
    }
}

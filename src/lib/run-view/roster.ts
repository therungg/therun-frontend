import { isSameRunner } from '~app/(new-layout)/games/[game]/shared/is-same-runner';
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

/** Who filed the run — the identity a roster is compared against. */
export interface RosterFiler {
    runnerName: string;
    userId?: number | null;
}

/**
 * Whether a roster member IS the filer. `userId` proves it whenever both
 * sides carry one — a roster member's `name` is the account's own username
 * and `runnerName` is `finished_runs.username` (guide §7's last paragraph):
 * normally identical, but two different columns that can differ in case or
 * spelling on older rows, so a strict `===` on the name can misread a
 * filer-only roster as co-op. Falls back to `isSameRunner`, the same
 * case-insensitive check every other identity test in this feature uses,
 * only when one side has no id to compare (a guest, or a masked account).
 */
function memberIsFiler(member: RunParticipant, filer: RosterFiler): boolean {
    if (member.userId != null && filer.userId != null) {
        return member.userId === filer.userId;
    }
    return isSameRunner(member.name, filer.runnerName);
}

/**
 * A one-member roster whose only member IS the filer. That is the row the
 * backend writes for the filer the first time a solo run's roster is touched,
 * and it is the ONLY one-member roster that may be drawn as a solo run.
 *
 * Every other one-member roster is the result of a real removal, and the
 * difference is the feature's own headline flow: A files, B is credited, A
 * takes themselves off, and `participants` is `[B]`. Falling back to
 * `runnerName` there names A — still the filer, per guide §0 — on a run A is
 * no longer credited on, and never names B at all.
 */
export function rosterIsSoloFiler(
    participants: RunParticipant[] | null | undefined,
    filer: RosterFiler,
): boolean {
    if (!Array.isArray(participants) || participants.length !== 1) return false;
    return memberIsFiler(participants[0], filer);
}

/**
 * Whether the filer is still credited anywhere on this roster. False the
 * moment they take themselves off — the feature's own headline flow (A
 * files, B is credited, A leaves) — which is the one case a filer-scoped
 * surface (the Runner card) cannot keep speaking for them.
 */
export function rosterCreditsFiler(
    participants: RunParticipant[] | null | undefined,
    filer: RosterFiler,
): boolean {
    return (
        Array.isArray(participants) &&
        participants.some((m) => memberIsFiler(m, filer))
    );
}

/**
 * Whether a board row or run page is the viewer's own — for "your row"
 * highlighting and Find-me. A row is yours when you are credited on its
 * roster, or when it has no roster and you filed it: never a single
 * board-wide `userId` lookup, because one person can legitimately hold
 * several rows on a co-op board with different partners (guide §1).
 *
 * Roster membership is checked the same way `RunRoster`'s own "is this me"
 * lookup does: an account match (`userId` present) against the session
 * username, never a guest row matched on name alone.
 */
export function isYourRow(
    participants: RunParticipant[] | null | undefined,
    filerName: string,
    sessionUsername: string | null | undefined,
): boolean {
    if (Array.isArray(participants) && participants.length > 0) {
        return participants.some(
            (m) => m.userId != null && isSameRunner(m.name, sessionUsername),
        );
    }
    return isSameRunner(filerName, sessionUsername);
}

/**
 * Whether this run's credit is the roster's to tell rather than
 * `runnerName`'s. The one test the board row and the run page's hero share,
 * so the two cannot drift about which runs name a filer.
 */
export function rendersAsRoster(
    participants: RunParticipant[] | null | undefined,
    filer: RosterFiler,
): participants is RunParticipant[] {
    return (
        Array.isArray(participants) &&
        participants.length > 0 &&
        !rosterIsSoloFiler(participants, filer)
    );
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
 * Whether taking this member off would leave nobody on the roster.
 *
 * An empty array is not "nobody": the backend reads `participants: []` as
 * "take everyone off and fall back to the filer alone" (guide §2). So a
 * removal that would send `[]` does the opposite of what the control says —
 * it credits the filer again, who is either the person trying to leave (the
 * removal silently no-ops) or someone who already took themselves off. A run
 * always credits somebody, so the last member is not removable here.
 */
export function removalEmptiesRoster(
    members: RunParticipant[],
    member: RunParticipant,
): boolean {
    return rosterBody(members, (m) => m === member).length === 0;
}

/**
 * Whether "Add a runner…" may render at all — the affordance that would MAKE
 * a run co-op, gated on the board actually being configured for it
 * (`coopBoard`, guide §5). An unconfigured board's default policy is
 * permissive (no ceiling) so it would otherwise satisfy every other rule
 * here; `coopBoard` is what tells apart "this board welcomes co-op" from
 * "nobody has said anything about it yet."
 */
export function canAddRunner(
    coopBoard: boolean,
    editable: boolean,
    opts: { isMod: boolean; isMember: boolean; isFiler: boolean },
): boolean {
    return (
        coopBoard && editable && (opts.isMod || opts.isMember || opts.isFiler)
    );
}

/**
 * Whether the Runners panel earns its place on a run that has no roster of
 * its own — no real multi-member roster, and not the one-member remainder of
 * a removal (both of those render unconditionally; see `rendersAsRoster`).
 *
 * Gated on `coopBoard`: on an unconfigured board a solo run is simply a solo
 * run, and the panel must not appear for anyone, moderators included — it is
 * exactly the affordance that would let someone start crediting a second
 * person on a board nobody configured for it. A configured board still keeps
 * the existing rule: the panel is for the filer, anyone already credited, a
 * moderator, or (to explain why the run is off the board) anyone at all when
 * the roster is incomplete OR carries too many runners — either way, the
 * person who can fix it has to see the panel.
 */
export function showsSoloRosterPanel(
    coopBoard: boolean,
    opts: {
        isMod: boolean;
        rosterIncomplete: boolean;
        rosterTooMany: boolean;
        viewerIsFiler: boolean;
        viewerOnRoster: boolean;
    },
): boolean {
    // A run held off the board for its roster is told so through this panel,
    // and that has to survive the board's policy being removed afterwards:
    // the run is still off the board until something rebuilds it, and the
    // person who could act on it is the only one who would never hear.
    if (opts.rosterIncomplete || opts.rosterTooMany) return true;
    if (!coopBoard) return false;
    return opts.isMod || opts.viewerIsFiler || opts.viewerOnRoster;
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
        // Never the "filled in" line here — nobody is missing, there are too
        // many (guide §5).
        case 'participants_too_many':
            return 'Off the board: it credits more runners than this board does.';
        case 'below_minimum':
            return 'Off the board: the time is below this board’s minimum.';
        case 'mod_override':
            return 'Taken off the board by a moderator.';
        default:
            return null;
    }
}

/**
 * "This board credits 2–4 runners." / "This board credits 2 runners." /
 * "This board credits 1 runner." / "This board credits 2 or more runners." —
 * the one place this sentence is written, shared by the bell's copy
 * (notification-copy.ts) and the run page's roster panel so the two cannot
 * drift. Null when there is no range to name (`players` absent/null — no
 * policy is configured at any scope).
 */
export function playersRangeSentence(
    players: { min: number; max: number | null } | null | undefined,
): string | null {
    if (!players || typeof players.min !== 'number') return null;
    const { min, max } = players;
    if (max == null) return `This board credits ${min} or more runners.`;
    if (max === min) {
        return `This board credits ${min} ${min === 1 ? 'runner' : 'runners'}.`;
    }
    return `This board credits ${min}–${max} runners.`;
}

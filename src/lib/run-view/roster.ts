import { isSameRunner } from '~app/(new-layout)/games/[game]/shared/is-same-runner';
import type { RosterMemberInput } from '~src/lib/moderation/run-roster';
import type { RunParticipant } from '../../../types/leaderboards.types';

/**
 * The rules a roster editor has to hold to, kept in one place away from the
 * components so the run page and anything that grows a roster editor later
 * cannot disagree about them. See docs/frontend-guide-co-op-runs.md §§3, 7.
 */

/**
 * What a roster's copy calls the thing it is about. A run and a manual time
 * share every rule in this file (guide §11) and differ only in the word — so
 * the word travels as a value, never as a second copy of a sentence.
 */
export type RosterEntryNoun = 'run' | 'time';

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

/** A name plus an optional id — the minimum either side of an identity
 * comparison needs. `RosterFiler` and `RunParticipant` both satisfy it. */
interface NamedIdentity {
    name: string;
    userId?: number | null;
}

/**
 * Whether two roster-shaped identities are the same person. `userId` proves
 * it whenever both sides carry one — a roster member's `name` is the
 * account's own username, while a filer-shaped identity's name can be
 * `finished_runs.username` (guide §7's last paragraph): normally identical,
 * but two different columns that can differ in case or spelling on older
 * rows, so a strict `===` on the name can misread one person as two. Falls
 * back to `isSameRunner`, the same case-insensitive check every other
 * identity test in this feature uses, only when one side has no id to
 * compare (a guest, or a masked account).
 *
 * The one identity helper every "is this the same person" test in this file
 * shares — `memberIsFiler` and `otherRosterMembers` both call through it so
 * they can't drift about what counts as a match.
 */
function sameIdentity(a: NamedIdentity, b: NamedIdentity): boolean {
    if (a.userId != null && b.userId != null) {
        return a.userId === b.userId;
    }
    return isSameRunner(a.name, b.name);
}

/** Whether a roster member IS the filer. See `sameIdentity`. */
function memberIsFiler(member: RunParticipant, filer: RosterFiler): boolean {
    return sameIdentity(member, {
        name: filer.runnerName,
        userId: filer.userId,
    });
}

/**
 * Everyone on this roster except the given person — the "with X and Y" line
 * every surface that names a roster's OTHER members needs (the record wall,
 * board slice and Runners panel show the WHOLE roster instead and don't call
 * this). Matches by account id when both sides carry one, else falls back to
 * `isSameRunner`, through the same `sameIdentity` every other match in this
 * file uses — a strict `name !== name` compare misreads the row's own
 * runner, in a denormalised or differently-cased copy of their name, as
 * their own partner.
 */
export function otherRosterMembers(
    roster: RunParticipant[],
    person: NamedIdentity,
): RunParticipant[] {
    return roster.filter((m) => !sameIdentity(m, person));
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
 * The most runners one entry can ever credit, whatever its board says (guide
 * §2: `a run can credit at most 16 runners`). A board with no ceiling of its
 * own still stops here, and every door that grows a roster reads it from this
 * one place — the submit dialog's fields and the run page's Add control used
 * to stop at different numbers, and the run page's stopped nowhere.
 */
export const MAX_ROSTER_MEMBERS = 16;

/**
 * Whether the roster can take nobody else — the state that has to replace
 * "Add a runner…" with a plain line, for a moderator exactly as much as
 * anyone else: adding one more here is a write the server refuses, or answers
 * by taking the run off the board, and nobody should be offered that by
 * accident (see `canAddRunner`).
 *
 * A board with no ceiling of its own is capped by `MAX_ROSTER_MEMBERS`, which
 * is the server's own limit: without it the control offered an add that could
 * only ever be refused.
 */
export function rosterAtMax(
    rosterSize: number,
    players: { min: number; max: number | null } | null | undefined,
): boolean {
    if (rosterSize >= MAX_ROSTER_MEMBERS) return true;
    return !!players && players.max != null && rosterSize >= players.max;
}

/**
 * The configuration + actor gate for "Add a runner…", WITHOUT the maximum
 * check — split out from `canAddRunner` so the panel can tell "nobody may add
 * here" apart from "someone may, but the roster is full" and word the two
 * differently (the second gets a line explaining why, not silence).
 *
 * The config half is no longer `coopBoard` alone (guide §5's permissive
 * default would otherwise satisfy every other rule here). A moderator may
 * additionally repair a roster that ALREADY EXISTS (`hasRoster` —
 * `rendersAsRoster`) whatever `coopBoard` now says: `coopBoard` only answers
 * "is this board configured for co-op today", and a moderator has to be able
 * to fix a team roster on a board whose policy was since removed —
 * degrade-only, never a door to CREATE a roster on a board nobody configured
 * for it. A non-moderator stays gated on `coopBoard` alone; a run with no
 * roster on a non-co-op board still offers this to nobody.
 */
export function actorMayAddRunner(
    coopBoard: boolean,
    editable: boolean,
    opts: {
        isMod: boolean;
        isMember: boolean;
        isFiler: boolean;
        hasRoster: boolean;
    },
): boolean {
    const configGate = coopBoard || (opts.isMod && opts.hasRoster);
    return (
        configGate && editable && (opts.isMod || opts.isMember || opts.isFiler)
    );
}

/**
 * Whether "Add a runner…" may render at all — the affordance that would MAKE
 * a run co-op or grow one further, gated on the board actually being
 * configured for it (`coopBoard`, guide §5) or, for a moderator, on a roster
 * that already exists (`actorMayAddRunner`), AND on the roster not already
 * being at the board's maximum (`rosterAtMax`). At the maximum the control
 * disappears rather than 403ing on click — the caller renders
 * `rosterAtMax(...)` in its place so the reason is still said.
 */
export function canAddRunner(
    coopBoard: boolean,
    editable: boolean,
    opts: {
        isMod: boolean;
        isMember: boolean;
        isFiler: boolean;
        hasRoster: boolean;
        rosterSize: number;
        players: { min: number; max: number | null } | null | undefined;
    },
): boolean {
    return (
        actorMayAddRunner(coopBoard, editable, opts) &&
        !rosterAtMax(opts.rosterSize, opts.players)
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

/**
 * "2 of 4 runners" (a ceiling to count against) or "2 runners — this board
 * credits at least 2 runners" (no ceiling) — where the roster stands
 * against the board's range, so a person adding a partner isn't working
 * blind. Null when there's no range to compare against (`players` absent —
 * matches `playersRangeSentence`'s own null case).
 *
 * Singularizes both numbers independently the way `playersRangeSentence`
 * and `rosterLimitReachedSentence` do — a roster of one and a board that
 * credits one are two different numbers that can each be "1 runner".
 *
 * Shown only alongside the roster itself, never duplicating
 * `rosterMismatchSentence` — that one already states both numbers as part of
 * explaining why the run is held.
 */
export function rosterCountSentence(
    rosterSize: number,
    players: { min: number; max: number | null } | null | undefined,
): string | null {
    if (!players || typeof players.min !== 'number') return null;
    if (players.max != null) {
        const maxNoun = players.max === 1 ? 'runner' : 'runners';
        return `${rosterSize} of ${players.max} ${maxNoun}`;
    }
    const rosterNoun = rosterSize === 1 ? 'runner' : 'runners';
    const minNoun = players.min === 1 ? 'runner' : 'runners';
    return `${rosterSize} ${rosterNoun} — this board credits at least ${players.min} ${minNoun}`;
}

/**
 * The line that stands in for "Add a runner…" once the roster is at the
 * board's maximum — said to a moderator exactly as much as anyone else,
 * because the server would answer one more add by taking the run off the
 * board, and nobody should be offered that by accident.
 */
export function rosterLimitReachedSentence(
    players: { min: number; max: number | null } | null | undefined,
): string {
    if (players?.max != null) {
        return `This board's limit of ${players.max} ${players.max === 1 ? 'runner' : 'runners'} is reached.`;
    }
    // No ceiling on the board: the only limit left is the one every entry
    // has, and `rosterAtMax` only says yes here once it is reached.
    return `A run credits at most ${MAX_ROSTER_MEMBERS} runners.`;
}

/**
 * The roster panel's held-run notice, in the runner's own numbers — built
 * from `playersRangeSentence` rather than a second range formatter of its
 * own (guide §8 / the sentence has to agree everywhere it's said). Two
 * different pieces of news depending on `reason` (guide §5): never say
 * someone is missing when the roster is actually too big, and vice versa.
 *
 * `entryNoun` is what the sentence calls the thing being held. A manual time
 * is held by the same two reasons a run is (guide §11.4), and calling it a
 * run on its own page is simply wrong — so the noun is a parameter, and it
 * defaults to the run so every existing caller reads exactly as before.
 */
export function rosterMismatchSentence(
    reason: 'participants_incomplete' | 'participants_too_many',
    rosterSize: number,
    players: { min: number; max: number | null } | null | undefined,
    entryNoun: RosterEntryNoun = 'run',
): string {
    const range = playersRangeSentence(players);
    const rangeClause = range ? range.replace(/\.$/, '') : null;
    const rosterNoun = rosterSize === 1 ? 'runner' : 'runners';
    if (reason === 'participants_incomplete') {
        return rangeClause
            ? `${rangeClause} and this ${entryNoun} credits ${rosterSize} ${rosterNoun}. It is off the board until its runners are filled in.`
            : `This ${entryNoun} is off the board until its runners are filled in.`;
    }
    return rangeClause
        ? `${rangeClause} and this ${entryNoun} credits ${rosterSize} ${rosterNoun}. It credits more runners than this board does.`
        : `This ${entryNoun} credits more runners than this board does.`;
}

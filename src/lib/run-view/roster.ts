import { isSameRunner } from '~app/(new-layout)/games/[game]/shared/is-same-runner';
import type { RosterMemberInput } from '~src/lib/moderation/run-roster';
import type {
    PlayersRange,
    RunParticipant,
} from '../../../types/leaderboards.types';

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
 * How many members of a roster are named before the rest become a count —
 * the one number the sentences and the components that draw avatars both
 * read. A board cell and the "with …" line under it disagreeing about where
 * a roster stops reads as two different rosters.
 */
export const ROSTER_SHOWN = 3;

/**
 * A partner list split into the ones a "with …" line names and the number it
 * counts instead.
 *
 * Never leaves ONE behind: "and 1 more" is longer than the name it hides, so
 * a fourth partner is named rather than counted. Exported for the surfaces
 * that draw each partner as an avatar + name rather than as text — they take
 * the same split, so a line of names and a line of components truncate at the
 * same place.
 */
export function namedPartners<T>(others: T[]): { shown: T[]; more: number } {
    if (others.length <= ROSTER_SHOWN + 1) return { shown: others, more: 0 };
    return {
        shown: others.slice(0, ROSTER_SHOWN),
        more: others.length - ROSTER_SHOWN,
    };
}

/**
 * A roster split into the members a cell draws and the ones behind a "+N" —
 * the same `ROSTER_SHOWN` names a sentence would print, but with no
 * never-leave-one-behind exception: "+1" is a chip the width of a chip,
 * while "and 1 more" is longer than the name it replaces, so the two
 * surfaces round the same number differently on purpose.
 *
 * Nothing is dropped: `hidden` is the rest of the roster, and the control
 * that counts it opens a panel naming every member.
 */
export function splitRoster<T>(members: T[]): { shown: T[]; hidden: T[] } {
    if (members.length <= ROSTER_SHOWN) return { shown: members, hidden: [] };
    return {
        shown: members.slice(0, ROSTER_SHOWN),
        hidden: members.slice(ROSTER_SHOWN),
    };
}

/**
 * "with Zoe" / "with Zoe and Sam" / "with Zoe, Sam and Kim" / "with Zoe, Sam,
 * Kim and 3 more" / "with others" — who an entry was set alongside, in the
 * one wording every surface that says it shares. Null when there is nobody to
 * name and nobody hidden.
 *
 * `others` is already everyone BUT the person the line is about
 * (`otherRosterMembers`); this does not filter it again. `hasHidden` is the
 * masked-member flag a payload carries instead of a member — it becomes
 * "others", never a number, because a mask is exactly what withholds the
 * count.
 */
export function partnersSentence(
    others: Array<{ name: string }>,
    hasHidden = false,
): string | null {
    const parts = namedParts(others, hasHidden);
    if (parts.length === 0) return null;
    return `with ${joinParts(parts)}`;
}

/**
 * "A" / "A and B" / "A, B and C" / "A, B, C and 3 more" — everyone an entry
 * credits, as the subject of a sentence rather than a "with …" tail. Page
 * titles and descriptions say this where a solo entry says a runner's name.
 * Null when the roster names nobody.
 *
 * Shares `namedPartners` and the join with `partnersSentence`, so a title and
 * a partners line truncate at the same place and read the same way.
 */
export function rosterNames(
    members: Array<{ name: string }>,
    hasHidden = false,
): string | null {
    const parts = namedParts(members, hasHidden);
    if (parts.length === 0) return null;
    return joinParts(parts);
}

/** The names a line shows, with the rest as a count and a mask as "others". */
function namedParts(
    members: Array<{ name: string }>,
    hasHidden: boolean,
): string[] {
    const { shown, more } = namedPartners(members);
    const parts = shown.map((m) => m.name);
    if (more > 0) parts.push(`${more} more`);
    if (hasHidden) parts.push('others');
    return parts;
}

/** "A" / "A and B" / "A, B and C" — one join for every list of names here. */
function joinParts(parts: string[]): string {
    if (parts.length === 1) return parts[0];
    return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
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
 * What the person reading an entry's page is TO that entry: did they file it,
 * are they credited on it, and is it being held off the board for its
 * roster.
 *
 * Both pages that render an entry (a run and a manual time) need exactly
 * these three answers, for exactly the same decisions — whether the Runners
 * panel renders, and whether the board probe behind it is worth a request —
 * and each had hand-copied the three tests. One copy, so the two pages cannot
 * answer differently about the same person.
 *
 * Roster membership is an ACCOUNT match: a member with no id is a guest or a
 * masked account, and neither is ever "you" on the strength of a name.
 * Filing is matched through `sameIdentity` like every other identity test in
 * this file — id first, where both sides carry one.
 */
export interface ViewerStanding {
    /** They filed it (`runnerName`), whether or not they are still credited. */
    isFiler: boolean;
    /** They hold a seat on the roster. */
    onRoster: boolean;
    /** It is off the board for its roster — too few runners, or too many. */
    rosterHeld: boolean;
}

export function viewerStanding(
    detail: {
        runnerName: string;
        userId?: number | null;
        participants?: RunParticipant[];
        rosterIncomplete?: boolean;
        rosterTooMany?: boolean;
    },
    sessionUsername: string | null | undefined,
): ViewerStanding {
    const viewer: NamedIdentity = { name: sessionUsername ?? '' };
    return {
        isFiler: sameIdentity(
            { name: detail.runnerName, userId: detail.userId },
            viewer,
        ),
        onRoster: (detail.participants ?? []).some(
            (m) => m.userId != null && sameIdentity(m, viewer),
        ),
        rosterHeld:
            detail.rosterIncomplete === true || detail.rosterTooMany === true,
    };
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
function toRosterInput(member: RunParticipant): RosterMemberInput | null {
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
 * accident.
 *
 * A board with no ceiling of its own is capped by `MAX_ROSTER_MEMBERS`, which
 * is the server's own limit: without it the control offered an add that could
 * only ever be refused.
 */
export function rosterAtMax(
    rosterSize: number,
    players: PlayersRange | null | undefined,
): boolean {
    if (rosterSize >= MAX_ROSTER_MEMBERS) return true;
    return !!players && players.max != null && rosterSize >= players.max;
}

/**
 * The configuration + actor gate for "Add a runner…", WITHOUT the maximum
 * check: the panel tells "nobody may add here" apart from "someone may, but
 * the roster is full" and words the two differently — the second gets a line
 * explaining why (`rosterLimitReachedSentence`), not silence.
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
 * Where a runner-count rule lives, for the sentences that name it. The rule
 * is a property of a category or of one of its subcategories; "board" is the
 * thing runners read, not the thing that carries the rule.
 */
export type PlayersRuleScope = 'category' | 'subcategory' | 'board';

/**
 * "2 runners" / "2-3 runners" / "2 or more runners" — the count on its own,
 * for a sentence that supplies its own subject. A plain hyphen, not an en
 * dash: this reads as two numbers and a range, not as prose punctuation.
 */
export function playersCountPhrase(
    players: PlayersRange | null | undefined,
): string | null {
    if (!players || typeof players.min !== 'number') return null;
    const { min, max } = players;
    if (max == null) return `${min} or more runners`;
    if (max === min) return `${min} ${min === 1 ? 'runner' : 'runners'}`;
    return `${min}-${max} runners`;
}

/**
 * "This category is co-op with 2-3 runners." / "Co-op board with 2-3
 * runners" — the one place this is written, shared by the board header, the
 * bell's copy (notification-copy.ts), the submit dialog, the run page's
 * roster panel and the console, so none of them can drift. Null when there
 * is no range to name (`players` absent/null — no rule at any scope).
 *
 * `scope` picks the subject. `'board'` labels the board a reader is already
 * looking at, so it names the board and takes no full stop — it is a label,
 * not a sentence. The other two name where the rule LIVES, because that is
 * where it gets changed; they default to the category, since a rule on the
 * whole category is the ordinary case and the wrong half of that guess is
 * the one that sends somebody hunting for a subcategory rule that does not
 * exist.
 */
export function playersRangeSentence(
    players: PlayersRange | null | undefined,
    scope: PlayersRuleScope = 'category',
): string | null {
    const count = playersCountPhrase(players);
    if (!count) return null;
    if (scope === 'board') return `Co-op board with ${count}`;
    return `This ${scope} is co-op with ${count}.`;
}

/**
 * "2 of 4 runners" against a ceiling, or "2 runners, 3 or more needed"
 * without one — a label beside the roster, not a sentence, so a person
 * adding a partner isn't working blind. Null when there's no rule to count
 * against (matches `playersRangeSentence`'s own null case).
 *
 * Shown only alongside the roster itself, never duplicating
 * `rosterMismatchSentence` — that one already states both numbers.
 */
export function rosterCountSentence(
    rosterSize: number,
    players: PlayersRange | null | undefined,
): string | null {
    if (!players || typeof players.min !== 'number') return null;
    if (players.max != null) {
        const maxNoun = players.max === 1 ? 'runner' : 'runners';
        return `${rosterSize} of ${players.max} ${maxNoun}`;
    }
    const rosterNoun = rosterSize === 1 ? 'runner' : 'runners';
    return `${rosterSize} ${rosterNoun}, ${players.min} or more needed`;
}

/**
 * The line that stands in for "Add a runner…" once the roster is full — said
 * to a moderator exactly as much as anyone else, because the server would
 * answer one more add by taking the run off the board, and nobody should be
 * offered that by accident.
 */
export function rosterLimitReachedSentence(
    players: PlayersRange | null | undefined,
): string {
    if (players?.max != null) {
        return `Limit of ${players.max} ${players.max === 1 ? 'runner' : 'runners'} reached.`;
    }
    // No ceiling in the rule: the only limit left is the one every entry
    // has, and `rosterAtMax` only says yes here once it is reached.
    return `A run can have at most ${MAX_ROSTER_MEMBERS} runners.`;
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
    players: PlayersRange | null | undefined,
    entryNoun: RosterEntryNoun = 'run',
    scope: PlayersRuleScope = 'category',
): string {
    const range = playersRangeSentence(players, scope);
    const rosterNoun = rosterSize === 1 ? 'runner' : 'runners';
    if (reason === 'participants_incomplete') {
        return range
            ? `${range} This ${entryNoun} has ${rosterSize} ${rosterNoun} and is off the board until the rest are added.`
            : `This ${entryNoun} is off the board until its runners are added.`;
    }
    return range
        ? `${range} This ${entryNoun} has ${rosterSize} ${rosterNoun} and is off the board.`
        : `This ${entryNoun} has too many runners and is off the board.`;
}

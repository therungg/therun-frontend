import type { RosterMemberInput } from '~src/lib/moderation/run-roster';
import { playersRangeSentence } from '~src/lib/run-view/roster';
import { isSameRunner } from '../shared/is-same-runner';

/**
 * The partner fields of the submit dialog, as state and as rules.
 *
 * The server refuses the WHOLE submission when one name cannot be credited,
 * so a refusal that names a value has to land on the row that holds it —
 * otherwise a team of four is told "no account named x" with four fields on
 * screen and no way to tell which one it means. That matching, the guest
 * fallback it unlocks and the three things worth catching before the request
 * is ever made all live here, away from the component.
 *
 * See docs/frontend-guide-co-op-runs.md §§2, 11.
 */

/** One runner one entry can ever credit at most (guide §2). The partner rows
 * are everyone BUT the person the run is filed for, so they stop one short. */
const MAX_ROSTER_MEMBERS = 16;

/** The exact refusal — and only this one — that unlocks the guest fallback.
 * Guide §2: it covers "no such account", "deleted" and "hidden on this board"
 * alike, so nothing here may interpret which of them happened. */
const NO_ACCOUNT_PREFIX = 'no account named ';

export interface PartnerRow {
    /** Stable across re-renders so a typed value never jumps rows. */
    key: string;
    value: string;
    /** Set only by taking the explicit offer after a refusal: the row then
     * sends `{ name }` — a guest — instead of `{ username }`. Never set on
     * the runner's behalf (guide §2). */
    asGuest: boolean;
    /** A sentence for this row, shown as given. */
    error: string | null;
    /** The row's typed value was refused as an account, so the row offers to
     * credit that name as a guest instead. Mutually exclusive with `error`:
     * the raw refusal is NOT repeated beside the offer, because it would
     * claim to know which of its three meanings applied. */
    offerGuest: boolean;
}

let rowSeq = 0;

export function newPartnerRow(): PartnerRow {
    rowSeq += 1;
    return {
        key: `partner-${rowSeq}`,
        value: '',
        asGuest: false,
        error: null,
        offerGuest: false,
    };
}

/** A typed value, trimmed — the only form anything here compares or sends. */
const term = (row: PartnerRow): string => row.value.trim();

/** The rows a runner actually filled in. Blank rows are not a roster entry
 * and are not an error: a board crediting up to four runners shows three
 * fields to a team of two. */
export const filledRows = (rows: PartnerRow[]): PartnerRow[] =>
    rows.filter((r) => term(r).length > 0);

/** How many partner fields the board's minimum demands — the submitter holds
 * the first seat, so the fields start one below it. At least one either way:
 * a section with no field to type in is not a section. */
export function initialPartnerRowCount(
    players: { min: number; max: number | null } | null,
): number {
    const min = players?.min ?? 1;
    return Math.max(1, min - 1);
}

/** The ceiling on partner fields: the board's own, less the submitter's seat,
 * and never past what one entry can credit. */
export function maxPartnerRows(
    players: { min: number; max: number | null } | null,
): number {
    const max = players?.max ?? null;
    const ceiling =
        max == null ? MAX_ROSTER_MEMBERS : Math.min(max, MAX_ROSTER_MEMBERS);
    return Math.max(1, ceiling - 1);
}

/**
 * The rows as the request's `participants`. A row is `{ username }` — an
 * account, resolved by the server — unless the runner explicitly took the
 * guest offer on it, which makes it `{ name }`. Guide §2: never the other way
 * round, and never silently.
 */
export function partnerInputs(rows: PartnerRow[]): RosterMemberInput[] {
    return filledRows(rows).map((r) =>
        r.asGuest ? { name: term(r) } : { username: term(r) },
    );
}

/**
 * What stops a submission before it is sent, in one sentence, or null.
 *
 * Only the three things the server cannot phrase better itself: a team below
 * the board's minimum (the server refuses the filing outright, which loses
 * the typed time), the same person twice, and the submitter naming
 * themselves — which the server ignores rather than refuses, so it would
 * silently file a team one smaller than it looks.
 */
export function rosterBlocker(
    rows: PartnerRow[],
    teamLeadName: string,
    players: { min: number; max: number | null } | null,
): string | null {
    const filled = filledRows(rows);

    const seen = new Set<string>();
    for (const row of filled) {
        const key = term(row).toLowerCase();
        if (seen.has(key)) {
            return 'Two of these rows name the same runner. Credit each runner once.';
        }
        seen.add(key);
        if (isSameRunner(term(row), teamLeadName)) {
            return `${teamLeadName} is already on this team, so leave that name out of the rows below.`;
        }
    }

    const min = players?.min ?? 1;
    const missing = min - 1 - filled.length;
    if (missing > 0) {
        const range = playersRangeSentence(players);
        const ask = `Name ${missing} more ${missing === 1 ? 'runner' : 'runners'} before submitting.`;
        return range ? `${range} ${ask}` : ask;
    }

    return null;
}

/** Whether a refusal is about who the submission credits, and therefore
 * belongs in the Runners section rather than under the time fields.
 *
 * This is ROUTING ONLY — what the section actually shows comes from
 * `rosterRefusalSentence`, because half of these are body-validation
 * fragments written for whoever wrote the request, not for the runner
 * reading the dialog. */
export function isRosterRefusal(message: string): boolean {
    return (
        message.startsWith(NO_ACCOUNT_PREFIX) ||
        isRunnerWrittenRefusal(message) ||
        message.startsWith('a run can credit at most') ||
        message.startsWith('every runner needs a name') ||
        message.startsWith('every participant must be an object') ||
        message.startsWith('participants must be an array') ||
        message.startsWith('runner names are at most') ||
        message.startsWith('usernames are at most')
    );
}

/** The refusals the backend writes FOR the runner (guide §2, "these strings
 * are written to be shown to the runner as-is"): the board's range, the
 * per-hour credit ceiling, and the one-way door on being added back. */
function isRunnerWrittenRefusal(message: string): boolean {
    return (
        message.startsWith('This board credits ') ||
        message === 'This board is not set up for co-op runs.' ||
        message.startsWith('You have credited too many runners') ||
        message.startsWith('Someone who took themselves off')
    );
}

/**
 * What the Runners section says about a refusal `isRosterRefusal` routed to
 * it.
 *
 * A sentence written for the runner is passed through exactly as the server
 * wrote it. Everything else is body validation — `participants must be an
 * array`, `every participant must be an object`, a name over the length
 * limit, a name that cannot be credited as an account and matches no row —
 * and those are a description of the request, not of anything the person
 * typed. They say the same thing to a runner either way: the runners did not
 * go through, so check the names. The shapes are not distinguished, because
 * no distinction between them is actionable at this field.
 */
export function rosterRefusalSentence(message: string): string {
    if (isRunnerWrittenRefusal(message)) return message;
    return 'Something about who this run credits didn’t go through. Check the names and try again.';
}

/**
 * The value a `no account named …` refusal is about, or null for any other
 * refusal. The server echoes back what the caller typed, so this is what the
 * rows — and the fixed first row — are matched against.
 */
export function refusedName(message: string): string | null {
    if (!message.startsWith(NO_ACCOUNT_PREFIX)) return null;
    const named = message.slice(NO_ACCOUNT_PREFIX.length).trim();
    return named.length > 0 ? named : null;
}

/**
 * A refusal, placed.
 *
 * `no account named <x>` is matched back to the row holding `<x>`,
 * case-insensitively, and that row alone changes: an account row is offered
 * the guest fallback, a row that is ALREADY a guest is told the value names
 * an account and offered nothing further (guide §2 — the guest door refuses
 * a name that case-folds to an account's, with the same sentence that sent
 * you there, and that is not a loop). Every other refusal, and one naming a
 * value no row holds, leaves the rows alone for the caller to show whole.
 */
export function applyRefusal(
    rows: PartnerRow[],
    message: string,
): { rows: PartnerRow[]; placed: boolean } {
    if (!message.startsWith(NO_ACCOUNT_PREFIX)) return { rows, placed: false };
    const named = message.slice(NO_ACCOUNT_PREFIX.length).trim().toLowerCase();
    if (named.length === 0) return { rows, placed: false };

    const index = rows.findIndex((r) => term(r).toLowerCase() === named);
    if (index < 0) return { rows, placed: false };

    const row = rows[index];
    const next = rows.slice();
    next[index] = row.asGuest
        ? {
              ...row,
              error: 'That name belongs to an account and can’t be credited as a guest. Check the spelling, or leave them off this run.',
              offerGuest: false,
          }
        : { ...row, error: null, offerGuest: true };
    return { rows: next, placed: true };
}

/** A row being retyped drops the refusal it earned — that answer belonged to
 * the old value, and the guest offer with it. */
export function retypeRow(row: PartnerRow, value: string): PartnerRow {
    return { ...row, value, error: null, offerGuest: false, asGuest: false };
}

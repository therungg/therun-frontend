'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';
import {
    editRunRosterAction,
    type RosterBoardRef,
} from '~src/actions/run-roster.action';
import type { RosterMemberInput } from '~src/lib/moderation/run-roster';
import {
    canAddRunner,
    describeIneligibleReason,
    isMaskedMember,
    removalEmptiesRoster,
    rosterBody,
    rosterIsEditable,
} from '~src/lib/run-view/roster';
import type { RunParticipant } from '../../../../../types/leaderboards.types';
import { RunnerIdentity } from '../leaderboard/runners';
import { BoardDialog } from '../shared/board-dialog';
import { isSameRunner } from '../shared/is-same-runner';
import styles from './run-page.module.scss';

const BTN_SECONDARY = 'btn btn-sm btn-outline-secondary';

interface Props {
    board: RosterBoardRef;
    /** The run's effective roster: its members, or the filer alone when the
     * run has none (a solo run carries no `participants` at all). */
    members: RunParticipant[];
    sessionUsername: string | null;
    /** Whether this visitor filed the run. The filer may credit someone even
     * after taking themselves off it (guide §3 rule 2). */
    viewerIsFiler: boolean;
    /** Moderator of this board — the only person who may take someone else
     * off a run. */
    isMod: boolean;
    /** The run is off its board because the roster no longer satisfies the
     * board's player policy. */
    rosterIncomplete: boolean;
    /** Whether this run's board is actually configured for co-op — a players
     * policy exists for it and permits more than one runner (guide §5).
     * Gates "Add a runner…" only; never the rendering of a roster that
     * already exists, and never "Take me off this run". */
    coopBoard: boolean;
}

/**
 * Who a run credits, and the one control the whole feature's consent model
 * rests on: taking yourself off a run someone else filed.
 *
 * The permission rules are the server's (`checkRosterEdit`), not this
 * component's — it renders the controls the rules allow and shows the
 * server's own sentence when they refuse. Two of them cannot be predicted
 * here at all: a run's history of self-removals never reaches the frontend,
 * so "Someone who took themselves off this run cannot be added back." can
 * only ever arrive as an answer, which is why every refusal has to land
 * where the person who caused it is looking.
 *
 * Controls are rendered or absent, never disabled-and-greyed: a visible
 * button on this surface means it works.
 */
export function RunRoster({
    board,
    members,
    sessionUsername,
    viewerIsFiler,
    isMod,
    rosterIncomplete,
    coopBoard,
}: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [confirmRemoveSelf, setConfirmRemoveSelf] = useState(false);
    const [addOpen, setAddOpen] = useState(false);

    // A member is "you" on `userId`, never on the name alone: a guest row may
    // legitimately carry your spelling without being your account, and a
    // masked account arrives under a placeholder that matches nobody.
    const meIndex = members.findIndex(
        (m) => m.userId != null && isSameRunner(sessionUsername, m.name),
    );
    const me = meIndex >= 0 ? members[meIndex] : null;

    // Every edit replaces the whole roster, and a masked account has no way
    // to be written back — no id to name it by, and a name would write a
    // guest row in its place. So one masked member freezes the roster for
    // everyone, moderators included. Hiding the controls is the only correct
    // answer: the alternative silently strips a credit.
    const editable = rosterIsEditable(members);
    const hasMasked = members.some(isMaskedMember);

    // A run always credits somebody: a removal that would send an empty
    // roster re-credits the filer instead of taking the last member off (see
    // `removalEmptiesRoster`), so the control is not offered at all.
    const lastMember = me != null && removalEmptiesRoster(members, me);
    const canRemoveSelf = editable && !isMod && me != null && !lastMember;
    // Rule 2: the filer and everyone currently credited may add. A moderator
    // may always add. Gated on `coopBoard` on top of that — this is the
    // affordance that would MAKE a run co-op, and it only belongs on a board
    // someone actually configured for it (guide §5).
    const canAdd = canAddRunner(coopBoard, editable, {
        isMod,
        isMember: me != null,
        isFiler: viewerIsFiler,
    });
    const incomplete = describeIneligibleReason('participants_incomplete');

    const submit = (
        next: RosterMemberInput[],
        onFail: (message: string) => void,
        onDone?: () => void,
    ) => {
        setError(null);
        startTransition(async () => {
            const res = await editRunRosterAction(board, next);
            if ('error' in res) {
                // The server's refusals are runner-facing sentences, and this
                // is the only place several of them can be learned — so the
                // message has to render where the action was taken, not on a
                // panel behind an open dialog's backdrop.
                onFail(res.error);
                return;
            }
            onDone?.();
            // The action expired this run's and this board's cache entries
            // with `updateTag`, so the refreshed render reads the roster that
            // was just written rather than the one it replaced.
            router.refresh();
        });
    };

    const removeMember = (member: RunParticipant) => {
        submit(
            rosterBody(members, (m) => m === member),
            setError,
        );
    };

    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Runners</h2>
            </div>

            {rosterIncomplete && incomplete && (
                <p className={styles.rosterNotice}>
                    {incomplete} This board asks for a different number of
                    runners than this run credits.
                </p>
            )}

            <ul className={styles.rosterList}>
                {members.map((member, i) => (
                    <li
                        key={`${member.userId ?? 'g'}-${member.name}-${i}`}
                        className={styles.rosterRow}
                    >
                        <span className={styles.rosterIdentity}>
                            <RunnerIdentity
                                name={member.name}
                                picture={member.picture}
                                country={member.country}
                                size="sm"
                                // THE LINK RULE (guide §7): link on `userId`
                                // being non-null, never on `isGuest`. A
                                // masked account keeps `isGuest: false` and
                                // arrives with a null id; linking it off the
                                // guest flag re-resolves the identity the
                                // mask exists to hide.
                                link={member.userId != null}
                                hoverCard={member.userId != null}
                            />
                            {member.isGuest && (
                                <span className={styles.rosterGuest}>
                                    no therun account
                                </span>
                            )}
                            {/* Quiet, and only on the viewer's own row — not
                                board trivia (guide §1). Null for the filer's
                                own seat and importer-written seats, so this
                                only ever shows for a member somebody else
                                added. */}
                            {member === me && member.addedByName && (
                                <span className={styles.rosterGuest}>
                                    added by {member.addedByName}
                                </span>
                            )}
                        </span>
                        {isMod &&
                            editable &&
                            !removalEmptiesRoster(members, member) && (
                                <button
                                    type="button"
                                    className={`${styles.action} ${styles.actionDanger}`}
                                    onClick={() => removeMember(member)}
                                    disabled={pending}
                                >
                                    Remove
                                </button>
                            )}
                        {canRemoveSelf && member === me && (
                            <button
                                type="button"
                                className={styles.action}
                                onClick={() => setConfirmRemoveSelf(true)}
                                disabled={pending}
                            >
                                Take me off this run
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            {canAdd && (
                <div className={styles.rosterActions}>
                    <button
                        type="button"
                        className={styles.action}
                        onClick={() => setAddOpen(true)}
                        disabled={pending}
                    >
                        Add a runner…
                    </button>
                </div>
            )}

            {/* Said only to the person who would otherwise have the control. */}
            {editable && lastMember && (
                <p className={styles.rosterNote}>
                    A run always credits someone, so you cannot take yourself
                    off while you are the only runner on it. A moderator can
                    change who this run credits.
                </p>
            )}

            {/* Only where a control would otherwise be: a passer-by has no
                use for the reason the roster is frozen. */}
            {hasMasked && (isMod || me != null || viewerIsFiler) && (
                <p className={styles.rosterNote}>
                    One of these runners has hidden their identity here, so who
                    this run credits cannot be changed.
                </p>
            )}

            {/* The row controls have no dialog of their own, so their
                failures belong here — but never underneath an open one. */}
            {error && !confirmRemoveSelf && !addOpen && (
                <p className={styles.rosterError}>{error}</p>
            )}

            {confirmRemoveSelf && me != null && (
                <RemoveSelfDialog
                    pending={pending}
                    onClose={() => {
                        setError(null);
                        setConfirmRemoveSelf(false);
                    }}
                    onConfirm={(onFail) =>
                        submit(
                            rosterBody(members, (m) => m === me),
                            onFail,
                            () => setConfirmRemoveSelf(false),
                        )
                    }
                />
            )}

            {/* Mounted only while open, so a reopened dialog can never carry
                a previous refusal into a new edit. */}
            {addOpen && (
                <AddRunnerDialog
                    pending={pending}
                    onClose={() => {
                        setError(null);
                        setAddOpen(false);
                    }}
                    onAdd={(input, onFail) =>
                        submit([...rosterBody(members), input], onFail, () =>
                            setAddOpen(false),
                        )
                    }
                />
            )}
        </section>
    );
}

/**
 * The confirmation, and the one thing it has to say: a self-removal is a
 * one-way door for everyone but a moderator. The server refuses a re-add
 * even from the person themselves, so saying it afterwards is too late.
 */
function RemoveSelfDialog({
    pending,
    onClose,
    onConfirm,
}: {
    pending: boolean;
    onClose: () => void;
    onConfirm: (onFail: (message: string) => void) => void;
}) {
    const confirmRef = useRef<HTMLButtonElement>(null);
    const [error, setError] = useState<string | null>(null);

    return (
        <BoardDialog
            open
            onClose={onClose}
            title="Take me off this run"
            size="sm"
            initialFocusRef={confirmRef}
        >
            <div className="modal-header">
                <h2 className="modal-title h6">Take me off this run</h2>
            </div>
            <div className="modal-body">
                <p className="small text-muted">
                    You stop being credited on this run. Once you take yourself
                    off, only a moderator can put you back.
                </p>
                {error && <p className={styles.rosterError}>{error}</p>}
            </div>
            <div className="modal-footer">
                <button
                    type="button"
                    className={BTN_SECONDARY}
                    onClick={onClose}
                    disabled={pending}
                >
                    Cancel
                </button>
                <button
                    ref={confirmRef}
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => onConfirm(setError)}
                    disabled={pending}
                >
                    Take me off
                </button>
            </div>
        </BoardDialog>
    );
}

/**
 * Crediting someone, by their therun username — one field, one flow, for
 * everyone the roster rules allow to add (guide §2, §3).
 *
 * The only thing sent for a first try is `{ username }`; the server resolves
 * it to an account. When it can't, it answers `no account named <x>` — one
 * message for "no such account", "deleted" and "hidden on this board" alike
 * (guide §2), so the copy here must not claim to know which. That exact
 * refusal, and only that one, unlocks a second, explicit step: credit the
 * same name as a guest instead, which sends `{ name }`. Any other refusal
 * (the re-add lock, "only the runners on this run can add someone", …) is
 * shown as given, with no guest offer — offering one there would let someone
 * route around the refusal.
 */
function AddRunnerDialog({
    pending,
    onClose,
    onAdd,
}: {
    pending: boolean;
    onClose: () => void;
    onAdd: (
        input: RosterMemberInput,
        onFail: (message: string) => void,
    ) => void;
}) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    // Set ONLY by the exact `no account named ` prefix (guide §2's error
    // list) — never by any other refusal. That match, and nothing looser, is
    // what keeps the guest offer from becoming a way around a real refusal.
    const [offerGuest, setOfferGuest] = useState(false);

    const term = query.trim();

    const changeQuery = (value: string) => {
        setQuery(value);
        // A refusal belongs to the name that earned it, not to whatever gets
        // typed next.
        setError(null);
        setOfferGuest(false);
    };

    const fail = (message: string) => {
        setError(message);
        setOfferGuest(message.startsWith('no account named '));
    };

    const submitAccount = () => {
        if (term.length === 0) return;
        onAdd({ username: term }, fail);
    };

    const submitGuest = () => {
        if (term.length === 0) return;
        onAdd({ name: term }, fail);
    };

    return (
        <BoardDialog
            open
            onClose={onClose}
            title="Add a runner"
            size="md"
            initialFocusRef={inputRef}
        >
            <div className="modal-header">
                <h2 className="modal-title h6">Add a runner</h2>
            </div>
            <div className="modal-body">
                <label className="form-label small" htmlFor={inputId}>
                    therun username
                </label>
                <input
                    id={inputId}
                    ref={inputRef}
                    className="form-control form-control-sm"
                    value={query}
                    onChange={(e) => changeQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && term.length > 0) {
                            e.preventDefault();
                            submitAccount();
                        }
                    }}
                    disabled={pending}
                    placeholder="Their therun username"
                    maxLength={64}
                />
                {/* The raw refusal is NOT shown beside the guest offer. The
                    server answers "no account named x" identically for a name
                    nobody has, a deleted account and an account hidden on this
                    board, so repeating it would claim to know which. */}
                {error && !offerGuest && (
                    <p className={styles.rosterError}>{error}</p>
                )}
                {offerGuest && (
                    <div className="mt-2">
                        <p className="small text-muted mb-1">
                            We couldn’t add an account called “{term}”. Check
                            the spelling — or credit them as a guest. A guest is
                            a name only: the run won’t appear on anyone’s
                            profile, and only a moderator can change it later.
                        </p>
                        <button
                            type="button"
                            className={styles.action}
                            onClick={submitGuest}
                            disabled={pending}
                        >
                            Credit “{term}” as a guest
                        </button>
                    </div>
                )}
            </div>
            <div className="modal-footer">
                <button
                    type="button"
                    className={BTN_SECONDARY}
                    onClick={onClose}
                    disabled={pending}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={submitAccount}
                    disabled={pending || term.length === 0}
                >
                    Add
                </button>
            </div>
        </BoardDialog>
    );
}

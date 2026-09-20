'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';
import {
    editRunRosterAction,
    findRosterCandidatesAction,
    type RosterBoardRef,
    type RosterCandidate,
} from '~src/actions/run-roster.action';
import type { RosterMemberInput } from '~src/lib/moderation/run-roster';
import {
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
    // may always add.
    const canAdd = editable && (isMod || me != null || viewerIsFiler);
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
                a previous search — or a previous refusal — into a new edit. */}
            {addOpen && (
                <AddRunnerDialog
                    board={board}
                    members={members}
                    // The account picker reads a moderator-only route; a
                    // runner crediting their partner gets the guest field.
                    canSearch={isMod}
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
 * Crediting someone. The write body has exactly two shapes, and so does this:
 * an account by id, or a guest by name.
 *
 * The account half is moderator-only, because the only read that returns an
 * account id next to a name is — a search over this board's own runs. The
 * guest half is not: the backend lets the filer and every credited member add
 * a guest, and without it the ordinary way a co-op run comes to exist (filed
 * solo, partners credited afterwards) would need a moderator every time.
 */
function AddRunnerDialog({
    board,
    members,
    canSearch,
    pending,
    onClose,
    onAdd,
}: {
    board: RosterBoardRef;
    members: RunParticipant[];
    canSearch: boolean;
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
    const [candidates, setCandidates] = useState<RosterCandidate[]>([]);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searching, startSearch] = useTransition();

    const term = query.trim();
    const credited = new Set(
        members.map((m) => m.userId).filter((id): id is number => id != null),
    );
    // Someone already on the roster is not an add. The server would answer
    // `updated: false` and nothing would happen, which reads as a dead button.
    const pickable = candidates.filter((c) => !credited.has(c.userId));

    const search = () => {
        if (term.length < 2) return;
        setError(null);
        startSearch(async () => {
            const res = await findRosterCandidatesAction(
                board.gameSlug,
                board.gameId,
                board.categoryId,
                term,
            );
            setSearched(true);
            if ('error' in res) {
                setError(res.error);
                setCandidates([]);
                return;
            }
            setCandidates(res.candidates);
        });
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
                    Name
                </label>
                <div className="d-flex gap-2">
                    <input
                        id={inputId}
                        ref={inputRef}
                        className="form-control form-control-sm"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSearched(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && canSearch) {
                                e.preventDefault();
                                search();
                            }
                        }}
                        disabled={pending}
                        placeholder="Runner name"
                        maxLength={64}
                    />
                    {canSearch && term.length >= 2 && (
                        <button
                            type="button"
                            className={BTN_SECONDARY}
                            onClick={search}
                            disabled={pending || searching}
                        >
                            {searching ? 'Searching…' : 'Search'}
                        </button>
                    )}
                </div>
                {canSearch ? (
                    <>
                        {pickable.length > 0 && (
                            <ul className={styles.rosterCandidates}>
                                {pickable.map((c) => (
                                    <li key={c.userId}>
                                        <button
                                            type="button"
                                            className={styles.action}
                                            onClick={() =>
                                                onAdd(
                                                    { userId: c.userId },
                                                    setError,
                                                )
                                            }
                                            disabled={pending}
                                        >
                                            {c.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {searched && !searching && pickable.length === 0 && (
                            <p className="small text-muted mt-2">
                                No account with runs on this board matches that
                                name. Add them as a guest instead.
                            </p>
                        )}
                    </>
                ) : (
                    <p className="small text-muted mt-2">
                        They are credited under this name, without a therun
                        account. A moderator can link it to an account later.
                    </p>
                )}
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
                {term.length > 0 && (
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => onAdd({ name: term }, setError)}
                        disabled={pending}
                    >
                        Add “{term}” as a guest
                    </button>
                )}
            </div>
        </BoardDialog>
    );
}

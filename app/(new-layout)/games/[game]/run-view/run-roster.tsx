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
    /** Moderator of this board — the only person who may take someone else
     * off a run, or credit anyone on it. */
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
 * only ever arrive as an answer.
 *
 * Controls are rendered or absent, never disabled-and-greyed: a visible
 * button on this surface means it works.
 */
export function RunRoster({
    board,
    members,
    sessionUsername,
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

    const canRemoveSelf = editable && !isMod && me != null;
    const incomplete = describeIneligibleReason('participants_incomplete');

    const submit = (
        next: RosterMemberInput[],
        affectedNames: string[],
        onDone?: () => void,
    ) => {
        setError(null);
        startTransition(async () => {
            const res = await editRunRosterAction(board, next, affectedNames);
            if ('error' in res) {
                setError(res.error);
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
            members.map((m) => m.name),
        );
    };

    const addMember = (input: RosterMemberInput, name: string) => {
        submit(
            [...rosterBody(members), input],
            [...members.map((m) => m.name), name],
            () => setAddOpen(false),
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
                        {isMod && editable && (
                            <button
                                type="button"
                                className={`${styles.action} ${styles.actionDanger}`}
                                onClick={() => removeMember(member)}
                                disabled={pending}
                            >
                                Remove
                            </button>
                        )}
                        {!isMod && canRemoveSelf && member === me && (
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

            {isMod && editable && (
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

            {/* Only where a control would otherwise be: a passer-by has no
                use for the reason the roster is frozen. */}
            {hasMasked && (isMod || me != null) && (
                <p className={styles.rosterNote}>
                    One of these runners has hidden their identity here, so who
                    this run credits cannot be changed.
                </p>
            )}

            {error && <p className={styles.rosterError}>{error}</p>}

            <RemoveSelfDialog
                open={confirmRemoveSelf}
                pending={pending}
                onClose={() => setConfirmRemoveSelf(false)}
                onConfirm={() => {
                    if (!me) return;
                    submit(
                        rosterBody(members, (m) => m === me),
                        members.map((m) => m.name),
                        () => setConfirmRemoveSelf(false),
                    );
                }}
            />

            {isMod && (
                <AddRunnerDialog
                    open={addOpen}
                    board={board}
                    pending={pending}
                    onClose={() => setAddOpen(false)}
                    onAdd={addMember}
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
    open,
    pending,
    onClose,
    onConfirm,
}: {
    open: boolean;
    pending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) {
    const confirmRef = useRef<HTMLButtonElement>(null);
    return (
        <BoardDialog
            open={open}
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
                    onClick={onConfirm}
                    disabled={pending}
                >
                    Take me off
                </button>
            </div>
        </BoardDialog>
    );
}

/**
 * Moderator-only. Two ways to credit someone, because the write body has
 * exactly two: an account by id, or a guest by name.
 *
 * The account half is fed by a search over this board's own runs — the only
 * moderator read that returns an account id next to a name. Anyone without a
 * run in this category will not be found, and is credited as a guest.
 */
function AddRunnerDialog({
    open,
    board,
    pending,
    onClose,
    onAdd,
}: {
    open: boolean;
    board: RosterBoardRef;
    pending: boolean;
    onClose: () => void;
    onAdd: (input: RosterMemberInput, name: string) => void;
}) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [candidates, setCandidates] = useState<RosterCandidate[]>([]);
    const [searched, setSearched] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searching, startSearch] = useTransition();

    const term = query.trim();

    const search = () => {
        if (term.length < 2) return;
        setSearchError(null);
        startSearch(async () => {
            const res = await findRosterCandidatesAction(
                board.gameSlug,
                board.gameId,
                board.categoryId,
                term,
            );
            setSearched(true);
            if ('error' in res) {
                setSearchError(res.error);
                setCandidates([]);
                return;
            }
            setCandidates(res.candidates);
        });
    };

    const close = () => {
        setQuery('');
        setCandidates([]);
        setSearched(false);
        setSearchError(null);
        onClose();
    };

    return (
        <BoardDialog
            open={open}
            onClose={close}
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
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                search();
                            }
                        }}
                        disabled={pending}
                        placeholder="Runner name"
                    />
                    {term.length >= 2 && (
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
                {searchError && (
                    <p className={`${styles.rosterError} mt-2`}>
                        {searchError}
                    </p>
                )}
                {candidates.length > 0 && (
                    <ul className={styles.rosterCandidates}>
                        {candidates.map((c) => (
                            <li key={c.userId}>
                                <button
                                    type="button"
                                    className={styles.action}
                                    onClick={() =>
                                        onAdd({ userId: c.userId }, c.name)
                                    }
                                    disabled={pending}
                                >
                                    {c.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {searched && !searching && candidates.length === 0 && (
                    <p className="small text-muted mt-2">
                        No account with runs on this board matches that name.
                        Add them as a guest instead.
                    </p>
                )}
            </div>
            <div className="modal-footer">
                <button
                    type="button"
                    className={BTN_SECONDARY}
                    onClick={close}
                    disabled={pending}
                >
                    Cancel
                </button>
                {term.length > 0 && term.length <= 64 && (
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => onAdd({ name: term }, term)}
                        disabled={pending}
                    >
                        Add “{term}” as a guest
                    </button>
                )}
            </div>
        </BoardDialog>
    );
}

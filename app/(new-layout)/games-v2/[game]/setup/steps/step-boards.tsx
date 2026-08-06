'use client';

import { useState, useTransition } from 'react';
import { Check2, Dot } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import { SETUP_STEP_LABELS } from '~src/lib/setup/steps';
import type {
    BoardModRole,
    GameModerator,
} from '../../../../../../types/board-claims.types';
import { BoardCuration } from '../../manage/boards/board-curation';
import {
    addGameModeratorAction,
    removeGameModeratorAction,
} from '../actions/manage-moderators.action';
import { setGameConfiguredAction } from '../actions/set-configured.action';
import styles from '../setup.module.scss';
import type { StepProps, WizardData } from '../types';
import { StepHeader } from './step-header';

/**
 * Step 5: what the boards actually look like, then go live.
 *
 * The curation half is the real BoardCuration view — category switcher,
 * subcategory bands, ranked table, sourced live from the mod roster
 * endpoint — mounted with `context="wizard"`. The go-live half moved here
 * verbatim from the retired step 7.
 */
export function StepBoards({ data }: StepProps) {
    return (
        <section>
            <StepHeader step="boards" title="Check the boards, then go live" />
            <BoardCuration
                game={data.game}
                categories={data.categories}
                groups={data.groups}
                variables={data.variables}
                policies={data.policies}
                canConfigure
                context="wizard"
            />
            <GoLiveFooter data={data} />
        </section>
    );
}

/**
 * Mod team + review + the one irreversible-feeling button in setup. Lifted
 * from the retired finish step; the review list now derives its edit links
 * from the five-step canon (the old exceptions special case is gone — the
 * per-category step takes a `cat` of its own).
 */
function GoLiveFooter({ data }: { data: WizardData }) {
    const [mods, setMods] = useState<GameModerator[]>(data.moderators);
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<BoardModRole>('game-mod');
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startPending] = useTransition();

    // Revisiting a board that already went live: there's nothing left to
    // flip, so the step reads as a review instead of a launch.
    const alreadyLive =
        data.completeness.steps.find((s) => s.step === 'boards')?.status ===
        'done';

    const reviewSteps = data.completeness.steps.filter(
        (s) => s.step !== 'boards',
    );
    const blockers = reviewSteps.filter((s) => s.status === 'blocker');
    const warnings = reviewSteps.filter((s) => s.status === 'warning');

    const firstUnconfiguredMain = data.categories
        .filter(
            (c) =>
                !c.archived && (c.isMain ?? false) && !(c.rules ?? '').trim(),
        )
        .sort(
            (a, b) =>
                (b.totalFinishedAttemptCount ?? 0) -
                (a.totalFinishedAttemptCount ?? 0),
        )[0];

    const editLinkFor = (s: (typeof reviewSteps)[number]) => {
        // An unfinished category-setup step means one specific category is
        // missing rules — send the moderator into that category's editor
        // rather than back to the hub to hunt for it.
        if (
            s.step === 'category-setup' &&
            s.status !== 'done' &&
            firstUnconfiguredMain
        ) {
            return `/games-v2/${encodeURIComponent(data.game.name)}/setup?step=category-setup&cat=${firstUnconfiguredMain.id}`;
        }
        return `/games-v2/${encodeURIComponent(data.game.name)}/setup?step=${s.step}`;
    };

    const addMod = () => {
        startPending(async () => {
            setError(null);
            const res = await addGameModeratorAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                username,
                role,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setMods((ms) => [
                ...ms,
                {
                    assignmentId: res.result.assignmentId,
                    // userId is unknown here (backend resolved it by username);
                    // it's refreshed from the server list on next mount, and
                    // the list only renders username/role, so this is fine.
                    userId: -1,
                    username: res.result.username,
                    role,
                    createdAt: new Date().toISOString(),
                },
            ]);
            setUsername('');
            toast.success(`Added ${res.result.username}`);
        });
    };

    const removeMod = (m: GameModerator) => {
        const admins = mods.filter((x) => x.role === 'game-admin');
        if (m.role === 'game-admin' && admins.length <= 1) {
            toast.error('A board needs at least one board admin.');
            return;
        }
        startPending(async () => {
            const res = await removeGameModeratorAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                assignmentId: m.assignmentId,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setMods((ms) =>
                ms.filter((x) => x.assignmentId !== m.assignmentId),
            );
        });
    };

    const finish = () => {
        startPending(async () => {
            setError(null);
            const res = await setGameConfiguredAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setDone(true);
        });
    };

    if (done) {
        return (
            <div className={`${styles.section} text-center py-5`}>
                <h2>Your board is live</h2>
                <p className="text-muted">
                    Runs are on the board and your standards are active. Point
                    runners at the submission form and keep an eye on the queue.
                </p>
                <div className="d-flex gap-2 justify-content-center">
                    <Link
                        href={`/games-v2/${encodeURIComponent(data.game.name)}/manage`}
                        className={styles.primaryAction}
                    >
                        Go to your console
                    </Link>
                    <Link
                        href={`/games-v2/${encodeURIComponent(data.game.name)}`}
                        className={styles.secondaryAction}
                    >
                        View your board
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h3 className="h6">Mod team</h3>
            <p className="text-muted small">
                {alreadyLive
                    ? 'Your board is already live. Adjust the mod team here, and use the list below to jump back into any step.'
                    : 'Add a co-mod or two so the queue doesn’t depend on you alone. Then check the list below and put the board live.'}
            </p>
            <ul className={`${styles.rows} mb-2`}>
                {mods.map((m) => (
                    <li key={m.assignmentId} className={styles.rowItem}>
                        <strong>{m.username}</strong>
                        <span className={styles.pendingPill}>
                            {m.role === 'game-admin'
                                ? 'board admin'
                                : 'moderator'}
                        </span>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger ms-auto"
                            disabled={isPending}
                            onClick={() => removeMod(m)}
                        >
                            Remove
                        </button>
                    </li>
                ))}
                {mods.length === 0 && (
                    <li className={`${styles.rowItem} text-muted`}>
                        No moderators listed yet (the backend mod list may not
                        be deployed — you can still finish setup).
                    </li>
                )}
            </ul>
            <div className="d-flex gap-2 mb-4">
                <input
                    className="form-control w-auto"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Twitch username"
                />
                <select
                    className="form-select w-auto"
                    value={role}
                    onChange={(e) => setRole(e.target.value as BoardModRole)}
                >
                    <option value="game-mod">Moderator</option>
                    <option value="game-admin">Board admin</option>
                </select>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={isPending || !username.trim()}
                    onClick={addMod}
                >
                    Add
                </button>
            </div>

            <h3 className="h6">{alreadyLive ? 'Review' : 'Review & finish'}</h3>
            <ul className={`${styles.rows} mb-3`}>
                {reviewSteps.map((s) => (
                    <li key={s.step} className={styles.rowItem}>
                        <span
                            className={
                                s.status === 'blocker'
                                    ? styles.textDanger
                                    : s.status === 'warning'
                                      ? styles.textWarning
                                      : s.status === 'done'
                                        ? styles.textSuccess
                                        : 'text-muted'
                            }
                        >
                            {s.status === 'done' ? (
                                <Check2 size={14} aria-hidden />
                            ) : (
                                <Dot size={14} aria-hidden />
                            )}
                        </span>
                        <strong>{SETUP_STEP_LABELS[s.step]}</strong>
                        <span className="text-muted small">{s.summary}</span>
                        <Link href={editLinkFor(s)} className="ms-auto small">
                            edit
                        </Link>
                    </li>
                ))}
            </ul>
            {blockers.length > 0 && (
                <div className={styles.errorNote}>
                    Fix before finishing:{' '}
                    {blockers.map((b) => b.summary).join(' · ')}
                </div>
            )}
            {warnings.length > 0 && blockers.length === 0 && (
                <div className={styles.warnNote}>
                    Not blocking, but worth a look:{' '}
                    {warnings.map((w) => w.summary).join(' · ')}
                </div>
            )}
            {error && <div className={styles.errorNote}>{error}</div>}
            {alreadyLive ? (
                <Link
                    href={`/games-v2/${encodeURIComponent(data.game.name)}/manage`}
                    className={styles.primaryAction}
                >
                    Back to console
                </Link>
            ) : (
                <button
                    type="button"
                    className={styles.primaryAction}
                    disabled={isPending || blockers.length > 0}
                    onClick={finish}
                >
                    {isPending ? 'Putting it live…' : 'Put the board live'}
                </button>
            )}
        </div>
    );
}

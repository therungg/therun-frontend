'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import type {
    LeaderboardRosterRow,
    ModTiming,
    RunnerRef,
} from '../../../../../../types/moderation.types';
import { createManualTimeAction } from '../moderation/shared/actions/manual-times.action';
import { parseTimeInput } from '../moderation/shared/time-format';
import styles from './board-curation.module.scss';

/**
 * Resolves a typed name to a real user's `RunnerRef` when it exactly matches
 * (case-insensitively) a runner already loaded for this board/subcategory,
 * else falls back to a guest entry.
 *
 * This is a best-effort match against already-fetched data, not a user
 * directory lookup: the public search index (`findUserOrRun`) returns only
 * display fields (username, avatar, counts) with no numeric user id, and
 * manual-time creation's `RunnerRef` has no username-resolution variant on
 * the backend the way role assignment does — so there's no cheap way to
 * turn arbitrary typed text into a real `userId`. Per the task-11 brief,
 * that means a name that doesn't match someone already on this board's
 * roster is always added as a guest.
 */
export function resolveRunnerRef(
    name: string,
    knownRunners: Pick<LeaderboardRosterRow, 'userId' | 'runnerName'>[],
): RunnerRef {
    const trimmed = name.trim();
    const match = knownRunners.find(
        (r) =>
            r.userId != null &&
            r.runnerName.toLowerCase() === trimmed.toLowerCase(),
    );
    return match?.userId != null
        ? { userId: match.userId }
        : { guestName: trimmed };
}

export interface AddRunnerRowProps {
    category: ResolvedCategory;
    subcategoryKey: string;
    gameSlug: string;
    /** The board's currently-loaded roster (not just on-board rows) — the
     * pool `resolveRunnerRef` matches typed names against. */
    knownRunners: Pick<LeaderboardRosterRow, 'userId' | 'runnerName'>[];
    onMutated: () => void;
}

/**
 * Ghost row at the end of the curation table: type a name + a time, hit Add,
 * and it lands via the same manual-time path Fix-time uses — just for a
 * runner who doesn't have an entry on this board/subcategory yet.
 */
export function AddRunnerRow({
    category,
    subcategoryKey,
    gameSlug,
    knownRunners,
    onMutated,
}: AddRunnerRowProps) {
    const [name, setName] = useState('');
    const [timeText, setTimeText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isAdding, startAdding] = useTransition();

    const modTiming: ModTiming =
        category.primaryTiming === 'gt' ? 'gametime' : 'realtime';

    const handleAdd = () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Enter a runner name.');
            return;
        }
        const parsed = parseTimeInput(timeText);
        if (parsed == null || Number.isNaN(parsed)) {
            setError('Enter a valid time (h:mm:ss, m:ss, or m:ss.SSS).');
            return;
        }
        startAdding(async () => {
            const res = await createManualTimeAction(gameSlug, {
                runnerRef: resolveRunnerRef(trimmedName, knownRunners),
                categoryId: category.id,
                subcategoryKey,
                timing: modTiming,
                timeMs: parsed,
                reason: 'Added during board curation',
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setName('');
            setTimeText('');
            setError(null);
            toast.success('Runner added.');
            onMutated();
        });
    };

    return (
        <tr className={styles.ghostRow}>
            <td className={styles.selectCell} aria-hidden="true" />
            <td className={styles.rank} aria-hidden="true" />
            <td colSpan={2}>
                <input
                    type="text"
                    className={styles.ghostInput}
                    placeholder="Add a runner…"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdd();
                        }
                    }}
                    disabled={isAdding}
                    aria-label="Runner name"
                />
            </td>
            <td>
                <input
                    type="text"
                    className={`${styles.ghostInput} ${styles.ghostTimeInput}`}
                    placeholder="e.g. 35:48"
                    value={timeText}
                    onChange={(e) => setTimeText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdd();
                        }
                    }}
                    disabled={isAdding}
                    aria-label="Runner time"
                />
                {error && <span className={styles.timeError}>{error}</span>}
            </td>
            <td className={styles.actionsCell}>
                <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={handleAdd}
                    disabled={isAdding || !name.trim() || !timeText.trim()}
                >
                    {isAdding ? 'Adding…' : 'Add'}
                </button>
            </td>
        </tr>
    );
}

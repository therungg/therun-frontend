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

type KnownRunner = Pick<LeaderboardRosterRow, 'userId' | 'runnerName'>;

/**
 * Finds a registered runner (real `userId`, not a guest row) already loaded
 * for this board/subcategory whose name exactly matches (case-insensitively)
 * the typed text. Returns `null` for an empty/whitespace-only name or no
 * match — the case that resolves to a guest entry.
 *
 * This is a best-effort match against already-fetched data, not a user
 * directory lookup: the public search index (`findUserOrRun`) returns only
 * display fields (username, avatar, counts) with no numeric user id, and
 * manual-time creation's `RunnerRef` has no username-resolution variant on
 * the backend the way role assignment does — so there's no cheap way to
 * turn arbitrary typed text into a real `userId`. Per the task-11 brief,
 * that means a name that doesn't match someone already on this board's
 * roster is always added as a guest. Exported so the component can drive
 * live "matched runner" / "will be added as a guest" feedback off the same
 * lookup `resolveRunnerRef` uses, rather than duplicating the match logic.
 */
export function findMatchedRunner(
    name: string,
    knownRunners: KnownRunner[],
): KnownRunner | null {
    const trimmed = name.trim();
    if (!trimmed) return null;
    return (
        knownRunners.find(
            (r) =>
                r.userId != null &&
                r.runnerName.toLowerCase() === trimmed.toLowerCase(),
        ) ?? null
    );
}

/** Resolves a typed name to a real user's `RunnerRef` via `findMatchedRunner`,
 * else falls back to a guest entry. See `findMatchedRunner` for why a
 * non-matching name always becomes a guest. */
export function resolveRunnerRef(
    name: string,
    knownRunners: KnownRunner[],
): RunnerRef {
    const trimmed = name.trim();
    const match = findMatchedRunner(name, knownRunners);
    return match?.userId != null
        ? { userId: match.userId }
        : { guestName: trimmed };
}

export interface AddRunnerRowProps {
    category: ResolvedCategory;
    subcategoryKey: string;
    gameSlug: string;
    /** The board's currently-loaded roster (not just on-board rows) — the
     * pool `resolveRunnerRef`/`findMatchedRunner` match typed names against. */
    knownRunners: KnownRunner[];
    /** Whether the table is drawing the non-ranked clock, so this row keeps
     *  the same column count as the rows above it. */
    showSecondary: boolean;
    onMutated: () => void;
}

/**
 * Ghost row at the end of the curation table: type a name + a time, hit Add,
 * and it lands via the same manual-time path Fix-time uses — just for a
 * runner who doesn't have an entry on this board/subcategory yet.
 *
 * Because a typed name can silently resolve to either a real user or a
 * guest (see `findMatchedRunner`), a live one-line indicator under the name
 * field — and an echo in the Add button's label — makes it unambiguous
 * which one is about to happen before the mod commits to it.
 */
export function AddRunnerRow({
    category,
    subcategoryKey,
    gameSlug,
    knownRunners,
    showSecondary,
    onMutated,
}: AddRunnerRowProps) {
    const [name, setName] = useState('');
    const [timeText, setTimeText] = useState('');
    // Optional achievement date; empty => the entry shows its created-at.
    const [dateText, setDateText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isAdding, startAdding] = useTransition();

    const modTiming: ModTiming =
        category.primaryTiming === 'gt' ? 'gametime' : 'realtime';

    const matchedRunner = findMatchedRunner(name, knownRunners);

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
                runnerRef:
                    matchedRunner?.userId != null
                        ? { userId: matchedRunner.userId }
                        : { guestName: trimmedName },
                categoryId: category.id,
                subcategoryKey,
                timing: modTiming,
                timeMs: parsed,
                runDate: dateText || null,
                reason: 'Added during board curation',
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setName('');
            setTimeText('');
            setDateText('');
            setError(null);
            toast.success('Runner added.');
            onMutated();
        });
    };

    return (
        <tr className={styles.ghostRow}>
            <td className={styles.selectCell} aria-hidden="true" />
            <td className={styles.rank} aria-hidden="true" />
            <td>
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
                <div className={styles.ghostMatchNote}>
                    {name.trim() &&
                        (matchedRunner
                            ? `Matched runner: ${matchedRunner.runnerName} — links to their account`
                            : 'Will be added as a guest entry')}
                </div>
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
            {/* A new entry has one time; this holds the table's shape so
                the Add button stays under Actions. */}
            {showSecondary && <td aria-hidden="true" />}
            <td className={styles.when}>
                <input
                    type="date"
                    className={styles.ghostInput}
                    value={dateText}
                    onChange={(e) => setDateText(e.target.value)}
                    disabled={isAdding}
                    aria-label="Date achieved (optional)"
                    title="Date achieved (optional)"
                />
            </td>
            <td className={styles.actionsCell}>
                <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={handleAdd}
                    disabled={isAdding || !name.trim() || !timeText.trim()}
                >
                    {isAdding
                        ? 'Adding…'
                        : matchedRunner
                          ? `Add for ${matchedRunner.runnerName}`
                          : 'Add guest'}
                </button>
            </td>
        </tr>
    );
}

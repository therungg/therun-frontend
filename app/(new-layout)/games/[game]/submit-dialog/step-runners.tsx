'use client';

import { useId } from 'react';
import { playersRangeSentence } from '~src/lib/run-view/roster';
import type { PlayersRange } from '../../../../../types/leaderboards.types';
import {
    maxPartnerRows,
    newPartnerRow,
    type PartnerRow,
    retypeRow,
} from './partner-rows';
import styles from './submit-run-dialog.module.scss';

interface Props {
    /** Whoever the run is filed for — the signed-in runner, or the runner a
     * moderator picked. They hold the first seat implicitly and are never a
     * partner row. */
    teamLeadName: string;
    /** The lead has no therun account: a moderator filed under a plain name. */
    teamLeadIsGuest: boolean;
    players: PlayersRange | null;
    rows: PartnerRow[];
    onRowsChange: (rows: PartnerRow[]) => void;
    /** A refusal about who the submission credits — the board's range, the
     * per-hour credit ceiling — shown verbatim, as the server wrote it. */
    sectionError: string | null;
    /** What stops the submission, once they have tried to make it. */
    blocker: string | null;
    pending: boolean;
}

/**
 * Who the run credits, as part of filing it.
 *
 * A co-op board's entry is invalid the moment it is filed solo, so the
 * partners belong in the submission rather than in an edit afterwards — and
 * the server agrees: it refuses a filing whose team is outside the board's
 * range (guide §11.2), which is why the count is checked here before the
 * typed time can be lost to a refusal.
 *
 * One field per partner, and it takes a therun username: an account is
 * credited on their profile, told they were credited and can take themselves
 * off, and a guest is none of those. The guest fallback exists, but only
 * after the server has refused the username and only if the runner takes it
 * explicitly (guide §2).
 */
export function StepRunners({
    teamLeadName,
    teamLeadIsGuest,
    players,
    rows,
    onRowsChange,
    sectionError,
    blocker,
    pending,
}: Props) {
    const idPrefix = useId();
    const range = playersRangeSentence(players);
    const canAddRow = rows.length < maxPartnerRows(players);

    const setRow = (index: number, next: PartnerRow) => {
        const copy = rows.slice();
        copy[index] = next;
        onRowsChange(copy);
    };

    return (
        <section className={styles.runners}>
            <h3 className={styles.runnersTitle}>Runners</h3>
            <p className={styles.hint}>
                {range ? `${range} ` : ''}
                Anyone with a therun account is credited as soon as this is
                filed, is told about it, and can take themselves off.
            </p>

            <ul className={styles.runnersList}>
                <li className={styles.runnersLead}>
                    <span className={styles.runnerName}>{teamLeadName}</span>
                    <span className={styles.runnersLeadNote}>
                        {teamLeadIsGuest
                            ? 'this run is filed under this name'
                            : 'this run is filed under this account'}
                    </span>
                </li>
                {rows.map((row, index) => {
                    const fieldId = `${idPrefix}-${row.key}`;
                    const term = row.value.trim();
                    return (
                        <li key={row.key} className={styles.runnersRow}>
                            <label
                                className={styles.fieldLabel}
                                htmlFor={fieldId}
                            >
                                Runner {index + 2}
                            </label>
                            <div className={styles.runnersField}>
                                <input
                                    id={fieldId}
                                    className="form-control"
                                    value={row.value}
                                    onChange={(e) =>
                                        setRow(
                                            index,
                                            retypeRow(row, e.target.value),
                                        )
                                    }
                                    placeholder="Their therun username"
                                    maxLength={64}
                                    disabled={pending}
                                />
                                {rows.length > 1 && (
                                    <button
                                        type="button"
                                        className={styles.btnSecondary}
                                        onClick={() =>
                                            onRowsChange(
                                                rows.filter(
                                                    (r) => r.key !== row.key,
                                                ),
                                            )
                                        }
                                        disabled={pending}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            {row.asGuest && (
                                <p className={styles.hint}>
                                    Credited as a guest: a name only, on
                                    nobody’s profile.
                                </p>
                            )}
                            {row.error && (
                                <div className={styles.fieldError}>
                                    {row.error}
                                </div>
                            )}
                            {/* The raw refusal is NOT repeated here. The
                                server says "no account named x" for a name
                                nobody has, a deleted account and an account
                                hidden on this board alike (guide §2), so
                                naming a cause would claim to know which. */}
                            {row.offerGuest && (
                                <div className={styles.runnersGuestOffer}>
                                    {/* Word for word the run page's own guest
                                        door (run-roster.tsx): two wordings
                                        read as two different things
                                        happening. */}
                                    <p className={styles.hint}>
                                        “{term}” is not on therun. Add them as
                                        guest?
                                    </p>
                                    <button
                                        type="button"
                                        className={styles.btnSecondary}
                                        onClick={() =>
                                            setRow(index, {
                                                ...row,
                                                asGuest: true,
                                                offerGuest: false,
                                                error: null,
                                            })
                                        }
                                        disabled={pending}
                                    >
                                        Add as guest
                                    </button>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            {canAddRow && (
                <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => onRowsChange([...rows, newPartnerRow()])}
                    disabled={pending}
                >
                    Add a runner…
                </button>
            )}

            {blocker && <div className={styles.fieldError}>{blocker}</div>}
            {sectionError && (
                <div className={styles.errorAlert} role="alert">
                    {sectionError}
                </div>
            )}
        </section>
    );
}

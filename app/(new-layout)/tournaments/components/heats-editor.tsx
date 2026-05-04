'use client';

import type { DateRange } from '../../../../types/tournament.types';
import styles from './tournament-form.module.scss';

function isoToLocalInput(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string {
    if (!local) return '';
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return local;
    return d.toISOString();
}

export function HeatsEditor({
    value,
    onChange,
}: {
    value: DateRange[];
    onChange: (next: DateRange[]) => void;
}) {
    function update(i: number, patch: Partial<DateRange>) {
        onChange(value.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
    }
    function remove(i: number) {
        onChange(value.filter((_, idx) => idx !== i));
    }
    function add() {
        onChange([...value, { startDate: '', endDate: '' }]);
    }

    return (
        <div className={styles.repeaterList}>
            {value.length === 0 && (
                <div className={styles.repeaterEmpty}>
                    No periods yet — add at least one window during which runs
                    count toward this tournament.
                </div>
            )}
            {value.map((h, i) => (
                <div key={i} className={styles.repeaterRow}>
                    <div className={styles.repeaterIndex}>#{i + 1}</div>
                    <div className={styles.repeaterFields}>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel}>Start</label>
                            <input
                                type="datetime-local"
                                className={styles.input}
                                value={isoToLocalInput(h.startDate)}
                                onChange={(e) =>
                                    update(i, {
                                        startDate: localInputToIso(
                                            e.target.value,
                                        ),
                                    })
                                }
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.fieldLabel}>End</label>
                            <input
                                type="datetime-local"
                                className={styles.input}
                                value={isoToLocalInput(h.endDate)}
                                onChange={(e) =>
                                    update(i, {
                                        endDate: localInputToIso(
                                            e.target.value,
                                        ),
                                    })
                                }
                            />
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.repeaterRemove}
                        onClick={() => remove(i)}
                    >
                        Remove
                    </button>
                </div>
            ))}
            <button type="button" className={styles.repeaterAdd} onClick={add}>
                + Add another period
            </button>
        </div>
    );
}

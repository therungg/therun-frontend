'use client';

import { RunTimesField } from '~src/components/time-input/run-times-field';
import type { ModTiming } from '../../../../../types/moderation.types';
import styles from './submit-run-dialog.module.scss';

/** Local date as YYYY-MM-DD — the value format `<input type="date">` wants. */
export function todayISODate(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function isValidHttpUrl(raw: string): boolean {
    try {
        const u = new URL(raw);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

interface Props {
    /** The clock this board ranks by. */
    primaryTiming: ModTiming;
    /** True when the category shows both clocks, so both fields appear. */
    showSecondary: boolean;
    /** What this board calls its game-time clock ('igt' | 'lrt'). */
    gameTimeLabel: string;
    /** Milliseconds, or null while the field is empty. */
    timeMs: number | null;
    onTimeChange: (ms: number | null) => void;
    secondaryMs: number | null;
    onSecondaryChange: (ms: number | null) => void;
    runDate: string;
    onRunDateChange: (v: string) => void;
    vodUrl: string;
    onVodChange: (v: string) => void;
    vodTouched: boolean;
    onVodBlur: () => void;
}

/**
 * The time itself — one field per clock the board shows.
 *
 * This used to be a single time plus a radio asking which clock it was, which
 * left a board showing two columns with only ever one of them filled. Two
 * labeled fields answer that question by existing.
 */
export function StepTime({
    primaryTiming,
    showSecondary,
    gameTimeLabel,
    timeMs,
    onTimeChange,
    secondaryMs,
    onSecondaryChange,
    runDate,
    onRunDateChange,
    vodUrl,
    onVodChange,
    vodTouched,
    onVodBlur,
}: Props) {
    const vodInvalid =
        vodUrl.trim().length > 0 && !isValidHttpUrl(vodUrl.trim());

    return (
        <div className={styles.step}>
            <RunTimesField
                idPrefix="submit-time"
                primaryTiming={primaryTiming}
                gameTimeLabel={gameTimeLabel}
                showSecondary={showSecondary}
                primaryMs={timeMs}
                onPrimaryChange={onTimeChange}
                secondaryMs={secondaryMs}
                onSecondaryChange={onSecondaryChange}
                // A missing second clock is only worth saying once the first
                // one is there — an untouched form should not scold.
                showErrors={timeMs !== null}
            />

            <div>
                <label htmlFor="submit-date" className="form-label">
                    Date achieved
                </label>
                <input
                    id="submit-date"
                    type="date"
                    className="form-control"
                    value={runDate}
                    max={todayISODate()}
                    onChange={(e) => onRunDateChange(e.target.value)}
                />
                <p className={styles.hint}>
                    Leave empty to date it from today.
                </p>
            </div>

            <div>
                <label htmlFor="submit-vod" className="form-label">
                    Video link
                </label>
                <input
                    id="submit-vod"
                    type="url"
                    className={`form-control ${
                        vodTouched && vodInvalid ? 'is-invalid' : ''
                    }`}
                    placeholder="https://…"
                    value={vodUrl}
                    onChange={(e) => onVodChange(e.target.value)}
                    onBlur={onVodBlur}
                />
                {vodTouched && vodInvalid ? (
                    <div className={styles.fieldError}>
                        Enter a full http(s) link.
                    </div>
                ) : (
                    <p className={styles.hint}>
                        Optional, but a run with a video is verified faster.
                    </p>
                )}
            </div>
        </div>
    );
}

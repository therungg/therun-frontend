'use client';

import { DurationField } from '~src/components/time-input/duration-field';
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
    /** True when the category shows both clocks, so the timing is a choice. */
    timingChoice: boolean;
    timing: ModTiming;
    onTimingChange: (t: ModTiming) => void;
    /** What this board calls its game-time clock ('igt' | 'lrt'). */
    gameTimeLabel: string;
    /** Milliseconds, or null while the field is empty. */
    timeMs: number | null;
    onTimeChange: (ms: number | null) => void;
    runDate: string;
    onRunDateChange: (v: string) => void;
    vodUrl: string;
    onVodChange: (v: string) => void;
    vodTouched: boolean;
    onVodBlur: () => void;
}

/**
 * The time itself. A manual time asserts one clock, so this takes a single
 * time — on a board that ranks both, which clock it is becomes a choice
 * rather than two fields.
 */
export function StepTime({
    timingChoice,
    timing,
    onTimingChange,
    gameTimeLabel,
    timeMs,
    onTimeChange,
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
            {timingChoice && (
                <fieldset>
                    <legend className="form-label">Timing</legend>
                    <div className="d-flex gap-3">
                        <label className="d-flex align-items-center gap-2">
                            <input
                                type="radio"
                                name="submit-timing"
                                checked={timing === 'realtime'}
                                onChange={() => onTimingChange('realtime')}
                            />
                            Real time
                        </label>
                        <label className="d-flex align-items-center gap-2">
                            <input
                                type="radio"
                                name="submit-timing"
                                checked={timing === 'gametime'}
                                onChange={() => onTimingChange('gametime')}
                            />
                            {gameTimeLabel.toUpperCase()}
                        </label>
                    </div>
                </fieldset>
            )}

            <DurationField
                id="submit-time"
                label="Time"
                size="lg"
                value={timeMs}
                onChange={onTimeChange}
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

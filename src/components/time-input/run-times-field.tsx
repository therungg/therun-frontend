'use client';

import { formatDuration } from '~src/lib/duration';
import {
    otherTiming,
    secondaryRequired,
    secondaryVisible,
    validateRunTimes,
} from '~src/lib/run-times';
import type { ModTiming } from '../../../types/moderation.types';
import { DurationField } from './duration-field';
import styles from './run-times-field.module.scss';

interface Props {
    /** The clock this board ranks by. */
    primaryTiming: ModTiming;
    /** What this board calls its game-time clock: 'igt' or 'lrt'. */
    gameTimeLabel: string;
    /** The category's "also show the other clock" switch. */
    showSecondary: boolean;
    primaryMs: number | null;
    onPrimaryChange: (ms: number | null) => void;
    secondaryMs: number | null;
    onSecondaryChange: (ms: number | null) => void;
    /** `lg` in a dialog, `sm` in a table row. */
    size?: 'lg' | 'sm';
    disabled?: boolean;
    /** Errors stay quiet until the form has been tried. */
    showErrors?: boolean;
    onEnter?: () => void;
    /** For a dialog that focuses the first field on open. */
    inputRef?: React.RefObject<HTMLInputElement | null>;
    idPrefix?: string;
}

/** The clock's name as a board says it: IGT, LRT, or Real time. */
export function clockName(timing: ModTiming, gameTimeLabel: string): string {
    if (timing === 'realtime') return 'Real time';
    return gameTimeLabel.toLowerCase() === 'lrt' ? 'LRT' : 'IGT';
}

/**
 * A submission's clocks, side by side.
 *
 * A board that shows two clocks used to take one time and a radio asking which
 * clock it was, which left one of its two columns permanently empty. Two
 * labeled fields answer that question by existing, so the radio is gone.
 *
 * A game-timed board asks for the real time too — required when it has a
 * column for it. A real-time board asks for nothing else at all.
 */
export function RunTimesField({
    primaryTiming,
    gameTimeLabel,
    showSecondary,
    primaryMs,
    onPrimaryChange,
    secondaryMs,
    onSecondaryChange,
    size = 'lg',
    disabled,
    showErrors,
    onEnter,
    inputRef,
    idPrefix = 'run-times',
}: Props) {
    const secondTiming = otherTiming(primaryTiming);
    const required = secondaryRequired(primaryTiming, showSecondary);
    // A real-time board never asks for game time, whatever its columns say.
    const askSecondary = secondaryVisible(primaryTiming);
    const verdict = validateRunTimes({
        primaryTiming,
        showSecondary,
        primaryMs,
        secondaryMs,
    });

    const primaryName = clockName(primaryTiming, gameTimeLabel);
    const secondaryName = clockName(secondTiming, gameTimeLabel);

    return (
        <div
            className={styles.group}
            role="group"
            aria-label="Run times"
            data-paired={askSecondary ? 'true' : 'false'}
        >
            <div className={styles.fields}>
                <div className={styles.field}>
                    <DurationField
                        id={`${idPrefix}-primary`}
                        label={primaryName}
                        size={size}
                        value={primaryMs}
                        onChange={onPrimaryChange}
                        disabled={disabled}
                        onEnter={onEnter}
                        inputRef={inputRef}
                        aria-label={`${primaryName} — the time this board ranks by`}
                    />
                    {showErrors && verdict.errors.primary && (
                        <p className={styles.error}>{verdict.errors.primary}</p>
                    )}
                </div>

                {askSecondary && (
                    <div className={styles.field}>
                        <div className={styles.secondaryLabel}>
                            <span>{secondaryName}</span>
                            <span
                                className={
                                    required ? styles.required : styles.optional
                                }
                            >
                                {required ? 'Required' : 'Optional'}
                            </span>
                        </div>
                        <DurationField
                            id={`${idPrefix}-secondary`}
                            size={size}
                            value={secondaryMs}
                            onChange={onSecondaryChange}
                            disabled={disabled}
                            onEnter={onEnter}
                            aria-label={`${secondaryName} — ${
                                required ? 'required' : 'optional'
                            } on this board`}
                        />
                        {showErrors && verdict.errors.secondary && (
                            <p className={styles.error}>
                                {verdict.errors.secondary}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Two numbers the runner typed, and the one thing they imply —
                shown so a transposed pair is obvious before it is submitted. */}
            {verdict.warnings.secondary ? (
                <p className={styles.warning}>{verdict.warnings.secondary}</p>
            ) : (
                verdict.loadsMs !== null && (
                    <p className={styles.loads}>
                        Loads <strong>{formatDuration(verdict.loadsMs)}</strong>
                    </p>
                )
            )}
        </div>
    );
}

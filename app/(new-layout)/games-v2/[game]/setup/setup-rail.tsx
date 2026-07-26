'use client';

import { useId, useState } from 'react';
import { Check2, ChevronDown, Dot } from 'react-bootstrap-icons';
import type {
    SetupStepId,
    SetupStepState,
    SetupStepStatus,
} from '~src/lib/setup/completeness';
import { SETUP_STEPS, setupStepMeta } from '~src/lib/setup/steps';
import styles from './setup.module.scss';

interface Props {
    steps: SetupStepState[];
    active: SetupStepId;
    doneCount: number;
    totalCount: number;
    onSelect: (id: SetupStepId) => void;
}

/**
 * Persistent step rail. Renders the per-step `summary` that computeCompleteness
 * already produces, so an open blocker on a later step is legible from any step
 * — and gives each step a full-height hit area instead of a hairline segment.
 */
export function SetupRail({
    steps,
    active,
    doneCount,
    totalCount,
    onSelect,
}: Props) {
    const [open, setOpen] = useState(false);
    const listId = useId();
    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const activeLabel = setupStepMeta(active).label;

    const select = (id: SetupStepId) => {
        setOpen(false);
        onSelect(id);
    };

    return (
        <nav className={styles.rail} aria-label="Setup steps">
            {/* Compact-viewport trigger; hidden on wide viewports, where the
                same progress summary is always visible above the rows. */}
            <button
                type="button"
                className={styles.railTrigger}
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen((o) => !o)}
            >
                <RailProgress
                    doneCount={doneCount}
                    totalCount={totalCount}
                    pct={pct}
                    activeLabel={activeLabel}
                />
                <ChevronDown
                    size={14}
                    className={`${styles.railChevron} ${
                        open ? styles.railChevronOpen : ''
                    }`}
                    aria-hidden
                />
            </button>

            <div className={styles.railHead}>
                <RailProgress
                    doneCount={doneCount}
                    totalCount={totalCount}
                    pct={pct}
                />
            </div>

            <ul
                id={listId}
                className={`${styles.railList} ${
                    open ? styles.railListOpen : ''
                }`}
            >
                {SETUP_STEPS.map((meta) => {
                    const state = steps.find((s) => s.step === meta.id);
                    const status = state?.status ?? 'todo';
                    const isActive = meta.id === active;
                    return (
                        <li key={meta.id}>
                            <button
                                type="button"
                                className={`${styles.railItem} ${
                                    isActive ? styles.railItemActive : ''
                                }`}
                                aria-current={isActive ? 'step' : undefined}
                                onClick={() => select(meta.id)}
                            >
                                <StatusGlyph status={status} />
                                <span className={styles.railItemText}>
                                    <span className={styles.railItemLabel}>
                                        <span
                                            className={styles.railItemNum}
                                            aria-hidden
                                        >
                                            {meta.num}
                                        </span>
                                        {meta.label}
                                    </span>
                                    {state && (
                                        <span
                                            className={styles.railItemSummary}
                                        >
                                            {state.summary}
                                        </span>
                                    )}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

function RailProgress({
    doneCount,
    totalCount,
    pct,
    activeLabel,
}: {
    doneCount: number;
    totalCount: number;
    pct: number;
    activeLabel?: string;
}) {
    return (
        <span className={styles.railProgress}>
            <span className={styles.railProgressLine}>
                <span className={styles.eyebrow}>Setup</span>
                <span className={styles.railCount}>
                    {activeLabel
                        ? `${doneCount}/${totalCount}`
                        : `${doneCount} of ${totalCount} done`}
                </span>
                {activeLabel && (
                    <span className={styles.railTriggerStep}>
                        {activeLabel}
                    </span>
                )}
            </span>
            <span
                className={styles.railMeter}
                role="progressbar"
                aria-label="Setup progress"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <span
                    className={styles.railMeterFill}
                    style={{ width: `${pct}%` }}
                />
            </span>
        </span>
    );
}

const TONE: Record<SetupStepStatus, string> = {
    done: styles.toneDone,
    todo: styles.toneTodo,
    warning: styles.toneWarning,
    blocker: styles.toneBlocker,
};

// Status is carried by icon shape and tone for sighted users; spell it out so
// it isn't colour-only information.
const STATUS_TEXT: Record<SetupStepStatus, string> = {
    done: 'Done',
    todo: 'Not done',
    warning: 'Needs attention',
    blocker: 'Blocked',
};

function StatusGlyph({ status }: { status: SetupStepStatus }) {
    const Icon = status === 'done' ? Check2 : Dot;
    return (
        <>
            <Icon
                size={16}
                className={`${styles.railGlyph} ${TONE[status]}`}
                aria-hidden
            />
            <span className="visually-hidden">{STATUS_TEXT[status]}: </span>
        </>
    );
}

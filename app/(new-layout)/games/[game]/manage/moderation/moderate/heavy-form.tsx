'use client';

import {
    type ReactNode,
    type RefObject,
    useEffect,
    useRef,
    useState,
} from 'react';
import type { RejectionReasonKey } from '../../../../../../../types/moderation.types';
import { ReasonKeyPicker } from '../shared/reason-key-picker';
import { ReasonZone } from '../shared/run-action-parts';
import styles from './moderate-panel.module.scss';
import { type ModerateVerb, VERB_EFFECT, VERB_LABEL } from './verbs';

/**
 * What the runner is told, as the end of a sentence that starts with their
 * name. Follows what the backend actually notifies: verdicts, manual time
 * create, verdict and delete, and a video request. `null` means the runner
 * is not told.
 */
const RUNNER_IS_TOLD: Record<ModerateVerb, string | null> = {
    approve: 'is told the run was approved.',
    decline: 'is told the run was declined, with this reason.',
    remove: null,
    restore: 'is told the run is back on the board.',
    send_back: 'is told the run is pending again.',
    ask_video: 'is asked to add a video.',
    // A correction is written to the run (or the manual time) and to the
    // history. Neither path sends the runner anything today.
    set_time: null,
    retime: null,
    move: null,
    reassign: 'and the new runner are told the run changed owner.',
    hide_identity: null,
    mark: null,
    note: null,
    add_run: 'is told a run was added for them.',
    ban: null,
    lift_ban: null,
};

export interface HeavyFormSpec {
    verb: ModerateVerb;
    /** Part 1. One sentence with the real numbers, from the caller's preview. */
    whatChanges: ReactNode;
    /** Who the After part names: the runner, or "Each runner" for a selection. */
    runnerName: string;
    /**
     * What the runner is told, ending a sentence that starts with their name,
     * when it differs from the verb's usual line. `null` = not told.
     */
    told?: string | null;
    /** Where undo lives, e.g. "Restore from history". Generic line when absent. */
    undoHint?: string;
    /** Set when the preview says this cannot be undone; the reason, shown in red. */
    notUndoable: string | null;
    /** Decline uses canned keys plus an optional note. Everything else is free text. */
    reasonKeys: boolean;
    minReason: number;
    /** The action button label, naming the action: "Decline run", "Ban from Super Mario 64". */
    actionLabel: string;
    /** Danger for verbs that take something away; primary for Set time, Move and Add run. */
    tone: 'danger' | 'primary';
    /** Scope cards for ban/hide identity, board picker for move, time input for set time. */
    fields?: ReactNode;
    /** Set while the fields are not filled in (no time typed, same board picked). Holds the action button. */
    blocked?: boolean;
    /** Why the action button is held, shown beside it while it is disabled. */
    blockedHint?: string;
}

export interface HeavyFormState {
    reason: string;
    setReason: (v: string) => void;
    reasonKey: RejectionReasonKey | null;
    setReasonKey: (k: RejectionReasonKey | null) => void;
    ready: boolean;
    /** The reason field, so the action button can send the cursor to it. */
    reasonFieldRef: RefObject<HTMLTextAreaElement | null>;
}

export function useHeavyForm(spec: HeavyFormSpec | null): HeavyFormState {
    const [reason, setReason] = useState('');
    const [reasonKey, setReasonKey] = useState<RejectionReasonKey | null>(null);
    const reasonFieldRef = useRef<HTMLTextAreaElement>(null);
    const verb = spec?.verb;
    // A different verb is a different form: start it empty.
    useEffect(() => {
        setReason('');
        setReasonKey(null);
    }, [verb]);
    const ready = spec
        ? spec.reasonKeys
            ? reasonKey !== null &&
              // "Other" is not a reason on its own: it needs the words.
              (reasonKey !== 'other' || reason.trim().length >= spec.minReason)
            : reason.trim().length >= spec.minReason
        : false;
    return {
        reason,
        setReason,
        reasonKey,
        setReasonKey,
        ready,
        reasonFieldRef,
    };
}

function BellIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.tellIcon} aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
    );
}

function UndoIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.tellIcon} aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
        </svg>
    );
}

function WarnIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.tellIcon} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
        </svg>
    );
}

export function HeavyFormBody({
    spec,
    state,
    busy,
}: {
    spec: HeavyFormSpec;
    state: HeavyFormState;
    busy: boolean;
}) {
    const told =
        spec.told !== undefined ? spec.told : RUNNER_IS_TOLD[spec.verb];
    const reasonRef = useRef<HTMLElement>(null);
    const fieldRef = state.reasonFieldRef;
    // A free-text reason that is still too short. Said on the label, where
    // the writing happens, and not only beside a button at the far end.
    const reasonShort =
        !spec.reasonKeys && state.reason.trim().length < spec.minReason;
    // Opening a form puts the cursor on its reason: the first canned key
    // when there are any, the text field otherwise.
    const verb = spec.verb;
    useEffect(() => {
        const first =
            reasonRef.current?.querySelector<HTMLInputElement>(
                'input[type="radio"]',
            ) ?? fieldRef.current;
        first?.focus();
    }, [verb]);
    return (
        <div className={styles.form}>
            <div className={styles.formTitle}>
                <h4>{VERB_LABEL[spec.verb]}</h4>
                <span>{VERB_EFFECT[spec.verb]}</span>
            </div>
            <div className={styles.formBody}>
                <section className={styles.part}>
                    <span className={styles.partLabel}>What changes</span>
                    {spec.fields}
                    <p className={styles.consequence}>{spec.whatChanges}</p>
                </section>
                <section
                    ref={reasonRef}
                    className={`${styles.part} ${styles.reasonPart}`}
                >
                    <span className={styles.partLabel}>
                        Reason
                        {/* A verb that takes a reason key cannot run on
                            typed words, and nothing said so until the button
                            refused. Said here, before the writing. */}
                        {spec.reasonKeys ? (
                            <span className={styles.partRequired}>
                                Pick one
                            </span>
                        ) : reasonShort ? (
                            <span className={styles.partRequired}>
                                Required, {spec.minReason} characters or more
                            </span>
                        ) : null}
                    </span>
                    {spec.reasonKeys ? (
                        <ReasonKeyPicker
                            value={state.reasonKey}
                            onChange={state.setReasonKey}
                            disabled={busy}
                        />
                    ) : null}
                    <ReasonZone
                        reason={state.reason}
                        onReasonChange={state.setReason}
                        required={!spec.reasonKeys}
                        minLength={spec.reasonKeys ? 0 : spec.minReason}
                        fieldRef={fieldRef}
                        disabled={busy}
                    />
                </section>
                <section className={styles.part}>
                    <span className={styles.partLabel}>After</span>
                    <div className={styles.tells}>
                        <p className={styles.tell}>
                            <BellIcon />
                            <span>
                                {told
                                    ? `${spec.runnerName} ${told}`
                                    : `${spec.runnerName} is not told.`}
                            </span>
                        </p>
                        {spec.notUndoable ? (
                            <p className={styles.tellWarn}>
                                <WarnIcon />
                                <span>
                                    Cannot be undone from history:{' '}
                                    {spec.notUndoable}
                                </span>
                            </p>
                        ) : (
                            <p className={styles.tell}>
                                <UndoIcon />
                                <span>
                                    {spec.undoHint
                                        ? `Can be undone: ${spec.undoHint}.`
                                        : 'Can be undone from history.'}
                                </span>
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

export function HeavyFormFooter(props: {
    spec: HeavyFormSpec;
    state: HeavyFormState;
    busy: boolean;
    onBack: () => void;
    onConfirm: (reason: string, reasonKey: RejectionReasonKey | null) => void;
}) {
    // What the form is still waiting for. A verb that takes a reason key
    // cannot run on typed words alone, and the button said nothing about it
    // — a moderator who wrote out why and found the button dead had no way
    // to learn that a reason had to be picked. The verb's own hint still
    // wins when it has one; this only speaks when nothing else would.
    const missing = (): string | null => {
        if (props.spec.blocked || props.busy) return null;
        if (props.state.ready) return null;
        if (props.spec.reasonKeys && props.state.reasonKey === null) {
            return 'Pick a reason above.';
        }
        const short = props.spec.minReason - props.state.reason.trim().length;
        if (short > 0) {
            return props.state.reason.trim().length === 0
                ? 'Say why.'
                : `${short} more character${short === 1 ? '' : 's'}.`;
        }
        return null;
    };
    // Only the words are missing. The button stays live and takes the
    // moderator to the field instead of sitting dead beside a quiet note.
    const onlyReasonMissing =
        !props.spec.blocked &&
        !props.busy &&
        !props.state.ready &&
        !(props.spec.reasonKeys && props.state.reasonKey === null);
    const hint =
        (props.spec.blocked || !props.state.ready) && props.spec.blockedHint
            ? props.spec.blockedHint
            : missing();
    return (
        <>
            <button
                type="button"
                className={styles.back}
                onClick={props.onBack}
                disabled={props.busy}
            >
                <svg
                    viewBox="0 0 24 24"
                    className={styles.chevron}
                    aria-hidden="true"
                >
                    <path d="m15 18-6-6 6-6" />
                </svg>
                Back <kbd className={styles.key}>esc</kbd>
            </button>
            <span className={styles.grow} />
            {/* The reason an action cannot run yet belongs to the button it
                is holding back, so the two are one object rather than a
                sentence floating beside a button. */}
            <span
                className={
                    hint
                        ? `${styles.actionGroup} ${styles.actionGroupHinted}`
                        : styles.actionGroup
                }
            >
                {hint && <span className={styles.blockedHint}>{hint}</span>}
                <button
                    type="button"
                    className={
                        props.spec.tone === 'primary'
                            ? styles.primary
                            : styles.danger
                    }
                    disabled={
                        !onlyReasonMissing &&
                        (!props.state.ready || props.busy || props.spec.blocked)
                    }
                    onClick={() => {
                        if (onlyReasonMissing) {
                            props.state.reasonFieldRef.current?.focus();
                            return;
                        }
                        props.onConfirm(
                            props.state.reason.trim(),
                            props.state.reasonKey,
                        );
                    }}
                >
                    {props.spec.actionLabel}
                </button>
            </span>
        </>
    );
}

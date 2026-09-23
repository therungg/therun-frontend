'use client';

import { type ReactNode, useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type {
    EffectiveSettings,
    SettingsPreview,
    VerificationSettingsView,
} from '../../../../../../../types/verification-settings.types';
import {
    HintBubble,
    InlineError,
    SegmentedControl,
    SwitchField,
} from '../../shared/form-kit';
import {
    previewVerificationSettingsAction,
    saveVerificationSettingsAction,
} from './actions/verification-settings.action';
import styles from './settings-editor.module.scss';
import {
    canPreview,
    formFrom,
    fullInputFrom,
    inputFrom,
    isDirty,
    previewSentences,
    type SettingsForm,
    validateForm,
    videoRuleAppliedMessage,
} from './settings-model';

interface Props {
    gameSlug: string;
    /** The board these settings belong to, or null for the game's own
     *  defaults. A category save writes only the sections the moderator
     *  changed, so the rest keeps following the game. */
    categoryId?: number | null;
    effective: EffectiveSettings;
    enforced: boolean;
    /** Whether any setting has been saved for this game. When false, the
     *  defaults can be saved as they stand. */
    configured?: boolean;
    onSaved: (view: VerificationSettingsView) => void;
}

export function SettingsEditor({
    gameSlug,
    categoryId = null,
    effective,
    enforced,
    configured,
    onSaved,
}: Props) {
    const original = formFrom(effective);
    const [form, setForm] = useState<SettingsForm>(original);
    const [preview, setPreview] = useState<SettingsPreview | null>(null);
    const [appliedMessage, setAppliedMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPreviewing, startPreview] = useTransition();
    const [isSaving, startSave] = useTransition();

    // A slow preview response for a form the moderator has since changed
    // again must not land on top of the newer form. Each preview call takes
    // a ticket; only the newest one is allowed to write state.
    const requestId = useRef(0);

    const set = <K extends keyof SettingsForm>(
        key: K,
        value: SettingsForm[K],
    ) => {
        setForm((f) => ({ ...f, [key]: value }));
        // Invalidate any preview immediately — it always describes the form
        // as it currently is. Bumping the ticket also stops a preview call
        // already in flight from landing on this now-different form.
        requestId.current++;
        setPreview(null);
        setAppliedMessage(null);
        setError(null);
    };

    const invalid = validateForm(form);
    const dirty = isDirty(form, original);
    // Nothing saved for the game yet and the form untouched: saving writes
    // the defaults as they stand, so a moderator who agrees with them isn't
    // stuck.
    const acceptDefaults =
        categoryId === null && configured === false && !dirty && !invalid;
    const input = invalid
        ? null
        : acceptDefaults
          ? fullInputFrom(form, categoryId)
          : inputFrom(form, original, categoryId, effective.videoRule.source);
    // Preview is optional: it shows what a change would touch, but saving
    // never waits on it.
    const offerPreview = input !== null && !acceptDefaults && canPreview(input);
    const canSave = (dirty || acceptDefaults) && !invalid && !isSaving;

    const runPreview = () => {
        if (!input) return;
        const ticket = ++requestId.current;
        startPreview(async () => {
            const res = await previewVerificationSettingsAction(
                gameSlug,
                input,
            );
            if (ticket !== requestId.current) return;
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setPreview(res.preview);
        });
    };

    const save = () => {
        if (!input || !canSave) return;
        startSave(async () => {
            const res = await saveVerificationSettingsAction(gameSlug, input);
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success('Settings saved.');
            setPreview(null);
            setAppliedMessage(
                videoRuleAppliedMessage(
                    res.videoRuleApplied ?? { hidden: 0, flagged: 0 },
                ),
            );
            onSaved(res.view);
        });
    };

    const sentences = preview ? previewSentences(preview, enforced) : [];

    return (
        <section className={styles.panel}>
            <SettingRow
                label="Auto-submission"
                hint="If turned on, a PB by a runner goes directly to the mod queue or to auto-verification. If turned off, the user has to submit the run themselves."
            >
                <SegmentedControl
                    label="Auto-submission"
                    labelHidden
                    value={form.timerRuns}
                    options={[
                        { value: 'direct', label: 'Allow' },
                        { value: 'runner_submits', label: 'Disallow' },
                    ]}
                    onChange={(v) =>
                        set('timerRuns', v as SettingsForm['timerRuns'])
                    }
                />
            </SettingRow>

            <SettingRow label="VOD requirement">
                <SegmentedControl
                    label="VOD required for"
                    labelHidden
                    value={form.videoRequire}
                    options={[
                        { value: 'nothing', label: 'Nothing' },
                        { value: 'top_n', label: 'The top runs' },
                        { value: 'under_time', label: 'Runs under a time' },
                        { value: 'everything', label: 'Every run' },
                    ]}
                    onChange={(v) =>
                        set('videoRequire', v as SettingsForm['videoRequire'])
                    }
                />
                {form.videoRequire === 'top_n' && (
                    <div className={styles.dial}>
                        <label className={styles.dialLabel}>
                            <span>A VOD is needed for the top</span>
                            <input
                                className={`form-control form-control-sm ${styles.dialInput}`}
                                inputMode="numeric"
                                value={form.videoTopN}
                                onChange={(e) =>
                                    set('videoTopN', e.target.value)
                                }
                            />
                            <span>runs</span>
                        </label>
                    </div>
                )}
                {form.videoRequire === 'under_time' && (
                    <div className={styles.dial}>
                        <label className={styles.dialLabel}>
                            <span>A VOD is needed for runs under</span>
                            <input
                                className={`form-control form-control-sm ${styles.dialInput} ${styles.dialWide}`}
                                inputMode="numeric"
                                value={form.videoTime}
                                onChange={(e) =>
                                    set('videoTime', e.target.value)
                                }
                            />
                        </label>
                        <HintBubble label="the time">
                            Type it the way a time is written: 30:00 for half an
                            hour, 1:29:59 for an hour and a half.
                        </HintBubble>
                    </div>
                )}
                {form.videoRequire !== 'nothing' && (
                    <SegmentedControl
                        label="When a run has no VOD"
                        hint="Asking the runner keeps the run off the board until they add one. The mod queue keeps it on the board while you look."
                        value={form.videoOnMissing}
                        options={[
                            {
                                value: 'hide',
                                label: 'Ask the runner to submit it first',
                            },
                            { value: 'flag', label: 'Put it in the mod queue' },
                        ]}
                        onChange={(v) =>
                            set(
                                'videoOnMissing',
                                v as SettingsForm['videoOnMissing'],
                            )
                        }
                    />
                )}
            </SettingRow>

            <SettingRow
                label="Auto-verification"
                hint="When a run is submitted we can check whether it verifies itself: whether the splits agree with the run time and the clock, whether live timing matches, how far it beats the runner's own golds and previous PB, how many verified runs they already have here, and how high it lands. If turned off, every submission goes to the mod queue."
            >
                <SegmentedControl
                    label="Auto-verification"
                    labelHidden
                    value={form.autoVerifyEnabled ? 'on' : 'off'}
                    options={[
                        { value: 'on', label: 'Turn on' },
                        { value: 'off', label: 'Turn off' },
                    ]}
                    onChange={(v) => set('autoVerifyEnabled', v === 'on')}
                />
                {form.autoVerifyEnabled && (
                    <div className={styles.dials}>
                        <div className={styles.dial}>
                            <label className={styles.dialLabel}>
                                <span>Never auto-verify the top</span>
                                <input
                                    className={`form-control form-control-sm ${styles.dialInput}`}
                                    inputMode="numeric"
                                    value={form.neverTopN}
                                    onChange={(e) =>
                                        set('neverTopN', e.target.value)
                                    }
                                />
                            </label>
                            <HintBubble label="the top runs rule">
                                A run landing in the top this many never
                                auto-verifies. It always goes to the mod queue.
                                Set it to 0 to turn that off.
                            </HintBubble>
                        </div>
                        <div className={styles.dial}>
                            <label className={styles.dialLabel}>
                                <span>A runner needs</span>
                                <input
                                    className={`form-control form-control-sm ${styles.dialInput}`}
                                    inputMode="numeric"
                                    value={form.minPriorVerifiedRuns}
                                    onChange={(e) =>
                                        set(
                                            'minPriorVerifiedRuns',
                                            e.target.value,
                                        )
                                    }
                                />
                                <span>verified runs on this game first</span>
                            </label>
                            <HintBubble label="verified runs needed first">
                                Never auto-verify a runner until a mod has
                                verified this many of their runs on this game
                                before. Runs that arrived already verified from
                                an import count too; ones this setting cleared
                                itself do not.
                            </HintBubble>
                        </div>
                        <div className={styles.dial}>
                            <label className={styles.dialLabel}>
                                <span>A run may beat their own PB by</span>
                                <input
                                    className={`form-control form-control-sm ${styles.dialInput}`}
                                    inputMode="decimal"
                                    value={form.maxPbJumpSeconds}
                                    onChange={(e) =>
                                        set('maxPbJumpSeconds', e.target.value)
                                    }
                                />
                                <span className={styles.dialSuffix}>
                                    seconds
                                </span>
                            </label>
                            <HintBubble label="the PB improvement limit">
                                If a run beats that runner's own PB by more than
                                this it is worth a look, so it goes to the mod
                                queue instead of verifying itself. It is not
                                checked for someone with no runs on this board
                                yet.
                            </HintBubble>
                        </div>
                        <div className={styles.dial}>
                            <SwitchField
                                id="live-required"
                                label="Only auto-verify if the run was timed with therun.gg LiveSplit"
                                checked={form.liveRequired}
                                onChange={(v) => set('liveRequired', v)}
                            />
                            <HintBubble label="the live requirement">
                                A live run only matches when it started and
                                finished at the same moments, so this is what
                                ties a submitted run to one that was watched
                                happening.
                            </HintBubble>
                        </div>
                    </div>
                )}
            </SettingRow>

            {preview && (
                <section className={styles.preview} aria-live="polite">
                    <h4 className={styles.previewTitle}>If you save this</h4>
                    <ul>
                        {sentences.map((s) => (
                            <li key={s}>{s}</li>
                        ))}
                    </ul>
                </section>
            )}

            <div className={styles.errorSlot}>
                <InlineError>{error ?? (dirty ? invalid : null)}</InlineError>
            </div>

            <div className={styles.footer}>
                {dirty && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                            setForm(original);
                            requestId.current++;
                            setPreview(null);
                            setAppliedMessage(null);
                            setError(null);
                        }}
                        disabled={isSaving}
                    >
                        Reset
                    </button>
                )}
                {offerPreview && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={runPreview}
                        disabled={!dirty || !!invalid || isPreviewing}
                    >
                        {isPreviewing ? 'Checking runs…' : 'Preview'}
                    </button>
                )}
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={save}
                    disabled={!canSave}
                >
                    {isSaving ? 'Saving…' : 'Save'}
                </button>
            </div>
            {appliedMessage && (
                <p className={styles.appliedNote}>{appliedMessage}</p>
            )}
        </section>
    );
}

/** One answer: its name in the label column, its controls in the control
 *  column, a hairline above it. */
function SettingRow({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className={styles.row}>
            <div className={styles.rowLabel}>
                {label}
                {hint && <HintBubble label={label}>{hint}</HintBubble>}
            </div>
            <div className={styles.rowControl}>{children}</div>
        </div>
    );
}

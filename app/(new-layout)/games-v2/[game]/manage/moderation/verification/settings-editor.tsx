'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type {
    EffectiveSettings,
    SettingsPreview,
    VerificationSettingsView,
} from '../../../../../../../types/verification-settings.types';
import {
    FormSection,
    HintBubble,
    InlineError,
    SectionFooter,
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
    needsPreview,
    previewSentences,
    type SettingsForm,
    validateForm,
} from './settings-model';

interface Props {
    gameSlug: string;
    effective: EffectiveSettings;
    enforced: boolean;
    /** Whether any setting has been saved for this game. When false, the
     *  defaults can be saved as they stand. */
    configured?: boolean;
    onSaved: (view: VerificationSettingsView) => void;
}

export function SettingsEditor({
    gameSlug,
    effective,
    enforced,
    configured,
    onSaved,
}: Props) {
    const original = formFrom(effective);
    const [form, setForm] = useState<SettingsForm>(original);
    const [preview, setPreview] = useState<SettingsPreview | null>(null);
    const [applyToExisting, setApplyToExisting] = useState(false);
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
        setApplyToExisting(false);
        setError(null);
    };

    const invalid = validateForm(form);
    const dirty = isDirty(form, original);
    // Nothing saved for the game yet and the form untouched: saving writes
    // the defaults as they stand, so a moderator who agrees with them isn't
    // stuck. Unchanged values act on nothing, so no preview is needed.
    const acceptDefaults = configured === false && !dirty && !invalid;
    const input = invalid
        ? null
        : acceptDefaults
          ? fullInputFrom(form, null)
          : inputFrom(form, original, null);
    const mustPreview =
        input !== null && !acceptDefaults && needsPreview(input);
    const offerPreview = input !== null && !acceptDefaults && canPreview(input);
    const canSave =
        (dirty || acceptDefaults) &&
        !invalid &&
        (!mustPreview || preview !== null) &&
        !isSaving;

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
            const res = await saveVerificationSettingsAction(gameSlug, {
                ...input,
                ...(input.videoRule && applyToExisting
                    ? { applyVideoRuleToExisting: true }
                    : {}),
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success('Settings saved.');
            setPreview(null);
            setApplyToExisting(false);
            onSaved(res.view);
        });
    };

    const sentences = preview ? previewSentences(preview, enforced) : [];
    const offerApply =
        !!preview?.videoRule &&
        preview.videoRule.wouldHide + preview.videoRule.wouldFlag > 0 &&
        enforced;

    return (
        <div className={styles.editor}>
            <FormSection
                title="Auto-submission"
                titleHint="If turned on, a PB by a runner goes directly to the mod queue or to auto-verification. If turned off, the user has to submit the run themselves."
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
            </FormSection>

            <FormSection
                title="Auto-verification"
                titleHint="When a run is submitted we can check whether it verifies itself: whether the splits agree with the run time and the clock, whether live timing matches, how far it beats the runner's own golds and previous PB, how many verified runs they already have here, and how high it lands. If turned off, every submission goes to the mod queue."
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
                                auto-verifies — it always goes to the mod queue.
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
                                    value={form.maxPbJumpPct}
                                    onChange={(e) =>
                                        set('maxPbJumpPct', e.target.value)
                                    }
                                />
                                <span className={styles.dialSuffix}>%</span>
                            </label>
                            <HintBubble label="the PB improvement limit">
                                If a run beats that runner's own PB by more than
                                this it is worth a look, so it goes to the mod
                                queue instead of verifying itself. It is not
                                checked for someone with no runs on this board
                                yet.
                            </HintBubble>
                        </div>
                        <SegmentedControl
                            label="Live timing"
                            hint={
                                form.liveData === 'must_match'
                                    ? 'A run whose live timing disagrees with its splits reaches you. One with no live run at all is not judged either way.'
                                    : 'This board ignores live timing entirely.'
                            }
                            value={form.liveData}
                            options={[
                                {
                                    value: 'must_match',
                                    label: 'Must match the splits',
                                },
                                {
                                    value: 'uploads_off',
                                    label: 'No live uploads',
                                },
                            ]}
                            onChange={(v) =>
                                set('liveData', v as SettingsForm['liveData'])
                            }
                        />
                    </div>
                )}
            </FormSection>

            <FormSection title="What needs a video">
                <SegmentedControl
                    label="Video required for"
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
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>
                            How many top runs
                        </span>
                        <input
                            className="form-control form-control-sm"
                            inputMode="numeric"
                            value={form.videoTopN}
                            onChange={(e) => set('videoTopN', e.target.value)}
                        />
                    </label>
                )}
                {form.videoRequire === 'under_time' && (
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>
                            Under this time, in milliseconds
                        </span>
                        <input
                            className="form-control form-control-sm"
                            inputMode="numeric"
                            value={form.videoTimeMs}
                            onChange={(e) => set('videoTimeMs', e.target.value)}
                        />
                    </label>
                )}
                {form.videoRequire !== 'nothing' && (
                    <SegmentedControl
                        label="When a run has no video"
                        value={form.videoOnMissing}
                        options={[
                            {
                                value: 'hide',
                                label: 'Keep it off the board and ask the runner',
                            },
                            {
                                value: 'flag',
                                label: 'Keep it on the board and show it in the mod queue',
                            },
                        ]}
                        onChange={(v) =>
                            set(
                                'videoOnMissing',
                                v as SettingsForm['videoOnMissing'],
                            )
                        }
                    />
                )}
            </FormSection>

            {preview && (
                <section className={styles.preview} aria-live="polite">
                    <h4 className={styles.previewTitle}>If you save this</h4>
                    <ul>
                        {sentences.map((s) => (
                            <li key={s}>{s}</li>
                        ))}
                    </ul>
                    {offerApply && (
                        <SwitchField
                            id="apply-game"
                            label="Also apply the video rule to runs already on the board"
                            checked={applyToExisting}
                            onChange={setApplyToExisting}
                        />
                    )}
                </section>
            )}

            <InlineError>{error ?? (dirty ? invalid : null)}</InlineError>

            {!enforced && (
                <p className={styles.notice} role="status">
                    Saved settings are not active yet: video rules, closing
                    timer runs, limits on submitted times and automatic trust
                    are not enforced. Auto-verify, the review window and
                    reopening timer runs apply as soon as you save.
                </p>
            )}

            <SectionFooter>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                        setForm(original);
                        requestId.current++;
                        setPreview(null);
                        setApplyToExisting(false);
                        setError(null);
                    }}
                    disabled={!dirty || isSaving}
                >
                    Reset
                </button>
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
                    {isSaving
                        ? 'Saving…'
                        : acceptDefaults
                          ? 'Use these settings'
                          : 'Save'}
                </button>
            </SectionFooter>
            {mustPreview && !preview && dirty && !invalid && (
                <p className={styles.hint}>Preview before saving.</p>
            )}
        </div>
    );
}

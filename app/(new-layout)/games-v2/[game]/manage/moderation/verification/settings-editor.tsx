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
    formFrom,
    inputFrom,
    isDirty,
    needsPreview,
    PRESET_HINTS,
    PRESET_OPTIONS,
    previewSentences,
    type SettingsForm,
    sourceLabel,
    validateForm,
} from './settings-model';

interface Props {
    gameSlug: string;
    /** null edits the game default. */
    categoryId: number | null;
    effective: EffectiveSettings;
    enforced: boolean;
    onSaved: (view: VerificationSettingsView) => void;
    /** Category editors only: drop every override and inherit the game again. */
    onRemoveOverride?: () => void;
}

export function SettingsEditor({
    gameSlug,
    categoryId,
    effective,
    enforced,
    onSaved,
    onRemoveOverride,
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
    const input = invalid ? null : inputFrom(form, original, categoryId);
    const mustPreview = input !== null && needsPreview(input);
    const canSave =
        dirty && !invalid && (!mustPreview || preview !== null) && !isSaving;

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
            toast.success(
                categoryId === null
                    ? 'Game settings saved.'
                    : 'Category settings saved.',
            );
            setPreview(null);
            setApplyToExisting(false);
            onSaved(res.view);
        });
    };

    const sentences = preview ? previewSentences(preview) : [];
    const offerApply =
        !!preview?.videoRule &&
        preview.videoRule.wouldHide + preview.videoRule.wouldFlag > 0 &&
        enforced;

    return (
        <div className={styles.editor}>
            <FormSection
                title="What this board accepts"
                lede={sourceLabel(effective.intake.source)}
            >
                <SwitchField
                    id={`timer-${categoryId ?? 'game'}`}
                    label="Accept runs from the timer"
                    hint="When off, timer runs are still kept, but they stay off the board until this is turned back on."
                    checked={form.acceptTimer}
                    onChange={(v) => set('acceptTimer', v)}
                />
                <SegmentedControl
                    label="Who can submit a time by hand"
                    value={form.manualMode}
                    options={[
                        { value: 'anyone', label: 'Anyone' },
                        { value: 'account_age', label: 'Older accounts' },
                        { value: 'trusted', label: 'Trusted runners' },
                        { value: 'off', label: 'Nobody' },
                    ]}
                    onChange={(v) =>
                        set('manualMode', v as SettingsForm['manualMode'])
                    }
                />
                {form.manualMode === 'account_age' && (
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>
                            Account at least this many days old
                        </span>
                        <input
                            className="form-control form-control-sm"
                            inputMode="numeric"
                            value={form.manualDays}
                            onChange={(e) => set('manualDays', e.target.value)}
                        />
                    </label>
                )}
                {form.manualMode === 'trusted' && (
                    <p className={styles.hint}>
                        Trusted means a runner you trusted, or anyone with a
                        verified run on this game.
                    </p>
                )}
            </FormSection>

            <FormSection
                title="What's verified automatically"
                lede={sourceLabel(effective.autoVerify.source)}
            >
                <SegmentedControl
                    label="Auto-verify"
                    value={form.preset}
                    options={PRESET_OPTIONS}
                    onChange={(v) => set('preset', v as SettingsForm['preset'])}
                />
                <p className={styles.hint}>{PRESET_HINTS[form.preset]}</p>
                {form.preset !== 'off' && (
                    <>
                        <label className={styles.field}>
                            <span className={styles.fieldLabel}>
                                Never auto-verify the top
                            </span>
                            <input
                                className="form-control form-control-sm"
                                inputMode="numeric"
                                value={form.neverTopN}
                                onChange={(e) =>
                                    set('neverTopN', e.target.value)
                                }
                            />
                        </label>
                        <SwitchField
                            id={`live-${categoryId ?? 'game'}`}
                            label="Require therun.gg live tracking"
                            checked={form.requireLive}
                            onChange={(v) => set('requireLive', v)}
                        />
                    </>
                )}
                <SwitchField
                    id={`trust-${categoryId ?? 'game'}`}
                    label="Trust runners automatically"
                    hint="After this many verified runs on this game with none declined, their runs are verified without review."
                    checked={form.autoTrustOn}
                    onChange={(v) => set('autoTrustOn', v)}
                />
                {form.autoTrustOn && (
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>
                            Verified runs before trusting
                        </span>
                        <input
                            className="form-control form-control-sm"
                            inputMode="numeric"
                            value={form.autoTrustAfter}
                            onChange={(e) =>
                                set('autoTrustAfter', e.target.value)
                            }
                        />
                    </label>
                )}
            </FormSection>

            <FormSection
                title="What needs a video"
                lede={sourceLabel(effective.videoRule.source)}
            >
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
                <SegmentedControl
                    label="Review window"
                    value={form.windowMode}
                    options={[
                        { value: 'top_n', label: 'The top runs' },
                        { value: 'under_time', label: 'Runs under a time' },
                    ]}
                    onChange={(v) =>
                        set('windowMode', v as SettingsForm['windowMode'])
                    }
                />
                {form.windowMode === 'top_n' ? (
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>
                            Review the top
                        </span>
                        <input
                            className="form-control form-control-sm"
                            inputMode="numeric"
                            value={form.windowN}
                            onChange={(e) => set('windowN', e.target.value)}
                        />
                    </label>
                ) : (
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>
                            Review runs under this time, in milliseconds
                        </span>
                        <input
                            className="form-control form-control-sm"
                            inputMode="numeric"
                            value={form.windowTimeMs}
                            onChange={(e) =>
                                set('windowTimeMs', e.target.value)
                            }
                        />
                    </label>
                )}
                <p className={styles.hint}>
                    Runs outside the review window are not put in the mod queue.
                </p>
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
                            id={`apply-${categoryId ?? 'game'}`}
                            label="Also apply the video rule to runs already on the board"
                            hint="Off means only new runs are asked for a video."
                            checked={applyToExisting}
                            onChange={setApplyToExisting}
                        />
                    )}
                </section>
            )}

            <InlineError>{error ?? (dirty ? invalid : null)}</InlineError>

            <SectionFooter>
                {onRemoveOverride && (
                    <button
                        type="button"
                        className="btn btn-sm btn-link"
                        onClick={onRemoveOverride}
                        disabled={isSaving}
                    >
                        Use the game default
                    </button>
                )}
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
                {mustPreview && (
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
            </SectionFooter>
            {mustPreview && !preview && dirty && !invalid && (
                <p className={styles.hint}>
                    Preview before saving.
                    {input?.autoVerify && input.autoVerify.preset !== 'off'
                        ? ' Checking auto-verify replays up to 100 recent runs and takes a few seconds.'
                        : ''}
                </p>
            )}
        </div>
    );
}

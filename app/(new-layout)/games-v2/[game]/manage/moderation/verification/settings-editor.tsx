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
    /** null edits the game default. */
    categoryId: number | null;
    effective: EffectiveSettings;
    enforced: boolean;
    /** Game editor only: whether any setting has been saved for this game.
     *  When false, the defaults can be saved as they stand. */
    configured?: boolean;
    onSaved: (view: VerificationSettingsView) => void;
    /** Category editors only: drop every override and inherit the game again. */
    onRemoveOverride?: () => Promise<void>;
}

export function SettingsEditor({
    gameSlug,
    categoryId,
    effective,
    enforced,
    configured,
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
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [isRemoving, startRemove] = useTransition();

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
    const acceptDefaults =
        categoryId === null && configured === false && !dirty && !invalid;
    const input = invalid
        ? null
        : acceptDefaults
          ? fullInputFrom(form, categoryId)
          : inputFrom(form, original, categoryId);
    const mustPreview =
        input !== null && !acceptDefaults && needsPreview(input);
    const offerPreview = input !== null && !acceptDefaults && canPreview(input);
    const canSave =
        (dirty || acceptDefaults) &&
        !invalid &&
        (!mustPreview || preview !== null) &&
        !isSaving &&
        !isRemoving;

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

    const sentences = preview ? previewSentences(preview, enforced) : [];
    const offerApply =
        !!preview?.videoRule &&
        preview.videoRule.wouldHide + preview.videoRule.wouldFlag > 0 &&
        enforced;

    return (
        <div className={styles.editor}>
            <FormSection title="What this board accepts">
                <SegmentedControl
                    label="Runs from LiveSplit"
                    value={form.timerRuns}
                    options={[
                        { value: 'direct', label: 'Go straight on' },
                        {
                            value: 'runner_submits',
                            label: 'Runner submits them',
                        },
                    ]}
                    onChange={(v) =>
                        set('timerRuns', v as SettingsForm['timerRuns'])
                    }
                />
                <p className={styles.hint}>
                    {form.timerRuns === 'direct'
                        ? 'A new PB goes onto the board as soon as it syncs.'
                        : 'A new PB is held until its runner confirms it, retimes it against their video and checks the board rules.'}
                </p>
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
            </FormSection>

            <FormSection title="What's verified automatically">
                <SwitchField
                    id={`autoverify-${categoryId ?? 'game'}`}
                    label="Verify runs automatically when they pass every check"
                    checked={form.autoVerifyEnabled}
                    onChange={(v) => set('autoVerifyEnabled', v)}
                />
                <p className={styles.hint}>
                    {form.autoVerifyEnabled
                        ? 'Runs that clear every dial below go on verified. Everything else reaches you.'
                        : 'Nothing is verified automatically — every run reaches you.'}
                </p>
                {form.autoVerifyEnabled && (
                    <div className={styles.dials}>
                        <div className={styles.dialGroup}>
                            <label className={styles.dial}>
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
                            <label className={styles.dial}>
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
                            <p className={styles.dialNote}>
                                A run landing inside the top always reaches you,
                                however clean it looks — set it to 0 to turn
                                that off. Runs verified by you or by
                                speedrun.com count toward the second; ones this
                                setting cleared do not, so nobody builds a
                                record on its own say-so.
                            </p>
                        </div>

                        <div className={styles.dialGroup}>
                            <label className={styles.dial}>
                                <span>A split may beat their own best by</span>
                                <input
                                    className={`form-control form-control-sm ${styles.dialInput}`}
                                    inputMode="decimal"
                                    value={form.maxGoldBeatPct}
                                    onChange={(e) =>
                                        set('maxGoldBeatPct', e.target.value)
                                    }
                                />
                                <span className={styles.dialSuffix}>%</span>
                            </label>
                            <label className={styles.dial}>
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
                            <p className={styles.dialNote}>
                                Both compare a runner only to their own history,
                                so neither is checked for someone with no runs
                                on this board yet. Lower numbers send you more
                                runs.
                            </p>
                        </div>

                        <div className={styles.dialGroup}>
                            <SegmentedControl
                                label="Live timing"
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
                                    set(
                                        'liveData',
                                        v as SettingsForm['liveData'],
                                    )
                                }
                            />
                            <p className={styles.dialNote}>
                                {form.liveData === 'must_match'
                                    ? 'A run whose live timing disagrees with its splits reaches you. One with no live run at all is not judged either way.'
                                    : 'This board ignores live timing entirely.'}
                            </p>
                        </div>
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
                            id={`apply-${categoryId ?? 'game'}`}
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
                {onRemoveOverride &&
                    (confirmRemove ? (
                        <>
                            <span className={styles.hint}>
                                Remove this board's overrides?
                            </span>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() =>
                                    startRemove(async () => {
                                        await onRemoveOverride();
                                        setConfirmRemove(false);
                                    })
                                }
                                disabled={isRemoving || isSaving}
                            >
                                {isRemoving ? 'Removing…' : 'Remove'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-link"
                                onClick={() => setConfirmRemove(false)}
                                disabled={isRemoving}
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-sm btn-link"
                            onClick={() => setConfirmRemove(true)}
                            disabled={isSaving}
                        >
                            Use the game default
                        </button>
                    ))}
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

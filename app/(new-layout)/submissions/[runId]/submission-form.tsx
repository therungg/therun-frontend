'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { VodReviewWorkbench } from '~app/(new-layout)/games-v2/[game]/leaderboard/vod-review/vod-review-workbench';
import { FormSection } from '~app/(new-layout)/games-v2/[game]/manage/shared/form-kit';
import { submitPbAction } from '~src/actions/pb-submission.action';
import { RunTimesField } from '~src/components/time-input/run-times-field';
import { getFormattedString } from '~src/components/util/datetime';
import type { PbSubmissionForm } from '../../../../types/pb-submission.types';
import styles from '../submissions.module.scss';

/** A URL the workbench can actually load a video from. */
const isHttpUrl = (v: string) => /^https?:\/\/\S+$/i.test(v.trim());

export function SubmissionForm({ form }: { form: PbSubmissionForm }) {
    const router = useRouter();
    const [legitimate, setLegitimate] = useState(false);
    // Prefilled from the timer: the common case is confirming what it recorded.
    const [timeMs, setTimeMs] = useState<number | null>(form.timerTimeMs);
    const [gameTimeMs, setGameTimeMs] = useState<number | null>(
        form.timerGameTimeMs,
    );
    const [vodUrl, setVodUrl] = useState(form.vodUrl ?? '');
    const [retimedMs, setRetimedMs] = useState<number | null>(null);
    const [retimeOpen, setRetimeOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const vodOk = isHttpUrl(vodUrl);
    const videoMissing = form.videoRequired && !vodOk;
    const canSubmit = legitimate && timeMs !== null && !videoMissing && !busy;

    const submit = async () => {
        if (!canSubmit || timeMs === null) return;
        setBusy(true);
        setError(null);
        const res = await submitPbAction({
            runId: form.runId,
            legitimate: true,
            timeMs,
            gameTimeMs: gameTimeMs ?? null,
            ...(vodOk ? { vodUrl: vodUrl.trim() } : {}),
        });
        setBusy(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        toast.success('Submitted. A moderator will take it from here.');
        router.push('/submissions');
        router.refresh();
    };

    const hasRules = !!(form.rules.game || form.rules.category);

    return (
        <>
            {hasRules && (
                <FormSection
                    title="What this board asks of a run"
                    lede="You are confirming the run against these."
                >
                    <div className={styles.rules}>
                        {form.rules.game && (
                            <>
                                <div className={styles.rulesHeading}>
                                    Game rules
                                </div>
                                <div>{form.rules.game}</div>
                            </>
                        )}
                        {form.rules.category && (
                            <>
                                <div
                                    className={styles.rulesHeading}
                                    style={{
                                        marginTop: form.rules.game
                                            ? '0.75rem'
                                            : undefined,
                                    }}
                                >
                                    Board rules
                                </div>
                                <div>{form.rules.category}</div>
                            </>
                        )}
                    </div>
                </FormSection>
            )}

            <FormSection title="Was this run legitimate?">
                <div className="form-check">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="pb-legitimate"
                        checked={legitimate}
                        onChange={(e) => setLegitimate(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="pb-legitimate">
                        I ran this myself, and it follows the rules above.
                    </label>
                </div>
            </FormSection>

            <FormSection
                title="The time"
                lede="Prefilled from your timer. Change it if it is wrong."
            >
                <RunTimesField
                    idPrefix="pb-time"
                    primaryTiming="realtime"
                    gameTimeLabel="igt"
                    showSecondary={form.timerGameTimeMs !== null}
                    primaryMs={timeMs}
                    onPrimaryChange={setTimeMs}
                    secondaryMs={gameTimeMs}
                    onSecondaryChange={setGameTimeMs}
                    showErrors={timeMs === null}
                />
                <p className={styles.timerNote}>
                    Your timer recorded{' '}
                    {getFormattedString(String(form.timerTimeMs), true)}.
                </p>
            </FormSection>

            <FormSection
                title="Video"
                lede={
                    form.videoRequired
                        ? 'This board needs a video for a run at this rank.'
                        : 'Optional here, but a run with a video is reviewed faster.'
                }
            >
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>Link to the video</span>
                    <input
                        type="url"
                        className={`form-control ${
                            videoMissing && vodUrl ? 'is-invalid' : ''
                        }`}
                        placeholder="https://…"
                        value={vodUrl}
                        onChange={(e) => setVodUrl(e.target.value)}
                    />
                    {videoMissing && vodUrl !== '' && (
                        <span className={styles.hint}>
                            Enter a full http(s) link.
                        </span>
                    )}
                </label>

                {vodOk && (
                    <details
                        className={styles.retime}
                        onToggle={(e) => setRetimeOpen(e.currentTarget.open)}
                    >
                        <summary>Retime against the video (optional)</summary>
                        <p className={styles.hint}>
                            Step to the first and last frame of the run. The
                            time it works out can replace the one above.
                        </p>
                        {retimeOpen && (
                            <>
                                <VodReviewWorkbench
                                    mode="runner"
                                    url={vodUrl.trim()}
                                    initial={{
                                        fps: 60,
                                        markers: [],
                                        realTimeMs: form.timerTimeMs,
                                        timing: 'realtime',
                                    }}
                                    onChange={(patch) =>
                                        setRetimedMs(patch?.retimedMs ?? null)
                                    }
                                />
                                {retimedMs !== null && retimedMs !== timeMs && (
                                    <button
                                        type="button"
                                        className={`btn btn-outline-primary btn-sm ${styles.applyRetime}`}
                                        onClick={() => setTimeMs(retimedMs)}
                                    >
                                        Use{' '}
                                        {getFormattedString(
                                            String(retimedMs),
                                            true,
                                        )}
                                    </button>
                                )}
                            </>
                        )}
                    </details>
                )}
            </FormSection>

            <div className={styles.actions}>
                <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canSubmit}
                    onClick={submit}
                >
                    {busy ? 'Submitting…' : 'Submit this run'}
                </button>
                {!legitimate && (
                    <span className={styles.hint}>
                        Confirm the run above before submitting.
                    </span>
                )}
                {error && <span className="text-danger">{error}</span>}
            </div>
        </>
    );
}

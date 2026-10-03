'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { submitPbAction } from '~src/actions/pb-submission.action';
import { GameImage } from '~src/components/image/gameimage';
import type { VodReviewPatch } from '../../../../../types/leaderboards.types';
import type { ModTiming } from '../../../../../types/moderation.types';
import type { PbSubmissionForm } from '../../../../../types/pb-submission.types';
import { detectVod } from '../leaderboard/vod-review/player/types';
import { isValidHttpUrl, StepTime } from './step-time';
import styles from './submit-run-dialog.module.scss';

/**
 * The Submit a run header, for a run that already exists: the game, then the
 * board it is on.
 */
export function PrefilledSubmitHeader({
    titleId,
    gameDisplay,
    gameImage,
    boardLabel,
}: {
    titleId: string;
    gameDisplay: string | null;
    gameImage: string | null;
    boardLabel: string | null;
}) {
    return (
        <div className={styles.header}>
            <div className={styles.headerGame}>
                {gameDisplay && (
                    <GameImage
                        src={gameImage ?? 'noimage'}
                        alt={gameDisplay}
                        quality="small"
                        width={36}
                        height={48}
                        style={{ width: 36, height: 48, objectFit: 'cover' }}
                        className={styles.headerArt}
                    />
                )}
                <div>
                    {(gameDisplay || boardLabel) && (
                        <div className={styles.headerGameName}>
                            {[gameDisplay, boardLabel]
                                .filter(Boolean)
                                .join(' · ')}
                        </div>
                    )}
                    <h2 id={titleId} className={styles.title}>
                        Submit a run
                    </h2>
                </div>
            </div>
        </div>
    );
}

/**
 * Submit a run, with the run's own time and video already filled in: the
 * time step of the Submit a run dialog, and its footer. Sending it puts the
 * run in front of a moderator.
 */
export function PrefilledSubmitForm({
    form,
    timing = 'realtime',
    gameTimeLabel = 'igt',
    onCancel,
    onSubmitted,
}: {
    form: PbSubmissionForm;
    timing?: ModTiming;
    gameTimeLabel?: string;
    onCancel: () => void;
    onSubmitted: () => void;
}) {
    // The board's clock first, as the Submit a run dialog has it.
    const gt = timing === 'gametime';
    const [timeMs, setTimeMs] = useState<number | null>(
        gt ? (form.timerGameTimeMs ?? form.timerTimeMs) : form.timerTimeMs,
    );
    const [secondaryMs, setSecondaryMs] = useState<number | null>(
        gt ? form.timerTimeMs : form.timerGameTimeMs,
    );
    const [vodUrl, setVodUrl] = useState(form.vodUrl ?? '');
    const [vodTouched, setVodTouched] = useState(false);
    const [vodReview, setVodReview] = useState<VodReviewPatch | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const vod = vodUrl.trim();
    const vodOk = vod.length > 0 && isValidHttpUrl(vod);
    const valid =
        timeMs !== null &&
        (vod.length === 0 || vodOk) &&
        (!form.videoRequired || vodOk);

    const submit = async () => {
        if (!valid || timeMs === null) return;
        setSubmitting(true);
        setError(null);
        const realMs = gt ? secondaryMs : timeMs;
        const gameMs = gt ? timeMs : secondaryMs;
        const res = await submitPbAction({
            runId: form.runId,
            legitimate: true,
            timeMs: realMs ?? form.timerTimeMs,
            gameTimeMs: gameMs ?? null,
            ...(vodOk ? { vodUrl: vod } : {}),
            ...(vodOk && vodReview ? { vodReview } : {}),
        });
        setSubmitting(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        toast.success('Submitted. A moderator will take it from here.');
        onSubmitted();
    };

    return (
        <>
            <div className={styles.body}>
                <StepTime
                    primaryTiming={timing}
                    showSecondary={form.timerGameTimeMs !== null}
                    gameTimeLabel={gameTimeLabel}
                    defaultVodFps={60}
                    timeMs={timeMs}
                    onTimeChange={setTimeMs}
                    secondaryMs={secondaryMs}
                    onSecondaryChange={setSecondaryMs}
                    vodUrl={vodUrl}
                    onVodChange={(v) => {
                        if (detectVod(v)?.id !== detectVod(vodUrl)?.id) {
                            setVodReview(null);
                        }
                        setVodUrl(v);
                        setVodTouched(true);
                    }}
                    vodTouched={vodTouched}
                    onVodBlur={() => setVodTouched(true)}
                    vodReview={vodReview}
                    onVodReviewChange={setVodReview}
                    vodHint={
                        form.videoRequired
                            ? 'This board needs a video for this run.'
                            : null
                    }
                />
                {error && (
                    <div className={styles.errorAlert} role="alert">
                        {error}
                    </div>
                )}
            </div>
            <div className={styles.footer}>
                <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={styles.btnPrimary}
                    disabled={!valid || submitting}
                    onClick={() => void submit()}
                >
                    {submitting ? 'Submitting…' : 'Submit run'}
                </button>
            </div>
        </>
    );
}

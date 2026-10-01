'use client';

import { useState } from 'react';
import { formatDuration } from '~src/lib/duration';
import { isEmbeddableVod } from '~src/lib/vod-url';
import type { VodMarker } from '../../../../../../types/leaderboards.types';
import { startFrameOf } from '../../leaderboard/vod-review/split-nav';
import type { ModContext } from '../load-run-view';
import { formatGap } from '../run-format';
import { useOnOtherVideo } from '../run-media';
import type { RunViewModel } from '../run-view';
import { FactEditor } from './fact-editor';
import styles from './mod-layer.module.scss';
import type { RunVerbs } from './use-run-verbs';

const DEFAULT_FPS = 30;

function endFrameOf(markers: VodMarker[]): number | null {
    const e = markers.find((m) => m.kind === 'end');
    return e ? e.frame : null;
}

/** Under the video: where the run starts and ends on it, and the retime. */
export function MediaFoot({
    model,
    verbs,
}: {
    model: RunViewModel;
    verbs: RunVerbs;
}) {
    const review = model.vodReview;
    const fps = review?.fps ?? DEFAULT_FPS;
    // The moderator's marks win once they pin a start, as on the player.
    const modMarkers = review?.mod?.markers ?? null;
    const byMod = modMarkers != null && startFrameOf(modMarkers) != null;
    const markers = byMod ? modMarkers : (review?.runner?.markers ?? []);
    const start = startFrameOf(markers);
    const end = endFrameOf(markers);
    const canRetime = verbs.can('retime');
    const onOtherVideo = useOnOtherVideo(model);
    if (start == null && !canRetime) return null;

    const toMs = (frame: number) => Math.round((frame * 1000) / fps);
    const measured =
        start != null && end != null ? toMs(end) - toMs(start) : null;
    const time = model.realTime;
    // Within two frames reads as the same time.
    const off =
        measured != null &&
        time != null &&
        Math.abs(measured - time) > 2000 / fps
            ? measured - time
            : null;

    return (
        <div className={styles.mediaFoot}>
            <span>
                {start != null ? (
                    <>
                        {byMod ? 'Retimed' : "Runner's"} start{' '}
                        <span className={styles.mono}>
                            {formatDuration(toMs(start))}
                        </span>
                        {end != null && (
                            <>
                                {' '}
                                · end{' '}
                                <span className={styles.mono}>
                                    {formatDuration(toMs(end))}
                                </span>
                            </>
                        )}
                        {measured != null && time != null && (
                            <>
                                {' '}
                                ·{' '}
                                {off == null ? (
                                    <span className={styles.faster}>
                                        matches the time
                                    </span>
                                ) : (
                                    <span className={styles.statusPending}>
                                        {formatGap(off)} against the time
                                    </span>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    'Start and end not marked'
                )}
            </span>
            {canRetime && verbs.retimed ? (
                <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => void verbs.undoRetime()}
                    disabled={verbs.busy}
                >
                    Undo retime
                </button>
            ) : canRetime && onOtherVideo ? (
                <span>You can only retime Video 1</span>
            ) : canRetime ? (
                <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => void verbs.openVerb('retime')}
                >
                    Retime from video
                </button>
            ) : null}
        </div>
    );
}

/**
 * The left column when the run has no video to play: one line, amber when
 * the board wants a video on this run.
 */
export function NoVideo({
    model,
    mod,
    onChanged,
}: {
    model: RunViewModel;
    mod: ModContext;
    onChanged: () => void;
}) {
    const [adding, setAdding] = useState(false);
    if (model.vodUrl && !isEmbeddableVod(model.vodUrl)) {
        return (
            <div className={styles.noVideo}>
                Video can't play here ·{' '}
                <a href={model.vodUrl} target="_blank" rel="noreferrer">
                    open it
                </a>
            </div>
        );
    }
    if (adding) {
        return (
            <FactEditor
                edit={{ kind: 'video' }}
                label="Video"
                model={model}
                mod={mod}
                onClose={() => setAdding(false)}
                onSaved={() => {
                    setAdding(false);
                    onChanged();
                }}
            />
        );
    }
    const category = mod.sheet.categories.find(
        (c) => c.id === model.categoryId,
    );
    const rank = model.boardContext?.rank ?? null;
    const topN = category?.requireVideoTopN ?? null;
    const required =
        mod.provenance?.moderation.ineligibleReason === 'missing_video' ||
        category?.requireVideo === true ||
        (topN != null && rank != null && rank <= topN);

    return (
        <div
            className={`${styles.noVideo} ${required ? styles.noVideoRequired : ''}`}
        >
            <span>
                No video
                {required &&
                    (topN != null && category?.requireVideo !== true
                        ? ` · required for the top ${topN}`
                        : ' · this board requires one')}
            </span>
            <button
                type="button"
                className={styles.noVideoAdd}
                onClick={() => setAdding(true)}
            >
                Add one now
            </button>
        </div>
    );
}

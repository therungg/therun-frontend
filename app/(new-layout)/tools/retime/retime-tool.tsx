'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, type RefObject, useRef, useState } from 'react';
import { detectVod } from '~app/(new-layout)/games/[game]/leaderboard/vod-review/player/types';
import {
    createPlayheadStore,
    type PlayheadStore,
    usePlayhead,
} from '~app/(new-layout)/games/[game]/leaderboard/vod-review/playhead-store';
import {
    convertMarkers,
    retimeMs,
} from '~app/(new-layout)/games/[game]/leaderboard/vod-review/retime';
import {
    RetimeResult,
    RetimeSteps,
} from '~app/(new-layout)/games/[game]/leaderboard/vod-review/retime-steps';
import {
    type VodReviewControls,
    VodReviewWorkbench,
} from '~app/(new-layout)/games/[game]/leaderboard/vod-review/vod-review-workbench';
import { DurationField } from '~src/components/time-input/duration-field';
import type { VodReviewPatch } from '../../../../types/leaderboards.types';
import styles from '../tools.module.scss';

const DEFAULT_FPS = 60;

export function RetimeTool() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const url = params.get('url') ?? '';
    const expectedMs = parseMs(params.get('time'));
    const [input, setInput] = useState(url);
    const [expectedInput, setExpectedInput] = useState(expectedMs);
    const [invalid, setInvalid] = useState(false);

    const submit = (e?: FormEvent) => {
        e?.preventDefault();
        const next = input.trim();
        if (!detectVod(next)) {
            setInvalid(true);
            return;
        }
        setInvalid(false);
        const q = new URLSearchParams({ url: next });
        if (expectedInput) q.set('time', String(expectedInput));
        router.replace(`${pathname}?${q}`, { scroll: false });
    };

    const vod = url && detectVod(url) ? url : null;

    return (
        <>
            <form className={styles.form} onSubmit={submit}>
                <label className={styles.field}>
                    <span className={styles.label}>VOD link</span>
                    <input
                        type="url"
                        className="form-control"
                        placeholder="https://www.twitch.tv/videos/… or https://youtu.be/…"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            setInvalid(false);
                        }}
                    />
                </label>
                <label className={`${styles.field} ${styles.timeField}`}>
                    <span className={styles.label}>
                        Expected time{' '}
                        <span className={styles.optional}>optional</span>
                    </span>
                    <DurationField
                        value={expectedInput}
                        onChange={setExpectedInput}
                        onEnter={() => submit()}
                        size="sm"
                        inputClassName={styles.timeInput}
                    />
                </label>
                <button type="submit" className="btn btn-primary">
                    Load
                </button>
                {invalid && (
                    <p className={`${styles.error} ${styles.wideField} mb-0`}>
                        Only Twitch and YouTube VODs are supported.
                    </p>
                )}
            </form>

            {vod && <Workbench key={vod} url={vod} expectedMs={expectedMs} />}
        </>
    );
}

/**
 * The player on the left, the Start and End cards beside it, so marking never
 * needs a scroll away from the frame being marked.
 */
function Workbench({
    url,
    expectedMs,
}: {
    url: string;
    expectedMs: number | null;
}) {
    const [patch, setPatch] = useState<VodReviewPatch | null>(null);
    const controls = useRef<VodReviewControls | null>(null);
    const [playhead] = useState(createPlayheadStore);

    return (
        <div className={styles.retime}>
            <VodReviewWorkbench
                mode="runner"
                url={url}
                initial={{
                    fps: DEFAULT_FPS,
                    markers: [],
                    realTimeMs: expectedMs,
                    timing: 'realtime',
                }}
                onChange={setPatch}
                controlsRef={controls}
                playheadStore={playhead}
                hideActions
                autoFocus
            />
            <aside className={styles.retimeSide}>
                <Steps
                    patch={patch}
                    controls={controls}
                    store={playhead}
                    expectedMs={expectedMs}
                />
            </aside>
        </div>
    );
}

/** Kept apart so only the cards re-render as the playhead moves. */
function Steps({
    patch,
    controls,
    store,
    expectedMs,
}: {
    patch: VodReviewPatch | null;
    controls: RefObject<VodReviewControls | null>;
    store: PlayheadStore;
    /** The time the run should come to: the delta and the jump to the end
     *  are measured against it. */
    expectedMs: number | null;
}) {
    const playhead = usePlayhead(store);
    const placedFps = patch?.fps ?? playhead.fps;
    const placed = patch?.markers ?? [];
    const markers = convertMarkers(placed, placedFps, playhead.fps);

    return (
        <>
            <RetimeResult
                markers={markers}
                markedMs={retimeMs(placed, placedFps)}
                fps={playhead.fps}
                playhead={playhead}
                submittedMs={expectedMs}
                benchmark="expected"
            />
            <RetimeSteps
                markers={markers}
                fps={playhead.fps}
                playhead={playhead}
                submittedMs={expectedMs}
                benchmark="expected"
                controls={() => controls.current}
            />
        </>
    );
}

/** The expected time from the URL, in ms; anything but a positive whole
 *  number is no expected time. */
function parseMs(raw: string | null): number | null {
    if (!raw || !/^\d+$/.test(raw)) return null;
    const ms = Number(raw);
    return ms > 0 ? ms : null;
}

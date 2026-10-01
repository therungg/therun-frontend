'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { isEmbeddableVod } from '~src/lib/vod-url';
import {
    splitStartFrame,
    startFrameOf,
} from '../leaderboard/vod-review/split-nav';
import { useVodPlayer } from '../leaderboard/vod-review/use-vod-player';
import { runVideos } from './run-media-shared';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

const DEFAULT_FPS = 30;

type MediaApi = {
    seekToSplit: ((index: number) => void) | null;
    /** The video the viewer picked; null until they pick one. */
    picked: string | null;
    pick: (url: string) => void;
};
const MediaContext = createContext<MediaApi>({
    seekToSplit: null,
    picked: null,
    pick: () => undefined,
});
export const useRunMedia = () => useContext(MediaContext);

/** The video on screen: the picked one, else the first that can play here. */
export function currentVideo(
    model: RunViewModel,
    picked: string | null,
): string | null {
    const videos = runVideos(model);
    return picked != null && videos.includes(picked)
        ? picked
        : (videos.find((url) => isEmbeddableVod(url)) ?? null);
}

/** Whether a video other than the run's first is on screen. Retime and
 *  split jumps only work against the first. */
export function useOnOtherVideo(model: RunViewModel): boolean {
    const { picked } = useContext(MediaContext);
    const current = currentVideo(model, picked);
    return current != null && current !== model.vodUrl;
}

function VodPlayer({
    url,
    model,
    onSeekReady,
}: {
    url: string;
    model: RunViewModel;
    onSeekReady: (seek: MediaApi['seekToSplit']) => void;
}) {
    const fps = model.vodReview?.fps ?? DEFAULT_FPS;
    const player = useVodPlayer({ url, fps });
    // Mod markers win over the runner's when they carry a start marker:
    // they are the reviewed ones, but seeking needs a start.
    const modMarkers = model.vodReview?.mod?.markers ?? null;
    const markers =
        modMarkers && startFrameOf(modMarkers) != null
            ? modMarkers
            : (model.vodReview?.runner?.markers ?? []);
    const start = startFrameOf(markers);
    // The markers were set against the run's first video; another of its
    // videos has its own timeline, so split jumps stay off there.
    const canSeek =
        url === model.vodUrl &&
        player.status === 'ready' &&
        start != null &&
        model.splits.length > 0;

    const { seekToFrame } = player;
    const splits = model.splits;

    // Publish the seek function to the provider whenever seeking becomes
    // possible or impossible. Never call the parent setter during render.
    useEffect(() => {
        if (!canSeek || start == null) {
            onSeekReady(null);
            return;
        }
        onSeekReady((index: number) => {
            // Seek to where the segment begins, not to the split that ended it.
            const pos = splits.findIndex((s) => s.index === index);
            if (pos !== -1)
                seekToFrame(splitStartFrame(splits, pos, start, fps));
        });
    }, [canSeek, start, fps, splits, seekToFrame, onSeekReady]);

    return <div ref={player.containerRef} className={styles.player} />;
}

const SeekSetterContext = createContext<(s: MediaApi['seekToSplit']) => void>(
    () => {},
);

export function RunMediaProvider({ children }: { children: React.ReactNode }) {
    const [seekToSplit, setSeek] = useState<MediaApi['seekToSplit']>(null);
    const [picked, pick] = useState<string | null>(null);
    // Stable identity so VodPlayer's effect doesn't re-run every render.
    const [publish] = useState(
        () => (s: MediaApi['seekToSplit']) => setSeek(() => s),
    );
    return (
        <MediaContext.Provider value={{ seekToSplit, picked, pick }}>
            <SeekSetterContext.Provider value={publish}>
                {children}
            </SeekSetterContext.Provider>
        </MediaContext.Provider>
    );
}

export function RunMediaSlot({ model }: { model: RunViewModel }) {
    const setSeek = useContext(SeekSetterContext);
    const { picked, pick } = useContext(MediaContext);
    const videos = runVideos(model);
    const current = currentVideo(model, picked);
    if (current == null) return null;
    return (
        <div className={styles.media}>
            <VodPlayer
                key={current}
                url={current}
                model={model}
                onSeekReady={setSeek}
            />
            {videos.length > 1 && (
                // One pill per video; one that can't play here opens in a
                // new tab instead.
                <nav className={styles.videoPicker} aria-label="Videos">
                    {videos.map((url, i) =>
                        isEmbeddableVod(url) ? (
                            <button
                                key={url}
                                type="button"
                                className={
                                    url === current
                                        ? `${styles.videoPill} ${styles.videoPillActive}`
                                        : styles.videoPill
                                }
                                aria-pressed={url === current}
                                onClick={() => pick(url)}
                            >
                                Video {i + 1}
                            </button>
                        ) : (
                            <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.videoPill}
                            >
                                Video {i + 1} ↗
                            </a>
                        ),
                    )}
                </nav>
            )}
        </div>
    );
}

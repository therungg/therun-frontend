'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { isEmbeddableVod } from '~src/lib/vod-url';
import {
    splitTargetFrame,
    startFrameOf,
} from '../leaderboard/vod-review/split-nav';
import { useVodPlayer } from '../leaderboard/vod-review/use-vod-player';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';
import { SplitChart } from './split-chart';

const DEFAULT_FPS = 30;

type MediaApi = { seekToSplit: ((index: number) => void) | null };
const MediaContext = createContext<MediaApi>({ seekToSplit: null });
export const useRunMedia = () => useContext(MediaContext);

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
    const canSeek =
        player.status === 'ready' && start != null && model.splits.length > 0;

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
            const split = splits.find((s) => s.index === index);
            if (split)
                seekToFrame(splitTargetFrame(start, split.splitTimeMs, fps));
        });
    }, [canSeek, start, fps, splits, seekToFrame, onSeekReady]);

    return <div ref={player.containerRef} className={styles.player} />;
}

const SeekSetterContext = createContext<(s: MediaApi['seekToSplit']) => void>(
    () => {},
);

export function RunMediaProvider({ children }: { children: React.ReactNode }) {
    const [seekToSplit, setSeek] = useState<MediaApi['seekToSplit']>(null);
    // Stable identity so VodPlayer's effect doesn't re-run every render.
    const [publish] = useState(
        () => (s: MediaApi['seekToSplit']) => setSeek(() => s),
    );
    return (
        <MediaContext.Provider value={{ seekToSplit }}>
            <SeekSetterContext.Provider value={publish}>
                {children}
            </SeekSetterContext.Provider>
        </MediaContext.Provider>
    );
}

export function RunMediaSlot({ model }: { model: RunViewModel }) {
    const setSeek = useContext(SeekSetterContext);
    if (model.vodUrl && isEmbeddableVod(model.vodUrl)) {
        return (
            <div className={styles.media}>
                <VodPlayer
                    url={model.vodUrl}
                    model={model}
                    onSeekReady={setSeek}
                />
            </div>
        );
    }
    if (model.splits.length > 0) {
        return (
            <div className={styles.media}>
                <SplitChart splits={model.splits} />
            </div>
        );
    }
    return null;
}

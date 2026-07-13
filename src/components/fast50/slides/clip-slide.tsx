'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { CustomSlideComponent } from '../deck/deck';
import styles from '../deck/fast50.module.scss';
import { Reveal } from '../deck/primitives';

export const ClipSlide: CustomSlideComponent = ({ content, stage }) => {
    const clip = content.kind === 'clip' ? content.clip : null;
    const videoRef = useRef<HTMLVideoElement>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (stage >= 1) {
            video.play().catch(() => setFailed(true));
        } else {
            video.pause();
            video.currentTime = 0;
        }
    }, [stage]);

    if (!clip) return null;
    const playing = stage >= 1 && !failed;
    return (
        <div className={styles.slide}>
            <div
                className={styles.clipFrame}
                data-playing={playing || undefined}
            >
                {!failed ? (
                    <video
                        ref={videoRef}
                        src={clip.videoUrl}
                        preload="auto"
                        playsInline
                        onError={() => setFailed(true)}
                    />
                ) : null}
            </div>
            <div className={styles.slideContent}>
                <div className={styles.kicker}>Watch for this</div>
                <Reveal when={stage >= 0}>
                    <h1 className={styles.headline}>{clip.title}</h1>
                </Reveal>
                {clip.caption ? (
                    <Reveal when={stage >= 2}>
                        <div className={styles.subStat}>{clip.caption}</div>
                    </Reveal>
                ) : null}
            </div>
        </div>
    );
};

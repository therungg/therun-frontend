'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    evaluators,
    type SlideId,
} from '~src/components/fast50/deck/evaluators';
import fast50Styles from '~src/components/fast50/deck/fast50.module.scss';
import {
    CUSTOM_SLIDE_COMPONENTS,
    SLIDE_COMPONENTS,
} from '~src/components/fast50/slides/slide-registry';
import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import {
    customSlidesFromPrep,
    type PrepSessionData,
    type PrepSlideRef,
} from '~src/lib/fast50/prep.types';
import styles from './prep-studio.module.scss';

export const PreviewPane = ({
    dossier,
    data,
    selected,
}: {
    dossier: RunnerDossier;
    data: PrepSessionData;
    selected: PrepSlideRef | null;
}) => {
    const [stage, setStage] = useState(0);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.4);

    // isSlide distinguishes a real slide render (goes inside the scaled
    // 1920×1080 stage) from placeholder/warning text (renders as pane copy).
    let slide: React.ReactNode = (
        <p className={styles.itemMeta}>Select a slide to preview.</p>
    );
    let isSlide = false;
    if (selected) {
        if (selected.kind === 'stat') {
            const evaluate = evaluators[selected.id as SlideId];
            const evaluation = evaluate ? evaluate(dossier) : null;
            const Component = SLIDE_COMPONENTS[selected.id as SlideId];
            if (evaluation && Component) {
                isSlide = true;
                slide = (
                    <Component
                        dossier={dossier}
                        evaluation={evaluation}
                        stage={stage}
                        prep={data}
                    />
                );
            } else {
                slide = (
                    <p className={styles.warning}>
                        ⚠ no data for '{selected.id}' — this slide will be
                        dropped at showtime
                    </p>
                );
            }
        } else {
            const item = customSlidesFromPrep(data, dossier.deck).find(
                (c) => c.id === selected.id,
            );
            if (item) {
                const Component = CUSTOM_SLIDE_COMPONENTS[item.content.kind];
                isSlide = true;
                slide = (
                    <Component
                        dossier={dossier}
                        content={item.content}
                        stage={stage}
                    />
                );
            }
        }
    }

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setScale(el.clientWidth / 1920));
        ro.observe(el);
        return () => ro.disconnect();
    }, [isSlide]);
    return (
        <div className={`${styles.pane} ${styles.preview}`}>
            <div className={styles.row}>
                <span className={styles.paneTitle}>Preview</span>
                {[0, 1, 2].map((s) => (
                    <button
                        key={s}
                        type="button"
                        className={styles.tab}
                        data-active={stage === s || undefined}
                        onClick={() => setStage(s)}
                    >
                        stage {s}
                    </button>
                ))}
            </div>
            {isSlide ? (
                <div ref={viewportRef} className={styles.previewViewport}>
                    <div
                        className={`${styles.previewScale} ${fast50Styles.stage} ${fast50Styles.stageEmbedded}`}
                        style={{ transform: `scale(${scale})` }}
                    >
                        {slide}
                    </div>
                </div>
            ) : (
                slide
            )}
        </div>
    );
};

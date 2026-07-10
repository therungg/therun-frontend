'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useReducer, useRef, useState } from 'react';
import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import type { ComposedSlide } from './compose-deck';
import { deckReducer, initialDeckState, STAGES_PER_SLIDE } from './deck-state';
import type { SlideEvaluation, SlideId } from './evaluators';
import styles from './fast50.module.scss';

export type SlideComponent = React.ComponentType<{
    dossier: RunnerDossier;
    evaluation: SlideEvaluation;
    stage: number;
}>;

export const Deck = ({
    dossier,
    slides,
    components,
}: {
    dossier: RunnerDossier;
    slides: ComposedSlide[];
    components: Partial<Record<SlideId, SlideComponent>>;
}) => {
    const router = useRouter();
    const renderable = slides.filter((s) => components[s.id]);
    const [state, dispatch] = useReducer(deckReducer, initialDeckState);
    const [hudVisible, setHudVisible] = useState(false);
    const hudTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const ctx = {
        slideCount: renderable.length,
        stagesPerSlide: STAGES_PER_SLIDE,
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
                e.preventDefault();
                dispatch({ type: 'ADVANCE', ...ctx });
            } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
                e.preventDefault();
                dispatch({ type: 'BACK', ...ctx });
            } else if (e.key.toLowerCase() === 'b') {
                dispatch({ type: 'TOGGLE_BLACKOUT', ...ctx });
            } else if (e.key === 'Escape') {
                router.push('/fast50/screen');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx.slideCount, router]);

    useEffect(() => {
        const onMove = () => {
            setHudVisible(true);
            clearTimeout(hudTimer.current);
            hudTimer.current = setTimeout(() => setHudVisible(false), 2000);
        };
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, []);

    const current = renderable[state.slideIndex];
    if (!current) return null;
    const Component = components[current.id] as SlideComponent;

    return (
        <div className={styles.stage}>
            <Component
                key={current.id}
                dossier={dossier}
                evaluation={current.evaluation}
                stage={state.stage}
            />
            {state.blackout ? <div className={styles.blackout} /> : null}
            <div
                className={`${styles.hud} ${hudVisible ? styles.hudVisible : ''}`}
            >
                {renderable.map((s, i) => (
                    <button
                        key={s.id}
                        type="button"
                        title={s.id}
                        data-active={i === state.slideIndex || undefined}
                        data-overflow={s.overflow || undefined}
                        onClick={() =>
                            dispatch({ type: 'GOTO', index: i, ...ctx })
                        }
                    />
                ))}
            </div>
        </div>
    );
};

'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { loadCapture } from '~src/components/fast50/capture/capture-store';
import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import { postRunFromLive } from '~src/lib/fast50/post-run';
import { type ComposedSlide, composeDeck } from './compose-deck';
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

    // Post-run decks may have been captured live (before the backend history
    // caught up) and stashed in localStorage — prefer that over the
    // server-composed postRun when present.
    const effectiveDossier = useMemo(() => {
        if (dossier.deck !== 'post' || typeof window === 'undefined')
            return dossier;
        const captured = loadCapture(
            window.localStorage,
            dossier.runner.username,
            dossier.game.game,
            dossier.game.category,
        );
        if (!captured) return dossier;
        const postRun = postRunFromLive(
            captured.run,
            dossier.splits,
            'capture',
        );
        return postRun ? { ...dossier, postRun } : dossier;
    }, [dossier]);

    const effectiveSlides = useMemo(
        () =>
            effectiveDossier === dossier
                ? slides
                : composeDeck(effectiveDossier),
        [effectiveDossier, dossier, slides],
    );

    const renderable = effectiveSlides.filter((s) => components[s.id]);
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
                dossier={effectiveDossier}
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

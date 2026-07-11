'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useReducer, useRef, useState } from 'react';
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

// Post-run decks may have been captured live (before the backend history
// caught up) and stashed in localStorage — prefer that over the
// server-composed postRun when present. The read is deferred to a
// post-mount effect so the first client render matches the SSR HTML
// (reading localStorage during render would cause a hydration mismatch).
const useEffectiveDossier = (
    dossier: RunnerDossier,
    slides: ComposedSlide[],
): { dossier: RunnerDossier; slides: ComposedSlide[] } => {
    const [override, setOverride] = useState<{
        dossier: RunnerDossier;
        slides: ComposedSlide[];
    } | null>(null);

    useEffect(() => {
        setOverride(null);
        if (dossier.deck !== 'post') return;
        const captured = loadCapture(
            window.localStorage,
            dossier.runner.username,
            dossier.game.game,
            dossier.game.category,
        );
        if (!captured) return;
        const postRun = postRunFromLive(
            captured.run,
            dossier.splits,
            'capture',
        );
        if (!postRun) return;
        const effective = { ...dossier, postRun };
        setOverride({ dossier: effective, slides: composeDeck(effective) });
    }, [dossier]);

    return override ?? { dossier, slides };
};

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
    const effective = useEffectiveDossier(dossier, slides);

    useEffect(() => {
        const failed = dossier.sources
            .filter((s) => !s.ok)
            .sort((a, b) => a.name.localeCompare(b.name));
        for (const s of failed) {
            console.warn(`fast50: dossier source failed — ${s.name}`, s.error);
        }
    }, [dossier.sources]);

    const renderable = effective.slides.filter((s) => components[s.id]);
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

    const current =
        renderable.length > 0
            ? renderable[Math.min(state.slideIndex, renderable.length - 1)]
            : undefined;
    if (!current) return null;
    const Component = components[current.id] as SlideComponent;

    return (
        <div className={styles.stage}>
            <Component
                key={current.id}
                dossier={effective.dossier}
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

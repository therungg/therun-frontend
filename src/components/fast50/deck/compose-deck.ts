import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import type { CustomSlideContent } from '~src/lib/fast50/prep.types';
import {
    evaluators,
    type SlideEvaluation,
    type SlideId,
    THRESHOLDS,
} from './evaluators';

export interface ComposedSlide {
    id: string;
    evaluation: SlideEvaluation;
    anchor: boolean;
    overflow: boolean;
    custom?: CustomSlideContent;
}

const PRE_ANCHORS: SlideId[] = ['the-game', 'intro', 'roadmap'];
const PRE_POOL: SlideId[] = [
    'grind',
    'one-shot',
    'danger-zone',
    'world-class',
    'profile',
    'forecast',
    'form-check',
];
const POST_ANCHORS: SlideId[] = ['result'];
const POST_POOL: SlideId[] = [
    'where-it-lands',
    'survived',
    'gold-rush',
    'story-of-run',
    'the-table',
    'zoom-out',
];

export { THRESHOLDS };

export const composeDeck = (d: RunnerDossier): ComposedSlide[] => {
    const anchors = d.deck === 'pre' ? PRE_ANCHORS : POST_ANCHORS;
    const pool = d.deck === 'pre' ? PRE_POOL : POST_POOL;

    const anchorSlides = anchors.flatMap((id) => {
        const evaluation = evaluators[id](d);
        return evaluation
            ? [{ id, evaluation, anchor: true, overflow: false }]
            : [];
    });

    const scored = pool
        .flatMap((id) => {
            const evaluation = evaluators[id](d);
            return evaluation ? [{ id, evaluation }] : [];
        })
        .sort((a, b) => b.evaluation.score - a.evaluation.score);

    const main = scored.slice(0, THRESHOLDS.mainSlots);
    const overflow = scored.slice(THRESHOLDS.mainSlots);

    return [
        ...anchorSlides,
        ...main.map((s) => ({ ...s, anchor: false, overflow: false })),
        ...overflow.map((s) => ({ ...s, anchor: false, overflow: true })),
    ];
};

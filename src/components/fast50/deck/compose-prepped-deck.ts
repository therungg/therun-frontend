import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import {
    type CustomSlideItem,
    customSlidesFromPrep,
    headlineForCustom,
    type PrepSessionData,
} from '~src/lib/fast50/prep.types';
import { type ComposedSlide, composeDeck } from './compose-deck';
import { evaluators, type SlideId } from './evaluators';

export interface PreppedDeck {
    slides: ComposedSlide[];
    warnings: string[];
}

const toSlide = (item: CustomSlideItem): ComposedSlide => ({
    id: item.id,
    evaluation: { score: 100, headline: headlineForCustom(item.content) },
    anchor: false,
    overflow: false,
    custom: item.content,
});

const insertAfter = (
    slides: ComposedSlide[],
    afterId: string,
    slide: ComposedSlide,
) => {
    const i = slides.findIndex((s) => s.id === afterId);
    slides.splice(i === -1 ? slides.length : i + 1, 0, slide);
};

export const composePreppedDeck = (
    d: RunnerDossier,
    prep: PrepSessionData | null | undefined,
): PreppedDeck => {
    if (!prep) return { slides: composeDeck(d), warnings: [] };

    const custom = customSlidesFromPrep(prep, d.deck);
    const frozen =
        d.deck === 'pre' ? prep.deckOrder?.pre : prep.deckOrder?.post;

    if (frozen && frozen.length > 0) {
        const warnings: string[] = [];
        const slides: ComposedSlide[] = [];
        for (const ref of frozen) {
            if (ref.kind === 'stat') {
                const evaluate = evaluators[ref.id as SlideId];
                const evaluation = evaluate ? evaluate(d) : null;
                if (!evaluation) {
                    warnings.push(`'${ref.id}' dropped — data unavailable`);
                    continue;
                }
                slides.push({
                    id: ref.id,
                    evaluation,
                    anchor: false,
                    overflow: false,
                });
            } else {
                const item = custom.find((c) => c.id === ref.id);
                if (!item) {
                    warnings.push(
                        `custom slide '${ref.id}' skipped — content deleted`,
                    );
                    continue;
                }
                slides.push(toSlide(item));
            }
        }
        return { slides, warnings };
    }

    // No curated order: auto-compose, then interleave prepped content at
    // default positions. Overflow stays at the very end.
    const auto = composeDeck(d);
    const slides = auto.filter((s) => !s.overflow);
    const overflow = auto.filter((s) => s.overflow);
    const remaining = [...custom];
    const takeFirst = (kind: CustomSlideItem['content']['kind']) => {
        const i = remaining.findIndex((c) => c.content.kind === kind);
        return i === -1 ? undefined : remaining.splice(i, 1)[0];
    };

    if (d.deck === 'pre') {
        const quote = takeFirst('quote');
        if (quote) insertAfter(slides, 'intro', toSlide(quote));
        const clip = takeFirst('clip');
        if (clip) insertAfter(slides, 'roadmap', toSlide(clip));
        const shot = takeFirst('called-shot');
        for (const item of remaining) slides.push(toSlide(item));
        if (shot) slides.push(toSlide(shot));
    } else {
        const verdict = takeFirst('called-shot-result');
        if (verdict) insertAfter(slides, 'result', toSlide(verdict));
        for (const item of remaining) slides.push(toSlide(item));
    }
    return { slides: [...slides, ...overflow], warnings: [] };
};

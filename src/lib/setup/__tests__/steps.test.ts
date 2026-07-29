import { describe, expect, it } from 'vitest';
import {
    CONCEPT_LABEL,
    consoleLocationForStep,
    STEP_CONCEPTS,
} from '../../console/vocabulary';
import { SETUP_STEP_ORDER, type SetupStepId } from '../completeness';
import { SETUP_STEP_LABELS, SETUP_STEPS, setupStepIndex } from '../steps';

describe('SETUP_STEPS', () => {
    it('declares the same steps as SETUP_STEP_ORDER, in the same order', () => {
        expect(SETUP_STEPS.map((s) => s.id)).toEqual(SETUP_STEP_ORDER);
    });

    it('numbers steps 1..n contiguously', () => {
        expect(SETUP_STEPS.map((s) => s.num)).toEqual(
            SETUP_STEPS.map((_, i) => i + 1),
        );
    });

    it('has a unique non-empty label per step', () => {
        const labels = SETUP_STEPS.map((s) => s.label);
        expect(labels.every((l) => l.trim().length > 0)).toBe(true);
        expect(new Set(labels).size).toBe(labels.length);
    });

    it('makes only the final step non-skippable', () => {
        expect(
            SETUP_STEPS.filter((s) => !s.skippable).map((s) => s.id),
        ).toEqual(['finish']);
    });

    it('derives labels and indexes from the same list', () => {
        expect(SETUP_STEP_LABELS.finish).toBe('Go live');
        expect(setupStepIndex('defaults')).toBe(4);
        // Unknown ids are impossible via SetupStepId, but the lookup must not
        // silently report position 0 for one.
        expect(setupStepIndex('nope' as never)).toBe(-1);
    });
});

describe('vocabulary alignment', () => {
    // `defaults` and `exceptions` are the two multi-concept steps: step 5 is
    // one screen with four headings, and step 6 is per-category overrides
    // across all of them. They keep their own rail labels; the console
    // reaches their contents through the category index.
    const MULTI_CONCEPT: SetupStepId[] = ['defaults', 'exceptions'];

    it('takes every single-concept rail label from the shared vocabulary', () => {
        for (const step of SETUP_STEPS) {
            if (MULTI_CONCEPT.includes(step.id)) continue;
            const concepts = STEP_CONCEPTS[step.id];
            if (concepts.length === 0) continue;
            expect(step.label, step.id).toBe(CONCEPT_LABEL[concepts[0]]);
        }
    });

    it('names the console destination for every step but the last', () => {
        for (const step of SETUP_STEPS) {
            const location = consoleLocationForStep(step.id);
            if (step.id === 'finish') expect(location).toBeNull();
            else expect(location, step.id).not.toBeNull();
        }
    });
});

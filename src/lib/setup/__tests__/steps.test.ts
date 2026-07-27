import { describe, expect, it } from 'vitest';
import { SETUP_STEP_ORDER } from '../completeness';
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

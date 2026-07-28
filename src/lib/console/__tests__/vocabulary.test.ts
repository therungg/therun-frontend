import { describe, expect, it } from 'vitest';
import { SETUP_STEP_ORDER } from '../../setup/completeness';
import {
    CONCEPT_LABEL,
    conceptLabel,
    consoleLocationForStep,
    STEP_CONCEPTS,
} from '../vocabulary';

describe('vocabulary', () => {
    it('gives every setup step at least one concept', () => {
        for (const step of SETUP_STEP_ORDER) {
            expect(STEP_CONCEPTS[step], step).toBeDefined();
        }
    });

    it('only maps steps to concepts that have labels', () => {
        for (const concepts of Object.values(STEP_CONCEPTS)) {
            for (const c of concepts) {
                expect(CONCEPT_LABEL[c], c).toBeTruthy();
            }
        }
    });

    it('labels the four concepts wizard step 5 splits into', () => {
        expect(STEP_CONCEPTS.defaults).toEqual([
            'timing',
            'proof',
            'standards',
            'rules',
        ]);
        expect(conceptLabel('proof')).toBe('Proof & review');
        expect(conceptLabel('standards')).toBe('Minimum time');
    });

    it('sends board-wide steps to the category index, not one category', () => {
        expect(consoleLocationForStep('defaults')).toEqual({
            crumb: 'Categories ▸ Timing',
            pane: 'categories',
        });
        expect(consoleLocationForStep('exceptions')?.pane).toBe('categories');
    });

    it('has no console location for the terminal step', () => {
        expect(consoleLocationForStep('finish')).toBeNull();
    });

    it('never returns an empty label', () => {
        for (const [id, label] of Object.entries(CONCEPT_LABEL)) {
            expect(label.trim().length, id).toBeGreaterThan(0);
        }
    });
});

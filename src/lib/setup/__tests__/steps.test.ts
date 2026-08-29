import { describe, expect, it } from 'vitest';
import {
    CONCEPT_LABEL,
    consoleLocationForStep,
    STEP_CONCEPTS,
} from '../../console/vocabulary';
import { SETUP_STEP_ORDER, type SetupStepId } from '../completeness';
import {
    LEGACY_STEP_MAP,
    resolveSetupStep,
    SETUP_STEP_LABELS,
    SETUP_STEPS,
    setupStepIndex,
} from '../steps';

describe('SETUP_STEPS', () => {
    it('declares the same steps as SETUP_STEP_ORDER, in the same order', () => {
        expect(SETUP_STEPS.map((s) => s.id)).toEqual(SETUP_STEP_ORDER);
    });

    it('is the seven-step category-centric wizard', () => {
        expect(SETUP_STEPS.map((s) => s.id)).toEqual([
            'details',
            'categories',
            'levels',
            'groups',
            'category-setup',
            'variables',
            'boards',
        ]);
        expect(SETUP_STEPS.map((s) => s.label)).toEqual([
            'Game details',
            'Categories',
            'Levels',
            'Category groups',
            'Category settings',
            'Subcategories & filters',
            'Boards',
        ]);
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
        ).toEqual(['boards']);
    });

    it('derives labels and indexes from the same list', () => {
        expect(SETUP_STEP_LABELS.boards).toBe('Boards');
        expect(setupStepIndex('category-setup')).toBe(4);
        // Unknown ids are impossible via SetupStepId, but the lookup must not
        // silently report position 0 for one.
        expect(setupStepIndex('nope' as never)).toBe(-1);
    });
});

describe('resolveSetupStep', () => {
    it('passes a current step id straight through', () => {
        expect(resolveSetupStep('groups')).toBe('groups');
        expect(resolveSetupStep('category-setup')).toBe('category-setup');
    });

    it('passes the revived variables step id straight through', () => {
        // `variables` is a live step id again (Subcategories & filters), so an
        // old ?step=variables link lands on that step rather than being folded
        // onto category settings.
        expect(resolveSetupStep('variables')).toBe('variables');
    });

    it('maps every retired step id onto its successor', () => {
        // Bookmarks and links minted by older wizards must still land on the
        // screen that now owns that work.
        expect(resolveSetupStep('exceptions')).toBe('category-setup');
        expect(resolveSetupStep('defaults')).toBe('details');
        expect(resolveSetupStep('finish')).toBe('boards');
    });

    it('maps no retired id onto another retired id', () => {
        for (const target of Object.values(LEGACY_STEP_MAP)) {
            expect(SETUP_STEP_ORDER).toContain(target);
        }
    });

    it('returns null for nothing and for junk', () => {
        expect(resolveSetupStep(null)).toBeNull();
        expect(resolveSetupStep(undefined)).toBeNull();
        expect(resolveSetupStep('')).toBeNull();
        expect(resolveSetupStep('not-a-step')).toBeNull();
    });
});

describe('vocabulary alignment', () => {
    // `details` and `category-setup` keep bespoke rail labels rather than a
    // concept label: step 1 carries the board's timing/rules defaults alongside
    // the game's details, and "Category settings" reads better on the rail than
    // the bare "Categories" concept it maps to. The console reaches both by its
    // own routes.
    const MULTI_CONCEPT: SetupStepId[] = ['details', 'category-setup'];

    it('takes every single-concept rail label from the shared vocabulary', () => {
        for (const step of SETUP_STEPS) {
            if (MULTI_CONCEPT.includes(step.id)) continue;
            const concepts = STEP_CONCEPTS[step.id];
            if (concepts.length === 0) continue;
            expect(step.label, step.id).toBe(CONCEPT_LABEL[concepts[0]]);
        }
    });

    it('names a console destination for every step', () => {
        for (const step of SETUP_STEPS) {
            expect(consoleLocationForStep(step.id), step.id).not.toBeNull();
        }
    });
});

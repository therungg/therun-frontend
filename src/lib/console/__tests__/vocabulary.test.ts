import { describe, expect, it } from 'vitest';
import { SETUP_STEP_ORDER } from '../../setup/completeness';
import {
    CONCEPT_LABEL,
    CONCEPT_TILE,
    conceptLabel,
    consoleLocationForStep,
    STEP_CONCEPTS,
    TILE_CONCEPT_IDS,
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

    it('labels the concepts wizard step 1 carries alongside the game details', () => {
        // Board-wide timing and the rules template moved onto step 1 with the
        // rest of the board defaults.
        expect(STEP_CONCEPTS.details).toEqual([
            'game-details',
            'timing',
            'rules',
        ]);
        expect(conceptLabel('standards')).toBe('Minimum time');
    });

    it('sends the per-category step to the category index, not one category', () => {
        expect(consoleLocationForStep('category-setup')).toEqual({
            crumb: 'Categories',
            pane: 'categories',
        });
    });

    it('sends step 1 to the game-details pane, not the category index', () => {
        expect(consoleLocationForStep('details')).toEqual({
            crumb: 'Game details',
            pane: 'game-details',
        });
    });

    it('gives the terminal step its own console home', () => {
        // Curating what is on the boards is ongoing work, not a one-off
        // launch — unlike the old "Go live" step it maps to a real pane.
        expect(consoleLocationForStep('boards')).toEqual({
            crumb: 'Boards',
            pane: 'boards',
        });
    });

    it('never returns an empty label', () => {
        for (const [id, label] of Object.entries(CONCEPT_LABEL)) {
            expect(label.trim().length, id).toBeGreaterThan(0);
        }
    });
});

describe('CONCEPT_TILE', () => {
    it('gives every tiled concept a verb-led action and a blurb', () => {
        for (const id of TILE_CONCEPT_IDS) {
            expect(CONCEPT_TILE[id]?.action, id).toBeTruthy();
            expect(CONCEPT_TILE[id]?.blurb, id).toBeTruthy();
        }
    });

    it('has no tile for reports — it is the attention pane pre-filtered', () => {
        expect(Object.keys(CONCEPT_TILE)).not.toContain('reports');
    });

    it('tiles board curation right after groups', () => {
        expect(TILE_CONCEPT_IDS.indexOf('boards')).toBe(
            TILE_CONCEPT_IDS.indexOf('groups') + 1,
        );
    });

    it('only tiles concepts that also have a sidebar label', () => {
        for (const id of TILE_CONCEPT_IDS) {
            expect(CONCEPT_LABEL[id], id).toBeTruthy();
        }
    });

    it('phrases every action as something you do, not a section name', () => {
        for (const id of TILE_CONCEPT_IDS) {
            // A tile action that merely repeats the sidebar noun means the
            // grid has stopped answering "what can I do here".
            expect(CONCEPT_TILE[id].action, id).not.toBe(CONCEPT_LABEL[id]);
        }
    });
});

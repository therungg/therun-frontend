import { describe, expect, it } from 'vitest';
import { normalizeArchived } from '../archived-flag';

describe('normalizeArchived', () => {
    it('prefers the new archived field when present', () => {
        expect(normalizeArchived({ archived: true, active: true })).toBe(true);
        expect(normalizeArchived({ archived: false, active: false })).toBe(
            false,
        );
    });
    it('falls back to inverted active when archived is absent', () => {
        expect(normalizeArchived({ active: false })).toBe(true);
        expect(normalizeArchived({ active: true })).toBe(false);
    });
    it('treats null archived as absent', () => {
        expect(normalizeArchived({ archived: null, active: false })).toBe(true);
    });
    it('defaults to not-archived when neither field exists', () => {
        expect(normalizeArchived({})).toBe(false);
        expect(normalizeArchived({ active: null })).toBe(false);
    });
});

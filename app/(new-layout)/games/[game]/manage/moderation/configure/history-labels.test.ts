import { describe, expect, it } from 'vitest';
import { historyActionLabel } from './history-labels';

describe('historyActionLabel', () => {
    it('maps each documented mod-log action to a plain sentence', () => {
        expect(historyActionLabel('exclude_run')).toBe(
            'Excluded this run from the leaderboard',
        );
        expect(historyActionLabel('include_run')).toBe(
            'Restored this run to the leaderboard',
        );
        expect(historyActionLabel('exclude_via_rule')).toBe(
            'Excluded via a ban rule',
        );
        expect(historyActionLabel('delete_exclusion_rule')).toBe(
            'Removed a ban rule',
        );
    });

    it('maps verdict actions to plain sentences', () => {
        expect(historyActionLabel('verify')).toBe('Verified this run');
        expect(historyActionLabel('reject')).toBe('Rejected this run');
        expect(historyActionLabel('unreject')).toBe('Restored a rejected run');
    });

    it('never returns the raw snake_case code for an unknown action', () => {
        const result = historyActionLabel('some_new_action');
        expect(result).not.toBe('some_new_action');
        expect(result).toBe('Some new action');
    });

    it('returns a fallback for an empty action', () => {
        expect(historyActionLabel('')).toBe('Unknown action');
    });
});

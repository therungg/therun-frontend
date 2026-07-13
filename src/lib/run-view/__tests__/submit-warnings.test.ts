import { describe, expect, test } from 'vitest';
import type { SubmitWarning } from '../../../../types/leaderboards.types';
import { describeSubmitWarning } from '../submit-warnings';

const names = { platform: 'Platform' };
const w = (over: Partial<SubmitWarning>): SubmitWarning => ({
    nameNormalized: 'platform',
    submitted: 'BLABLA',
    resolved: 'Nintendo 64',
    reason: 'no_match_default_used',
    ...over,
});

describe('describeSubmitWarning', () => {
    test('no_match_default_used names the variable and both values', () => {
        const s = describeSubmitWarning(w({}), names);
        expect(s).toContain('BLABLA');
        expect(s).toContain('Platform');
        expect(s).toContain('Nintendo 64');
    });
    test('missing_default_used is silent', () => {
        expect(
            describeSubmitWarning(w({ reason: 'missing_default_used' }), names),
        ).toBeNull();
    });
    test('no_match_filter_dropped mentions ignoring', () => {
        expect(
            describeSubmitWarning(
                w({ reason: 'no_match_filter_dropped' }),
                names,
            ),
        ).toContain('ignored');
    });
    test('combination_invalid_default_used mentions default board', () => {
        expect(
            describeSubmitWarning(
                w({
                    reason: 'combination_invalid_default_used',
                    nameNormalized: '',
                }),
                names,
            ),
        ).toContain('default board');
    });
    test('falls back to nameNormalized when display name unknown', () => {
        expect(
            describeSubmitWarning(w({ nameNormalized: 'region' }), names),
        ).toContain('region');
    });
});

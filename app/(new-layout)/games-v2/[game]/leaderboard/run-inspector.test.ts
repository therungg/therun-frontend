import { describe, expect, it } from 'vitest';
import { verbsForStatus } from './run-inspector';

describe('verbsForStatus', () => {
    it('pending → Verify + Remove', () => {
        expect(verbsForStatus('pending')).toEqual(['approve', 'remove']);
    });

    it('verified → Unverify + Remove', () => {
        expect(verbsForStatus('verified')).toEqual(['unverify', 'remove']);
    });

    it('rejected → Restore + Remove', () => {
        expect(verbsForStatus('rejected')).toEqual(['restore', 'remove']);
    });
});

import { describe, expect, it } from 'vitest';
import { manualVerbsForStatus } from './manual-inspector';

describe('manualVerbsForStatus', () => {
    it('pending → Verify + Reject + Remove', () => {
        expect(manualVerbsForStatus('pending')).toEqual([
            'approve',
            'reject',
            'remove',
        ]);
    });

    it('verified → Reject + Remove (no re-verify)', () => {
        expect(manualVerbsForStatus('verified')).toEqual(['reject', 'remove']);
    });

    it('rejected → Verify + Remove (no re-reject)', () => {
        expect(manualVerbsForStatus('rejected')).toEqual(['approve', 'remove']);
    });
});

import { describe, expect, it } from 'vitest';
import { inspectorVerbs, verbsForStatus } from './run-inspector';

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

describe('inspectorVerbs', () => {
    it('mod mode is verbsForStatus unchanged', () => {
        for (const status of ['pending', 'verified', 'rejected'] as const) {
            expect(inspectorVerbs('mod', status)).toEqual(
                verbsForStatus(status),
            );
        }
    });

    // The owner gets one verb, never a verdict on their own work: no
    // approve, no unverify, and no second option to reason about.
    it('owner mode offers exactly one verb', () => {
        expect(inspectorVerbs('owner', 'pending')).toEqual(['remove']);
        expect(inspectorVerbs('owner', 'verified')).toEqual(['remove']);
        expect(inspectorVerbs('owner', 'rejected')).toEqual(['restore']);
    });

    it('owner mode never offers a moderator verdict', () => {
        for (const status of ['pending', 'verified', 'rejected'] as const) {
            const verbs = inspectorVerbs('owner', status);
            expect(verbs).not.toContain('approve');
            expect(verbs).not.toContain('unverify');
            expect(verbs).not.toContain('ban');
        }
    });
});

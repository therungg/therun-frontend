import { describe, expect, it } from 'vitest';
import { normalizeVerificationStatus } from './run-badges';

describe('normalizeVerificationStatus', () => {
    it('passes through "verified"', () => {
        expect(normalizeVerificationStatus('verified')).toBe('verified');
    });

    it('passes through "rejected"', () => {
        expect(normalizeVerificationStatus('rejected')).toBe('rejected');
    });

    it('normalizes "pending" to "pending"', () => {
        expect(normalizeVerificationStatus('pending')).toBe('pending');
    });

    it('falls back to "pending" for an unrecognized status', () => {
        expect(normalizeVerificationStatus('unverified')).toBe('pending');
    });

    it('falls back to "pending" for null/undefined/empty', () => {
        expect(normalizeVerificationStatus(null)).toBe('pending');
        expect(normalizeVerificationStatus(undefined)).toBe('pending');
        expect(normalizeVerificationStatus('')).toBe('pending');
    });
});

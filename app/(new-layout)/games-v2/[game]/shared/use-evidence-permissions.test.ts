import { describe, expect, it } from 'vitest';
import { evidencePermissions } from './use-evidence-permissions';

const base = {
    isOwner: true,
    verificationStatus: 'pending',
    descriptionRevoked: false,
    isMod: false,
};

describe('evidencePermissions', () => {
    it('mod can edit both, verified run', () => {
        const result = evidencePermissions({
            ...base,
            isMod: true,
            verificationStatus: 'verified',
        });
        expect(result).toEqual({
            canEditVod: true,
            canEditDescription: true,
            lockedReason: null,
        });
    });

    it('mod can edit both, pending run', () => {
        const result = evidencePermissions({ ...base, isMod: true });
        expect(result).toEqual({
            canEditVod: true,
            canEditDescription: true,
            lockedReason: null,
        });
    });

    it('mod can edit both even when description revoked', () => {
        const result = evidencePermissions({
            ...base,
            isMod: true,
            descriptionRevoked: true,
        });
        expect(result).toEqual({
            canEditVod: true,
            canEditDescription: true,
            lockedReason: null,
        });
    });

    it('mod can edit both even on a guest run (not the owner)', () => {
        const result = evidencePermissions({
            ...base,
            isMod: true,
            isOwner: false,
        });
        expect(result).toEqual({
            canEditVod: true,
            canEditDescription: true,
            lockedReason: null,
        });
    });

    it('a non-owner, non-mod cannot edit anything, no note needed', () => {
        const result = evidencePermissions({ ...base, isOwner: false });
        expect(result).toEqual({
            canEditVod: false,
            canEditDescription: false,
            lockedReason: null,
        });
    });

    it('owner of a pending run can edit both vod and description', () => {
        const result = evidencePermissions({ ...base });
        expect(result).toEqual({
            canEditVod: true,
            canEditDescription: true,
            lockedReason: null,
        });
    });

    it('owner of a verified run is locked out of both, with a reason', () => {
        const result = evidencePermissions({
            ...base,
            verificationStatus: 'verified',
        });
        expect(result.canEditVod).toBe(false);
        expect(result.canEditDescription).toBe(false);
        expect(result.lockedReason).toEqual(expect.any(String));
        expect(result.lockedReason).toMatch(/verifi/i);
    });

    it('owner of a rejected run can still edit both (only verified locks)', () => {
        const result = evidencePermissions({
            ...base,
            verificationStatus: 'rejected',
        });
        expect(result).toEqual({
            canEditVod: true,
            canEditDescription: true,
            lockedReason: null,
        });
    });

    it('owner with a revoked description can still edit vod, not description', () => {
        const result = evidencePermissions({
            ...base,
            descriptionRevoked: true,
        });
        expect(result.canEditVod).toBe(true);
        expect(result.canEditDescription).toBe(false);
        expect(result.lockedReason).toEqual(expect.any(String));
    });

    it('owner with revoked description on a verified run: verified reason wins', () => {
        const result = evidencePermissions({
            ...base,
            verificationStatus: 'verified',
            descriptionRevoked: true,
        });
        expect(result.canEditVod).toBe(false);
        expect(result.canEditDescription).toBe(false);
        expect(result.lockedReason).toMatch(/verifi/i);
    });

    it('descriptionRevoked defaults to false when omitted', () => {
        const { descriptionRevoked: _drop, ...withoutRevoked } = base;
        const result = evidencePermissions({ ...withoutRevoked });
        expect(result).toEqual({
            canEditVod: true,
            canEditDescription: true,
            lockedReason: null,
        });
    });

    it('guest run / no owner match: never owner-editable', () => {
        const result = evidencePermissions({
            ...base,
            isOwner: false,
        });
        expect(result).toEqual({
            canEditVod: false,
            canEditDescription: false,
            lockedReason: null,
        });
    });
});

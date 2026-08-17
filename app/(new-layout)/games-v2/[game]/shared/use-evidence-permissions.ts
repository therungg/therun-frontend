import { useMemo } from 'react';

export interface EvidencePermissionsInput {
    ownerUserId: number | null;
    verificationStatus: string;
    isGuest: boolean;
    descriptionRevoked?: boolean;
    sessionUserId: number | null;
    isMod: boolean;
}

export interface EvidencePermissions {
    canEditVod: boolean;
    canEditDescription: boolean;
    lockedReason: string | null;
}

const VERIFIED_LOCKED_REASON =
    'This run is verified — locked, ask a moderator to make changes.';
const DESCRIPTION_REVOKED_REASON =
    'Your description edit ability has been revoked — ask a moderator to make changes.';

/**
 * Pure mirror of the backend's `evidenceEditDecision` guard. Any change here
 * must be re-verified against the backend rule — this parity is the
 * feature's top risk.
 */
export function evidencePermissions({
    ownerUserId,
    verificationStatus,
    isGuest,
    descriptionRevoked = false,
    sessionUserId,
    isMod,
}: EvidencePermissionsInput): EvidencePermissions {
    if (isMod) {
        return {
            canEditVod: true,
            canEditDescription: true,
            lockedReason: null,
        };
    }

    const isOwner =
        !isGuest && sessionUserId != null && sessionUserId === ownerUserId;

    if (!isOwner) {
        return {
            canEditVod: false,
            canEditDescription: false,
            lockedReason: null,
        };
    }

    if (verificationStatus === 'verified') {
        return {
            canEditVod: false,
            canEditDescription: false,
            lockedReason: VERIFIED_LOCKED_REASON,
        };
    }

    if (descriptionRevoked) {
        return {
            canEditVod: true,
            canEditDescription: false,
            lockedReason: DESCRIPTION_REVOKED_REASON,
        };
    }

    return { canEditVod: true, canEditDescription: true, lockedReason: null };
}

export function useEvidencePermissions(
    input: EvidencePermissionsInput,
): EvidencePermissions {
    return useMemo(
        () => evidencePermissions(input),
        [
            input.ownerUserId,
            input.verificationStatus,
            input.isGuest,
            input.descriptionRevoked,
            input.sessionUserId,
            input.isMod,
        ],
    );
}

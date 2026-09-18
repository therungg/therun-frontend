import { useMemo } from 'react';

export interface EvidencePermissionsInput {
    /** Caller-computed: true iff the signed-in visitor owns this run/manual
     * time. The codebase has no numeric session user id to compare against
     * an owner id with (see `isSameRunner`) — ownership is resolved by
     * username before this hook ever runs. */
    isOwner: boolean;
    verificationStatus: string;
    descriptionRevoked?: boolean;
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
    isOwner,
    verificationStatus,
    descriptionRevoked = false,
    isMod,
}: EvidencePermissionsInput): EvidencePermissions {
    if (isMod) {
        return {
            canEditVod: true,
            canEditDescription: true,
            lockedReason: null,
        };
    }

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
            input.isOwner,
            input.verificationStatus,
            input.descriptionRevoked,
            input.isMod,
        ],
    );
}

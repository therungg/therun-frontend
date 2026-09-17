import { isSameRunner } from '../shared/is-same-runner';
import {
    type EvidencePermissions,
    evidencePermissions,
} from '../shared/use-evidence-permissions';
import type { RunViewModel } from './run-view';

/**
 * What the run page can actually save for this viewer. Shared by the evidence
 * panel and the stat strip so a control is only offered where it works.
 */
export function effectiveEvidencePerms(
    model: RunViewModel,
    sessionUsername: string | null,
    isMod: boolean,
): EvidencePermissions & { isOwner: boolean } {
    const isOwner =
        isSameRunner(sessionUsername, model.runnerName) &&
        !model.isGuest &&
        model.userId != null;

    const perms = evidencePermissions({
        isOwner,
        isMod,
        verificationStatus: model.verificationStatus,
        descriptionRevoked: model.descriptionRevoked ?? false,
    });

    if (!isMod || isOwner) return { ...perms, isOwner };

    // A mod who isn't the owner can only be wired to a save path that exists
    // and has everything it needs from this page's model. Runs need a board
    // slug+key (only known when the category resolved with board context);
    // manual times need nothing extra. Neither mod action supports
    // description, so that half stays locked.
    const modVodWireable =
        model.kind === 'manual' ||
        (model.kind === 'run' &&
            model.boardContext != null &&
            model.categorySlug != null);
    return {
        ...perms,
        canEditVod: perms.canEditVod && modVodWireable,
        canEditDescription: false,
        isOwner,
    };
}

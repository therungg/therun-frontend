'use client';

import {
    selfSetEvidenceAction,
    selfSetManualEvidenceAction,
} from '~src/actions/self-evidence.action';
import { attachVodAction } from '../leaderboard/actions/attach-vod.action';
import { updateManualTimeAction } from '../manage/moderation/shared/actions/manual-times.action';
import { EvidenceEditor } from '../shared/evidence-editor';
import { isSameRunner } from '../shared/is-same-runner';
import { evidencePermissions } from '../shared/use-evidence-permissions';
import type { RunViewModel } from './run-view';

type SaveResult = { ok: true } | { error: string };

// No mod description-edit path exists yet — `editRun` (runs) and
// `updateManualTime` (manual times) carry no `description` field on the
// backend today. A mod editing someone else's evidence from this page can
// therefore only ever touch the VOD, never the description; that half of
// the mod path is a documented gap (see B4 report), not an oversight.
const MOD_VOD_REASON = 'Attached video evidence from the run page.';

/**
 * Owns the wiring EvidenceEditor needs but can't have as a server-component
 * prop: which save callback applies (owner vs. mod vs. neither) and the
 * live `perms` computed from that. Kept separate from RunView (a server
 * component) because a plain closure over server actions can't cross that
 * boundary — importing and calling the 'use server' actions directly from
 * here is the supported RSC pattern.
 */
export function RunEvidencePanel({
    model,
    sessionUsername,
    isMod,
}: {
    model: RunViewModel;
    sessionUsername: string | null;
    isMod: boolean;
}) {
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

    // A mod who isn't the owner can only be wired to a save path that (a)
    // exists and (b) has everything it needs from this page's model. Runs
    // need a board slug+key (only ever known when this run matched the
    // runner's current standing — see RunViewModel.boardStanding); manual
    // times need nothing extra. Neither mod action supports description, so
    // that half stays locked regardless.
    const modVodWireable =
        isMod &&
        !isOwner &&
        (model.kind === 'manual' ||
            (model.kind === 'run' && model.boardStanding != null));
    const effectivePerms =
        isMod && !isOwner
            ? {
                  ...perms,
                  canEditVod: perms.canEditVod && modVodWireable,
                  canEditDescription: false,
              }
            : perms;

    const onSaveVod = async (url: string | null): Promise<SaveResult> => {
        if (isOwner) {
            return model.kind === 'run'
                ? selfSetEvidenceAction(model.id, { vodUrl: url })
                : selfSetManualEvidenceAction(model.id, {
                      evidenceUrl: url,
                  });
        }
        if (isMod && model.kind === 'run' && model.boardStanding != null) {
            const res = await attachVodAction(model.game.name, model.id, url, {
                categorySlug: model.boardStanding.categorySlug,
                subcategoryKey: model.boardStanding.subcategoryKey,
            });
            return 'error' in res ? res : { ok: true };
        }
        if (isMod && model.kind === 'manual') {
            return updateManualTimeAction(model.game.name, model.id, {
                reason: MOD_VOD_REASON,
                evidenceUrl: url,
            });
        }
        return { error: 'Not authorized.' };
    };

    const onSaveDescription = async (
        text: string | null,
    ): Promise<SaveResult> => {
        if (isOwner) {
            return model.kind === 'run'
                ? selfSetEvidenceAction(model.id, { description: text })
                : selfSetManualEvidenceAction(model.id, { description: text });
        }
        return {
            error: 'Editing another runner’s description isn’t available here yet.',
        };
    };

    return (
        <EvidenceEditor
            vodUrl={model.vodUrl}
            description={model.description}
            perms={effectivePerms}
            onSaveVod={onSaveVod}
            onSaveDescription={onSaveDescription}
        />
    );
}

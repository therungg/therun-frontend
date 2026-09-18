'use server';

import { getSession } from '~src/actions/session.action';
import {
    getManualTimeByIdAsViewer,
    getRunByIdAsViewer,
} from '~src/lib/run-detail-viewer';

type Fail = { error: string };

export type OwnerEvidenceTarget =
    | { kind: 'run'; runId: number }
    | { kind: 'manual'; manualTimeId: number };

/**
 * Owner-only evidence read for the run inspector drawer's owner mode.
 *
 * `LeaderboardEntry` (the board's public row shape) carries `vodUrl` but not
 * `description`/`descriptionRestriction` — those only exist on the AUTHED
 * detail read (see `run-detail-viewer.ts`), because `descriptionRestriction`
 * is owner-only information. The drawer is a client component and can't call
 * that reader directly, so this thin action does it: same uncached,
 * bearer-token-carrying reads `loadVodReviewAction` already uses, reshaped
 * to what `EvidenceEditor` + `evidencePermissions` need.
 */
export async function loadOwnerEvidenceAction(
    target: OwnerEvidenceTarget,
): Promise<
    | {
          ok: true;
          vodUrl: string | null;
          description: string | null;
          descriptionRevoked: boolean;
      }
    | Fail
> {
    const session = await getSession();
    if (!session?.id) return { error: 'Not signed in.' };

    try {
        if (target.kind === 'run') {
            const d = await getRunByIdAsViewer(target.runId, session.id);
            if (!d) return { error: 'Run not found.' };
            return {
                ok: true,
                vodUrl: d.vodUrl,
                description: d.description ?? null,
                descriptionRevoked: d.descriptionRestriction != null,
            };
        }
        const d = await getManualTimeByIdAsViewer(
            target.manualTimeId,
            session.id,
        );
        if (!d) return { error: 'Set time not found.' };
        return {
            ok: true,
            vodUrl: d.evidenceUrl,
            description: d.description ?? null,
            descriptionRevoked: d.descriptionRestriction != null,
        };
    } catch {
        return { error: 'Could not load your evidence.' };
    }
}

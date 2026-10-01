'use client';

import { usePathname } from 'next/navigation';
import Link from '~src/components/link';
import { getTwitchOAuthURL } from '~src/components/twitch/twitch-oauth';
import type { GameMetadata } from '~src/lib/game-mgmt';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import styles from '../game-page.module.scss';

/**
 * A board counts as set up once a moderator has marked setup complete or
 * its settings came from speedrun.com. Import provenance covers both the
 * settings import and the older full imports, which brought the categories
 * over without stamping `settingsSyncedAt`. Until then its categories, rules
 * and timing are whatever the auto-created defaults happened to be.
 */
export function isBoardSetUp(gameMeta: GameMetadata): boolean {
    return gameMeta.configured || gameMeta.importProvenance != null;
}

/**
 * The line under the hero on a board nobody has set up yet, with the way to
 * become the person who does: apply, sign in to apply, or (for the board's
 * own moderators) finish the setup.
 */
export function SetupNotice({
    gameName,
    gameDisplay,
    claim,
    canManage,
    canModerate,
}: {
    gameName: string;
    gameDisplay: string;
    claim?: ClaimCtaState | null;
    canManage?: boolean;
    canModerate?: boolean;
}) {
    const pathname = usePathname();

    let action: React.ReactNode = null;
    if (canManage) {
        action = (
            <Link
                href={`/games/${encodeURIComponent(gameName)}/setup`}
                className={styles.claimAction}
            >
                Finish setup
            </Link>
        );
    } else if (claim) {
        action = (
            <ClaimCta
                claim={claim}
                gameDisplay={gameDisplay}
                triggerClassName={styles.claimAction}
            />
        );
    } else if (!canModerate) {
        // Signed-out: the board pages build a claim for every signed-in
        // visitor who can't moderate.
        action = (
            <a
                href={getTwitchOAuthURL({ returnTo: pathname }).href}
                className={styles.claimAction}
            >
                Sign in to apply to moderate
            </a>
        );
    }

    return (
        <div className={styles.setupNotice}>
            <span>
                This board isn't set up yet. Data might not be accurate yet.
            </span>
            {action}
        </div>
    );
}

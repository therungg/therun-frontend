import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import type { GamePageData } from '../types';
import { LivePanel } from './live-panel';
import { RecentPbsPanel } from './recent-pbs-panel';
import styles from './sidebar.module.scss';
import { YourRunsPanel } from './your-runs-panel';

interface Props {
    data: GamePageData;
    claim?: ClaimCtaState | null;
}

export function Sidebar({ data, claim }: Props) {
    return (
        <>
            <LivePanel gameDisplay={data.game.display} />
            <YourRunsPanel rankings={data.yourRuns} gameSlug={data.game.name} />
            <RecentPbsPanel pbs={data.recentPbs} gameSlug={data.game.name} />
            {claim?.hasModerators && (
                <div className={styles.sidebarFoot}>
                    <ClaimCta
                        claim={claim}
                        gameDisplay={data.game.display}
                        triggerClassName={styles.quietLink}
                    />
                </div>
            )}
        </>
    );
}

import type { GamePageData } from '../types';
import { LivePanel } from './live-panel';
import { RecentPbsPanel } from './recent-pbs-panel';

interface Props {
    data: GamePageData;
}

export function Sidebar({ data }: Props) {
    return (
        <>
            <LivePanel gameDisplay={data.game.display} />
            <RecentPbsPanel pbs={data.recentPbs} />
        </>
    );
}

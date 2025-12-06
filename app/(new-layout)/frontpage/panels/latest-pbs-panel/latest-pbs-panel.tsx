import { Panel } from '~app/(new-layout)/components/panel.component';
import { getPersonalBestRuns } from '~src/lib/get-personal-best-runs';
import { LatestPbView } from './latest-pbs-view';

export const LatestPbsPanel = async () => {
    const runs = await getPersonalBestRuns();

    return (
        <Panel
            subtitle="Recent PB's from the community"
            title="Personal Bests"
            className="p-0"
        >
            <LatestPbView runs={runs} />
        </Panel>
    );
};

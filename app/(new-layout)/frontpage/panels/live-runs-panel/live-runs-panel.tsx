import { Panel } from '~app/(new-layout)/components/panel.component';
import { getTopNLiveRuns } from '~src/lib/live-runs';
import { LiveRunsView } from './live-runs-view';

export const LiveRunsPanel = async () => {
    const liveData = await getTopNLiveRuns(5);

    return (
        <Panel
            subtitle="View Live Runs"
            title="Live"
            link={{ url: '/live', text: 'View All Live Runs' }}
            className="p-0"
        >
            <LiveRunsView liveRuns={liveData} />
        </Panel>
    );
};

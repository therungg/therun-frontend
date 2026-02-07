import { FaUsers } from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { LiveCountChart } from './live-count-chart';

interface LiveCountDataPoint {
    count: number;
    timestamp: number;
}

async function getLiveCountHistory(): Promise<LiveCountDataPoint[]> {
    const res = await fetch('https://api.therun.gg/live/count/history', {
        next: { revalidate: 60 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.result ?? [];
}

export const LiveCountPanel = async () => {
    const history = await getLiveCountHistory();

    return (
        <Panel
            subtitle="Runners Online"
            title="Activity"
            icon={FaUsers}
            link={{ url: '/live', text: 'View Live Runs' }}
            className="p-3"
        >
            <LiveCountChart data={history} />
        </Panel>
    );
};

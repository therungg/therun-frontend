import { Live } from '~app/(old-layout)/live/live';
import { LiveRun } from '~app/(old-layout)/live/live.types';
import { liveRunArrayToMap } from '~app/(old-layout)/live/utilities';
import { getAllLiveRuns } from '~src/lib/live-runs';
import buildMetadata from '~src/utils/metadata';

export default async function LivePage() {
    const liveData: LiveRun[] = await getAllLiveRuns();
    const liveDataMap = liveRunArrayToMap(liveData);
    return <Live liveDataMap={liveDataMap} />;
}

export const metadata = buildMetadata({
    title: 'Watch Live Runs',
    description:
        'Watch streams of runners who are currently live and attempting a run, and discover new runners for your favorite games!',
});

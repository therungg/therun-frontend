import { Live } from '~app/(new-layout)/live/live';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { liveRunArrayToMap } from '~app/(new-layout)/live/utilities';
import { getAllLiveRuns } from '~src/lib/live-runs';
import buildMetadata from '~src/utils/metadata';

export default async function LivePage() {
    const liveData = (await getAllLiveRuns()) as LiveRun[];
    const liveDataMap = liveRunArrayToMap(liveData);

    return <Live liveDataMap={liveDataMap} canViewCommentary={true} />;
}

export const metadata = buildMetadata({
    title: 'Watch Live Runs',
    description:
        'Watch streams of runners who are currently live and attempting a run, and discover new runners for your favorite games!',
});
